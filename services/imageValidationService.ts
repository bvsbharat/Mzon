/**
 * Image Validation Service
 * Handles validation and preprocessing of image URLs for video generation
 */

export interface ImageValidationResult {
  isValid: boolean;
  processedUrl?: string;
  error?: string;
  metadata?: {
    width?: number;
    height?: number;
    format?: string;
    size?: number;
  };
}

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  format?: 'jpeg' | 'png' | 'webp';
  quality?: number;
  timeout?: number;
}

class ImageValidationService {
  private readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly SUPPORTED_FORMATS = ['jpeg', 'jpg', 'png', 'webp'];

  /**
   * Validate if an image URL is accessible and processable
   */
  async validateImageUrl(url: string, options: ImageProcessingOptions = {}): Promise<ImageValidationResult> {
    try {
      // Basic URL validation
      if (!this.isValidUrl(url)) {
        return {
          isValid: false,
          error: 'Invalid URL format'
        };
      }

      // Check if it's an Amazon image URL and handle special cases
      const processedUrl = this.preprocessAmazonUrl(url);

      // Test image accessibility
      const response = await this.fetchWithTimeout(processedUrl, options.timeout || this.DEFAULT_TIMEOUT);
      
      if (!response.ok) {
        return {
          isValid: false,
          error: `Image not accessible: HTTP ${response.status}`
        };
      }

      // Validate content type
      const contentType = response.headers.get('content-type');
      if (!this.isValidImageType(contentType)) {
        return {
          isValid: false,
          error: `Unsupported image format: ${contentType}`
        };
      }

      // Check file size
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > this.MAX_FILE_SIZE) {
        return {
          isValid: false,
          error: 'Image file too large (max 10MB)'
        };
      }

      // Get image metadata if possible
      const metadata = await this.getImageMetadata(response.clone());

      return {
        isValid: true,
        processedUrl,
        metadata
      };

    } catch (error) {
      console.error('Image validation failed:', error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown validation error'
      };
    }
  }

  /**
   * Validate multiple image URLs in parallel
   */
  async validateImageUrls(urls: string[], options: ImageProcessingOptions = {}): Promise<ImageValidationResult[]> {
    const validationPromises = urls.map(url => this.validateImageUrl(url, options));
    return Promise.all(validationPromises);
  }

  /**
   * Convert image to a format suitable for FAL.AI processing
   */
  async prepareImageForProcessing(url: string, options: ImageProcessingOptions = {}): Promise<string> {
    const validation = await this.validateImageUrl(url, options);
    
    if (!validation.isValid) {
      throw new Error(`Image validation failed: ${validation.error}`);
    }

    // If it's already a valid, accessible URL, return it
    if (validation.processedUrl) {
      return validation.processedUrl;
    }

    // For problematic URLs, we might need to proxy them through our backend
    return this.createProxyUrl(url);
  }

  /**
   * Check if URL is valid
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Preprocess Amazon image URLs to ensure accessibility
   */
  private preprocessAmazonUrl(url: string): string {
    if (!url.includes('amazon.com') && !url.includes('media-amazon.com')) {
      return url;
    }

    // Remove Amazon's image processing parameters that might cause issues
    const urlObj = new URL(url);
    
    // Common Amazon image URL patterns that might need adjustment
    if (url.includes('__AC_SX300_SY300_QL70_FMwebp_')) {
      // Convert WebP format to JPEG for better compatibility
      return url.replace('__AC_SX300_SY300_QL70_FMwebp_', '_AC_SL1500_');
    }

    if (url.includes('._AC_SL1500_.')) {
      // Already in a good format
      return url;
    }

    // For other Amazon URLs, try to get a larger, more standard format
    return url.replace(/\._AC_[^.]*\./, '._AC_SL1500_.');
  }

  /**
   * Check if content type is a valid image format
   */
  private isValidImageType(contentType: string | null): boolean {
    if (!contentType) return false;
    
    return this.SUPPORTED_FORMATS.some(format => 
      contentType.toLowerCase().includes(format)
    );
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(url: string, timeout: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'HEAD', // Use HEAD to avoid downloading the full image
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Get basic image metadata
   */
  private async getImageMetadata(response: Response): Promise<ImageValidationResult['metadata']> {
    try {
      const contentLength = response.headers.get('content-length');
      const contentType = response.headers.get('content-type');
      
      return {
        size: contentLength ? parseInt(contentLength) : undefined,
        format: contentType?.split('/')[1] || undefined
      };
    } catch {
      return {};
    }
  }

  /**
   * Create a proxy URL for problematic images
   */
  private createProxyUrl(originalUrl: string): string {
    // This would proxy the image through your backend to avoid CORS/access issues
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
    return `${backendUrl}/api/proxy-image?url=${encodeURIComponent(originalUrl)}`;
  }

  /**
   * Test image URL with fallback options
   */
  async validateWithFallbacks(url: string): Promise<ImageValidationResult> {
    // Try original URL first
    let result = await this.validateImageUrl(url);
    if (result.isValid) {
      return result;
    }

    // Try preprocessed Amazon URL
    if (url.includes('amazon')) {
      const processedUrl = this.preprocessAmazonUrl(url);
      if (processedUrl !== url) {
        result = await this.validateImageUrl(processedUrl);
        if (result.isValid) {
          return result;
        }
      }
    }

    // Try different format variations for Amazon images
    if (url.includes('amazon')) {
      const variations = this.generateAmazonUrlVariations(url);
      for (const variation of variations) {
        result = await this.validateImageUrl(variation);
        if (result.isValid) {
          return result;
        }
      }
    }

    // Return the last failed result
    return result;
  }

  /**
   * Generate different variations of Amazon image URLs
   */
  private generateAmazonUrlVariations(url: string): string[] {
    const variations: string[] = [];
    
    // Different size and format variations
    const formats = ['_AC_SL1500_', '_AC_SL1000_', '_AC_SL800_', '_AC_SX500_', ''];
    
    for (const format of formats) {
      // Replace existing format with new one
      const variation = url.replace(/\._AC_[^.]*\./, `.${format}.`);
      if (variation !== url) {
        variations.push(variation);
      }
    }

    return variations;
  }
}

// Export singleton instance
export const imageValidationService = new ImageValidationService();

// Export error types for better error handling
export class ImageValidationError extends Error {
  constructor(
    message: string,
    public readonly url: string,
    public readonly validationResult?: ImageValidationResult
  ) {
    super(message);
    this.name = 'ImageValidationError';
  }
}
