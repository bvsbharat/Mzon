import { NewsItem } from '../types';

// Social Media Scheduling Types
export interface ScheduledContent {
  id: string;
  content_id: string;
  platform: 'twitter' | 'linkedin' | 'instagram' | 'facebook';
  content_type: 'post' | 'story' | 'video';
  title?: string;
  content_text: string;
  media_urls: string[];
  hashtags: string[];
  scheduled_time: string;
  created_at: string;
  status: 'scheduled' | 'posted' | 'failed' | 'cancelled';
  posted_at?: string;
  engagement_data?: {
    likes: number;
    shares: number;
    comments: number;
  };
  campaign_id?: string;
  ai_generated: boolean;
  source_news?: {
    title: string;
    url: string;
  };
}

export interface ContentAnalytics {
  content_id: string;
  metric_name: string;
  metric_value: number;
  platform: string;
  recorded_at: string;
}

export interface ScheduleContentRequest {
  platform: 'twitter' | 'linkedin' | 'instagram' | 'facebook';
  content_type?: 'post' | 'story' | 'video';
  title?: string;
  content_text: string;
  media_urls?: string[];
  hashtags?: string[];
  scheduled_time: string;
  campaign_id?: string;
  target_audience?: any;
  ai_generated?: boolean;
  source_news_id?: string;
}

export interface GenerateFromNewsRequest {
  category?: string;
  platform: 'twitter' | 'linkedin' | 'instagram' | 'facebook';
  limit?: number;
}

class SocialSchedulingService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.VITE_BACKEND_URL || 'http://localhost:8000';
  }

  /**
   * Schedule social media content
   */
  async scheduleContent(contentData: ScheduleContentRequest): Promise<{ content_id: string; scheduled_time: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/social/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content_id: crypto.randomUUID(),
          ...contentData
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to schedule content: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.status !== 'success') {
        throw new Error(result.detail || 'Failed to schedule content');
      }

      return {
        content_id: result.content_id,
        scheduled_time: result.scheduled_time
      };
    } catch (error) {
      console.error('Error scheduling content:', error);
      throw error;
    }
  }

  /**
   * Get scheduled content by platform and status
   */
  async getScheduledContent(
    platform?: string,
    status: string = 'scheduled',
    limit: number = 20
  ): Promise<ScheduledContent[]> {
    try {
      const params = new URLSearchParams({
        status,
        limit: limit.toString()
      });

      if (platform) {
        params.append('platform', platform);
      }

      const response = await fetch(`${this.baseUrl}/api/social/scheduled?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch scheduled content: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.status !== 'success') {
        throw new Error(result.detail || 'Failed to fetch scheduled content');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching scheduled content:', error);
      return [];
    }
  }

  /**
   * Update content status (posted, failed, cancelled)
   */
  async updateContentStatus(
    contentId: string,
    status: 'posted' | 'failed' | 'cancelled',
    engagementData?: { likes: number; shares: number; comments: number }
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/social/${contentId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          engagement_data: engagementData
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update content status: ${response.statusText}`);
      }

      const result = await response.json();
      return result.status === 'success';
    } catch (error) {
      console.error('Error updating content status:', error);
      return false;
    }
  }

  /**
   * Generate social media content from cached news articles
   */
  async generateContentFromNews(request: GenerateFromNewsRequest): Promise<ScheduledContent[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/social/generate-from-news`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Failed to generate content from news: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.status !== 'success') {
        throw new Error(result.detail || 'Failed to generate content from news');
      }

      return result.data;
    } catch (error) {
      console.error('Error generating content from news:', error);
      throw error;
    }
  }

  /**
   * Get content performance analytics
   */
  async getContentAnalytics(
    platform?: string,
    daysBack: number = 7,
    limit: number = 50
  ): Promise<ContentAnalytics[]> {
    try {
      const params = new URLSearchParams({
        days_back: daysBack.toString(),
        limit: limit.toString()
      });

      if (platform) {
        params.append('platform', platform);
      }

      const response = await fetch(`${this.baseUrl}/api/analytics/content-performance?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.status !== 'success') {
        return []; // Analytics endpoint may not be fully implemented yet
      }

      return result.data || [];
    } catch (error) {
      console.error('Error fetching content analytics:', error);
      return [];
    }
  }

  /**
   * Delete scheduled content
   */
  async deleteScheduledContent(contentId: string): Promise<boolean> {
    return await this.updateContentStatus(contentId, 'cancelled');
  }

  /**
   * Get database connection status
   */
  async getDatabaseStatus(): Promise<{ connected: boolean; tables: Record<string, string> }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/database/stats`);

      if (!response.ok) {
        return { connected: false, tables: {} };
      }

      const result = await response.json();

      return {
        connected: result.status === 'success',
        tables: result.tables || {}
      };
    } catch (error) {
      console.error('Error checking database status:', error);
      return { connected: false, tables: {} };
    }
  }

  /**
   * Quick schedule from news item
   */
  async quickScheduleFromNews(
    newsItem: NewsItem,
    platform: 'twitter' | 'linkedin' | 'instagram' | 'facebook',
    scheduledTime: string
  ): Promise<string> {
    let content = '';
    const hashtags: string[] = newsItem.hashtags || [];

    // Generate platform-specific content
    switch (platform) {
      case 'twitter':
        content = `🚀 ${newsItem.title}\n\n${newsItem.description.substring(0, 120)}...\n\n#News #${newsItem.category}`;
        hashtags.push('News', newsItem.category);
        break;
      case 'linkedin':
        content = `📰 Industry Update: ${newsItem.title}\n\n${newsItem.description}\n\nThoughts? 💭\n\n#Industry #Business #${newsItem.category}`;
        hashtags.push('Industry', 'Business', newsItem.category);
        break;
      case 'instagram':
        content = `📊 ${newsItem.title}\n.\n.\n.\n#news #trending #${newsItem.category}`;
        hashtags.push('news', 'trending', newsItem.category);
        break;
      case 'facebook':
        content = `${newsItem.title}\n\n${newsItem.description}\n\nRead more: ${newsItem.url}`;
        break;
    }

    const result = await this.scheduleContent({
      platform,
      content_text: content,
      hashtags: hashtags.slice(0, 10), // Limit hashtags
      scheduled_time: scheduledTime,
      ai_generated: true,
      source_news_id: newsItem.id
    });

    return result.content_id;
  }

  /**
   * Get platform-specific character limits and formatting rules
   */
  getPlatformLimits(platform: string): {
    maxLength: number;
    supportsImages: boolean;
    supportsHashtags: boolean;
    hashtagLimit?: number;
  } {
    switch (platform) {
      case 'twitter':
        return { maxLength: 280, supportsImages: true, supportsHashtags: true, hashtagLimit: 5 };
      case 'linkedin':
        return { maxLength: 3000, supportsImages: true, supportsHashtags: true, hashtagLimit: 3 };
      case 'instagram':
        return { maxLength: 2200, supportsImages: true, supportsHashtags: true, hashtagLimit: 30 };
      case 'facebook':
        return { maxLength: 63206, supportsImages: true, supportsHashtags: true, hashtagLimit: 10 };
      default:
        return { maxLength: 280, supportsImages: false, supportsHashtags: false };
    }
  }

  /**
   * Format content for specific platform
   */
  formatContentForPlatform(content: string, platform: string): string {
    const limits = this.getPlatformLimits(platform);

    if (content.length <= limits.maxLength) {
      return content;
    }

    // Truncate with ellipsis
    return content.substring(0, limits.maxLength - 3) + '...';
  }
}

// Export singleton instance
export const socialSchedulingService = new SocialSchedulingService();