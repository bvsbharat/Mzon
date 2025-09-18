/**
 * DeepAgent News Service - Integrates with News Hunter DeepAgent backend
 * Provides news content as context for social media generation
 */
import {
  NewsItem,
  NewsCategory,
  AgentUpdate,
  NewsWebSocketMessage
} from '../types';

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:8000';
const WS_URL = BACKEND_URL.replace('http://', 'ws://').replace('https://', 'wss://');

interface DeepAgentResponse {
  type: 'start' | 'stream' | 'complete' | 'error';
  session_id: string;
  agent?: string;
  message: string;
  progress?: number;
  data?: any;
  timestamp?: string;
}

interface NewsContext {
  title: string;
  summary: string;
  keyPoints: string[];
  sentiment: string;
  hashtags: string[];
  socialPosts: any[];
  tags: string[];
  relevanceScore: number;
  trendingPotential: number;
}

class DeepAgentNewsService {
  private activeWebSockets: Map<string, WebSocket> = new Map();
  private sessionData: Map<string, any> = new Map();

  /**
   * Start DeepAgent news discovery
   */
  async startNewsDiscovery(tags: string[], maxArticles: number = 5): Promise<{ sessionId: string; status: string }> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/news/discover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tags,
          max_articles: maxArticles
        })
      });

      if (!response.ok) {
        throw new Error(`Discovery failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        sessionId: data.session_id,
        status: data.status
      };
    } catch (error) {
      console.error('Error starting DeepAgent discovery:', error);
      throw error;
    }
  }

  /**
   * Connect to DeepAgent WebSocket for real-time streaming
   * Following Event Hunter AI pattern
   */
  connectToDeepAgent(
    sessionId: string,
    tags: string[],
    maxArticles: number,
    onUpdate: (update: DeepAgentResponse) => void,
    onComplete: (data: any) => void,
    onError?: (error: string) => void
  ): void {
    const wsUrl = `${WS_URL}/ws/query`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('🤖 Connected to DeepAgent WebSocket');

      // Send query following Event Hunter pattern
      const queryMessage = {
        action: 'start_query',
        session_id: sessionId,
        tags: tags,
        max_articles: maxArticles
      };

      ws.send(JSON.stringify(queryMessage));
      this.activeWebSockets.set(sessionId, ws);
    };

    ws.onmessage = (event) => {
      try {
        const response: DeepAgentResponse = JSON.parse(event.data);

        // Call update handler
        onUpdate(response);

        // Handle completion with full data fetch
        if (response.type === 'complete') {
          this.handleComplete(sessionId, response, onComplete);
        }

        // Handle errors
        if (response.type === 'error') {
          onError?.(response.message);
        }

      } catch (error) {
        console.error('Error parsing DeepAgent message:', error);
        onError?.('Failed to parse agent response');
      }
    };

    ws.onerror = (error) => {
      console.error('DeepAgent WebSocket error:', error);
      onError?.('WebSocket connection error');
    };

    ws.onclose = (event) => {
      console.log('DeepAgent WebSocket closed:', event.code);
      this.activeWebSockets.delete(sessionId);
    };
  }

  /**
   * Handle completion and fetch full session data
   */
  private async handleComplete(sessionId: string, response: DeepAgentResponse, onComplete: (data: any) => void): Promise<void> {
    try {
      // Fetch complete session data with articles and social content
      const articleResponse = await fetch(`${BACKEND_URL}/api/news/articles/${sessionId}`);

      if (articleResponse.ok) {
        const articleData = await articleResponse.json();

        // Store session data for context usage
        this.sessionData.set(sessionId, articleData);

        // Call completion handler with full data
        onComplete({
          sessionId: sessionId,
          articles: articleData.articles,
          totalArticles: articleData.total_articles,
          contentReady: articleData.content_ready,
          sessionSummary: response.data?.session_summary
        });
      } else {
        console.warn('Could not fetch complete session data');
        onComplete(response.data || {});
      }
    } catch (error) {
      console.error('Error fetching session data:', error);
      onComplete(response.data || {});
    }
  }

  /**
   * Get articles with full context for AI generation
   */
  async getArticlesWithContext(sessionId: string): Promise<{ articles: any[], contexts: NewsContext[] }> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/news/articles/${sessionId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch articles');
      }

      const data = await response.json();
      const articles = data.articles || [];

      // Extract contexts for AI generation
      const contexts = articles.map((article: any) => ({
        title: article.title,
        summary: article.summary || article.description,
        keyPoints: article.key_points || [],
        sentiment: article.sentiment || 'neutral',
        hashtags: article.hashtags || [],
        socialPosts: article.social_posts || [],
        tags: article.tags || [],
        relevanceScore: article.relevance_score || 0,
        trendingPotential: article.trending_potential || 0
      }));

      return { articles, contexts };

    } catch (error) {
      console.error('Error getting articles with context:', error);
      throw error;
    }
  }

  /**
   * Get news content as context string for AI generation
   */
  async getNewsContentAsContext(sessionId: string): Promise<string> {
    try {
      const { articles, contexts } = await this.getArticlesWithContext(sessionId);

      // Create comprehensive context string
      const contextParts = [
        "=== NEWS CONTEXT FOR CONTENT GENERATION ===\n"
      ];

      contexts.forEach((context, index) => {
        contextParts.push(`\n--- Article ${index + 1} ---`);
        contextParts.push(`Title: ${context.title}`);
        contextParts.push(`Summary: ${context.summary}`);
        contextParts.push(`Sentiment: ${context.sentiment}`);
        contextParts.push(`Relevance: ${context.relevanceScore}%`);
        contextParts.push(`Trending Potential: ${context.trendingPotential}%`);
        contextParts.push(`Tags: ${context.tags.join(', ')}`);

        if (context.keyPoints.length > 0) {
          contextParts.push(`Key Points: ${context.keyPoints.join('; ')}`);
        }

        if (context.hashtags.length > 0) {
          contextParts.push(`Hashtags: ${context.hashtags.join(' ')}`);
        }

        contextParts.push(""); // Empty line between articles
      });

      return contextParts.join('\n');

    } catch (error) {
      console.error('Error generating news context:', error);
      return "";
    }
  }

  /**
   * Get pre-generated social media posts from DeepAgent
   */
  async getSocialMediaPosts(sessionId: string, platform?: string): Promise<any[]> {
    try {
      const { articles } = await this.getArticlesWithContext(sessionId);

      const allSocialPosts: any[] = [];

      articles.forEach(article => {
        const posts = article.social_posts || [];
        posts.forEach((post: any) => {
          if (!platform || post.platform === platform) {
            allSocialPosts.push({
              ...post,
              articleTitle: article.title,
              articleId: article.id,
              sourceContext: article.summary || article.description
            });
          }
        });
      });

      return allSocialPosts;

    } catch (error) {
      console.error('Error getting social media posts:', error);
      return [];
    }
  }

  /**
   * Create enhanced context for specific content generation
   */
  async createEnhancedContext(sessionId: string, contentType: 'social_post' | 'article' | 'campaign'): Promise<string> {
    try {
      const baseContext = await this.getNewsContentAsContext(sessionId);

      const enhancedContext = [
        baseContext,
        `\n=== CONTENT GENERATION INSTRUCTIONS ===`,
        `Content Type: ${contentType}`,
        `Generate content that:`,
        `- Incorporates insights from the news articles above`,
        `- Maintains the sentiment and tone of the source material`,
        `- Uses relevant hashtags and keywords from the context`,
        `- Adapts the messaging for the specified content type`,
        `- Leverages trending topics and high-relevance articles`,
        `\n=== END CONTEXT ===\n`
      ];

      return enhancedContext.join('\n');

    } catch (error) {
      console.error('Error creating enhanced context:', error);
      return baseContext || "";
    }
  }

  /**
   * Disconnect WebSocket for session
   */
  disconnectSession(sessionId: string): void {
    const ws = this.activeWebSockets.get(sessionId);
    if (ws) {
      ws.close();
      this.activeWebSockets.delete(sessionId);
    }
    this.sessionData.delete(sessionId);
  }

  /**
   * Check if DeepAgent backend is available
   */
  async checkBackendHealth(): Promise<{ healthy: boolean; message: string; agents: string[] }> {
    try {
      const response = await fetch(`${BACKEND_URL}/`);

      if (response.ok) {
        const data = await response.json();
        return {
          healthy: data.status === 'healthy',
          message: data.service || 'DeepAgent connected',
          agents: data.agents || []
        };
      } else {
        return {
          healthy: false,
          message: 'DeepAgent not responding',
          agents: []
        };
      }
    } catch (error) {
      return {
        healthy: false,
        message: 'DeepAgent connection failed',
        agents: []
      };
    }
  }

  /**
   * Get system statistics
   */
  async getSystemStats(): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/news/stats`);

      if (response.ok) {
        return await response.json();
      } else {
        throw new Error('Failed to fetch stats');
      }
    } catch (error) {
      console.error('Error getting system stats:', error);
      return {
        system: "DeepAgent offline",
        active_sessions: 0,
        total_articles_processed: 0,
        status: "error"
      };
    }
  }

  /**
   * Cleanup all connections
   */
  cleanup(): void {
    for (const [sessionId, ws] of this.activeWebSockets) {
      ws.close();
    }
    this.activeWebSockets.clear();
    this.sessionData.clear();
  }
}

// Export singleton instance
export const deepAgentNewsService = new DeepAgentNewsService();

// Export convenience functions
export const startDeepAgentDiscovery = (tags: string[], maxArticles?: number) =>
  deepAgentNewsService.startNewsDiscovery(tags, maxArticles);

export const connectToDeepAgent = (
  sessionId: string,
  tags: string[],
  maxArticles: number,
  onUpdate: (update: any) => void,
  onComplete: (data: any) => void,
  onError?: (error: string) => void
) => deepAgentNewsService.connectToDeepAgent(sessionId, tags, maxArticles, onUpdate, onComplete, onError);

export const getNewsAsContext = (sessionId: string) =>
  deepAgentNewsService.getNewsContentAsContext(sessionId);

export const getEnhancedContext = (sessionId: string, contentType: 'social_post' | 'article' | 'campaign') =>
  deepAgentNewsService.createEnhancedContext(sessionId, contentType);

export const getSocialMediaPosts = (sessionId: string, platform?: string) =>
  deepAgentNewsService.getSocialMediaPosts(sessionId, platform);

export const checkDeepAgentHealth = () =>
  deepAgentNewsService.checkBackendHealth();

export const getDeepAgentStats = () =>
  deepAgentNewsService.getSystemStats();