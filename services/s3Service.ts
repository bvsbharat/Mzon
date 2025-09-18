import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GalleryImage } from '../types';

interface S3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(config: S3Config) {
    this.s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.bucketName = config.bucketName;
  }

  /**
   * Converts a data URL to a buffer for S3 upload
   */
  private dataUrlToBuffer(dataUrl: string): { buffer: Buffer; mimeType: string } {
    const parts = dataUrl.split(',');
    const mimeType = parts[0].split(':')[1].split(';')[0];
    const base64Data = parts[1];
    const buffer = Buffer.from(base64Data, 'base64');
    return { buffer, mimeType };
  }

  /**
   * Generates a unique filename for the image
   */
  private generateFilename(prefix: string = 'image'): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    return `${prefix}-${timestamp}-${randomId}.png`;
  }

  /**
   * Uploads an image data URL to S3
   * @param dataUrl - The image data URL from canvas or AI generation
   * @param folder - Optional folder prefix (e.g., 'generated', 'uploads', 'variations')
   * @param customName - Optional custom filename
   * @returns Promise<string> - The S3 URL of the uploaded image
   */
  async uploadImage(dataUrl: string, folder?: string, customName?: string): Promise<string> {
    try {
      const { buffer, mimeType } = this.dataUrlToBuffer(dataUrl);

      // Generate filename with optional folder prefix
      const filename = customName || this.generateFilename();
      const key = folder ? `mzon/${folder}/${filename}` : `mzon/${filename}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ACL: 'public-read', // Make images publicly accessible
        Metadata: {
          uploadedAt: new Date().toISOString(),
          source: 'mzon-studio',
        },
      });

      await this.s3Client.send(command);

      // Return the public URL
      return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
    } catch (error) {
      console.error('Failed to upload image to S3:', error);
      throw new Error(`Image upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deletes an image from S3
   * @param s3Url - The full S3 URL of the image to delete
   */
  async deleteImage(s3Url: string): Promise<void> {
    try {
      // Extract key from S3 URL
      const url = new URL(s3Url);
      const key = url.pathname.substring(1); // Remove leading '/'

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('Failed to delete image from S3:', error);
      throw new Error(`Image deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generates a pre-signed URL for direct upload (useful for client-side uploads)
   * @param key - The S3 key/filename for the object
   * @param expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns Promise<string> - Pre-signed URL for upload
   */
  async generatePresignedUploadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ACL: 'public-read',
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Failed to generate presigned URL:', error);
      throw new Error(`Presigned URL generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Bulk upload multiple images
   * @param images - Array of objects containing dataUrl and optional metadata
   * @returns Promise<string[]> - Array of S3 URLs
   */
  async uploadMultipleImages(
    images: Array<{ dataUrl: string; folder?: string; customName?: string }>
  ): Promise<string[]> {
    try {
      const uploadPromises = images.map(({ dataUrl, folder, customName }) =>
        this.uploadImage(dataUrl, folder, customName)
      );

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Failed to upload multiple images:', error);
      throw new Error(`Bulk upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save gallery metadata to S3
   * @param galleryImages - Array of gallery images with metadata
   */
  async saveGalleryMetadata(galleryImages: GalleryImage[]): Promise<void> {
    try {
      const metadataKey = 'mzon/gallery-metadata.json';
      const metadata = {
        images: galleryImages,
        lastUpdated: new Date().toISOString(),
        totalImages: galleryImages.length,
        version: '2.0'
      };

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: metadataKey,
        Body: JSON.stringify(metadata, null, 2),
        ContentType: 'application/json',
        Metadata: {
          uploadedAt: new Date().toISOString(),
          source: 'mzon-studio',
          type: 'gallery-metadata'
        },
      });

      await this.s3Client.send(command);
      console.log('S3: Gallery metadata saved successfully');
    } catch (error) {
      console.error('Failed to save gallery metadata to S3:', error);
      throw new Error(`Gallery metadata save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load gallery metadata from S3
   * @returns Promise<GalleryImage[]> - Array of gallery images
   */
  async loadGalleryMetadata(): Promise<GalleryImage[]> {
    try {
      const metadataKey = 'mzon/gallery-metadata.json';
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: metadataKey,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        console.log('S3: No gallery metadata found');
        return [];
      }

      const bodyContent = await response.Body.transformToString();
      const metadata = JSON.parse(bodyContent);

      console.log(`S3: Loaded ${metadata.images?.length || 0} images from gallery metadata`);
      return metadata.images || [];
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        console.log('S3: Gallery metadata file does not exist yet');
        return [];
      }

      console.error('Failed to load gallery metadata from S3:', error);
      throw new Error(`Gallery metadata load failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all images in the S3 bucket under the mzon folder
   * @returns Promise<string[]> - Array of S3 URLs
   */
  async listGalleryImages(): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: 'mzon/',
        MaxKeys: 1000,
      });

      const response = await this.s3Client.send(command);

      if (!response.Contents) {
        return [];
      }

      // Filter out the metadata file and only return image files
      const imageUrls = response.Contents
        .filter(obj => obj.Key && !obj.Key.endsWith('gallery-metadata.json'))
        .filter(obj => obj.Key && /\.(jpg|jpeg|png|gif|webp)$/i.test(obj.Key))
        .map(obj => `https://${this.bucketName}.s3.amazonaws.com/${obj.Key}`);

      console.log(`S3: Found ${imageUrls.length} images in bucket`);
      return imageUrls;
    } catch (error) {
      console.error('Failed to list gallery images from S3:', error);
      throw new Error(`Gallery images list failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sync gallery: Ensure S3 metadata matches actual S3 contents
   * @param currentGalleryImages - Current gallery state
   * @returns Promise<GalleryImage[]> - Synced gallery images
   */
  async syncGalleryWithS3(currentGalleryImages: GalleryImage[]): Promise<GalleryImage[]> {
    try {
      const s3ImageUrls = await this.listGalleryImages();
      const metadataImages = await this.loadGalleryMetadata();

      // Create a map of existing metadata by URL
      const metadataMap = new Map<string, GalleryImage>();
      metadataImages.forEach(img => metadataMap.set(img.url, img));

      // For each S3 image, either use existing metadata or create new entry
      const syncedImages: GalleryImage[] = [];

      for (const s3Url of s3ImageUrls) {
        const existingMetadata = metadataMap.get(s3Url);

        if (existingMetadata) {
          // Use existing metadata
          syncedImages.push(existingMetadata);
        } else {
          // Create new metadata for orphaned S3 image
          const newImage: GalleryImage = {
            id: crypto.randomUUID(),
            url: s3Url,
            name: this.generateNameFromS3Key(s3Url),
            tags: ['s3-stored', 'auto-discovered'],
            isFavorite: false,
            createdAt: Date.now()
          };
          syncedImages.push(newImage);
        }
      }

      // Save the synced metadata back to S3
      await this.saveGalleryMetadata(syncedImages);

      console.log(`S3: Gallery synced - ${syncedImages.length} images total`);
      return syncedImages;
    } catch (error) {
      console.error('Failed to sync gallery with S3:', error);
      return currentGalleryImages; // Return current state if sync fails
    }
  }

  /**
   * Generate a user-friendly name from S3 key
   * @param s3Url - The S3 URL
   * @returns string - Generated name
   */
  private generateNameFromS3Key(s3Url: string): string {
    try {
      const url = new URL(s3Url);
      const key = url.pathname.substring(1); // Remove leading '/'
      const filename = key.split('/').pop() || 'Unknown Image';

      // Remove file extension and clean up the name
      const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

      // Convert snake_case or kebab-case to Title Case
      return nameWithoutExt
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    } catch (error) {
      return 'S3 Image';
    }
  }
}

// Initialize S3 service with environment variables
const createS3Service = (): S3Service | null => {
  const config = {
    region: import.meta.env.VITE_AWS_REGION || process.env.AWS_REGION,
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
    bucketName: import.meta.env.VITE_AWS_S3_BUCKET || process.env.AWS_S3_BUCKET,
  };

  // Check if all required config is present
  if (!config.region || !config.accessKeyId || !config.secretAccessKey || !config.bucketName) {
    console.warn('S3 configuration incomplete. Missing:', {
      region: !config.region,
      accessKeyId: !config.accessKeyId,
      secretAccessKey: !config.secretAccessKey,
      bucketName: !config.bucketName
    });
    console.warn('Image storage will fall back to data URLs.');
    return null;
  }

  try {
    console.log('S3 service initialized with bucket:', config.bucketName);
    return new S3Service(config);
  } catch (error) {
    console.error('Failed to initialize S3 service:', error);
    return null;
  }
};

// Export singleton instance
export const s3Service = createS3Service();
export { S3Service };
export type { S3Config };