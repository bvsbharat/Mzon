import {
  NewsItem,
  GeneratedContent,
  EmailContent,
  VideoContent,
  VideoGenerationRequest,
  VideoGenerationResult,
  SocialPlatform,
  MediaType,
  BrandConfiguration
} from '../types';
import {
  generateMultiPlatformContent,
  generateEmailContent,
  generateEmailVariations,
  generateNewsContentImage,
  generateVisualPromptFromNews
} from './geminiService';
import { brandService } from './brandService';
import { ArticleContent } from './articleContentService';
import { falAiService } from './falAiService';
import { storageService } from './storageService';

export interface ContentGenerationRequest {
  newsItem: NewsItem;
  articleContent?: ArticleContent;
  mediaType: MediaType;
  targetPlatforms: SocialPlatform[];
  emailTypes?: ('newsletter' | 'promotional' | 'transactional' | 'announcement')[];
  generateImages?: boolean;
  generateVideos?: boolean;
  videoDuration?: number; // Duration in seconds (8, 16, 24, 30)
  productImageUrl?: string; // For video generation
  brandOverride?: BrandConfiguration;
  customPrompt?: string;
}

export interface ContentGenerationResult {
  socialContent: GeneratedContent[];
  emailContent: EmailContent[];
  videoContent: VideoContent[];
  images: Record<string, string>; // platform -> image URL
  errors: string[];
  processingTime: number;
}

class ContentGenerationService {
  private generationHistory: Map<string, ContentGenerationResult> = new Map();

  /**
   * Generate comprehensive content package from news article
   * STRICT: NO MOCK DATA - Only real API calls allowed
   */
  async generateContentPackage(
    request: ContentGenerationRequest
  ): Promise<ContentGenerationResult> {
    const startTime = Date.now();
    const result: ContentGenerationResult = {
      socialContent: [],
      emailContent: [],
      videoContent: [],
      images: {},
      errors: [],
      processingTime: 0
    };

    // STRICT CHECK: Ensure we have Gemini API key (via Vite define)
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured. Cannot generate content without API access.');
    }

    try {
      // Get brand context
      const brandContext = request.brandOverride
        ? this.convertBrandConfigToBrandContext(request.brandOverride)
        : brandService.getBrandContext();

      // Prepare news context
      const newsContext = this.prepareNewsContext(request.newsItem, request.articleContent);

      // Generate content based on media type
      if (request.mediaType === 'image' || request.mediaType === 'mixed') {
        await this.generateImageContent(request, newsContext, brandContext, result);
      }

      // Generate social media content
      if (request.targetPlatforms.length > 0) {
        await this.generateSocialContent(request, newsContext, brandContext, result);
      }

      // Generate email content
      if (request.emailTypes && request.emailTypes.length > 0) {
        await this.generateEmailPackage(request, newsContext, brandContext, result);
      }

      // Generate images if requested
      if (request.generateImages) {
        await this.generateVisualAssets(request, newsContext, result);
      }

      // Generate videos if requested and product image is provided
      if (request.generateVideos && request.productImageUrl) {
        await this.generateVideoContent(request, newsContext, brandContext, result);
      }

      result.processingTime = Date.now() - startTime;

      // Cache result
      this.generationHistory.set(request.newsItem.id, result);

      return result;

    } catch (error) {
      result.errors.push(`Content generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.processingTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Generate social media content for multiple platforms
   * STRICT: Only real Gemini API generated content
   */
  private async generateSocialContent(
    request: ContentGenerationRequest,
    newsContext: string,
    brandContext: any,
    result: ContentGenerationResult
  ): Promise<void> {
    try {
      console.log('🚀 Calling Gemini API for social content generation...');

      const platformContent = await generateMultiPlatformContent(
        newsContext,
        request.targetPlatforms.map(p => p.toString()),
        undefined // No image URL for now
      );

      console.log('✅ Received content from Gemini API:', platformContent);

      // STRICT: Validate that we got real content from API
      if (!platformContent || Object.keys(platformContent).length === 0) {
        throw new Error('Gemini API returned empty content. Check API key and connectivity.');
      }

      for (const [platform, content] of Object.entries(platformContent)) {
        if (content && typeof content === 'string') {
          // STRICT: Ensure content is not placeholder/mock
          if (content.includes('mock') || content.includes('placeholder') || content.includes('sample')) {
            throw new Error(`Generated content appears to be mock data: ${content.substring(0, 100)}`);
          }
          // Extract hashtags from content
          const hashtagMatches = content.match(/#[\w]+/g) || [];
          const contentWithoutHashtags = content.replace(/#[\w]+/g, '').trim();

          // Calculate brand compliance
          const brandCompliance = brandContext
            ? brandService.validateContentBrandCompliance(content).score
            : 75;

          // Estimate engagement based on content quality and platform
          const engagementScore = this.estimateEngagement(content, platform as SocialPlatform, request.newsItem);

          const generatedContent: GeneratedContent = {
            id: `social-${platform}-${Date.now()}`,
            type: 'social_post',
            platform: platform as SocialPlatform,
            content: contentWithoutHashtags,
            title: `${platform} post about ${request.newsItem.title}`,
            hashtags: hashtagMatches,
            images: [],
            wordCount: this.countWords(contentWithoutHashtags),
            estimatedEngagement: engagementScore,
            brandCompliance,
            generatedAt: new Date().toISOString(),
            sourceNewsId: request.newsItem.id
          };

          result.socialContent.push(generatedContent);
        }
      }
    } catch (error) {
      result.errors.push(`Social media generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate email content package
   * STRICT: Only real Gemini API generated emails
   */
  private async generateEmailPackage(
    request: ContentGenerationRequest,
    newsContext: string,
    brandContext: any,
    result: ContentGenerationResult
  ): Promise<void> {
    try {
      for (const emailType of request.emailTypes!) {
        try {
          console.log(`🚀 Calling Gemini API for ${emailType} email generation...`);

          const emailData = await generateEmailContent(
            newsContext,
            emailType,
            brandContext,
            {
              segmentName: 'General Subscribers',
              interests: request.newsItem.tags || [],
              previousEngagement: 'Medium'
            }
          );

          console.log(`✅ Received ${emailType} email from Gemini API:`, emailData);

          // STRICT: Validate email content is not mock
          if (!emailData || !emailData.subject || !emailData.bodyText) {
            throw new Error(`Gemini API returned incomplete email data for ${emailType}`);
          }

          if (emailData.subject.includes('mock') || emailData.bodyText.includes('placeholder')) {
            throw new Error(`Generated email content appears to be mock data: ${emailData.subject}`);
          }

          const brandCompliance = brandContext
            ? brandService.validateContentBrandCompliance(emailData.bodyText).score
            : 75;

          const emailContent: EmailContent = {
            id: `email-${emailType}-${Date.now()}`,
            type: 'email',
            content: emailData.bodyText,
            title: `${emailType} email about ${request.newsItem.title}`,
            subject: emailData.subject,
            preheader: emailData.preheader,
            bodyHtml: emailData.bodyHtml,
            bodyText: emailData.bodyText,
            emailType,
            hashtags: this.extractHashtagsFromHtml(emailData.bodyHtml),
            images: [],
            wordCount: this.countWords(emailData.bodyText),
            estimatedEngagement: this.estimateEmailEngagement(emailData, request.newsItem),
            brandCompliance,
            generatedAt: new Date().toISOString(),
            sourceNewsId: request.newsItem.id,
            callToAction: emailData.callToAction
          };

          result.emailContent.push(emailContent);
        } catch (error) {
          result.errors.push(`${emailType} email generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      result.errors.push(`Email package generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate visual assets for content
   * STRICT: Only real Gemini Imagen API generated images
   */
  private async generateVisualAssets(
    request: ContentGenerationRequest,
    newsContext: string,
    result: ContentGenerationResult
  ): Promise<void> {
    try {
      const keyPoints = request.articleContent?.keyPoints || request.newsItem.keyPoints || [];
      const sentiment = request.newsItem.sentiment || 'neutral';

      for (const platform of request.targetPlatforms) {
        try {
          console.log(`🚀 Calling Gemini Imagen API for ${platform} image generation...`);

          const imageUrl = await generateNewsContentImage(
            request.newsItem.title,
            request.articleContent?.summary || request.newsItem.description,
            keyPoints,
            sentiment,
            this.getAspectRatioForPlatform(platform)
          );

          console.log(`✅ Generated image for ${platform}:`, imageUrl);

          // STRICT: Validate we got a real image URL
          if (!imageUrl || !imageUrl.startsWith('data:image/')) {
            throw new Error(`Gemini Imagen API did not return a valid image for ${platform}`);
          }

          result.images[platform] = imageUrl;
        } catch (error) {
          result.errors.push(`Image generation for ${platform} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      result.errors.push(`Visual assets generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate image-focused content
   */
  private async generateImageContent(
    request: ContentGenerationRequest,
    newsContext: string,
    brandContext: any,
    result: ContentGenerationResult
  ): Promise<void> {
    try {
      // Generate visual prompt
      const visualPrompt = await generateVisualPromptFromNews(
        request.newsItem.title,
        request.articleContent?.summary || request.newsItem.description,
        request.articleContent?.keyPoints || request.newsItem.keyPoints || [],
        request.newsItem.sentiment || 'neutral'
      );

      // Create content focused on visual storytelling
      const imageContent: GeneratedContent = {
        id: `image-content-${Date.now()}`,
        type: 'social_post',
        content: visualPrompt,
        title: `Visual content for ${request.newsItem.title}`,
        hashtags: request.newsItem.hashtags || [],
        images: [],
        wordCount: this.countWords(visualPrompt),
        estimatedEngagement: 80, // Visual content typically has higher engagement
        brandCompliance: brandContext ? brandService.validateContentBrandCompliance(visualPrompt).score : 75,
        generatedAt: new Date().toISOString(),
        sourceNewsId: request.newsItem.id
      };

      result.socialContent.push(imageContent);
    } catch (error) {
      result.errors.push(`Image content generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate video content using FAL AI service
   * STRICT: Only real FAL AI generated videos
   */
  private async generateVideoContent(
    request: ContentGenerationRequest,
    newsContext: string,
    brandContext: any,
    result: ContentGenerationResult
  ): Promise<void> {
    if (!falAiService.isAvailable()) {
      result.errors.push('FAL AI service not configured - video generation skipped');
      return;
    }

    if (!request.productImageUrl) {
      result.errors.push('Product image URL required for video generation');
      return;
    }

    try {
      console.log('🎬 Starting video generation workflow...');

      // Generate video for each target platform
      for (const platform of request.targetPlatforms) {
        try {
          const startTime = Date.now();

          console.log(`🚀 Generating video for ${platform}...`);

          // Prepare brand context for FAL AI
          const falBrandContext = brandContext ? {
            brandName: brandContext.brandName,
            brandColors: brandContext.brandColors || [],
            brandStyle: brandContext.brandStyle || 'modern and professional'
          } : undefined;

          // Determine number of segments needed based on requested duration
          const requestedDuration = request.videoDuration || 8;
          const segmentCount = Math.ceil(requestedDuration / 8);

          console.log(`📹 Generating ${segmentCount} segment(s) for ${requestedDuration}s video`);

          // Generate multiple video segments for longer durations
          const videoSegments: string[] = [];
          let compositeImageUrl = '';

          for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex++) {
            console.log(`🎬 Generating segment ${segmentIndex + 1}/${segmentCount} for ${platform}...`);

            // Create varied prompts for each segment
            const segmentPrompts = this.generateSegmentPrompts(
              request.newsItem.title,
              request.articleContent?.summary || request.newsItem.description,
              request.articleContent?.keyPoints || request.newsItem.keyPoints || [],
              segmentIndex,
              segmentCount
            );

            const videoResult = await falAiService.generateNewsVideo(
              request.productImageUrl,
              segmentPrompts.title,
              segmentPrompts.description,
              segmentPrompts.keyPoints,
              platform,
              falBrandContext
            );

            videoSegments.push(videoResult.videoUrl);

            // Use the composite image from the first segment
            if (segmentIndex === 0) {
              compositeImageUrl = videoResult.compositeImageUrl;
            }
          }

          let finalVideoUrl: string;

          // If single segment, use directly; if multiple, we'll need to combine them
          if (videoSegments.length === 1) {
            finalVideoUrl = videoSegments[0];
          } else {
            console.log(`🔗 Combining ${videoSegments.length} video segments...`);

            try {
              // Call Python video combination service
              const combinationResponse = await fetch('http://localhost:8000/api/video/combine', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  segment_urls: videoSegments,
                  transition_type: 'concatenate', // Can be 'concatenate', 'crossfade', or 'fade'
                  fade_duration: 0.5
                }),
              });

              if (!combinationResponse.ok) {
                throw new Error(`Video combination failed: ${combinationResponse.statusText}`);
              }

              const combinationData = await combinationResponse.json();
              finalVideoUrl = combinationData.video_path;

              console.log(`✅ Video segments combined successfully: ${finalVideoUrl}`);
            } catch (error) {
              console.error('❌ Video combination failed, using first segment as fallback:', error);
              finalVideoUrl = videoSegments[0];
            }
          }

          const processingTime = Date.now() - startTime;

          console.log(`✅ Video (${segmentCount} segment${segmentCount > 1 ? 's' : ''}) generated for ${platform} in ${processingTime}ms`);

          // Store video in our storage system
          const storedVideoUrl = await this.storeVideo(finalVideoUrl, `${platform}-video-${Date.now()}.mp4`, {
            platform,
            duration: `${requestedDuration}s`,
            aspectRatio: this.getVideoAspectRatioForPlatform(platform)
          });
          const storedCompositeUrl = await this.storeImage(compositeImageUrl, `${platform}-composite-${Date.now()}.jpg`);

          // Calculate brand compliance
          const brandCompliance = brandContext
            ? brandService.validateContentBrandCompliance(`Video for ${request.newsItem.title}`).score
            : 75;

          // Estimate engagement based on platform and content
          const engagementScore = this.estimateVideoEngagement(platform, request.newsItem);

          const videoContent: VideoContent = {
            id: `video-${platform}-${Date.now()}`,
            type: 'video',
            platform: platform,
            content: `Engaging video content for ${platform} featuring ${request.newsItem.title}`,
            title: `${platform} video about ${request.newsItem.title}`,
            hashtags: request.newsItem.hashtags || [],
            images: [storedCompositeUrl], // Store the composite image as well
            videoUrl: storedVideoUrl,
            compositeImageUrl: storedCompositeUrl,
            duration: '8s',
            aspectRatio: this.getVideoAspectRatioForPlatform(platform),
            resolution: '720p',
            hasAudio: true,
            videoStyle: 'product_showcase',
            wordCount: 0, // Videos don't have word count
            estimatedEngagement: engagementScore,
            brandCompliance,
            generatedAt: new Date().toISOString(),
            sourceNewsId: request.newsItem.id,
            processingTime: processingTime
          };

          result.videoContent.push(videoContent);

          console.log(`✅ Video content created for ${platform}`);

        } catch (error) {
          console.error(`❌ Video generation failed for ${platform}:`, error);
          result.errors.push(`Video generation for ${platform} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

    } catch (error) {
      console.error('❌ Video content generation failed:', error);
      result.errors.push(`Video content generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Store video file using storage service
   */
  private async storeVideo(
    videoUrl: string,
    fileName: string,
    videoMetadata: {
      platform: string;
      duration: string;
      aspectRatio: string;
    }
  ): Promise<string> {
    try {
      // Download the video from FAL AI
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`);
      }

      const videoBlob = await response.blob();
      const videoData = await this.blobToDataUrl(videoBlob);

      // Store using our enhanced video storage method
      const storedResult = await storageService.storeVideo(videoData, {
        customName: fileName,
        videoMetadata: {
          platform: videoMetadata.platform,
          duration: videoMetadata.duration,
          aspectRatio: videoMetadata.aspectRatio,
          hasAudio: true
        }
      });

      return storedResult.url;
    } catch (error) {
      console.error('❌ Video storage failed:', error);
      // Return original URL as fallback
      return videoUrl;
    }
  }

  /**
   * Store image file using storage service
   */
  private async storeImage(imageUrl: string, fileName: string): Promise<string> {
    try {
      // Download the image from FAL AI
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const imageBlob = await response.blob();
      const imageData = await this.blobToDataUrl(imageBlob);

      // Store using our existing storage service
      const storedResult = await storageService.storeImage(imageData, fileName);

      return storedResult.url;
    } catch (error) {
      console.error('❌ Image storage failed:', error);
      // Return original URL as fallback
      return imageUrl;
    }
  }

  /**
   * Convert blob to data URL
   */
  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to convert blob to data URL'));
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Estimate engagement score for video content
   */
  private estimateVideoEngagement(platform: SocialPlatform, newsItem: NewsItem): number {
    let score = 70; // Base score for video content (higher than text/images)

    // Platform-specific multipliers (video performs differently on each platform)
    const platformMultipliers = {
      instagram: 1.3, // High video engagement
      tiktok: 1.5,    // Highest video engagement platform
      youtube: 1.2,   // Good for video content
      facebook: 1.1,  // Decent video engagement
      linkedin: 0.9,  // Lower video engagement but high quality audience
      twitter: 1.0,   // Baseline
      threads: 1.1    // Growing platform with good video engagement
    };

    score *= platformMultipliers[platform] || 1.0;

    // News relevance factors
    if (newsItem.isFresh) score += 15;
    if (newsItem.credibility > 80) score += 10;
    if (newsItem.engagement > 70) score += 10;
    if (newsItem.trendingPotential && newsItem.trendingPotential > 70) score += 20; // Videos can go viral easier

    // Video-specific bonuses
    score += 10; // Video content generally performs better
    if (newsItem.category === 'technology') score += 5; // Tech videos perform well
    if (newsItem.sentiment === 'positive') score += 5; // Positive content performs better

    return Math.min(Math.round(score), 100);
  }

  /**
   * Get video aspect ratio for platform
   */
  /**
   * Generate varied prompts for video segments to create dynamic content
   */
  private generateSegmentPrompts(
    title: string,
    description: string,
    keyPoints: string[],
    segmentIndex: number,
    totalSegments: number
  ): { title: string; description: string; keyPoints: string[] } {
    const segmentTypes = [
      'introduction', 'development', 'highlight', 'conclusion'
    ];

    const segmentType = segmentTypes[segmentIndex % segmentTypes.length];

    let segmentTitle = title;
    let segmentDescription = description;
    let segmentKeyPoints = keyPoints;

    switch (segmentType) {
      case 'introduction':
        segmentTitle = `Introduction: ${title}`;
        segmentDescription = `Opening segment introducing: ${description}`;
        segmentKeyPoints = keyPoints.slice(0, Math.max(1, Math.floor(keyPoints.length / 2)));
        break;

      case 'development':
        segmentTitle = `Deep Dive: ${title}`;
        segmentDescription = `Exploring the details of ${description}`;
        segmentKeyPoints = keyPoints.slice(Math.floor(keyPoints.length / 3));
        break;

      case 'highlight':
        segmentTitle = `Key Insights: ${title}`;
        segmentDescription = `Highlighting important aspects of ${description}`;
        segmentKeyPoints = keyPoints.slice(-Math.max(1, Math.floor(keyPoints.length / 2)));
        break;

      case 'conclusion':
        segmentTitle = `Wrap-up: ${title}`;
        segmentDescription = `Concluding thoughts on ${description}`;
        segmentKeyPoints = keyPoints.length > 0 ? [keyPoints[keyPoints.length - 1]] : [];
        break;
    }

    return {
      title: segmentTitle,
      description: segmentDescription,
      keyPoints: segmentKeyPoints
    };
  }

  private getVideoAspectRatioForPlatform(platform: SocialPlatform): '16:9' | '9:16' | 'auto' {
    const ratios = {
      instagram: '9:16' as const, // Stories/Reels format
      tiktok: '9:16' as const,    // Vertical format
      youtube: '16:9' as const,   // Landscape format
      facebook: '16:9' as const,  // Landscape format
      linkedin: '16:9' as const,  // Professional landscape
      twitter: '16:9' as const,   // Landscape format
      threads: '9:16' as const    // Vertical format like Instagram
    };

    return ratios[platform] || 'auto';
  }

  /**
   * Prepare comprehensive news context for content generation
   */
  private prepareNewsContext(newsItem: NewsItem, articleContent?: ArticleContent): string {
    let context = `ARTICLE: ${newsItem.title}\n\n`;

    if (articleContent && !articleContent.error) {
      context += `FULL CONTENT: ${articleContent.content}\n\n`;
      context += `SUMMARY: ${articleContent.summary}\n\n`;
      if (articleContent.keyPoints.length > 0) {
        context += `KEY POINTS:\n${articleContent.keyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}\n\n`;
      }
    } else {
      context += `DESCRIPTION: ${newsItem.description}\n\n`;
      if (newsItem.summary) {
        context += `SUMMARY: ${newsItem.summary}\n\n`;
      }
      if (newsItem.keyPoints && newsItem.keyPoints.length > 0) {
        context += `KEY POINTS:\n${newsItem.keyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}\n\n`;
      }
    }

    context += `SOURCE: ${newsItem.source}\n`;
    context += `CATEGORY: ${newsItem.category}\n`;
    context += `PUBLISHED: ${new Date(newsItem.publishedAt).toLocaleDateString()}\n`;

    if (newsItem.tags && newsItem.tags.length > 0) {
      context += `TAGS: ${newsItem.tags.join(', ')}\n`;
    }

    if (newsItem.sentiment) {
      context += `SENTIMENT: ${newsItem.sentiment}\n`;
    }

    return context;
  }

  /**
   * Convert BrandConfiguration to brand context format
   */
  private convertBrandConfigToBrandContext(config: BrandConfiguration) {
    return {
      brandName: config.brandName,
      brandVoice: config.brandVoice,
      brandDescription: config.brandDescription,
      targetAudience: config.targetAudience,
      keyMessages: config.keyMessages.filter(msg => msg.trim() !== '')
    };
  }

  /**
   * Estimate engagement score for social media content
   */
  private estimateEngagement(content: string, platform: SocialPlatform, newsItem: NewsItem): number {
    let score = 50; // Base score

    // Content length optimization by platform
    const contentLength = content.length;
    const optimalLengths = {
      twitter: { min: 70, max: 140 },
      instagram: { min: 150, max: 300 },
      linkedin: { min: 200, max: 600 },
      facebook: { min: 100, max: 250 },
      youtube: { min: 200, max: 500 },
      tiktok: { min: 50, max: 150 },
      threads: { min: 100, max: 300 }
    };

    const optimal = optimalLengths[platform];
    if (optimal && contentLength >= optimal.min && contentLength <= optimal.max) {
      score += 15;
    }

    // News relevance factors
    if (newsItem.isFresh) score += 10;
    if (newsItem.credibility > 80) score += 10;
    if (newsItem.engagement > 70) score += 10;
    if (newsItem.trendingPotential && newsItem.trendingPotential > 70) score += 15;

    // Content quality factors
    if (content.includes('?')) score += 5; // Questions drive engagement
    if (/[!]{1,2}/.test(content)) score += 5; // Excitement
    if (content.match(/#\w+/g)?.length) score += 5; // Has hashtags

    // Platform-specific bonuses
    const platformMultipliers = {
      instagram: 1.2, // Visual platform
      tiktok: 1.3,    // High engagement platform
      twitter: 1.0,   // Baseline
      linkedin: 0.8,  // Lower engagement but higher quality
      facebook: 0.9,  // Mixed engagement
      youtube: 1.1,   // Good for video content
      threads: 1.0    // New platform
    };

    score *= platformMultipliers[platform] || 1.0;

    return Math.min(Math.round(score), 100);
  }

  /**
   * Estimate engagement for email content
   */
  private estimateEmailEngagement(emailData: any, newsItem: NewsItem): number {
    let score = 60; // Base score for emails

    // Subject line quality
    const subjectLength = emailData.subject.length;
    if (subjectLength >= 30 && subjectLength <= 50) score += 15;

    // Content factors
    if (newsItem.credibility > 85) score += 10;
    if (newsItem.isFresh) score += 10;
    if (emailData.callToAction?.text) score += 10;

    // Email type factors
    const typeBonus = {
      newsletter: 5,
      promotional: 0,
      transactional: 15,
      announcement: 10
    };

    return Math.min(Math.round(score), 100);
  }

  /**
   * Get appropriate aspect ratio for platform
   */
  private getAspectRatioForPlatform(platform: SocialPlatform): '1:1' | '9:16' | '16:9' | '4:5' {
    const ratios = {
      instagram: '1:1' as const,
      facebook: '16:9' as const,
      twitter: '16:9' as const,
      linkedin: '4:5' as const,
      youtube: '16:9' as const,
      tiktok: '9:16' as const,
      threads: '1:1' as const
    };
    return ratios[platform] || '1:1';
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Extract hashtags from HTML content
   */
  private extractHashtagsFromHtml(html: string): string[] {
    const textContent = html.replace(/<[^>]*>/g, '');
    const matches = textContent.match(/#[\w]+/g);
    return matches || [];
  }

  /**
   * Get generation history
   */
  getGenerationHistory(): Map<string, ContentGenerationResult> {
    return this.generationHistory;
  }

  /**
   * Clear generation history
   */
  clearHistory(): void {
    this.generationHistory.clear();
  }

  /**
   * Get content by news item ID
   */
  getContentByNewsId(newsId: string): ContentGenerationResult | null {
    return this.generationHistory.get(newsId) || null;
  }
}

// Export singleton instance
export const contentGenerationService = new ContentGenerationService();