import { fal } from "@fal-ai/client";

// Get FAL API key from environment (Vite requires VITE_ prefix for frontend access)
const getFalApiKey = (): string | undefined => {
  // In browser environment, use import.meta.env
  if (typeof window !== 'undefined') {
    return import.meta.env.VITE_FAL_KEY;
  }
  // In Node.js environment, use process.env
  return process.env.FAL_KEY || process.env.VITE_FAL_KEY;
};

const falApiKey = getFalApiKey();

// Configure FAL AI client with API key
if (!falApiKey) {
  console.warn('VITE_FAL_KEY environment variable not set. Video generation will be unavailable.');
} else {
  fal.config({
    credentials: falApiKey
  });
}

export interface NanoBananaRequest {
  prompt: string;
  image_urls: string[];
  num_images?: number;
  output_format?: 'jpeg' | 'png';
  sync_mode?: boolean;
}

export interface NanoBananaResponse {
  images: Array<{
    url: string;
    content_type?: string;
    file_name?: string;
    file_size?: number;
    file_data?: string;
  }>;
  description?: string;
}

export interface Veo3VideoRequest {
  prompt: string;
  image_url: string;
  aspect_ratio?: 'auto' | '16:9' | '9:16';
  duration?: '8s';
  generate_audio?: boolean;
  resolution?: '720p' | '1080p';
}

export interface Veo3VideoResponse {
  video: {
    url: string;
    content_type?: string;
    file_name?: string;
    file_size?: number;
  };
}

export interface FalApiError {
  detail: Array<{
    loc: string[];
    msg: string;
    type: string;
    url?: string;
    ctx?: {
      support_codes?: string[];
    };
    input?: string;
  }>;
}

export class ContentPolicyViolationError extends Error {
  public readonly supportCodes: string[];
  public readonly violatingInput: string;
  public readonly documentationUrl: string;

  constructor(errorDetail: FalApiError['detail'][0]) {
    const message = `Content policy violation: ${errorDetail.msg}`;
    super(message);
    this.name = 'ContentPolicyViolationError';
    this.supportCodes = errorDetail.ctx?.support_codes || [];
    this.violatingInput = errorDetail.input || '';
    this.documentationUrl = errorDetail.url || 'https://docs.fal.ai/errors#content_policy_violation';
  }

  getUserFriendlyMessage(): string {
    return `The image you're trying to process contains content that violates FAL.AI's content policy. This could be due to inappropriate content, copyrighted material, or other policy restrictions. Please try with a different image.`;
  }

  getDetailedMessage(): string {
    let message = this.getUserFriendlyMessage();
    if (this.supportCodes.length > 0) {
      message += `\n\nSupport codes: ${this.supportCodes.join(', ')}`;
    }
    if (this.violatingInput) {
      message += `\n\nViolating input: ${this.violatingInput}`;
    }
    message += `\n\nFor more information, visit: ${this.documentationUrl}`;
    return message;
  }
}

export interface CompositeImageConfig {
  productImageUrl: string;
  newsTitle: string;
  newsDescription: string;
  keyPoints: string[];
  brandContext?: {
    brandName: string;
    brandColors?: string[];
    brandStyle?: string;
  };
}

export interface VideoGenerationConfig {
  compositeImageUrl: string;
  newsContext: string;
  duration: '8s';
  aspectRatio: '16:9' | '9:16' | 'auto';
  platform: 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'linkedin';
  includeAudio: boolean;
  videoStyle: 'promotional' | 'news_update' | 'product_showcase' | 'story_format';
}

class FalAiService {
  private isConfigured = false;

  constructor() {
    this.isConfigured = !!falApiKey;
    if (!this.isConfigured) {
      console.warn('FAL AI service not configured - video generation features will be unavailable');
    }
  }

  /**
   * Check if FAL AI service is properly configured
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Generate a composite image by combining a product image with news context using Nano Banana
   * This creates a single image that incorporates both the product and news information
   */
  async generateCompositeImage(config: CompositeImageConfig): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('FAL AI service not configured. Please set FAL_KEY environment variable.');
    }

    try {
      // Create a detailed prompt that combines news context with product placement
      let prompt = `Create a visually striking social media image that combines this product with the following news story:

News Title: ${config.newsTitle}
News Description: ${config.newsDescription}`;

      if (config.keyPoints && config.keyPoints.length > 0) {
        prompt += `\nKey Points: ${config.keyPoints.join(', ')}`;
      }

      prompt += `\n\nGenerate an image that:
- Features the product prominently in the composition
- Incorporates visual elements that represent the news story
- Has a modern, social media-friendly design
- Uses professional lighting and composition
- Creates a clear connection between the product and the news context`;

      if (config.brandContext) {
        prompt += `\n- Aligns with the brand style: ${config.brandContext.brandStyle || 'modern and professional'}`;
        if (config.brandContext.brandColors) {
          prompt += `\n- Uses brand colors: ${config.brandContext.brandColors.join(', ')}`;
        }
      }

      prompt += `\n\nThe final image should be engaging, professional, and perfect for social media sharing.`;

      console.log('🚀 Generating composite image with Nano Banana...');
      console.log('Prompt:', prompt);
      console.log('Product Image URL:', config.productImageUrl);

      const request: NanoBananaRequest = {
        prompt: prompt,
        image_urls: [config.productImageUrl],
        num_images: 1,
        output_format: 'jpeg'
      };

      // Try with retry logic and exponential backoff
      const response = await this.retryWithBackoff(
        () => fal.subscribe('fal-ai/nano-banana/edit', {
          input: request,
          logs: true,
          onQueueUpdate: (update) => {
            if (update.status === "IN_PROGRESS" && update.logs) {
              update.logs.forEach(log => console.log('Nano Banana:', log.message));
            }
          },
        })
      ) as { data: NanoBananaResponse };

      console.log('✅ Nano Banana response:', response);

      if (!response.data?.images || response.data.images.length === 0) {
        throw new Error('No images returned from Nano Banana API');
      }

      const compositeImageUrl = response.data.images[0].url;

      if (!compositeImageUrl) {
        throw new Error('Invalid image URL returned from Nano Banana API');
      }

      console.log('✅ Generated composite image:', compositeImageUrl);
      return compositeImageUrl;

    } catch (error) {
      console.error('❌ Composite image generation failed:', error);

      // Handle content policy violations with user-friendly message
      if (error instanceof ContentPolicyViolationError) {
        console.error('🚫 Content policy violation:', error.getDetailedMessage());
        throw error; // Re-throw to preserve the specific error type
      }

      // If SSL error, provide helpful message
      if (error instanceof Error && error.message.includes('ERR_SSL_BAD_RECORD_MAC_ALERT')) {
        throw new Error('SSL connection error with FAL AI service. This may be a temporary network issue. Please try again in a moment.');
      }

      throw new Error(`Failed to generate composite image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate an animated video from a static image using Veo 3 Fast
   * This takes the composite image and creates an engaging video animation
   */
  async generateVideoFromImage(config: VideoGenerationConfig): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('FAL AI service not configured. Please set FAL_KEY environment variable.');
    }

    try {
      // Create animation prompt based on video style and platform
      let animationPrompt = this.generateAnimationPrompt(config);

      console.log('🚀 Generating video with Veo 3 Fast...');
      console.log('Animation Prompt:', animationPrompt);
      console.log('Composite Image URL:', config.compositeImageUrl);

      const request: Veo3VideoRequest = {
        prompt: animationPrompt,
        image_url: config.compositeImageUrl,
        aspect_ratio: config.aspectRatio,
        duration: config.duration,
        generate_audio: config.includeAudio,
        resolution: '720p'
      };

      const response = await this.retryWithBackoff(
        () => fal.subscribe('fal-ai/veo3/fast/image-to-video', {
          input: request,
          logs: true,
          onQueueUpdate: (update) => {
            if (update.status === "IN_PROGRESS" && update.logs) {
              update.logs.forEach(log => console.log('Veo 3 Fast:', log.message));
            }
          },
        })
      ) as { data: Veo3VideoResponse };

      console.log('✅ Veo 3 Fast response:', response);

      if (!response.data?.video?.url) {
        throw new Error('No video URL returned from Veo 3 Fast API');
      }

      const videoUrl = response.data.video.url;
      console.log('✅ Generated video:', videoUrl);

      return videoUrl;

    } catch (error) {
      console.error('❌ Video generation failed:', error);

      // Handle content policy violations with user-friendly message
      if (error instanceof ContentPolicyViolationError) {
        console.error('🚫 Content policy violation:', error.getDetailedMessage());
        throw error; // Re-throw to preserve the specific error type
      }

      // If SSL error, provide helpful message
      if (error instanceof Error && error.message.includes('ERR_SSL_BAD_RECORD_MAC_ALERT')) {
        throw new Error('SSL connection error with FAL AI video service. This may be a temporary network issue. Please try again in a moment.');
      }

      throw new Error(`Failed to generate video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate the complete news-to-video workflow
   * This combines composite image generation with video animation
   */
  async generateNewsVideo(
    productImageUrl: string,
    newsTitle: string,
    newsDescription: string,
    keyPoints: string[] = [],
    platform: VideoGenerationConfig['platform'] = 'instagram',
    brandContext?: CompositeImageConfig['brandContext']
  ): Promise<{ compositeImageUrl: string; videoUrl: string }> {
    if (!this.isConfigured) {
      throw new Error('FAL AI service not configured. Please set FAL_KEY environment variable.');
    }

    console.log('🎬 Starting complete news-to-video generation workflow...');

    // Step 1: Generate composite image
    console.log('📸 Step 1: Generating composite image...');
    const compositeImageUrl = await this.generateCompositeImage({
      productImageUrl,
      newsTitle,
      newsDescription,
      keyPoints,
      brandContext
    });

    // Step 2: Generate video from composite image
    console.log('🎥 Step 2: Generating video from composite image...');
    const videoConfig: VideoGenerationConfig = {
      compositeImageUrl,
      newsContext: `${newsTitle}\n\n${newsDescription}`,
      duration: '8s',
      aspectRatio: this.getAspectRatioForPlatform(platform),
      platform,
      includeAudio: true,
      videoStyle: 'product_showcase'
    };

    const videoUrl = await this.generateVideoFromImage(videoConfig);

    console.log('✅ Complete workflow finished successfully!');

    return {
      compositeImageUrl,
      videoUrl
    };
  }

  /**
   * Generate animation prompt based on video configuration
   */
  private generateAnimationPrompt(config: VideoGenerationConfig): string {
    const basePrompts = {
      promotional: "Smoothly animate the scene with subtle camera movements and gentle product highlighting. Create an engaging, professional presentation that draws attention to the product while maintaining the news context.",
      news_update: "Animate with dynamic news-style transitions and graphics. Include subtle text animations and professional broadcast-style movements that emphasize the informational content.",
      product_showcase: "Focus on elegant product presentation with smooth camera movements that showcase the product from multiple angles while incorporating the news elements in the background.",
      story_format: "Create a narrative flow with gentle transitions and storytelling elements that connect the news content with the product in a natural, engaging way."
    };

    let prompt = basePrompts[config.videoStyle] || basePrompts.promotional;

    // Add platform-specific optimizations
    const platformOptimizations = {
      instagram: " Optimize for Instagram engagement with vibrant colors and eye-catching movements perfect for social media consumption.",
      tiktok: " Use dynamic, attention-grabbing animations suitable for TikTok's fast-paced environment with trendy visual effects.",
      youtube: " Create professional-quality animations suitable for YouTube's longer-form content consumption with polished transitions.",
      facebook: " Design engaging movements optimized for Facebook's social sharing with clear, accessible visual elements.",
      linkedin: " Maintain professional, business-appropriate animations that are suitable for LinkedIn's professional network."
    };

    prompt += platformOptimizations[config.platform] || platformOptimizations.instagram;

    // Add technical requirements
    prompt += ` Ensure smooth motion, avoid abrupt changes, and maintain visual clarity throughout the ${config.duration} duration.`;

    return prompt;
  }

  /**
   * Get optimal aspect ratio for each platform
   */
  private getAspectRatioForPlatform(platform: VideoGenerationConfig['platform']): '16:9' | '9:16' | 'auto' {
    const ratios = {
      instagram: '9:16' as const,
      tiktok: '9:16' as const,
      youtube: '16:9' as const,
      facebook: '16:9' as const,
      linkedin: '16:9' as const
    };

    return ratios[platform] || 'auto';
  }

  /**
   * Upload file to FAL AI storage for processing
   */
  async uploadFile(file: File): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('FAL AI service not configured. Please set FAL_KEY environment variable.');
    }

    try {
      console.log('📤 Uploading file to FAL AI storage...');
      const url = await fal.storage.upload(file);
      console.log('✅ File uploaded:', url);
      return url;
    } catch (error) {
      console.error('❌ File upload failed:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert data URL to blob and upload to FAL AI storage
   */
  async uploadDataUrl(dataUrl: string, fileName: string = 'image.jpg'): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('FAL AI service not configured. Please set FAL_KEY environment variable.');
    }

    try {
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: blob.type });

      return await this.uploadFile(file);
    } catch (error) {
      console.error('❌ Data URL upload failed:', error);
      throw new Error(`Failed to upload data URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse FAL API error response and throw appropriate error types
   */
  private handleFalApiError(error: any): never {
    // Check if it's a FAL API error response
    if (error && typeof error === 'object' && error.detail && Array.isArray(error.detail)) {
      const errorDetail = error.detail[0];
      
      // Handle content policy violations
      if (errorDetail.type === 'content_policy_violation') {
        throw new ContentPolicyViolationError(errorDetail);
      }
      
      // Handle other FAL API errors
      const message = errorDetail.msg || 'Unknown FAL API error';
      const apiError = new Error(`FAL API Error: ${message}`);
      apiError.name = 'FalApiError';
      throw apiError;
    }
    
    // Re-throw if it's not a FAL API error
    throw error;
  }

  /**
   * Retry logic with exponential backoff for handling SSL and network issues
   * Content policy violations are not retried as they are permanent failures
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt + 1}/${maxRetries}...`);
        return await operation();
      } catch (error) {
        // Handle FAL API errors first
        try {
          this.handleFalApiError(error);
        } catch (handledError) {
          // If it's a content policy violation, don't retry
          if (handledError instanceof ContentPolicyViolationError) {
            console.error('🚫 Content policy violation detected - not retrying');
            throw handledError;
          }
          // For other FAL API errors, continue with retry logic
          lastError = handledError;
        }

        lastError = error as Error;
        console.warn(`⚠️ Attempt ${attempt + 1} failed:`, error);

        // Check if it's an SSL error or network issue
        if (error instanceof Error && (
          error.message.includes('ERR_SSL_BAD_RECORD_MAC_ALERT') ||
          error.message.includes('net::ERR_') ||
          error.message.includes('fetch')
        )) {
          console.log('🔒 Network/SSL error detected, waiting before retry...');

          // Exponential backoff with jitter
          const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
          await this.sleep(delay);
          continue;
        }

        // For other errors, wait less time
        if (attempt < maxRetries - 1) {
          await this.sleep(baseDelay * (attempt + 1));
        }
      }
    }

    // If all retries failed, throw the last error
    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const falAiService = new FalAiService();