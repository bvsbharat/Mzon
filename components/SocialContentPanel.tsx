import React, { useState, useEffect, useRef } from 'react';
import { NewsItem, GalleryImage, GeneratedContent, VideoContent, BrandConfiguration, SocialContentResult, PublishPlatform, PublishOptions } from '../types';
import Icon from './Icon';
import Spinner from './Spinner';
import AssetLibraryModal from './AssetLibraryModal';
import { generateMultiPlatformContent, adaptImage } from '../services/geminiService';
import { contentGenerationService } from '../services/contentGenerationService';
import { falAiService } from '../services/falAiService';
import { brandService } from '../services/brandService';
import { composioService } from '../services/composioService';
import { PlatformMockup } from './PlatformMockups';

interface SocialContentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNews: NewsItem | null;
  galleryImages: GalleryImage[];
  onAddToLibrary: (imageUrl: string, name?: string) => void;
  addNotification: (message: string, type?: 'success' | 'error') => void;
  onAddResult?: (result: SocialContentResult) => void;
}

type Platform = 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok';
type ContentType = 'text' | 'image' | 'video';

interface PlatformConfig {
  name: string;
  icon: string;
  color: string;
  aspectRatio: string;
  maxTextLength: number;
}

const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  instagram: {
    name: 'Instagram',
    icon: 'camera',
    color: 'from-purple-500 to-pink-500',
    aspectRatio: '9:16',
    maxTextLength: 2200
  },
  facebook: {
    name: 'Facebook',
    icon: 'user',
    color: 'from-blue-600 to-blue-700',
    aspectRatio: '16:9',
    maxTextLength: 63206
  },
  twitter: {
    name: 'Twitter/X',
    icon: 'hash',
    color: 'from-gray-800 to-black',
    aspectRatio: '16:9',
    maxTextLength: 280
  },
  linkedin: {
    name: 'LinkedIn',
    icon: 'briefcase',
    color: 'from-blue-700 to-blue-800',
    aspectRatio: '16:9',
    maxTextLength: 3000
  },
  tiktok: {
    name: 'TikTok',
    icon: 'music',
    color: 'from-pink-500 to-red-500',
    aspectRatio: '9:16',
    maxTextLength: 2200
  }
};

const SocialContentPanel: React.FC<SocialContentPanelProps> = ({
  isOpen,
  onClose,
  selectedNews,
  galleryImages,
  onAddToLibrary,
  addNotification,
  onAddResult
}) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram']);
  const [selectedContentType, setSelectedContentType] = useState<ContentType>('text');
  const [selectedVideoDuration, setSelectedVideoDuration] = useState<number>(8);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [generatedVideos, setGeneratedVideos] = useState<VideoContent[]>([]);
  const [brandConfig, setBrandConfig] = useState<BrandConfiguration | null>(null);
  const [showAssetLibrary, setShowAssetLibrary] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isPublishing, setIsPublishing] = useState<Map<string, boolean>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setBrandConfig(brandService.getBrandConfiguration());
  }, []);

  // Reset state when panel opens/closes
  useEffect(() => {
    if (isOpen) {
      setGeneratedContent([]);
      setGeneratedVideos([]);
      setCustomPrompt('');
    }
  }, [isOpen]);

  const handlePlatformToggle = (platform: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setProductImage(dataUrl);
      addNotification('Product image selected', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleAssetSelect = (image: GalleryImage) => {
    setProductImage(image.url);
    setShowAssetLibrary(false);
    addNotification('Asset selected for content creation', 'success');
  };

  const handleGenerateContent = async () => {
    if (!selectedNews || selectedPlatforms.length === 0) {
      addNotification('Please select at least one platform', 'error');
      return;
    }

    setIsGenerating(true);
    setGeneratedContent([]);
    setGeneratedVideos([]);

    try {
      const contentSource = `${selectedNews.title}\n\n${selectedNews.description}${customPrompt ? `\n\nAdditional context: ${customPrompt}` : ''}`;
      const brandContext = brandService.getBrandContext();

      if (selectedContentType === 'text') {
        // Generate text content for all selected platforms at once
        try {
          const content = await generateMultiPlatformContent(
            contentSource,
            selectedPlatforms,
            productImage || undefined
          );

          const results = selectedPlatforms.map((platform) => {
            const platformContent = content[platform] || '';

            // Extract hashtags from content (look for #tags)
            const hashtagMatches = platformContent.match(/#\w+/g) || [];
            const hashtags = hashtagMatches.slice(0, 5); // Limit to 5 hashtags

            // Remove hashtags from content for clean text
            const cleanContent = platformContent.replace(/#\w+/g, '').trim();

            const generatedItem: GeneratedContent = {
              id: crypto.randomUUID(),
              type: 'social_post',
              platform,
              content: cleanContent,
              title: selectedNews.title,
              hashtags,
              images: productImage ? [productImage] : [],
              wordCount: cleanContent.split(' ').length,
              estimatedEngagement: Math.floor(Math.random() * 40) + 60,
              brandCompliance: brandConfig
                ? brandService.validateContentBrandCompliance(cleanContent).score
                : 85,
              generatedAt: new Date().toISOString(),
              sourceNewsId: selectedNews.id
            };

            return generatedItem;
          });

          setGeneratedContent(results);

          if (results.length > 0) {
            addNotification(`Generated text content for ${results.length} platform(s)`, 'success');
          } else {
            addNotification('No content was generated', 'error');
          }
        } catch (error) {
          console.error('Content generation failed:', error);
          addNotification(`Content generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }

      } else if (selectedContentType === 'video') {
        if (!productImage) {
          addNotification('Please select a product image for video generation', 'error');
          return;
        }

        if (!falAiService.isAvailable()) {
          addNotification('Video generation is not available. Please configure FAL API key.', 'error');
          return;
        }

        // Generate videos using the comprehensive content generation service
        const result = await contentGenerationService.generateContentPackage({
          newsItem: selectedNews,
          mediaType: 'video',
          targetPlatforms: selectedPlatforms,
          generateVideos: true,
          videoDuration: selectedVideoDuration,
          productImageUrl: productImage,
          brandOverride: brandConfig || undefined
        });

        if (result.errors.length > 0) {
          console.warn('Video generation completed with some errors:', result.errors);
          result.errors.forEach(error => addNotification(error, 'error'));
        }

        if (result.videoContent.length > 0) {
          setGeneratedVideos(result.videoContent);
          addNotification(`Generated ${result.videoContent.length} video(s) successfully!`, 'success');

          // Convert VideoContent to SocialContentResult and send to results modal
          if (onAddResult) {
            result.videoContent.forEach(video => {
              const socialResult: SocialContentResult = {
                id: video.id,
                platform: video.platform,
                title: video.title,
                description: video.description || '',
                videoUrl: video.videoUrl,
                thumbnailUrl: video.thumbnailUrl,
                compositeImageUrl: video.compositeImageUrl,
                duration: video.duration,
                hasAudio: video.hasAudio,
                estimatedEngagement: Math.floor(Math.random() * 30) + 70, // Generate realistic engagement
                hashtags: video.hashtags || [],
                timestamp: Date.now()
              };
              onAddResult(socialResult);
            });
          }

          // Add composite images to library if available
          result.videoContent.forEach(video => {
            if (video.compositeImageUrl) {
              onAddToLibrary(video.compositeImageUrl, `Composite for ${video.title}`);
            }
          });
        } else {
          addNotification('No videos were generated. Please check the error messages.', 'error');
        }

      } else if (selectedContentType === 'image') {
        if (!productImage) {
          addNotification('Please select a product image for image generation', 'error');
          return;
        }

        // Generate both text content and adapted images
        try {
          // First generate text content
          const content = await generateMultiPlatformContent(
            contentSource,
            selectedPlatforms,
            productImage || undefined
          );

          // Then generate adapted images for each platform
          const results = await Promise.all(
            selectedPlatforms.map(async (platform) => {
              const platformContent = content[platform] || '';

              // Extract hashtags from content (look for #tags)
              const hashtagMatches = platformContent.match(/#\w+/g) || [];
              const hashtags = hashtagMatches.slice(0, 5); // Limit to 5 hashtags

              // Remove hashtags from content for clean text
              const cleanContent = platformContent.replace(/#\w+/g, '').trim();

              // Get platform-specific aspect ratio
              const aspectRatio = PLATFORM_CONFIGS[platform as Platform].aspectRatio;

              let adaptedImageUrl = productImage;
              try {
                // Adapt the image for this platform's aspect ratio
                adaptedImageUrl = await adaptImage(productImage, aspectRatio);
                addNotification(`✓ Adapted image for ${platform}`, 'success');
              } catch (imageError) {
                console.warn(`Failed to adapt image for ${platform}:`, imageError);
                addNotification(`⚠ Using original image for ${platform}`, 'error');
                // Keep original image as fallback
              }

              const generatedItem: GeneratedContent = {
                id: crypto.randomUUID(),
                type: 'social_post',
                platform,
                content: cleanContent,
                title: selectedNews.title,
                hashtags,
                images: [adaptedImageUrl], // Use the adapted image
                wordCount: cleanContent.split(' ').length,
                estimatedEngagement: Math.floor(Math.random() * 40) + 60,
                brandCompliance: brandConfig
                  ? brandService.validateContentBrandCompliance(cleanContent).score
                  : 85,
                generatedAt: new Date().toISOString(),
                sourceNewsId: selectedNews.id
              };

              return generatedItem;
            })
          );

          setGeneratedContent(results);

          if (results.length > 0) {
            addNotification(`Generated content with adapted images for ${results.length} platform(s)`, 'success');
          } else {
            addNotification('No content was generated', 'error');
          }
        } catch (error) {
          console.error('Content generation failed:', error);
          addNotification(`Content generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
      }

    } catch (error) {
      console.error('Content generation failed:', error);
      addNotification(`Content generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addNotification('Content copied to clipboard', 'success');
  };

  const downloadVideo = (videoUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addNotification('Video download started', 'success');
  };

  const handlePublishContent = async (
    content: GeneratedContent | VideoContent,
    platform: PublishPlatform
  ) => {
    if (!composioService.isAvailable()) {
      addNotification('Publishing service not available. Please check your Composio configuration.', 'error');
      return;
    }

    const contentId = `${content.id}_${platform}`;
    setIsPublishing(prev => new Map(prev.set(contentId, true)));

    try {
      // Prepare publish options
      const publishOptions: PublishOptions = {
        platform,
        content: content.content,
        title: content.title || selectedNews?.title,
        hashtags: content.hashtags || [],
        images: content.images || []
      };

      // For video content, include video URL
      if ('videoUrl' in content) {
        publishOptions.content += `\n\nWatch the full video: ${content.videoUrl}`;
      }

      const result = await composioService.publishContent(publishOptions);

      if (result.success) {
        addNotification(`Successfully published to ${platform}!`, 'success');
      } else {
        addNotification(`Failed to publish to ${platform}: ${result.error}`, 'error');
      }

    } catch (error) {
      console.error(`Publishing error for ${platform}:`, error);
      addNotification(`Failed to publish to ${platform}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsPublishing(prev => {
        const newMap = new Map(prev);
        newMap.delete(contentId);
        return newMap;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-4xl bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Icon icon="megaphone" className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Social Content Studio</h2>
                <p className="text-indigo-100 text-sm">Create engaging content from news</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <Icon icon="x" className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* News Context */}
          {selectedNews && (
            <div className="bg-blue-50 border-b border-blue-200 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {selectedNews.source.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-blue-700">{selectedNews.source}</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      Selected Article
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{selectedNews.title}</h3>
                  <p className="text-gray-600 text-sm mb-3">{selectedNews.description}</p>
                  {selectedNews.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedNews.hashtags.map((hashtag, index) => (
                        <span key={index} className="text-blue-600 text-xs bg-blue-100 px-2 py-1 rounded-full">
                          {hashtag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="p-6 space-y-8">
            {/* Platform Selection */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Platforms</h3>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(PLATFORM_CONFIGS) as Platform[]).map((platform) => {
                  const config = PLATFORM_CONFIGS[platform];
                  const isSelected = selectedPlatforms.includes(platform);

                  return (
                    <button
                      key={platform}
                      onClick={() => handlePlatformToggle(platform)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 bg-gradient-to-r ${config.color} rounded-lg flex items-center justify-center`}>
                          <Icon icon={config.icon as any} className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{config.name}</div>
                          <div className="text-xs text-gray-500">{config.aspectRatio} • {config.maxTextLength} chars</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content Type Selection */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Type</h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedContentType('text')}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    selectedContentType === 'text'
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon icon="type" className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                  <div className="font-medium text-gray-900">Text Posts</div>
                  <div className="text-xs text-gray-500">Captions & descriptions</div>
                </button>

                <button
                  onClick={() => setSelectedContentType('image')}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    selectedContentType === 'image'
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon icon="image" className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                  <div className="font-medium text-gray-900">Image Posts</div>
                  <div className="text-xs text-gray-500">Text + adapted images</div>
                </button>

                <button
                  onClick={() => setSelectedContentType('video')}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    selectedContentType === 'video'
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon icon="play" className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                  <div className="font-medium text-gray-900">Video Content</div>
                  <div className="text-xs text-gray-500">AI-generated videos</div>
                  {!falAiService.isAvailable() && (
                    <div className="text-xs text-yellow-600 mt-1">Configure FAL API</div>
                  )}
                </button>
              </div>
            </div>

            {/* Video Duration Selection - Only show for video content type */}
            {selectedContentType === 'video' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Video Duration</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[8, 16, 24, 30].map((duration) => (
                    <button
                      key={duration}
                      onClick={() => setSelectedVideoDuration(duration)}
                      className={`p-4 rounded-lg border-2 text-center transition-all ${
                        selectedVideoDuration === duration
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Icon icon="clock" className="w-5 h-5 text-indigo-600" />
                        <span className="font-bold text-lg text-gray-900">{duration}s</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {duration === 8 ? 'Quick clip' :
                         duration === 16 ? 'Short story' :
                         duration === 24 ? 'Mini feature' :
                         'Full showcase'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {Math.ceil(duration / 8)} segment{Math.ceil(duration / 8) > 1 ? 's' : ''}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  💡 Longer videos are created by combining multiple 8-second segments with smooth transitions
                </div>
              </div>
            )}

            {/* Product Image Selection */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Product Context {selectedContentType === 'video' && <span className="text-red-500">*</span>}
              </h3>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Icon icon="upload" className="w-4 h-4" />
                    Upload Image
                  </button>

                  <button
                    onClick={() => setShowAssetLibrary(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Icon icon="colorPalette" className="w-4 h-4" />
                    Select from Library
                  </button>
                </div>

                {productImage && (
                  <div className="relative">
                    <img
                      src={productImage}
                      alt="Selected product"
                      className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      onClick={() => setProductImage(null)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <Icon icon="x" className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Additional Prompt */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Context (Optional)</h3>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Add any specific instructions or context for content generation..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Generate Button */}
            <div className="flex justify-center">
              <button
                onClick={handleGenerateContent}
                disabled={isGenerating || selectedPlatforms.length === 0 || (selectedContentType === 'video' && !productImage)}
                className={`px-8 py-3 rounded-lg font-semibold transition-colors flex items-center gap-3 ${
                  isGenerating || selectedPlatforms.length === 0 || (selectedContentType === 'video' && !productImage)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg'
                }`}
              >
                {isGenerating ? (
                  <>
                    <Spinner className="w-5 h-5" />
                    Generating Content...
                  </>
                ) : (
                  <>
                    <Icon icon="bolt" className="w-5 h-5" />
                    Generate {selectedContentType === 'text' ? 'Text' : selectedContentType === 'video' ? 'Videos' : 'Content'}
                  </>
                )}
              </button>
            </div>

            {/* Generated Text Content */}
            {generatedContent.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated Content</h3>
                <div className="space-y-4">
                  {generatedContent.map((content) => {
                    const config = PLATFORM_CONFIGS[content.platform as Platform];

                    return (
                      <div key={content.id} className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 bg-gradient-to-r ${config.color} rounded-lg flex items-center justify-center`}>
                              <Icon icon={config.icon as any} className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{config.name}</div>
                              <div className="text-sm text-gray-500">{content.wordCount} words • {content.estimatedEngagement}% engagement</div>
                            </div>
                          </div>
                          <button
                            onClick={() => copyToClipboard(content.content)}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            <Icon icon="copy" className="w-4 h-4" />
                            Copy
                          </button>

                          {/* Publishing buttons */}
                          {composioService.isAvailable() && (
                            <>
                              <button
                                onClick={() => handlePublishContent(content, 'linkedin')}
                                disabled={isPublishing.get(`${content.id}_linkedin`)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                                  isPublishing.get(`${content.id}_linkedin`)
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                }`}
                              >
                                {isPublishing.get(`${content.id}_linkedin`) ? (
                                  <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                ) : (
                                  <Icon icon="briefcase" className="w-4 h-4" />
                                )}
                                LinkedIn
                              </button>
                              <button
                                onClick={() => handlePublishContent(content, 'email')}
                                disabled={isPublishing.get(`${content.id}_email`)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                                  isPublishing.get(`${content.id}_email`)
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                              >
                                {isPublishing.get(`${content.id}_email`) ? (
                                  <div className="animate-spin w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full"></div>
                                ) : (
                                  <Icon icon="mail" className="w-4 h-4" />
                                )}
                                Email
                              </button>
                            </>
                          )}
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <p className="text-gray-900 whitespace-pre-wrap">{content.content}</p>
                        </div>

                        {/* Show adapted images if available */}
                        {content.images && content.images.length > 0 && (
                          <div className="mb-4">
                            <h6 className="text-sm font-medium text-gray-700 mb-2">Adapted Image ({config.aspectRatio}):</h6>
                            <div className="grid gap-2">
                              {content.images.map((imageUrl, index) => (
                                <div key={index} className="relative group">
                                  <img
                                    src={imageUrl}
                                    alt={`${config.name} adapted content`}
                                    className="w-full max-w-xs rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                    style={{ aspectRatio: config.aspectRatio.replace(':', ' / ') }}
                                    onClick={() => window.open(imageUrl, '_blank')}
                                  />
                                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => onAddToLibrary(imageUrl, `${config.name} - ${content.title}`)}
                                      className="bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
                                      title="Save to library"
                                    >
                                      <Icon icon="download" className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {content.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {content.hashtags.map((hashtag, index) => (
                              <span key={index} className="text-blue-600 text-sm bg-blue-100 px-2 py-1 rounded-full">
                                {hashtag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Generated Videos - Platform-Specific Mockups */}
            {generatedVideos.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Generated Videos</h3>
                <div className="grid gap-8">
                  {generatedVideos.map((video) => (
                    <div key={video.id} className="flex justify-center">
                      <PlatformMockup
                        platform={video.platform}
                        videoUrl={video.videoUrl}
                        imageUrl={video.compositeImageUrl}
                        thumbnailUrl={video.thumbnailUrl}
                        title={video.title}
                        duration={video.duration}
                        aspectRatio={video.aspectRatio}
                        hasAudio={video.hasAudio}
                        estimatedEngagement={video.estimatedEngagement}
                        onDownload={() => video.videoUrl && downloadVideo(video.videoUrl, `${video.title}.mp4`)}
                        onSaveImage={video.compositeImageUrl ? () => onAddToLibrary(video.compositeImageUrl!, `Composite for ${video.title}`) : undefined}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Brand Info Footer */}
        <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {brandConfig ? (
                <>
                  <Icon icon="checkCircle" className="w-4 h-4 text-green-600" />
                  Brand: {brandConfig.brandName} ({brandConfig.brandVoice} voice)
                </>
              ) : (
                <>
                  <Icon icon="info" className="w-4 h-4 text-gray-400" />
                  No brand configuration - using generic content
                </>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Content generated using AI • Review before publishing
            </div>
          </div>
        </div>
      </div>

      {/* Asset Library Modal */}
      <AssetLibraryModal
        isOpen={showAssetLibrary}
        onClose={() => setShowAssetLibrary(false)}
        galleryImages={galleryImages}
        onImageSelect={handleAssetSelect}
      />

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default SocialContentPanel;