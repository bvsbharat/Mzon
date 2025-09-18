import { s3Service } from './s3Service';
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
        const s3Url = await s3Service.uploadImage(dataUrl, folder, filename);

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
   * @param metadata - Image metadata
   * @returns string - Generated filename
   */
  private generateFilename(metadata: ImageMetadata): string {
    if (metadata.customName) {
      // Ensure the custom name has a proper extension
      return metadata.customName.endsWith('.png')
        ? metadata.customName
        : `${metadata.customName}.png`;
    }

    // Generate a descriptive filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const type = metadata.imageType || 'image';

    return `${type}_${timestamp}_${randomId}.png`;
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
   * Load gallery images from S3 with fallback to localStorage
   * @returns Promise<GalleryImage[]> - Gallery images
   */
  async loadGalleryImages(): Promise<GalleryImage[]> {
    console.log('StorageService: Loading gallery images...');
    console.log('StorageService: S3 service available:', !!s3Service);

    // Try S3 first if available
    if (s3Service) {
      try {
        console.log('StorageService: Loading from S3...');
        const s3Images = await s3Service.loadGalleryMetadata();

        if (s3Images.length > 0) {
          console.log(`StorageService: Successfully loaded ${s3Images.length} images from S3`);
          return s3Images;
        }

        // If no images in S3 metadata, try to sync with actual S3 contents
        console.log('StorageService: No S3 metadata found, syncing with S3 bucket contents...');
        const syncedImages = await s3Service.syncGalleryWithS3([]);

        if (syncedImages.length > 0) {
          console.log(`StorageService: Found and synced ${syncedImages.length} images from S3 bucket`);
          return syncedImages;
        }

        console.log('StorageService: No images found in S3 bucket');
      } catch (error) {
        console.warn('StorageService: S3 gallery loading failed, falling back to localStorage:', error);
      }
    } else {
      console.log('StorageService: S3 service not available - checking environment variables...');
      console.log('StorageService: Environment check:', {
        hasRegion: !!import.meta.env.VITE_AWS_REGION,
        hasAccessKey: !!import.meta.env.VITE_AWS_ACCESS_KEY_ID,
        hasSecretKey: !!import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
        hasBucket: !!import.meta.env.VITE_AWS_S3_BUCKET
      });
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
   * Save gallery metadata to both S3 and localStorage
   * @param galleryImages - Gallery images to save
   */
  async saveGalleryMetadata(galleryImages: GalleryImage[]): Promise<void> {
    console.log('StorageService: Saving gallery metadata...', { count: galleryImages.length });

    // Save to S3 if available
    if (s3Service) {
      try {
        await s3Service.saveGalleryMetadata(galleryImages);
        console.log('StorageService: Gallery metadata saved to S3');
      } catch (error) {
        console.warn('StorageService: Failed to save gallery metadata to S3:', error);
      }
    }

    // Always save to localStorage as backup
    try {
      const { localStorageService } = await import('./localStorageService');
      localStorageService.saveGalleryImages(galleryImages);
      console.log('StorageService: Gallery metadata saved to localStorage');
    } catch (error) {
      console.warn('StorageService: Failed to save gallery metadata to localStorage:', error);
    }
  }

  /**
   * Sync gallery with S3 - ensures S3 metadata is up to date
   * @param currentGalleryImages - Current gallery state
   * @returns Promise<GalleryImage[]> - Synced gallery images
   */
  async syncGalleryWithS3(currentGalleryImages: GalleryImage[]): Promise<GalleryImage[]> {
    if (!s3Service) {
      console.log('StorageService: S3 not available for sync');
      return currentGalleryImages;
    }

    try {
      console.log('StorageService: Syncing gallery with S3...');
      const syncedImages = await s3Service.syncGalleryWithS3(currentGalleryImages);
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