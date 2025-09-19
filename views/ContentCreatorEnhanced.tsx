import React, { useState, useEffect } from 'react';
import {
  ContentTemplate,
  ContentProject,
  View,
  NewsContentWorkflow,
  MediaType,
  SocialPlatform,
  GeneratedContent,
  EmailContent,
  VideoContent,
  BrandConfiguration
} from '../types';
import {
  contentGenerationService,
  ContentGenerationRequest
} from '../services/contentGenerationService';
import { brandService } from '../services/brandService';
import { articleContentService, ArticleContent } from '../services/articleContentService';
import { falAiService } from '../services/falAiService';
import Icon from '../components/Icon';
import MediaTypeSelector from '../components/MediaTypeSelector';
import GeneratedContentViewer from '../components/GeneratedContentViewer';
import ArticleContentDisplay from '../components/ArticleContentDisplay';
import BrandConfigurationModal from '../components/BrandConfigurationModal';

interface ContentCreatorEnhancedProps {
  onNavigate: (view: View) => void;
  addImageToLibrary: (imageUrl: string, name?: string) => void;
  addNotification: (message: string, type?: 'success' | 'error') => void;
  newsWorkflow?: NewsContentWorkflow;
  onMediaTypeSelected?: (mediaType: MediaType) => void;
  onWorkflowReset?: () => void;
}

const ContentCreatorEnhanced: React.FC<ContentCreatorEnhancedProps> = ({
  onNavigate,
  addImageToLibrary,
  addNotification,
  newsWorkflow,
  onMediaTypeSelected,
  onWorkflowReset
}) => {
  const [activeTab, setActiveTab] = useState<'generator' | 'projects' | 'library'>('generator');
  const [projects, setProjects] = useState<ContentProject[]>([]);

  // Content generation state
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>(['instagram', 'twitter', 'linkedin']);
  const [selectedEmailTypes, setSelectedEmailTypes] = useState<('newsletter' | 'promotional' | 'transactional' | 'announcement')[]>([]);
  const [generateImages, setGenerateImages] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  // Generation results
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [generatedEmails, setGeneratedEmails] = useState<EmailContent[]>([]);
  const [generatedVideos, setGeneratedVideos] = useState<VideoContent[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // Video generation state
  const [selectedProductImage, setSelectedProductImage] = useState<string | null>(null);
  const [generateVideos, setGenerateVideos] = useState(false);
  const [showCompositeImageOnly, setShowCompositeImageOnly] = useState(false);

  // Brand configuration
  const [brandConfig, setBrandConfig] = useState<BrandConfiguration | null>(null);
  const [showBrandModal, setShowBrandModal] = useState(false);

  // Article content
  const [articleContent, setArticleContent] = useState<ArticleContent | null>(null);
  const [isFetchingArticle, setIsFetchingArticle] = useState(false);

  useEffect(() => {
    // Load brand configuration
    const config = brandService.getBrandConfiguration();
    setBrandConfig(config);
  }, []);

  useEffect(() => {
    // Auto-fetch article content if we have a news item but no content
    if (newsWorkflow?.selectedNewsItem && !articleContent && !isFetchingArticle) {
      handleFetchArticleContent();
    }
  }, [newsWorkflow?.selectedNewsItem]);

  const platformOptions: { platform: SocialPlatform; name: string; icon: string; color: string }[] = [
    { platform: 'instagram', name: 'Instagram', icon: 'camera', color: 'from-purple-500 to-pink-500' },
    { platform: 'facebook', name: 'Facebook', icon: 'facebook', color: 'from-blue-600 to-blue-700' },
    { platform: 'twitter', name: 'Twitter', icon: 'twitter', color: 'from-sky-400 to-sky-600' },
    { platform: 'linkedin', name: 'LinkedIn', icon: 'briefcase', color: 'from-blue-700 to-blue-800' },
    { platform: 'youtube', name: 'YouTube', icon: 'play', color: 'from-red-600 to-red-700' },
    { platform: 'tiktok', name: 'TikTok', icon: 'music', color: 'from-gray-900 to-black' },
    { platform: 'threads', name: 'Threads', icon: 'message', color: 'from-gray-800 to-gray-900' }
  ];

  const emailTypeOptions = [
    { type: 'newsletter' as const, name: 'Newsletter', description: 'Informative updates for subscribers' },
    { type: 'promotional' as const, name: 'Promotional', description: 'Marketing and sales content' },
    { type: 'announcement' as const, name: 'Announcement', description: 'Important news and updates' },
    { type: 'transactional' as const, name: 'Transactional', description: 'Service-related communications' }
  ];

  const handleFetchArticleContent = async () => {
    if (!newsWorkflow?.selectedNewsItem || isFetchingArticle) return;

    setIsFetchingArticle(true);
    try {
      const content = await articleContentService.fetchArticleContent(newsWorkflow.selectedNewsItem);
      setArticleContent(content);

      if (content.error) {
        addNotification?.('Article content partially fetched. Using available summary.', 'success');
      } else {
        addNotification?.('Article content fetched successfully!', 'success');
      }
    } catch (error) {
      addNotification?.('Failed to fetch article content', 'error');
      console.error('Article fetch error:', error);
    } finally {
      setIsFetchingArticle(false);
    }
  };

  const handleGenerateContent = async () => {
    if (!newsWorkflow?.selectedNewsItem || isGenerating) return;

    if (selectedPlatforms.length === 0 && selectedEmailTypes.length === 0) {
      addNotification?.('Please select at least one platform or email type', 'error');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      const request: ContentGenerationRequest = {
        newsItem: newsWorkflow.selectedNewsItem,
        articleContent: articleContent || undefined,
        mediaType: newsWorkflow.mediaType || 'mixed',
        targetPlatforms: selectedPlatforms,
        emailTypes: selectedEmailTypes.length > 0 ? selectedEmailTypes : undefined,
        generateImages,
        brandOverride: brandConfig || undefined,
        customPrompt: customPrompt.trim() || undefined
      };

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const result = await contentGenerationService.generateContentPackage(request);

      clearInterval(progressInterval);
      setGenerationProgress(100);

      // Update state with results
      setGeneratedContent(result.socialContent);
      setGeneratedEmails(result.emailContent);

      // Add generated images to library
      Object.entries(result.images).forEach(([platform, imageUrl]) => {
        addImageToLibrary?.(imageUrl, `${platform}_${newsWorkflow.selectedNewsItem?.title.substring(0, 30)}`);
      });

      // Show success notification
      const totalGenerated = result.socialContent.length + result.emailContent.length;
      addNotification?.(
        `Successfully generated ${totalGenerated} pieces of content in ${(result.processingTime / 1000).toFixed(1)}s`,
        'success'
      );

      // Show any errors
      if (result.errors.length > 0) {
        result.errors.forEach(error => addNotification?.(error, 'error'));
      }

    } catch (error) {
      addNotification?.(`Content generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      console.error('Content generation error:', error);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const handlePlatformToggle = (platform: SocialPlatform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleEmailTypeToggle = (emailType: typeof emailTypeOptions[0]['type']) => {
    setSelectedEmailTypes(prev =>
      prev.includes(emailType)
        ? prev.filter(t => t !== emailType)
        : [...prev, emailType]
    );
  };

  const handleSaveBrandConfig = async (config: BrandConfiguration) => {
    try {
      await brandService.saveBrandConfiguration(config);
      setBrandConfig(config);
      addNotification?.('Brand configuration saved successfully!', 'success');
    } catch (error) {
      addNotification?.('Failed to save brand configuration', 'error');
      throw error; // Re-throw to prevent modal from closing
    }
  };

  const handleBackToNews = () => {
    if (onWorkflowReset) {
      onWorkflowReset();
    }
    onNavigate('newsHub');
  };

  const handleProductImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setSelectedProductImage(dataUrl);
      addNotification?.('Product image selected for content generation', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateCompositeImage = async () => {
    if (!newsWorkflow?.selectedNewsItem) {
      addNotification?.('Please select a news article first', 'error');
      return;
    }

    if (!selectedProductImage) {
      addNotification?.('Please select a product image', 'error');
      return;
    }

    if (!falAiService.isAvailable()) {
      addNotification?.('FAL AI service not available. Please configure VITE_FAL_KEY.', 'error');
      return;
    }

    setIsGeneratingVideo(true);
    try {
      console.log('🖼️ Generating composite image...');

      const brandContext = brandConfig ? {
        brandName: brandConfig.brandName,
        brandColors: brandConfig.primaryColor ? [brandConfig.primaryColor] : [],
        brandStyle: brandConfig.contentStyle || 'modern and professional'
      } : undefined;

      const compositeImageUrl = await falAiService.generateCompositeImage({
        productImageUrl: selectedProductImage,
        newsTitle: newsWorkflow.selectedNewsItem.title,
        newsDescription: articleContent?.summary || newsWorkflow.selectedNewsItem.description,
        keyPoints: articleContent?.keyPoints || newsWorkflow.selectedNewsItem.keyPoints || [],
        brandContext
      });

      // Add to image library
      addImageToLibrary?.(compositeImageUrl, `Composite: ${newsWorkflow.selectedNewsItem.title.substring(0, 30)}...`);

      addNotification?.('Composite image generated successfully!', 'success');
      console.log('✅ Composite image generated:', compositeImageUrl);

    } catch (error) {
      console.error('❌ Composite image generation failed:', error);
      addNotification?.(`Failed to generate composite image: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!newsWorkflow?.selectedNewsItem) {
      addNotification?.('Please select a news article first', 'error');
      return;
    }

    if (!selectedProductImage) {
      addNotification?.('Please select a product image for video generation', 'error');
      return;
    }

    if (!falAiService.isAvailable()) {
      addNotification?.('Video generation not available. Please configure VITE_FAL_KEY.', 'error');
      return;
    }

    setIsGeneratingVideo(true);
    try {
      console.log('🎬 Starting comprehensive video generation...');

      // Use the comprehensive content generation service
      const result = await contentGenerationService.generateContentPackage({
        newsItem: newsWorkflow.selectedNewsItem,
        articleContent: articleContent || undefined,
        mediaType: 'video',
        targetPlatforms: selectedPlatforms,
        generateVideos: true,
        productImageUrl: selectedProductImage,
        brandOverride: brandConfig || undefined
      });

      if (result.errors.length > 0) {
        console.warn('Video generation completed with errors:', result.errors);
        result.errors.forEach(error => addNotification?.(error, 'error'));
      }

      if (result.videoContent.length > 0) {
        setGeneratedVideos(result.videoContent);
        addNotification?.(`Generated ${result.videoContent.length} video(s) successfully!`, 'success');

        // Add composite images to library
        result.videoContent.forEach(video => {
          if (video.compositeImageUrl) {
            addImageToLibrary?.(video.compositeImageUrl, `Composite for ${video.title}`);
          }
        });
      } else {
        addNotification?.('No videos were generated. Please check the error messages.', 'error');
      }

    } catch (error) {
      console.error('❌ Video generation failed:', error);
      addNotification?.(`Video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsGeneratingVideo(false);
    }
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
              <h1 className="text-2xl font-bold text-gray-900">AI Content Generator</h1>
              {newsWorkflow?.selectedNewsItem && (
                <p className="text-gray-600">Creating content from news article</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBrandModal(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                brandConfig
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              }`}
            >
              <Icon icon="star" className="w-4 h-4" />
              {brandConfig ? 'Brand Configured' : 'Setup Brand'}
            </button>
            <button
              onClick={() => onNavigate('imageGenerator')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Icon icon="image" className="w-4 h-4" />
              Image Generator
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
                  {!articleContent && !isFetchingArticle && (
                    <button
                      onClick={handleFetchArticleContent}
                      className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                    >
                      Fetch Full Content
                    </button>
                  )}
                  {isFetchingArticle && (
                    <div className="text-xs text-blue-600 flex items-center gap-1">
                      <div className="animate-spin w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                      Fetching...
                    </div>
                  )}
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
                  {newsWorkflow.mediaType || 'Mixed'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('generator')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'generator'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Content Generator
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
          <button
            onClick={() => setActiveTab('library')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'library'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Content Library
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'generator' && (
          <div className="p-6 space-y-6">
            {/* Article Content Display */}
            {articleContent && (
              <ArticleContentDisplay
                articleContent={articleContent}
                className="mb-6"
              />
            )}

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Generation Settings */}
              <div className="space-y-6">
                {/* Product Image Upload for AI Content Generation */}
                {newsWorkflow?.selectedNewsItem && (
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
                        <Icon icon="image" className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">AI Content Generation</h3>
                        <p className="text-sm text-gray-600">Upload your product image for AI-powered content creation</p>
                      </div>
                      {!falAiService.isAvailable() && (
                        <div className="ml-auto">
                          <div className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                            Configure FAL API Key
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Product Image Upload */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Product Image (Required for AI video and composite image generation)
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
                              <Icon icon="checkCircle" className="w-4 h-4" />
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

                      {/* AI Generation Options */}
                      {selectedProductImage && (
                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={handleGenerateCompositeImage}
                            disabled={isGeneratingVideo || !falAiService.isAvailable()}
                            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                              isGeneratingVideo || !falAiService.isAvailable()
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'
                            }`}
                          >
                            {isGeneratingVideo ? (
                              <>
                                <div className="animate-spin w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                                Generating...
                              </>
                            ) : (
                              <>
                                <Icon icon="image" className="w-4 h-4" />
                                Generate Composite Image
                              </>
                            )}
                          </button>

                          <button
                            onClick={handleGenerateVideo}
                            disabled={isGeneratingVideo || !falAiService.isAvailable() || selectedPlatforms.length === 0}
                            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                              isGeneratingVideo || !falAiService.isAvailable() || selectedPlatforms.length === 0
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700'
                            }`}
                          >
                            {isGeneratingVideo ? (
                              <>
                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                Generating Videos...
                              </>
                            ) : (
                              <>
                                <Icon icon="play" className="w-4 h-4" />
                                Generate AI Videos
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Info Text */}
                      <div className="bg-white/70 rounded-lg p-3">
                        <div className="text-sm text-gray-600">
                          <strong>AI Content Features:</strong>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            <li><strong>Composite Image:</strong> Blends product with news context using AI</li>
                            <li><strong>AI Videos:</strong> Creates platform-specific animated videos</li>
                            <li>Works with selected platforms (choose platforms below)</li>
                            <li>Automatically saves generated content to your library</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Social Media Platforms */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Media Platforms</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {platformOptions.map((option) => (
                      <button
                        key={option.platform}
                        onClick={() => handlePlatformToggle(option.platform)}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                          selectedPlatforms.includes(option.platform)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-8 h-8 bg-gradient-to-r ${option.color} rounded-lg flex items-center justify-center`}>
                          <Icon icon={option.icon as any} className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-medium text-gray-900">{option.name}</span>
                        {selectedPlatforms.includes(option.platform) && (
                          <Icon icon="checkCircle" className="w-5 h-5 text-blue-500 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Email Types */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Content</h3>
                  <div className="space-y-3">
                    {emailTypeOptions.map((option) => (
                      <button
                        key={option.type}
                        onClick={() => handleEmailTypeToggle(option.type)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                          selectedEmailTypes.includes(option.type)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon icon="mail" className="w-5 h-5 text-gray-600" />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{option.name}</div>
                          <div className="text-sm text-gray-600">{option.description}</div>
                        </div>
                        {selectedEmailTypes.includes(option.type) && (
                          <Icon icon="checkCircle" className="w-5 h-5 text-blue-500" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional Options */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Options</h3>
                  <div className="space-y-4">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={generateImages}
                        onChange={(e) => setGenerateImages(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900">Generate Images</span>
                        <p className="text-sm text-gray-600">Create platform-optimized images using AI</p>
                      </div>
                    </label>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Custom Instructions (Optional)
                      </label>
                      <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Add specific requirements or style preferences..."
                      />
                    </div>
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerateContent}
                  disabled={isGenerating || !newsWorkflow?.selectedNewsItem}
                  className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-semibold text-lg transition-colors ${
                    isGenerating || !newsWorkflow?.selectedNewsItem
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                      Generating Content... {generationProgress}%
                    </>
                  ) : (
                    <>
                      <Icon icon="zap" className="w-5 h-5" />
                      Generate AI Content
                    </>
                  )}
                </button>
              </div>

              {/* Generated Content */}
              <div>
                <GeneratedContentViewer
                  content={[...generatedContent, ...generatedEmails]}
                  isGenerating={isGenerating}
                  onCopyContent={(content) => {
                    navigator.clipboard.writeText(content);
                    addNotification?.('Content copied to clipboard!', 'success');
                  }}
                  onSaveToLibrary={(content) => {
                    // Implementation for saving to library
                    addNotification?.('Content saved to library!', 'success');
                  }}
                />
              </div>

              {/* Generated Videos */}
              {generatedVideos.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Generated Videos</h3>
                    <div className="text-sm text-gray-600">
                      {generatedVideos.length} video{generatedVideos.length !== 1 ? 's' : ''} generated
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {generatedVideos.map((video) => (
                      <div key={video.id} className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 bg-gradient-to-r ${
                              video.platform === 'instagram' ? 'from-purple-500 to-pink-500' :
                              video.platform === 'youtube' ? 'from-red-600 to-red-700' :
                              video.platform === 'tiktok' ? 'from-gray-900 to-black' :
                              'from-blue-600 to-blue-700'
                            } rounded-lg flex items-center justify-center`}>
                              <Icon icon={
                                video.platform === 'instagram' ? 'camera' :
                                video.platform === 'youtube' ? 'play' :
                                video.platform === 'tiktok' ? 'music' :
                                'play'
                              } className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 capitalize">
                                {video.platform || 'Video'}
                              </div>
                              <div className="text-sm text-gray-600">
                                {video.aspectRatio} • {video.duration} • {video.resolution}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = video.videoUrl;
                                link.download = `${video.title || 'video'}.mp4`;
                                link.click();
                              }}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Download video"
                            >
                              <Icon icon="download" className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (video.compositeImageUrl) {
                                  addImageToLibrary?.(video.compositeImageUrl, `${video.title} - Composite`);
                                  addNotification?.('Composite image added to library!', 'success');
                                }
                              }}
                              disabled={!video.compositeImageUrl}
                              className={`p-2 rounded-lg transition-colors ${
                                video.compositeImageUrl
                                  ? 'text-indigo-600 hover:bg-indigo-100'
                                  : 'text-gray-400 cursor-not-allowed'
                              }`}
                              title="Save composite image to library"
                            >
                              <Icon icon="image" className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Video Preview */}
                        <div className="mb-4">
                          <video
                            controls
                            className="w-full rounded-lg bg-black"
                            style={{ maxHeight: '300px' }}
                            poster={video.thumbnailUrl || video.compositeImageUrl}
                          >
                            <source src={video.videoUrl} type="video/mp4" />
                            Your browser does not support the video tag.
                          </video>
                        </div>

                        {/* Video Content */}
                        <div className="space-y-3">
                          {video.title && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                              <div className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3">
                                {video.title}
                              </div>
                            </div>
                          )}

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                            <div className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3">
                              {video.content}
                            </div>
                          </div>

                          {video.hashtags.length > 0 && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Hashtags</label>
                              <div className="flex flex-wrap gap-2">
                                {video.hashtags.map((tag, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-3 border-t border-gray-100">
                            <button
                              onClick={() => {
                                const textToCopy = `${video.title ? video.title + '\n\n' : ''}${video.content}${
                                  video.hashtags.length > 0 ? '\n\n' + video.hashtags.map(tag => `#${tag}`).join(' ') : ''
                                }`;
                                navigator.clipboard.writeText(textToCopy);
                                addNotification?.('Video content copied to clipboard!', 'success');
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <Icon icon="copy" className="w-4 h-4" />
                              Copy Content
                            </button>
                            <button
                              onClick={() => {
                                // Open video in new tab for sharing
                                window.open(video.videoUrl, '_blank');
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                            >
                              <Icon icon="externalLink" className="w-4 h-4" />
                              Open Video
                            </button>
                          </div>

                          {/* Video Metadata */}
                          <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                            Generated: {new Date(video.generatedAt).toLocaleString()}
                            {video.processingTime && ` • Processing: ${(video.processingTime / 1000).toFixed(1)}s`}
                            {video.fileSize && ` • Size: ${(video.fileSize / (1024 * 1024)).toFixed(1)}MB`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="p-6">
            <div className="text-center py-16">
              <Icon icon="edit" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-500 mb-6">Create your first content project to get started.</p>
              <button
                onClick={() => setActiveTab('generator')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Start Generating Content
              </button>
            </div>
          </div>
        )}

        {activeTab === 'library' && (
          <div className="p-6">
            <div className="text-center py-16">
              <Icon icon="bookmark" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Content library coming soon</h3>
              <p className="text-gray-500">Save and organize your generated content here.</p>
            </div>
          </div>
        )}
      </div>

      {/* Brand Configuration Modal */}
      <BrandConfigurationModal
        isOpen={showBrandModal}
        onClose={() => setShowBrandModal(false)}
        onSave={handleSaveBrandConfig}
        initialConfig={brandConfig || undefined}
      />
    </div>
  );
};

export default ContentCreatorEnhanced;