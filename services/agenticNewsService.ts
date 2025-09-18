/**
 * Agentic News Service - Connects to Python FastAPI backend for intelligent news discovery
 */
import {
  NewsItem,
  NewsCategory,
  NewsStats,
  NewsDiscoveryRequest,
  NewsDiscoveryResponse,
  TagMonitoringRequest,
  AgentUpdate,
  NewsWebSocketMessage
} from '../types';

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:8000';
const WS_URL = BACKEND_URL.replace('http://', 'ws://').replace('https://', 'wss://');

class AgenticNewsService {
  private websockets: Map<string, WebSocket> = new Map();
  private updateCallbacks: Map<string, (update: AgentUpdate) => void> = new Map();

  /**
   * Start intelligent news discovery using multi-agent system
   */
  async startNewsDiscovery(request: NewsDiscoveryRequest): Promise<NewsDiscoveryResponse> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/news/discover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tags: request.tags,
          categories: request.categories?.map(cat => cat),
          max_articles: request.maxArticles || 20,
          language: request.language || 'en',
          country: request.country || 'us'
        })
      });

      if (!response.ok) {
        throw new Error(`News discovery failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        sessionId: data.session_id,
        status: data.status,
        message: data.message,
        articles: data.articles || [],
        totalFound: data.total_found,
        processingTime: data.processing_time
      };
    } catch (error) {
      console.error('Error starting news discovery:', error);
      throw new Error('Failed to start news discovery. Please check your connection.');
    }
  }

  /**
   * Connect to WebSocket for real-time agent updates
   */
  connectToUpdates(
    sessionId: string,
    onUpdate: (update: AgentUpdate) => void,
    onComplete?: (articles: NewsItem[]) => void,
    onError?: (error: string) => void
  ): void {
    const wsUrl = `${WS_URL}/api/news/stream/${sessionId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log(`Connected to news discovery updates for session ${sessionId}`);
    };

    ws.onmessage = (event) => {
      try {
        const message: NewsWebSocketMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'connection_established':
            console.log('WebSocket connection established');
            break;

          case 'agent_update':
            if (message.update) {
              onUpdate(message.update);
            }
            break;

          case 'discovery_completed':
            if (message.update?.data?.processed_articles) {
              onComplete?.(message.update.data.processed_articles);
            }
            break;

          case 'error':
            onError?.(message.message || 'Unknown error occurred');
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      onError?.('Connection error occurred');
    };

    ws.onclose = (event) => {
      console.log(`WebSocket connection closed for session ${sessionId}`, event.code);
      this.websockets.delete(sessionId);
    };

    this.websockets.set(sessionId, ws);
    this.updateCallbacks.set(sessionId, onUpdate);
  }

  /**
   * Disconnect from WebSocket updates
   */
  disconnectFromUpdates(sessionId: string): void {
    const ws = this.websockets.get(sessionId);
    if (ws) {
      ws.close();
      this.websockets.delete(sessionId);
      this.updateCallbacks.delete(sessionId);
    }
  }

  /**
   * Get processed results for a completed session
   */
  async getProcessedResults(sessionId: string): Promise<NewsItem[]> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/news/processed/${sessionId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Session not found or still processing');
        }
        throw new Error(`Failed to get results: ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformBackendArticles(data.articles || []);
    } catch (error) {
      console.error('Error getting processed results:', error);
      throw error;
    }
  }

  /**
   * Start continuous tag monitoring
   */
  async startTagMonitoring(request: TagMonitoringRequest): Promise<{ monitoringId: string; status: string }> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tags/monitor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tags: request.tags,
          interval_minutes: request.intervalMinutes || 60
        })
      });

      if (!response.ok) {
        throw new Error(`Tag monitoring failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error starting tag monitoring:', error);
      throw new Error('Failed to start tag monitoring');
    }
  }

  /**
   * Get news discovery statistics
   */
  async getNewsStats(): Promise<NewsStats> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/news/stats`);

      if (!response.ok) {
        throw new Error(`Failed to get stats: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        freshArticles: data.fresh_articles || 0,
        premiumSources: data.premium_sources || 0,
        activeAPIs: data.active_apis || 0,
        lastUpdate: data.last_update,
        totalArticles: data.total_articles || 0,
        activeSessions: data.active_sessions || 0,
        totalArticlesProcessed: data.total_articles_processed || 0,
        activeMonitors: data.active_monitors || 0,
        cacheHitRate: data.cache_hit_rate || 0,
        averageProcessingTime: data.average_processing_time || 0
      };
    } catch (error) {
      console.error('Error getting news stats:', error);
      // Return default stats on error
      return {
        freshArticles: 0,
        premiumSources: 0,
        activeAPIs: 0,
        lastUpdate: new Date().toISOString(),
        totalArticles: 0,
        activeSessions: 0,
        totalArticlesProcessed: 0,
        activeMonitors: 0,
        cacheHitRate: 0,
        averageProcessingTime: 0
      };
    }
  }

  /**
   * Check backend health
   */
  async checkBackendHealth(): Promise<{ healthy: boolean; message: string }> {
    try {
      const response = await fetch(`${BACKEND_URL}/`);

      if (response.ok) {
        const data = await response.json();
        return {
          healthy: data.status === 'healthy',
          message: data.service || 'Backend connected'
        };
      } else {
        return {
          healthy: false,
          message: 'Backend not responding'
        };
      }
    } catch (error) {
      return {
        healthy: false,
        message: 'Backend connection failed'
      };
    }
  }

  /**
   * Transform backend article format to frontend format
   */
  private transformBackendArticles(backendArticles: any[]): NewsItem[] {
    return backendArticles.map(article => ({
      id: article.id,
      title: article.title,
      description: article.description,
      category: article.category,
      source: article.source,
      publishedAt: article.published_at,
      url: article.url,
      imageUrl: article.image_url,
      credibility: article.credibility_score || 50,
      engagement: article.engagement_score || 50,
      readingTime: article.reading_time || 1,
      isPremium: article.is_premium || false,
      isFresh: this.isArticleFresh(article.published_at),
      isFeatured: article.trending_potential ? article.trending_potential > 70 : false,
      hashtags: article.hashtags || [],
      // Enhanced backend properties
      content: article.content,
      summary: article.summary,
      keyPoints: article.key_points || [],
      sentiment: article.sentiment,
      relevanceScore: article.relevance_score,
      trendingPotential: article.trending_potential,
      tags: article.tags || [],
      socialPosts: article.social_posts || []
    }));
  }

  /**
   * Check if article is fresh (published within last 24 hours)
   */
  private isArticleFresh(publishedAt: string): boolean {
    const publishDate = new Date(publishedAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24;
  }

  /**
   * Cleanup all connections
   */
  cleanup(): void {
    for (const [sessionId, ws] of this.websockets) {
      ws.close();
    }
    this.websockets.clear();
    this.updateCallbacks.clear();
  }
}

// Export singleton instance
export const agenticNewsService = new AgenticNewsService();

// Export fallback functions that use the service
export const startAgenticNewsDiscovery = (request: NewsDiscoveryRequest) =>
  agenticNewsService.startNewsDiscovery(request);

export const connectToNewsUpdates = (
  sessionId: string,
  onUpdate: (update: AgentUpdate) => void,
  onComplete?: (articles: NewsItem[]) => void,
  onError?: (error: string) => void
) => agenticNewsService.connectToUpdates(sessionId, onUpdate, onComplete, onError);

export const disconnectFromNewsUpdates = (sessionId: string) =>
  agenticNewsService.disconnectFromUpdates(sessionId);

export const getAgenticNewsStats = () =>
  agenticNewsService.getNewsStats();

export const checkAgenticBackendHealth = () =>
  agenticNewsService.checkBackendHealth();

export const startTagMonitoring = (request: TagMonitoringRequest) =>
  agenticNewsService.startTagMonitoring(request);

export const getProcessedNewsResults = (sessionId: string) =>
  agenticNewsService.getProcessedResults(sessionId);