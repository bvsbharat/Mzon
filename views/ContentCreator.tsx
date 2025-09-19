import React, { useState, useEffect } from 'react';
import { ContentTemplate, ContentProject, View, NewsContentWorkflow, MediaType, GeneratedContent, VideoContent, BrandConfiguration } from '../types';
import Icon from '../components/Icon';
import MediaTypeSelector from '../components/MediaTypeSelector';
import GeneratedContentViewer from '../components/GeneratedContentViewer';
import BrandConfigurationModal from '../components/BrandConfigurationModal';
import { generateMultiPlatformContent, generateEmailContent } from '../services/geminiService';
import { brandService } from '../services/brandService';
import { ArticleContent } from '../services/articleContentService';
import { contentGenerationService } from '../services/contentGenerationService';
import { falAiService } from '../services/falAiService';

interface ContentCreatorProps {
  onNavigate: (view: View) => void;
  addImageToLibrary: (imageUrl: string, name?: string) => void;
  addNotification: (message: string, type?: 'success' | 'error') => void;
  newsWorkflow?: NewsContentWorkflow;
  onMediaTypeSelected?: (mediaType: MediaType) => void;
  onWorkflowReset?: () => void;
}

const ContentCreator: React.FC<ContentCreatorProps> = ({
  onNavigate,
  addImageToLibrary,
  addNotification,
  newsWorkflow,
  onMediaTypeSelected,
  onWorkflowReset
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'generate' | 'projects'>('generate');
  const [projects, setProjects] = useState<ContentProject[]>([]);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [generatedVideoContent, setGeneratedVideoContent] = useState<VideoContent[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [brandConfig, setBrandConfig] = useState<BrandConfiguration | null>(null);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [contentGenerationMode, setContentGenerationMode] = useState<'news' | 'general'>('news');
  const [customTopic, setCustomTopic] = useState('');
  const [selectedProductImage, setSelectedProductImage] = useState<string | null>(null);
  const [showVideoGeneration, setShowVideoGeneration] = useState(false);

  useEffect(() => {
    setBrandConfig(brandService.getBrandConfiguration());
  }, []);

  const handleGenerateContent = async () => {
    const contentSource = newsWorkflow?.selectedNewsItem
      ? `${newsWorkflow.selectedNewsItem.title}\n\n${newsWorkflow.selectedNewsItem.description}`
      : customTopic;

    if (!contentSource.trim()) {
      addNotification('Please provide a topic or select a news article', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const brandContext = brandService.getBrandContext();

      // Generate content for multiple platforms
      const platforms = ['instagram', 'linkedin', 'twitter', 'facebook'] as const;

      const results = await Promise.all(
        platforms.map(async (platform) => {
          try {
            const content = await generateMultiPlatformContent(
              contentSource,
              [platform],
              brandContext || undefined,
              {
                includeHashtags: true,
                includeEmojis: platform === 'instagram' || platform === 'facebook',
                tone: brandContext?.brandVoice || 'professional'
              }
            );

            const generatedItem: GeneratedContent = {
              id: crypto.randomUUID(),
              type: 'social_post',
              platform,
              content: content.posts[0]?.content || '',
              title: newsWorkflow?.selectedNewsItem?.title || customTopic,
              hashtags: content.posts[0]?.hashtags || [],
              images: newsWorkflow?.selectedNewsItem?.imageUrl ? [newsWorkflow.selectedNewsItem.imageUrl] : [],
              wordCount: content.posts[0]?.content.split(' ').length || 0,
              estimatedEngagement: Math.floor(Math.random() * 40) + 60,
              brandCompliance: brandConfig
                ? brandService.validateContentBrandCompliance(content.posts[0]?.content || '').score
                : 85,
              generatedAt: new Date().toISOString(),
              sourceNewsId: newsWorkflow?.selectedNewsItem?.id
            };

            return generatedItem;
          } catch (error) {
            console.error(`Failed to generate content for ${platform}:`, error);
            return null;
          }
        })
      );

      const validResults = results.filter((result): result is GeneratedContent => result !== null);
      setGeneratedContent(validResults);

      if (validResults.length > 0) {
        addNotification(`Generated content for ${validResults.length} platform(s)`, 'success');
      } else {
        addNotification('Failed to generate content', 'error');
      }
    } catch (error) {
      console.error('Content generation failed:', error);
      addNotification('Failed to generate content', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveContent = (content: GeneratedContent) => {
    // Create a content project from the generated content
    const project: ContentProject = {
      id: crypto.randomUUID(),
      name: `${content.platform} - ${content.title?.substring(0, 30) || 'Generated Content'}`,
      description: `Generated content for ${content.platform}`,
      template: {
        id: crypto.randomUUID(),
        name: content.platform || 'social',
        description: `Generated ${content.type}`,
        platform: content.platform as any || 'instagram',
        type: 'post',
        dimensions: { width: 1080, height: 1080 }
      },
      content: {
        text: content.content,
        images: content.images,
        hashtags: content.hashtags
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setProjects(prev => [project, ...prev]);
    addNotification('Content saved to projects', 'success');
  };

  const handleSaveBrandConfig = (config: BrandConfiguration) => {
    brandService.saveBrandConfiguration(config);
    setBrandConfig(config);
    addNotification('Brand configuration saved', 'success');
  };

  const handleGenerateVideo = async () => {
    if (!newsWorkflow?.selectedNewsItem) {
      addNotification('Please select a news article first', 'error');
      return;
    }

    if (!selectedProductImage) {
      addNotification('Please select a product image for video generation', 'error');
      return;
    }

    if (!falAiService.isAvailable()) {
      addNotification('Video generation is not available. Please configure FAL API key.', 'error');
      return;
    }

    setIsGeneratingVideo(true);
    try {
      console.log('🎬 Starting video generation with comprehensive service...');

      // Use the comprehensive content generation service
      const result = await contentGenerationService.generateContentPackage({
        newsItem: newsWorkflow.selectedNewsItem,
        mediaType: 'video',
        targetPlatforms: ['instagram', 'tiktok', 'youtube'], // Generate for multiple platforms
        generateVideos: true,
        productImageUrl: selectedProductImage,
        brandOverride: brandConfig || undefined
      });

      if (result.errors.length > 0) {
        console.warn('Video generation completed with some errors:', result.errors);
        result.errors.forEach(error => addNotification(error, 'error'));
      }

      if (result.videoContent.length > 0) {
        setGeneratedVideoContent(result.videoContent);
        addNotification(`Generated ${result.videoContent.length} video(s) successfully!`, 'success');

        // Add composite images to library if available
        result.videoContent.forEach(video => {
          if (video.compositeImageUrl) {
            addImageToLibrary(video.compositeImageUrl, `Composite for ${video.title}`);
          }
        });
      } else {
        addNotification('No videos were generated. Please check the error messages.', 'error');
      }

    } catch (error) {
      console.error('Video generation failed:', error);
      addNotification(`Video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleProductImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setSelectedProductImage(dataUrl);
      addNotification('Product image selected for video generation', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Mock templates data
  const templates: ContentTemplate[] = [
    {
      id: '1',
      name: 'Instagram Post',
      description: 'Square format perfect for Instagram feed posts',
      platform: 'instagram',
      type: 'post',
      dimensions: { width: 1080, height: 1080 }
    },
    {
      id: '2',
      name: 'Instagram Story',
      description: 'Vertical format for Instagram stories',
      platform: 'instagram',
      type: 'story',
      dimensions: { width: 1080, height: 1920 }
    },
    {
      id: '3',
      name: 'Facebook Post',
      description: 'Horizontal format optimized for Facebook engagement',
      platform: 'facebook',
      type: 'post',
      dimensions: { width: 1200, height: 630 }
    },
    {
      id: '4',
      name: 'Twitter Header',
      description: 'Banner format for Twitter profile headers',
      platform: 'twitter',
      type: 'post',
      dimensions: { width: 1500, height: 500 }
    },
    {
      id: '5',
      name: 'LinkedIn Post',
      description: 'Professional format for LinkedIn content',
      platform: 'linkedin',
      type: 'post',
      dimensions: { width: 1200, height: 627 }
    },
    {
      id: '6',
      name: 'YouTube Thumbnail',
      description: 'Eye-catching thumbnails for YouTube videos',
      platform: 'youtube',
      type: 'post',
      dimensions: { width: 1280, height: 720 }
    }
  ];

  const platformColors = {
    instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
    facebook: 'bg-blue-600',
    twitter: 'bg-sky-500',
    linkedin: 'bg-blue-700',
    youtube: 'bg-red-600',
    tiktok: 'bg-black'
  };

  const platformIcons = {
    instagram: 'camera',
    facebook: 'user',
    twitter: 'message',
    linkedin: 'briefcase',
    youtube: 'play',
    tiktok: 'music'
  } as const;

  const handleCreateProject = (template: ContentTemplate) => {
    const newProject: ContentProject = {
      id: crypto.randomUUID(),
      name: `${template.name} Project`,
      description: `New ${template.platform} ${template.type} project`,
      template,
      content: {
        text: '',
        images: [],
        hashtags: []
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setProjects(prev => [newProject, ...prev]);
    addNotification(`Created new ${template.name} project`);
  };

  const handleUseTemplate = (template: ContentTemplate) => {
    setSelectedTemplate(template);
    // In a real implementation, this could navigate to a content editor
    addNotification(`Selected ${template.name} template. Integration with image tools coming soon!`);
  };

  const handleBackToNews = () => {
    if (onWorkflowReset) {
      onWorkflowReset();
    }
    onNavigate('newsHub');
  };

  // If we're in media type selection step, show the MediaTypeSelector
  if (newsWorkflow?.step === 'media_type_selection' && newsWorkflow.selectedNewsItem && onMediaTypeSelected) {
    return (
      <MediaTypeSelector
        selectedNewsItem={newsWorkflow.selectedNewsItem}
        onSelectMediaType={onMediaTypeSelected}
        onBack={handleBackToNews}
      />
    );
  }

  return (
    <div className="flex-grow flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {newsWorkflow?.selectedNewsItem && (
              <button
                onClick={handleBackToNews}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon icon="arrowLeft" className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Content Creator</h1>
              {newsWorkflow?.selectedNewsItem && (
                <p className="text-gray-600">Creating content from news article</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onNavigate('imageGenerator')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Icon icon="image" className="w-4 h-4" />
              Generate Images
            </button>
            <button
              onClick={() => onNavigate('library')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Icon icon="colorPalette" className="w-4 h-4" />
              Asset Library
            </button>
          </div>
        </div>

        {/* News Context Preview */}
        {newsWorkflow?.selectedNewsItem && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {newsWorkflow.selectedNewsItem.source.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">{newsWorkflow.selectedNewsItem.source}</span>
                  <span className="text-sm text-blue-600">Selected News Article</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{newsWorkflow.selectedNewsItem.title}</h3>
                <p className="text-gray-600 text-sm mb-2">{newsWorkflow.selectedNewsItem.description}</p>
                <div className="flex items-center gap-2">
                  {newsWorkflow.selectedNewsItem.hashtags.map((hashtag, index) => (
                    <span key={index} className="text-blue-600 text-xs">
                      {hashtag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Media Type</div>
                <div className="font-medium text-gray-900 capitalize">
                  {newsWorkflow.mediaType || 'Not selected'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Brand Status */}
        <div className="mb-4">
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-3">
              {brandConfig ? (
                <>
                  <Icon icon="checkCircle" className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-700">
                    Brand: {brandConfig.brandName} ({brandConfig.brandVoice} voice)
                  </span>
                </>
              ) : (
                <>
                  <Icon icon="alertTriangle" className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm text-gray-700">No brand configuration - content will be generic</span>
                </>
              )}
            </div>
            <button
              onClick={() => setShowBrandModal(true)}
              className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {brandConfig ? 'Edit Brand' : 'Set Brand'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('generate')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'generate'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Generate Content
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'projects'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Projects ({projects.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'generate' ? (
          <div className="space-y-8">
            {/* Content Source Selection */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Content Source</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setContentGenerationMode('news')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    contentGenerationMode === 'news'
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Icon icon="news" className="w-6 h-6 text-indigo-600" />
                    <span className="font-semibold text-gray-900">From News Article</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {newsWorkflow?.selectedNewsItem
                      ? `Generate content from: ${newsWorkflow.selectedNewsItem.title.substring(0, 50)}...`
                      : 'Select a news article from NewsHub to generate content'
                    }
                  </p>
                </button>

                <button
                  onClick={() => setContentGenerationMode('general')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    contentGenerationMode === 'general'
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Icon icon="edit" className="w-6 h-6 text-indigo-600" />
                    <span className="font-semibold text-gray-900">Custom Topic</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Create content about any topic you choose
                  </p>
                </button>
              </div>

              {contentGenerationMode === 'general' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter your topic or idea
                  </label>
                  <textarea
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="Describe the topic you want to create content about..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>

            {/* Generate Button */}
            <div className="flex justify-center">
              <button
                onClick={handleGenerateContent}
                disabled={isGenerating || (contentGenerationMode === 'general' && !customTopic.trim()) || (contentGenerationMode === 'news' && !newsWorkflow?.selectedNewsItem)}
                className={`px-8 py-3 rounded-lg font-semibold transition-colors flex items-center gap-3 ${
                  isGenerating || (contentGenerationMode === 'general' && !customTopic.trim()) || (contentGenerationMode === 'news' && !newsWorkflow?.selectedNewsItem)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg'
                }`}
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                    Generating Content...
                  </>
                ) : (
                  <>
                    <Icon icon="bolt" className="w-5 h-5" />
                    Generate Multi-Platform Content
                  </>
                )}
              </button>
            </div>

            {/* Video Generation Section */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Icon icon="play" className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">AI Video Generation</h3>
                  <p className="text-sm text-gray-600">Create engaging videos combining news content with your product</p>
                </div>
                {!falAiService.isAvailable() && (
                  <div className="ml-auto">
                    <div className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                      Configure FAL API Key
                    </div>
                  </div>
                )}
              </div>

              {newsWorkflow?.selectedNewsItem && (
                <div className="space-y-4">
                  {/* Product Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Image (Required for video generation)
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <Icon icon="image" className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-700">Select Product Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProductImageUpload}
                          className="hidden"
                        />
                      </label>
                      {selectedProductImage && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <Icon icon="check" className="w-4 h-4" />
                          Product image selected
                        </div>
                      )}
                    </div>
                    {selectedProductImage && (
                      <div className="mt-3">
                        <img
                          src={selectedProductImage}
                          alt="Selected product"
                          className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                        />
                      </div>
                    )}
                  </div>

                  {/* Video Generation Button */}
                  <div className="flex justify-center">
                    <button
                      onClick={handleGenerateVideo}
                      disabled={isGeneratingVideo || !selectedProductImage || !falAiService.isAvailable()}
                      className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-3 ${
                        isGeneratingVideo || !selectedProductImage || !falAiService.isAvailable()
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg'
                      }`}
                    >
                      {isGeneratingVideo ? (
                        <>
                          <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                          Generating Videos...
                        </>
                      ) : (
                        <>
                          <Icon icon="play" className="w-5 h-5" />
                          Generate AI Videos
                        </>
                      )}
                    </button>
                  </div>

                  {/* Video Generation Info */}
                  <div className="bg-white/70 rounded-lg p-4">
                    <div className="text-sm text-gray-600">
                      <strong>What happens next:</strong>
                      <ol className="list-decimal list-inside mt-2 space-y-1">
                        <li>Your product image will be combined with news context</li>
                        <li>AI will create a composite image optimized for social media</li>
                        <li>The composite image will be animated into engaging videos</li>
                        <li>Videos will be optimized for Instagram, TikTok, and YouTube</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Generated Video Content Display */}
            {generatedVideoContent.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated Videos</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {generatedVideoContent.map((video) => (
                    <div key={video.id} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                        {video.videoUrl ? (
                          <video
                            src={video.videoUrl}
                            controls
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Icon icon="play" className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-900 text-sm">{video.title}</h4>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="capitalize">{video.platform}</span>
                          <span>{video.duration}</span>
                          <span>{video.aspectRatio}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            {video.estimatedEngagement}% engagement
                          </div>
                          {video.hasAudio && (
                            <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              With Audio
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => video.videoUrl && window.open(video.videoUrl, '_blank')}
                            className="flex-1 px-3 py-2 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            Download Video
                          </button>
                          {video.compositeImageUrl && (
                            <button
                              onClick={() => addImageToLibrary(video.compositeImageUrl!, `Composite for ${video.title}`)}
                              className="px-3 py-2 bg-gray-600 text-white text-xs rounded-lg hover:bg-gray-700 transition-colors"
                            >
                              Save Image
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generated Content Display */}
            {generatedContent.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated Content</h3>
                <GeneratedContentViewer
                  content={generatedContent}
                  onSaveToLibrary={handleSaveContent}
                  isGenerating={isGenerating}
                />
              </div>
            )}

            {/* Help Text */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Icon icon="info" className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Content & Video Generation Tips</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Social media content optimized for Instagram, LinkedIn, Twitter, and Facebook</li>
                    <li>• AI video generation combines news context with your product images</li>
                    <li>• Videos are created in platform-specific aspect ratios (vertical for TikTok/Instagram, landscape for YouTube)</li>
                    <li>• Brand voice and messaging applied if configured</li>
                    <li>• Generated content includes platform-specific hashtags and formatting</li>
                    <li>• Save generated content and videos to projects for further editing</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Your Projects</h2>
              <p className="text-gray-600">Manage your content creation projects and drafts.</p>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-16">
                <Icon icon="edit" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                <p className="text-gray-500 mb-6">Generate your first content to create a project.</p>
                <button
                  onClick={() => setActiveTab('generate')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Generate Content
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-8 h-8 rounded flex items-center justify-center text-white text-sm ${platformColors[project.template.platform]}`}>
                        <Icon icon={platformIcons[project.template.platform] || 'image'} className="w-4 h-4" />
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="font-medium text-gray-900 mb-2">{project.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{project.description}</p>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 capitalize">
                        {project.template.platform} {project.template.type}
                      </span>
                      <button className="text-indigo-600 hover:text-indigo-800 text-sm">
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Brand Configuration Modal */}
      {showBrandModal && (
        <BrandConfigurationModal
          isOpen={showBrandModal}
          onClose={() => setShowBrandModal(false)}
          onSave={handleSaveBrandConfig}
          initialConfig={brandConfig}
        />
      )}
    </div>
  );
};

export default ContentCreator;