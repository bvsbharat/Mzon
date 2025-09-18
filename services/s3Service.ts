import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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
      const key = folder ? `${folder}/${filename}` : filename;

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
    console.warn('S3 configuration incomplete. Image storage will fall back to data URLs.');
    return null;
  }

  return new S3Service(config);
};

// Export singleton instance
export const s3Service = createS3Service();
export { S3Service };
export type { S3Config };