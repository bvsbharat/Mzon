/**
 * S3 Proxy Service - Routes S3 operations through backend to bypass CORS
 */

interface S3UploadResponse {
  success: boolean;
  url?: string;
  key?: string;
  bucket?: string;
  error?: string;
  error_code?: string;
}

interface S3DownloadResponse {
  success: boolean;
  data?: any;
  content_type?: string;
  key?: string;
  error?: string;
  error_code?: string;
}

interface S3DeleteResponse {
  success: boolean;
  message?: string;
  error?: string;
  error_code?: string;
}

interface S3ListResponse {
  success: boolean;
  files?: Array<{
    key: string;
    size: number;
    last_modified: string;
    url: string;
  }>;
  count?: number;
  error?: string;
  error_code?: string;
}

class S3ProxyService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.VITE_BACKEND_URL || 'http://localhost:8000';
  }

  /**
   * Upload file to S3 via backend proxy
   */
  async uploadFile(
    fileData: string,
    key: string,
    contentType: string = 'application/json'
  ): Promise<S3UploadResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/s3/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_data: fileData,
          key: key,
          content_type: contentType
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;

    } catch (error) {
      console.error('S3 proxy upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Download file from S3 via backend proxy
   */
  async downloadFile(key: string): Promise<S3DownloadResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/s3/download/${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            error: 'File not found',
            error_code: 'NOT_FOUND'
          };
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;

    } catch (error) {
      console.error('S3 proxy download error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed'
      };
    }
  }

  /**
   * Delete file from S3 via backend proxy
   */
  async deleteFile(key: string): Promise<S3DeleteResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/s3/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: key
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;

    } catch (error) {
      console.error('S3 proxy delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed'
      };
    }
  }

  /**
   * List files in S3 bucket via backend proxy
   */
  async listFiles(prefix: string = ''): Promise<S3ListResponse> {
    try {
      const url = new URL(`${this.baseUrl}/api/s3/list`);
      if (prefix) {
        url.searchParams.append('prefix', prefix);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;

    } catch (error) {
      console.error('S3 proxy list error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'List failed'
      };
    }
  }

  /**
   * Check S3 proxy service health
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string; bucket?: string; region?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/s3/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        return {
          healthy: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const result = await response.json();
      
      if (result.status === 'success') {
        return {
          healthy: result.data.s3_connected,
          bucket: result.data.bucket,
          region: result.data.region
        };
      } else {
        return {
          healthy: false,
          error: result.error || 'Health check failed'
        };
      }

    } catch (error) {
      console.error('S3 proxy health check error:', error);
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }

  /**
   * Upload image data URL to S3 via backend proxy
   */
  async uploadImage(dataUrl: string, filename?: string): Promise<S3UploadResponse> {
    try {
      // Generate filename if not provided
      if (!filename) {
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        filename = `mzon/images/image-${timestamp}-${randomId}.png`;
      }

      // Extract content type from data URL
      const mimeMatch = dataUrl.match(/data:([^;]+);/);
      const contentType = mimeMatch ? mimeMatch[1] : 'image/png';

      return await this.uploadFile(dataUrl, filename, contentType);

    } catch (error) {
      console.error('S3 proxy image upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Image upload failed'
      };
    }
  }

  /**
   * Upload JSON metadata to S3 via backend proxy
   */
  async uploadMetadata(data: any, key: string): Promise<S3UploadResponse> {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      return await this.uploadFile(jsonString, key, 'application/json');

    } catch (error) {
      console.error('S3 proxy metadata upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Metadata upload failed'
      };
    }
  }
}

// Export singleton instance
export const s3ProxyService = new S3ProxyService();
export default s3ProxyService;
