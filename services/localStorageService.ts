import { GalleryImage } from '../types';

const GALLERY_STORAGE_KEY = 'mzon_gallery_images';
const GALLERY_METADATA_KEY = 'mzon_gallery_metadata';

interface GalleryMetadata {
  lastUpdated: number;
  totalImages: number;
  version: string;
}

export class LocalStorageService {
  private static instance: LocalStorageService;

  private constructor() {}

  static getInstance(): LocalStorageService {
    if (!LocalStorageService.instance) {
      LocalStorageService.instance = new LocalStorageService();
    }
    return LocalStorageService.instance;
  }

  /**
   * Save gallery images to localStorage
   */
  saveGalleryImages(images: GalleryImage[]): void {
    try {
      const serializedImages = JSON.stringify(images);
      const metadata: GalleryMetadata = {
        lastUpdated: Date.now(),
        totalImages: images.length,
        version: '1.0'
      };

      localStorage.setItem(GALLERY_STORAGE_KEY, serializedImages);
      localStorage.setItem(GALLERY_METADATA_KEY, JSON.stringify(metadata));

      console.log(`LocalStorage: Saved ${images.length} images to localStorage`);
    } catch (error) {
      console.error('Failed to save images to localStorage:', error);
      // If localStorage is full or unavailable, we could implement cleanup here
      this.cleanupOldImages();
    }
  }

  /**
   * Load gallery images from localStorage
   */
  loadGalleryImages(): GalleryImage[] {
    try {
      const serializedImages = localStorage.getItem(GALLERY_STORAGE_KEY);
      if (!serializedImages) {
        console.log('LocalStorage: No saved images found');
        return [];
      }

      const images = JSON.parse(serializedImages) as GalleryImage[];
      console.log(`LocalStorage: Loaded ${images.length} images from localStorage`);

      // Validate the structure of loaded images
      return this.validateAndCleanImages(images);
    } catch (error) {
      console.error('Failed to load images from localStorage:', error);
      return [];
    }
  }

  /**
   * Get gallery metadata
   */
  getGalleryMetadata(): GalleryMetadata | null {
    try {
      const metadataStr = localStorage.getItem(GALLERY_METADATA_KEY);
      if (!metadataStr) return null;

      return JSON.parse(metadataStr) as GalleryMetadata;
    } catch (error) {
      console.error('Failed to load gallery metadata:', error);
      return null;
    }
  }

  /**
   * Clear all gallery data from localStorage
   */
  clearGalleryData(): void {
    try {
      localStorage.removeItem(GALLERY_STORAGE_KEY);
      localStorage.removeItem(GALLERY_METADATA_KEY);
      console.log('LocalStorage: Cleared all gallery data');
    } catch (error) {
      console.error('Failed to clear gallery data:', error);
    }
  }

  /**
   * Get storage usage information
   */
  getStorageInfo(): { used: number; available: number; percentage: number } {
    try {
      const images = localStorage.getItem(GALLERY_STORAGE_KEY);
      const metadata = localStorage.getItem(GALLERY_METADATA_KEY);

      const usedBytes = (images?.length || 0) + (metadata?.length || 0);
      const totalBytes = 5 * 1024 * 1024; // Assume 5MB localStorage limit (varies by browser)

      return {
        used: usedBytes,
        available: totalBytes - usedBytes,
        percentage: (usedBytes / totalBytes) * 100
      };
    } catch (error) {
      console.error('Failed to calculate storage info:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }

  /**
   * Validate and clean loaded images
   */
  private validateAndCleanImages(images: any[]): GalleryImage[] {
    return images.filter(img => {
      // Check if image has required properties
      return (
        img &&
        typeof img === 'object' &&
        typeof img.id === 'string' &&
        typeof img.url === 'string' &&
        typeof img.name === 'string' &&
        Array.isArray(img.tags) &&
        typeof img.isFavorite === 'boolean' &&
        typeof img.createdAt === 'number'
      );
    });
  }

  /**
   * Clean up old images if storage is full
   */
  private cleanupOldImages(): void {
    try {
      const images = this.loadGalleryImages();
      if (images.length === 0) return;

      // Sort by creation date, keep only the 50 most recent
      const recentImages = images
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 50);

      this.saveGalleryImages(recentImages);
      console.log(`LocalStorage: Cleaned up old images, kept ${recentImages.length} most recent`);
    } catch (error) {
      console.error('Failed to cleanup old images:', error);
    }
  }

  /**
   * Check if localStorage is available
   */
  isAvailable(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Export gallery data for backup
   */
  exportGalleryData(): { images: GalleryImage[]; metadata: GalleryMetadata | null; exportedAt: number } {
    return {
      images: this.loadGalleryImages(),
      metadata: this.getGalleryMetadata(),
      exportedAt: Date.now()
    };
  }

  /**
   * Import gallery data from backup
   */
  importGalleryData(data: { images: GalleryImage[]; metadata?: GalleryMetadata }): void {
    try {
      this.saveGalleryImages(data.images);
      console.log(`LocalStorage: Imported ${data.images.length} images`);
    } catch (error) {
      console.error('Failed to import gallery data:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const localStorageService = LocalStorageService.getInstance();