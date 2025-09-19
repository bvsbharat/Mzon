import { s3Service } from './s3Service';
import { s3ProxyService } from './s3ProxyService';
import { GalleryImage } from '../types';

export interface StorageResult {
  url: string;
  isS3: boolean;
  error?: string;
  errorType?: 'permission' | 'network' | 'configuration' | 'unknown';
  retryable?: boolean;
}

export interface ImageMetadata {
  folder?: string;
  customName?: string;
  userId?: string;
  imageType?: 'generated' | 'uploaded' | 'variation' | 'composed' | 'edited';
  fileType?: 'image' | 'video'; // Added support for videos
  videoMetadata?: {
    duration?: string;
    aspectRatio?: string;
    platform?: string;
    hasAudio?: boolean;
  };
}

class StorageService {
  /**
   * Stores an image, preferring S3 but falling back to data URL if S3 is unavailable
   * @param dataUrl - The image data URL
   * @param metadata - Optional metadata for organizing images
   * @returns Promise<StorageResult> - Storage result with URL and method used
   */
  async storeImage(dataUrl: string, metadata: ImageMetadata = {}): Promise<StorageResult> {
    console.log('StorageService: Attempting to store image', {
      s3Available: !!s3Service,
      imageType: metadata.imageType
    });

    // If S3 is configured, try to upload there
    if (s3Service) {
      try {
        const folder = this.generateFolder(metadata);
        const filename = this.generateFilename(metadata);

        console.log('StorageService: Uploading to S3', { folder, filename });
        const s3Url = await this.uploadImage(dataUrl, folder);

        console.log('StorageService: S3 upload successful', s3Url);
        return {
          url: s3Url,
          isS3: true,
        };
      } catch (error) {
        console.warn('S3 upload failed, falling back to data URL:', error);

        // Analyze the error to provide better feedback
        const errorMessage = error instanceof Error ? error.message : 'S3 upload failed';
        let errorType: StorageResult['errorType'] = 'unknown';
        let retryable = false;

        if (errorMessage.includes('AccessDenied') || errorMessage.includes('not authorized')) {
          errorType = 'permission';
          retryable = false;
        } else if (errorMessage.includes('NetworkingError') || errorMessage.includes('timeout')) {
          errorType = 'network';
          retryable = true;
        } else if (errorMessage.includes('NoSuchBucket') || errorMessage.includes('InvalidBucketName')) {
          errorType = 'configuration';
          retryable = false;
        }

        return {
          url: dataUrl,
          isS3: false,
          error: errorMessage,
          errorType,
          retryable,
        };
      }
    }

    // Fallback to data URL storage (in-memory)
    console.log('StorageService: Using data URL storage (S3 not configured)');
    return {
      url: dataUrl,
      isS3: false,
      error: 'S3 not configured',
    };
  }

  /**
   * Upload image to storage (S3 proxy or fallback to localStorage)
   */
  async uploadImage(dataUrl: string, folder: string = 'general'): Promise<StorageResult> {
    // Try S3 proxy service first (bypasses CORS)
    try {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const filename = `mzon/${folder}/image-${timestamp}-${randomId}.png`;
      
      const result = await s3ProxyService.uploadImage(dataUrl, filename);
      if (result.success) {
        return {
          url: result.url || dataUrl,
          isS3: true
        };
      } else {
        console.warn('S3 proxy upload failed:', result.error);
      }
    } catch (error) {
      console.warn('S3 proxy upload error:', error);
    }

    // Fallback to localStorage (data URL storage)
    try {
      const timestamp = Date.now();
      const imageId = `image_${timestamp}_${Math.random().toString(36).substring(2, 15)}`;
      
      // Store in localStorage
      const { localStorageService } = await import('./localStorageService');
      localStorageService.saveImage({
        id: imageId,
        url: dataUrl,
        timestamp,
        folder
      });

      return {
        url: dataUrl,
        isS3: false
      };
    } catch (error) {
      throw new Error(`Failed to save image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deletes an image from storage
   * @param imageUrl - The URL of the image to delete
   * @returns Promise<boolean> - Success status
   */
  async deleteImage(imageUrl: string): Promise<boolean> {
    // Only attempt deletion if it's an S3 URL and S3 service is available
    if (s3Service && this.isS3Url(imageUrl)) {
      try {
        await s3Service.deleteImage(imageUrl);
        return true;
      } catch (error) {
        console.error('Failed to delete S3 image:', error);
        return false;
      }
    }

    // For data URLs, no deletion needed (they're just strings)
    return true;
  }

  /**
   * Stores a video file using the same infrastructure as images
   * @param dataUrl - The video data URL
   * @param metadata - Video metadata including duration, aspect ratio, etc.
   * @returns Promise<StorageResult> - Storage result with URL and method used
   */
  async storeVideo(dataUrl: string, metadata: ImageMetadata = {}): Promise<StorageResult> {
    const videoMetadata: ImageMetadata = {
      ...metadata,
      fileType: 'video',
      imageType: 'generated' // Videos are typically AI generated in this context
    };

    console.log('StorageService: Storing video', {
      hasVideoMetadata: !!metadata.videoMetadata,
      platform: metadata.videoMetadata?.platform,
      duration: metadata.videoMetadata?.duration
    });

    return this.storeImage(dataUrl, videoMetadata);
  }

  /**
   * Stores multiple images in batch
   * @param images - Array of data URLs with metadata
   * @returns Promise<StorageResult[]> - Array of storage results
   */
  async storeMultipleImages(
    images: Array<{ dataUrl: string; metadata?: ImageMetadata }>
  ): Promise<StorageResult[]> {
    const results = await Promise.all(
      images.map(({ dataUrl, metadata = {} }) => this.storeImage(dataUrl, metadata))
    );

    return results;
  }

  /**
   * Checks if a URL is an S3 URL
   * @param url - The URL to check
   * @returns boolean - True if it's an S3 URL
   */
  private isS3Url(url: string): boolean {
    return url.includes('s3.amazonaws.com') || url.includes('amazonaws.com');
  }

  /**
   * Generates a folder path based on metadata
   * @param metadata - Image metadata
   * @returns string - Folder path
   */
  private generateFolder(metadata: ImageMetadata): string {
    const parts: string[] = [];

    // Add user-specific folder if available
    if (metadata.userId) {
      parts.push(`users/${metadata.userId}`);
    }

    // Add image type folder
    if (metadata.imageType) {
      parts.push(metadata.imageType);
    } else {
      parts.push('general');
    }

    // Add custom folder if specified
    if (metadata.folder) {
      parts.push(metadata.folder);
    }

    // Add date folder for organization
    const date = new Date();
    const dateFolder = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
    parts.push(dateFolder);

    return parts.join('/');
  }

  /**
   * Generates a filename based on metadata
   * @param metadata - Image/video metadata
   * @returns string - Generated filename
   */
  private generateFilename(metadata: ImageMetadata): string {
    const isVideo = metadata.fileType === 'video';
    const defaultExtension = isVideo ? '.mp4' : '.png';
    const validExtensions = isVideo ? ['.mp4', '.webm', '.mov'] : ['.png', '.jpg', '.jpeg'];

    if (metadata.customName) {
      // Check if custom name already has a valid extension
      const hasValidExtension = validExtensions.some(ext =>
        metadata.customName!.toLowerCase().endsWith(ext)
      );

      return hasValidExtension
        ? metadata.customName
        : `${metadata.customName}${defaultExtension}`;
    }

    // Generate a descriptive filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const type = metadata.imageType || (isVideo ? 'video' : 'image');

    // Include platform info for videos
    let filePrefix = type;
    if (isVideo && metadata.videoMetadata?.platform) {
      filePrefix = `${type}_${metadata.videoMetadata.platform}`;
    }

    return `${filePrefix}_${timestamp}_${randomId}${defaultExtension}`;
  }

  /**
   * Gets storage configuration status
   * @returns object - Configuration status
   */
  getStorageStatus() {
    return {
      s3Available: !!s3Service,
      fallbackEnabled: true,
      storageType: s3Service ? 'S3 with fallback' : 'Data URLs only',
    };
  }

  /**
   * Load gallery images from S3 proxy with fallback to localStorage
   * @returns Promise<GalleryImage[]> - Gallery images
   */
  async loadGalleryImages(): Promise<GalleryImage[]> {
    console.log('StorageService: Loading gallery images...');

    // Try S3 proxy service first (bypasses CORS)
    try {
      console.log('StorageService: Loading from S3 via proxy...');
      const result = await s3ProxyService.downloadFile('mzon/gallery-metadata.json');

      if (result.success && result.data) {
        const metadata = result.data;
        if (metadata.images && Array.isArray(metadata.images)) {
          console.log(`StorageService: Successfully loaded ${metadata.images.length} images from S3 via proxy`);
          return metadata.images;
        }
      } else if (result.error_code === 'NOT_FOUND') {
        console.log('StorageService: No gallery metadata found in S3');
      } else {
        console.warn('StorageService: S3 proxy download failed:', result.error);
      }
    } catch (error) {
      console.warn('StorageService: S3 proxy loading failed:', error);
    }

    // Fallback to localStorage
    console.log('StorageService: Loading from localStorage...');
    try {
      const { localStorageService } = await import('./localStorageService');
      const localImages = localStorageService.loadGalleryImages();
      console.log(`StorageService: Loaded ${localImages.length} images from localStorage`);
      return localImages;
    } catch (error) {
      console.error('StorageService: Failed to load from localStorage:', error);
      return [];
    }
  }

  /**
   * Save gallery metadata to storage
   */
  async saveGalleryMetadata(images: GalleryImage[]): Promise<StorageResult> {
    const metadataKey = 'mzon/gallery-metadata.json';
    const metadata = {
      images,
      lastUpdated: new Date().toISOString(),
      version: '1.0'
    };

    // Try S3 proxy service first (bypasses CORS)
    try {
      const result = await s3ProxyService.uploadMetadata(metadata, metadataKey);
      if (result.success) {
        return {
          url: result.url || `s3://${metadataKey}`,
          isS3: true
        };
      } else {
        console.warn('S3 proxy metadata save failed:', result.error);
      }
    } catch (error) {
      console.warn('S3 proxy metadata save error:', error);
    }

    // Fallback to localStorage
    try {
      localStorage.setItem('mzon-gallery-metadata', JSON.stringify(metadata));
      return {
        url: 'localStorage://mzon-gallery-metadata',
        isS3: false
      };
    } catch (error) {
      throw new Error(`Failed to save gallery metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sync gallery with S3 - ensures S3 metadata is up to date
   * @param currentGalleryImages - Current gallery state
   * @returns Promise<GalleryImage[]> - Synced gallery images
   */
  async syncGalleryWithS3(currentGalleryImages: GalleryImage[]): Promise<GalleryImage[]> {
    try {
      console.log('StorageService: Syncing gallery with S3 via proxy...');
      
      // List files in S3 via proxy to discover existing images
      const listResult = await s3ProxyService.listFiles('mzon/');
      
      if (!listResult.success) {
        console.warn('StorageService: Failed to list S3 files via proxy:', listResult.error);
        return currentGalleryImages;
      }

      const s3Files = listResult.files || [];
      console.log(`StorageService: Found ${s3Files.length} files in S3`);

      // Filter for image files and create gallery items
      const imageFiles = s3Files.filter(file => 
        file.key.match(/\.(png|jpg|jpeg|gif|webp)$/i) && 
        !file.key.includes('metadata.json')
      );

      const syncedImages: GalleryImage[] = [...currentGalleryImages];

      // Add any S3 images that aren't in current gallery
      for (const file of imageFiles) {
        const existingImage = syncedImages.find(img => 
          img.url === file.url || img.url.includes(file.key)
        );

        if (!existingImage) {
          const newImage: GalleryImage = {
            id: file.key.split('/').pop() || `s3-${Date.now()}`,
            url: file.url,
            timestamp: new Date(file.last_modified).getTime(),
            metadata: {
              source: 's3-sync',
              filename: file.key.split('/').pop() || 'unknown',
              size: file.size,
              lastModified: file.last_modified
            }
          };
          syncedImages.push(newImage);
        }
      }

      // Save updated metadata back to S3
      if (syncedImages.length !== currentGalleryImages.length) {
        await this.saveGalleryMetadata(syncedImages);
      }

      console.log(`StorageService: Gallery sync completed - ${syncedImages.length} images`);
      return syncedImages;

    } catch (error) {
      console.error('StorageService: Gallery sync failed:', error);
      return currentGalleryImages;
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();
export { StorageService };