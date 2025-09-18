

export interface ApiPart {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

export type GalleryImage = {
  id: string;
  url: string;
  name: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: number;
};

// FIX: Moved View and ComposerGenContext types here from App.tsx to resolve circular dependencies.
export type View = 'photo' | 'variation' | 'composer' | 'edit' | 'library' | 'imageGenerator' | 'campaign' | 'platform' | 'newsHub' | 'contentCreator';
export type ComposerGenContext = { targetSlot: number } | null;

// News and Content types
export type NewsCategory = 'technology' | 'design' | 'ai' | 'marketing' | 'photography' | 'business' | 'tools' | 'resources';

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  category: NewsCategory;
  source: string;
  publishedAt: string;
  url: string;
  imageUrl?: string;
  // Enhanced properties for dashboard interface
  credibility: number; // 0-100 percentage
  engagement: number; // 0-100 score
  readingTime: number; // in minutes
  isPremium: boolean;
  isFresh: boolean;
  isFeatured: boolean;
  hashtags: string[];
  // Additional properties from backend
  content?: string;
  summary?: string;
  keyPoints?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  relevanceScore?: number;
  trendingPotential?: number;
  tags: string[];
  socialPosts?: SocialMediaPost[];
}

export interface NewsStats {
  freshArticles: number;
  premiumSources: number;
  activeAPIs: number;
  lastUpdate: string;
  totalArticles: number;
  // Additional stats from backend
  activeSessions: number;
  totalArticlesProcessed: number;
  activeMonitors: number;
  cacheHitRate: number;
  averageProcessingTime: number;
}

export type MediaType = 'image' | 'video' | 'mixed';
export type SocialPlatform = 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'youtube' | 'tiktok' | 'threads';
export type VideoStyle = 'news_report' | 'social_story' | 'explainer' | 'highlight_reel';

export interface NewsContentWorkflow {
  selectedNewsItem: NewsItem | null;
  step: 'news_selection' | 'media_type_selection' | 'content_generation' | 'content_finalization';
  mediaType: MediaType | null;
  targetPlatforms: SocialPlatform[];
  generatedAssets: {
    images: string[];
    videos: string[];
    text: string;
    hashtags: string[];
  };
  // Enhanced with agentic discovery
  discoverySession?: {
    sessionId: string;
    isActive: boolean;
    progress: number;
    agentUpdates: AgentUpdate[];
  };
}

export interface SocialMediaPost {
  platform: 'twitter' | 'instagram' | 'linkedin' | 'facebook';
  content: string;
  hashtags: string[];
  imageUrl?: string;
  characterCount: number;
  engagementPrediction?: number;
}

// Enhanced real-time news types
export interface RealTimeMetrics {
  views: number;
  shares: number;
  comments: number;
  reactions: number;
  engagementRate: number;
  viralityVelocity: number; // How fast it's spreading
  peakTime?: string;
}

export interface SocialEngagementData {
  twitter?: { mentions: number; retweets: number; likes: number; };
  facebook?: { shares: number; likes: number; comments: number; };
  reddit?: { upvotes: number; comments: number; awards: number; };
  instagram?: { likes: number; comments: number; shares: number; };
  totalEngagement: number;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
}

export interface LiveNewsItem extends NewsItem {
  isBreaking: boolean;
  viralityScore: number; // 0-100 how viral this story is
  socialEngagement: SocialEngagementData;
  trendingRank?: number; // Position in trending topics
  realTimeMetrics: RealTimeMetrics;
  lastUpdated: string;
  updateFrequency: 'realtime' | 'hourly' | 'daily';
  newsSource: 'api' | 'rss' | 'social' | 'manual';
}

export interface TrendingTopic {
  id: string;
  keyword: string;
  trend: 'rising' | 'hot' | 'emerging' | 'declining';
  volume: number; // Search/mention volume
  changeRate: number; // Percentage change in last hour
  platforms: SocialPlatform[];
  relatedNews: NewsItem[];
  timeframe: '1h' | '24h' | '7d';
  category: NewsCategory;
  geography?: string; // Where it's trending
}

export interface SocialHook {
  id: string;
  platform: SocialPlatform;
  hookType: 'trending_hashtag' | 'viral_topic' | 'breaking_news' | 'meme' | 'controversy';
  content: string;
  engagementPotential: number; // 0-100 predicted engagement
  trendingHashtags: string[];
  optimalPostTime: string;
  expiryTime: string; // When this hook becomes irrelevant
  difficulty: 'easy' | 'medium' | 'hard'; // How hard to create content for
  competitionLevel: number; // How many others are using this hook
}

export interface BreakingNewsAlert {
  id: string;
  headline: string;
  summary: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: NewsCategory;
  timestamp: string;
  source: string;
  relatedTopics: string[];
  actionable: boolean; // Can user create content from this
  imageUrl?: string;
}

export interface NewsPersonalization {
  userId?: string;
  followedTopics: string[];
  blockedSources: string[];
  preferredSources: string[];
  notificationSettings: {
    breakingNews: boolean;
    trendingTopics: boolean;
    socialHooks: boolean;
  };
  contentPreferences: {
    includeImages: boolean;
    preferredLanguage: string;
    readingLevel: 'basic' | 'intermediate' | 'advanced';
  };
}

export interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'youtube' | 'tiktok';
  type: 'post' | 'story' | 'reel' | 'carousel';
  dimensions: {
    width: number;
    height: number;
  };
  templateUrl?: string;
}

export interface ContentProject {
  id: string;
  name: string;
  description: string;
  template: ContentTemplate;
  content: {
    text: string;
    images: string[];
    hashtags: string[];
  };
  createdAt: number;
  updatedAt: number;
}

// Agentic News Discovery Types
export interface AgentUpdate {
  agentName: string;
  status: 'idle' | 'searching' | 'processing' | 'completed' | 'error';
  message: string;
  progress?: number;
  data?: any;
  timestamp: string;
}

export interface NewsDiscoveryRequest {
  tags: string[];
  categories?: NewsCategory[];
  maxArticles?: number;
  language?: string;
  country?: string;
}

export interface NewsDiscoveryResponse {
  sessionId: string;
  status: string;
  message: string;
  articles?: NewsItem[];
  totalFound?: number;
  processingTime?: number;
}

export interface TagMonitoringRequest {
  tags: string[];
  intervalMinutes?: number;
}

export interface NewsWebSocketMessage {
  type: 'connection_established' | 'agent_update' | 'discovery_completed' | 'error';
  sessionId: string;
  update?: AgentUpdate;
  message?: string;
}
