import { s3Service } from './s3Service';

export interface StorageResult {
  url: string;
  isS3: boolean;
  error?: string;
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
    // If S3 is configured, try to upload there
    if (s3Service) {
      try {
        const folder = this.generateFolder(metadata);
        const filename = this.generateFilename(metadata);

        const s3Url = await s3Service.uploadImage(dataUrl, folder, filename);

        return {
          url: s3Url,
          isS3: true,
        };
      } catch (error) {
        console.warn('S3 upload failed, falling back to data URL:', error);

        return {
          url: dataUrl,
          isS3: false,
          error: error instanceof Error ? error.message : 'S3 upload failed',
        };
      }
    }

    // Fallback to data URL storage (in-memory)
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
}

// Export singleton instance
export const storageService = new StorageService();
export { StorageService };