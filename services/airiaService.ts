export interface AiriaExecutionRequest {
  userId: string;
  userInput: string;
  asyncOutput?: boolean;
}

export interface AiriaExecutionResponse {
  success: boolean;
  data?: any;
  error?: string;
  executionId?: string;
}

export interface SocialMediaPostRequest {
  platform: 'twitter' | 'linkedin' | 'instagram' | 'facebook';
  content: string;
  mediaUrls?: string[];
  hashtags?: string[];
  scheduledTime?: string;
  targetAudience?: string;
}

class AiriaService {
  private apiKey: string;
  private userId: string;
  private pipelineId: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_AIRIA_API_KEY || '';
    this.userId = import.meta.env.VITE_AIRIA_USER_ID || '';
    this.pipelineId = '4c574c43-a615-4c06-890b-b7179511223e';
    this.baseUrl = 'https://api.airia.ai/v2/PipelineExecution';
  }

  /**
   * Execute Airia pipeline for social media posting
   */
  async executeSocialMediaPost(postRequest: SocialMediaPostRequest): Promise<AiriaExecutionResponse> {
    if (!this.apiKey || !this.userId) {
      throw new Error('Airia API key and User ID must be configured in environment variables');
    }

    try {
      // Format the user input for the Airia agent
      const userInput = this.formatUserInputForAiria(postRequest);

      const requestBody: AiriaExecutionRequest = {
        userId: this.userId,
        userInput,
        asyncOutput: false
      };

      const response = await fetch(`${this.baseUrl}/${this.pipelineId}`, {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Airia API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();

      return {
        success: true,
        data: result,
        executionId: result.executionId || result.id
      };
    } catch (error) {
      console.error('Error executing Airia social media post:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Format the social media post request into a user input string for Airia
   */
  private formatUserInputForAiria(postRequest: SocialMediaPostRequest): string {
    const parts: string[] = [];

    // Add platform specification
    parts.push(`Post to ${postRequest.platform.toUpperCase()}`);

    // Add main content
    parts.push(`Content: "${postRequest.content}"`);

    // Add hashtags if provided
    if (postRequest.hashtags && postRequest.hashtags.length > 0) {
      parts.push(`Hashtags: ${postRequest.hashtags.map(tag => `#${tag}`).join(' ')}`);
    }

    // Add media URLs if provided
    if (postRequest.mediaUrls && postRequest.mediaUrls.length > 0) {
      parts.push(`Media: ${postRequest.mediaUrls.join(', ')}`);
    }

    // Add scheduling information if provided
    if (postRequest.scheduledTime) {
      parts.push(`Schedule for: ${postRequest.scheduledTime}`);
    }

    // Add target audience if provided
    if (postRequest.targetAudience) {
      parts.push(`Target audience: ${postRequest.targetAudience}`);
    }

    return parts.join('\n');
  }

  /**
   * Execute pipeline with custom user input
   */
  async executeCustomPipeline(userInput: string, asyncOutput: boolean = false): Promise<AiriaExecutionResponse> {
    if (!this.apiKey || !this.userId) {
      throw new Error('Airia API key and User ID must be configured in environment variables');
    }

    try {
      const requestBody: AiriaExecutionRequest = {
        userId: this.userId,
        userInput,
        asyncOutput
      };

      const response = await fetch(`${this.baseUrl}/${this.pipelineId}`, {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Airia API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();

      return {
        success: true,
        data: result,
        executionId: result.executionId || result.id
      };
    } catch (error) {
      console.error('Error executing Airia pipeline:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Check if Airia service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.userId);
  }

  /**
   * Get configuration status
   */
  getConfigurationStatus(): {
    hasApiKey: boolean;
    hasUserId: boolean;
    isFullyConfigured: boolean;
  } {
    return {
      hasApiKey: !!this.apiKey,
      hasUserId: !!this.userId,
      isFullyConfigured: this.isConfigured()
    };
  }
}

// Export singleton instance
export const airiaService = new AiriaService();
