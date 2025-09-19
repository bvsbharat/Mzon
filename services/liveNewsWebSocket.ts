import { LiveNewsItem, TrendingTopic, SocialHook } from '../types';

interface WebSocketMessage {
  type: 'connection_established' | 'initial_data' | 'live_update' | 'error';
  client_id?: string;
  message?: string;
  data?: {
    latest_news?: any[];
    trending_topics?: any[];
    social_hooks?: any[];
    update_type?: string;
  };
  timestamp: string;
}

interface LiveNewsCallbacks {
  onConnect?: (clientId: string) => void;
  onInitialData?: (data: {
    latest_news: LiveNewsItem[],
    trending_topics: TrendingTopic[],
    social_hooks: SocialHook[]
  }) => void;
  onLiveUpdate?: (data: {
    latest_news: LiveNewsItem[],
    trending_topics: TrendingTopic[]
  }) => void;
  onError?: (error: string) => void;
  onDisconnect?: () => void;
}

export class LiveNewsWebSocket {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private callbacks: LiveNewsCallbacks = {};
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private backendUrl: string;

  constructor(backendUrl: string = 'ws://localhost:8000') {
    this.backendUrl = backendUrl;
  }

  /**
   * Connect to the live news WebSocket
   */
  connect(callbacks: LiveNewsCallbacks): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.callbacks = callbacks;
    this.isConnecting = true;

    try {
      this.ws = new WebSocket(`${this.backendUrl}/ws/live-news`);

      this.ws.onopen = () => {
        console.log('🔌 Connected to live news WebSocket');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('🔌 Live news WebSocket disconnected:', event.code, event.reason);
        this.isConnecting = false;
        this.callbacks.onDisconnect?.();

        // Attempt to reconnect unless it was a manual close
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('🔌 Live news WebSocket error:', error);
        this.isConnecting = false;
        this.callbacks.onError?.('WebSocket connection error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.callbacks.onError?.('Failed to connect to live news feed');
    }
  }

  /**
   * Disconnect from the WebSocket
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }

    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: WebSocketMessage): void {
    console.log('📡 Live news update:', message.type);

    switch (message.type) {
      case 'connection_established':
        if (message.client_id) {
          this.callbacks.onConnect?.(message.client_id);
        }
        break;

      case 'initial_data':
        if (message.data) {
          const transformedData = {
            latest_news: this.transformNewsItems(message.data.latest_news || []),
            trending_topics: message.data.trending_topics || [],
            social_hooks: message.data.social_hooks || []
          };
          this.callbacks.onInitialData?.(transformedData);
        }
        break;

      case 'live_update':
        if (message.data) {
          const transformedData = {
            latest_news: this.transformNewsItems(message.data.latest_news || []),
            trending_topics: message.data.trending_topics || []
          };
          this.callbacks.onLiveUpdate?.(transformedData);
        }
        break;

      case 'error':
        if (message.message) {
          this.callbacks.onError?.(message.message);
        }
        break;

      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s
    this.reconnectAttempts++;

    console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    this.reconnectTimeout = setTimeout(() => {
      if (this.callbacks) {
        this.connect(this.callbacks);
      }
    }, delay);
  }

  /**
   * Transform backend news items to frontend format
   */
  private transformNewsItems(items: any[]): LiveNewsItem[] {
    return items.map(item => ({
      id: item.id || Math.random().toString(),
      title: item.title || '',
      description: item.description || '',
      category: item.category || 'technology',
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
export const liveNewsWebSocket = new LiveNewsWebSocket();