import { LiveNewsItem, TrendingTopic, SocialHook, NewsStats, NewsCategory } from '../types';

const BACKEND_URL = 'http://localhost:8000';

export class LiveNewsService {
  private static instance: LiveNewsService;

  public static getInstance(): LiveNewsService {
    if (!LiveNewsService.instance) {
      LiveNewsService.instance = new LiveNewsService();
    }
    return LiveNewsService.instance;
  }

  /**
   * Fetch latest real-time news with engagement metrics
   */
  async fetchLatestNews(
    category?: string,
    limit: number = 50,
    breakingOnly: boolean = false
  ): Promise<LiveNewsItem[]> {
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      params.append('limit', limit.toString());
      if (breakingOnly) params.append('breaking_only', 'true');

      const response = await fetch(`${BACKEND_URL}/api/news/latest?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return this.transformNewsItems(data.data || []);
    } catch (error) {
      console.error('Failed to fetch latest news:', error);
      throw error;
    }
  }

  /**
   * Fetch trending topics with virality analysis
   */
  async fetchTrendingTopics(
    timeframe: string = '24h',
    limit: number = 20,
    category?: string
  ): Promise<TrendingTopic[]> {
    try {
      const params = new URLSearchParams();
      params.append('timeframe', timeframe);
      params.append('limit', limit.toString());
      if (category) params.append('category', category);

      const response = await fetch(`${BACKEND_URL}/api/news/trending?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data?.trending_topics || [];
    } catch (error) {
      console.error('Failed to fetch trending topics:', error);
      throw error;
    }
  }

  /**
   * Fetch social media hooks and viral opportunities
   */
  async fetchSocialHooks(
    platforms?: string[],
    limit: number = 10,
    minEngagementPotential: number = 70
  ): Promise<SocialHook[]> {
    try {
      const params = new URLSearchParams();
      if (platforms && platforms.length > 0) {
        params.append('platforms', platforms.join(','));
      }
      params.append('limit', limit.toString());
      params.append('min_engagement_potential', minEngagementPotential.toString());

      const response = await fetch(`${BACKEND_URL}/api/news/social-hooks?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Failed to fetch social hooks:', error);
      throw error;
    }
  }

  /**
   * Get live news feed configuration
   */
  async getLiveFeedConfig(
    refreshRate: number = 30,
    categories?: string[],
    personalized: boolean = false
  ) {
    try {
      const params = new URLSearchParams();
      params.append('refresh_rate', refreshRate.toString());
      if (categories && categories.length > 0) {
        params.append('categories', categories.join(','));
      }
      params.append('personalized', personalized.toString());

      const response = await fetch(`${BACKEND_URL}/api/news/live-feed?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get live feed config:', error);
      throw error;
    }
  }

  /**
   * Get enhanced system stats from backend
   */
  async getEnhancedStats(): Promise<NewsStats> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/news/stats`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return {
        freshArticles: data.total_articles_processed || 0,
        premiumSources: data.active_agents?.length || 0,
        activeAPIs: data.active_agents?.length || 0,
        lastUpdate: data.last_update || new Date().toISOString(),
        totalArticles: data.total_articles_processed || 0,
        activeSessions: data.active_sessions || 0,
        totalArticlesProcessed: data.total_articles_processed || 0,
        activeMonitors: data.total_sessions || 0,
        cacheHitRate: 85, // Mock for now
        averageProcessingTime: 1.2 // Mock for now
      };
    } catch (error) {
      console.error('Failed to fetch enhanced stats:', error);
      throw error;
    }
  }

  /**
   * Personalize news feed
   */
  async personalizeNewsFeed(preferences: {
    followedTopics: string[];
    preferredSources: string[];
  }) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/news/personalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to personalize news feed:', error);
      throw error;
    }
  }

  /**
   * Check if live news backend is available
   */
  async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/`, {
        method: 'GET',
        timeout: 5000
      } as RequestInit);

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Transform backend news items to frontend format
   */
  private transformNewsItems(items: any[]): LiveNewsItem[] {
    return items.map(item => ({
      id: item.id || Math.random().toString(),
      title: item.title || '',
      description: item.description || '',
      category: item.category as NewsCategory || 'technology',
      source: item.source || 'Unknown',
      publishedAt: item.publishedAt || new Date().toISOString(),
      url: item.url || '#',
      imageUrl: item.imageUrl,
      credibility: item.relevanceScore || 75,
      engagement: item.trendingPotential || 60,
      readingTime: Math.ceil((item.description?.length || 500) / 200),
      isPremium: item.viralityScore > 80,
      isFresh: item.isBreaking || false,
      isFeatured: item.trendingRank ? item.trendingRank <= 3 : false,
      hashtags: item.hashtags || [],
      tags: item.tags || [],
      relevanceScore: item.relevanceScore,
      trendingPotential: item.trendingPotential,
      sentiment: item.sentiment,
      // LiveNewsItem specific properties
      isBreaking: item.isBreaking || false,
      viralityScore: item.viralityScore || 0,
      socialEngagement: item.socialEngagement || {
        totalEngagement: 0,
        sentiment: 'neutral' as const
      },
      trendingRank: item.trendingRank,
      realTimeMetrics: item.realTimeMetrics || {
        views: item.realTimeMetrics?.views || 0,
        shares: item.realTimeMetrics?.shares || 0,
        comments: item.realTimeMetrics?.comments || 0,
        reactions: item.realTimeMetrics?.reactions || 0,
        engagementRate: item.realTimeMetrics?.engagementRate || 0,
        viralityVelocity: item.realTimeMetrics?.viralityVelocity || 0
      },
      lastUpdated: item.lastUpdated || new Date().toISOString(),
      updateFrequency: item.updateFrequency || 'hourly',
      newsSource: item.newsSource || 'api'
    }));
  }
}

// Export singleton instance
export const liveNewsService = LiveNewsService.getInstance();