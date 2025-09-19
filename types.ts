

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
export type View = 'photo' | 'variation' | 'composer' | 'edit' | 'library' | 'imageGenerator' | 'campaign' | 'platform' | 'newsHub' | 'contentCreator' | 'socialScheduler' | 'videoViewer';
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
  // Article content fetching
  articleContent?: {
    content: string;
    summary: string;
    keyPoints: string[];
    wordCount: number;
    readingTime: number;
    fetchedAt: string;
    error?: string;
  };
  // Brand context for content generation
  brandContext?: {
    brandName: string;
    brandVoice: string;
    brandDescription: string;
    targetAudience: string;
    keyMessages: string[];
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

// Brand Configuration Types
export interface BrandConfiguration {
  brandName: string;
  brandVoice: 'professional' | 'casual' | 'friendly' | 'authoritative' | 'playful' | 'formal';
  brandDescription: string;
  targetAudience: string;
  keyMessages: string[];
  industry: string;
  companySize: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  contentStyle: 'informative' | 'entertaining' | 'inspiring' | 'educational' | 'promotional';
  hashtagPreferences: string[];
  avoidWords: string[];
}

// Generated Content Types
export interface GeneratedContent {
  id: string;
  type: 'social_post' | 'email' | 'article' | 'campaign';
  platform?: SocialPlatform;
  content: string;
  title?: string;
  subject?: string; // For emails
  hashtags: string[];
  images: string[];
  wordCount: number;
  estimatedEngagement: number;
  brandCompliance: number; // 0-100 how well it matches brand guidelines
  generatedAt: string;
  sourceNewsId?: string;
  variations?: GeneratedContent[]; // Alternative versions
}

// Email Generation Types
export interface EmailContent extends GeneratedContent {
  type: 'email';
  subject: string;
  preheader: string;
  bodyHtml: string;
  bodyText: string;
  emailType: 'newsletter' | 'promotional' | 'transactional' | 'announcement';
  callToAction: {
    text: string;
    url: string;
  };
}

// Video Generation Types
export interface VideoContent extends GeneratedContent {
  type: 'video';
  videoUrl: string;
  compositeImageUrl?: string;
  duration: '8s';
  aspectRatio: '16:9' | '9:16' | 'auto';
  resolution: '720p' | '1080p';
  hasAudio: boolean;
  videoStyle: 'promotional' | 'news_update' | 'product_showcase' | 'story_format';
  processingTime?: number;
  fileSize?: number;
  thumbnailUrl?: string;
}

export interface VideoGenerationRequest {
  newsItem: NewsItem;
  productImageUrl: string;
  platform: SocialPlatform;
  brandContext?: BrandConfiguration;
  customPrompt?: string;
  includeAudio?: boolean;
  videoStyle?: VideoContent['videoStyle'];
}

export interface VideoGenerationResult {
  success: boolean;
  videoContent?: VideoContent;
  compositeImageUrl?: string;
  error?: string;
  processingTimeMs?: number;
  steps: {
    compositeImageGeneration: { success: boolean; timeMs: number; error?: string };
    videoGeneration: { success: boolean; timeMs: number; error?: string };
  };
}

export interface CompositeImageRequest {
  productImageUrl: string;
  newsTitle: string;
  newsDescription: string;
  keyPoints?: string[];
  brandContext?: {
    brandName: string;
    brandColors?: string[];
    brandStyle?: string;
  };
}

// Extended GeneratedContent type to include video
export type ExtendedGeneratedContent = GeneratedContent | EmailContent | VideoContent;

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
  retry_count?: number;
  last_error?: string;
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

export interface SocialPlatformConfig {
  platform: 'twitter' | 'linkedin' | 'instagram' | 'facebook';
  maxLength: number;
  supportsImages: boolean;
  supportsHashtags: boolean;
  hashtagLimit?: number;
  icon: string;
  color: string;
}

export interface CalendarEvent {
  id: string;
  date: string;
  scheduled_content: ScheduledContent[];
  total_posts: number;
}

export interface ContentGenerationSettings {
  platform: 'twitter' | 'linkedin' | 'instagram' | 'facebook';
  tone: 'professional' | 'casual' | 'engaging' | 'informative';
  includeHashtags: boolean;
  includeEmojis: boolean;
  includeCallToAction: boolean;
  maxLength?: number;
}

// Composio Publishing Types
export type PublishPlatform = 'linkedin' | 'email';

export interface PublishOptions {
  platform: PublishPlatform;
  content: string;
  title?: string;
  images?: string[];
  hashtags?: string[];
  // LinkedIn specific
  visibility?: 'public' | 'connections' | 'logged-in';
  // Email specific
  recipients?: string[];
  subject?: string;
}

export interface PublishResult {
  success: boolean;
  platform: PublishPlatform;
  publishedId?: string;
  publishedUrl?: string;
  error?: string;
  timestamp: number;
}

export interface ComposioConnectionStatus {
  platform: PublishPlatform;
  connected: boolean;
  connectedAccountId?: string;
  connectionUrl?: string;
  lastChecked: number;
}

export interface ComposioConnection {
  id: string;
  platform: PublishPlatform;
  status: 'connected' | 'disconnected' | 'pending';
  accountInfo?: {
    name?: string;
    email?: string;
    profileUrl?: string;
  };
  connectedAt?: number;
  redirectUrl?: string;
}

export interface PublishHistoryItem {
  id: string;
  contentId: string;
  platform: PublishPlatform;
  publishedAt: number;
  publishResult: PublishResult;
  content: {
    text: string;
    title?: string;
    hashtags: string[];
    images: string[];
  };
}
