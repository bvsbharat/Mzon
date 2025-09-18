import { NewsItem, NewsCategory, NewsStats } from '../types';
import { agenticNewsService, startAgenticNewsDiscovery } from './agenticNewsService';

// Enhanced mock news data with backend-compatible properties
const mockNewsData: NewsItem[] = [
  {
    id: '1',
    title: 'AI-Powered Image Generation Reaches New Heights',
    description: 'Latest advancements in generative AI are transforming digital content creation with unprecedented quality and speed.',
    category: 'ai',
    source: 'Tech Daily',
    publishedAt: '2024-01-15T10:30:00Z',
    url: 'https://example.com/news/1',
    imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=200&fit=crop',
    credibility: 87,
    engagement: 85,
    readingTime: 2,
    isPremium: true,
    isFresh: true,
    isFeatured: true,
    hashtags: ['#AI', '#GenerativeAI', '#TechNews'],
    tags: ['ai', 'generative ai', 'technology'],
    relevanceScore: 92,
    trendingPotential: 85,
    sentiment: 'positive' as const
  },
  {
    id: '2',
    title: 'Design Trends Shaping 2024: Minimalism Meets Functionality',
    description: 'Explore the latest design trends that are defining user experiences across digital platforms this year.',
    category: 'design',
    source: 'Design Weekly',
    publishedAt: '2024-01-14T15:45:00Z',
    url: 'https://example.com/news/2',
    imageUrl: 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=400&h=200&fit=crop',
    credibility: 92,
    engagement: 78,
    readingTime: 3,
    isPremium: false,
    isFresh: true,
    isFeatured: false,
    hashtags: ['#Design', '#UX', '#Trends2024'],
    tags: ['design', 'ux', 'trends', 'minimalism'],
    relevanceScore: 88,
    trendingPotential: 75,
    sentiment: 'neutral' as const
  },
  {
    id: '3',
    title: 'Social Media Marketing Automation Tools You Need',
    description: 'Discover the essential automation tools that are streamlining social media marketing campaigns.',
    category: 'marketing',
    source: 'Marketing Hub',
    publishedAt: '2024-01-14T09:15:00Z',
    url: 'https://example.com/news/3',
    imageUrl: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=200&fit=crop',
    credibility: 89,
    engagement: 92,
    readingTime: 1,
    isPremium: true,
    isFresh: false,
    isFeatured: true,
    hashtags: ['#Marketing', '#Automation', '#SocialMedia'],
    tags: ['marketing', 'automation', 'social media', 'tools'],
    relevanceScore: 90,
    trendingPotential: 82,
    sentiment: 'positive' as const
  },
  {
    id: '4',
    title: 'Professional Photography in the Digital Age',
    description: 'How digital tools and AI are reshaping professional photography workflows and creative possibilities.',
    category: 'photography',
    source: 'Photo Pro',
    publishedAt: '2024-01-13T12:00:00Z',
    url: 'https://example.com/news/4',
    imageUrl: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400&h=200&fit=crop',
    credibility: 85,
    engagement: 73,
    readingTime: 4,
    isPremium: false,
    isFresh: false,
    isFeatured: false,
    hashtags: ['#Photography', '#DigitalPhotography', '#AI'],
    tags: ['photography', 'digital', 'ai', 'workflows'],
    relevanceScore: 78,
    trendingPotential: 65,
    sentiment: 'neutral' as const
  },
  {
    id: '5',
    title: 'Startup Funding Trends in Creative Tech',
    description: 'Investment patterns in creative technology startups show promising growth in AI-driven solutions.',
    category: 'business',
    source: 'Startup News',
    publishedAt: '2024-01-13T08:30:00Z',
    url: 'https://example.com/news/5',
    imageUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&h=200&fit=crop',
    credibility: 94,
    engagement: 88,
    readingTime: 3,
    isPremium: true,
    isFresh: false,
    isFeatured: false,
    hashtags: ['#Startups', '#Funding', '#CreativeTech'],
    tags: ['startup', 'funding', 'creative tech', 'investment'],
    relevanceScore: 85,
    trendingPotential: 88,
    sentiment: 'positive' as const
  },
  {
    id: '6',
    title: 'Top 10 Design Tools Every Creative Professional Should Know',
    description: 'Essential design tools and resources that are streamlining creative workflows in 2024.',
    category: 'tools',
    source: 'Tool Review',
    publishedAt: '2024-01-12T16:20:00Z',
    url: 'https://example.com/news/6',
    imageUrl: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=400&h=200&fit=crop',
    credibility: 81,
    engagement: 95,
    readingTime: 2,
    isPremium: false,
    isFresh: false,
    isFeatured: true,
    hashtags: ['#Tools', '#Design', '#CreativeTools'],
    tags: ['tools', 'design', 'creative', 'workflow'],
    relevanceScore: 92,
    trendingPotential: 78,
    sentiment: 'positive' as const
  }
];

/**
 * Gets news statistics - tries agentic backend first, falls back to mock data
 */
export const getNewsStats = async (): Promise<NewsStats> => {
  try {
    // Try to get stats from agentic backend
    const backendHealth = await agenticNewsService.checkBackendHealth();

    if (backendHealth.healthy) {
      return await agenticNewsService.getNewsStats();
    }
  } catch (error) {
    console.warn('Agentic backend not available, using mock data');
  }

  // Fallback to mock data
  await new Promise(resolve => setTimeout(resolve, 200));

  const freshArticles = mockNewsData.filter(item => item.isFresh).length;
  const premiumSources = mockNewsData.filter(item => item.isPremium).length;

  return {
    freshArticles,
    premiumSources,
    activeAPIs: 1,
    lastUpdate: new Date().toISOString(),
    totalArticles: mockNewsData.length,
    activeSessions: 0,
    totalArticlesProcessed: 0,
    activeMonitors: 0,
    cacheHitRate: 0,
    averageProcessingTime: 0
  };
};

/**
 * Fetches news - uses mock data for now, can be extended with agentic discovery
 */
export const fetchNews = async (category?: NewsCategory): Promise<NewsItem[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  let filteredNews = mockNewsData;

  if (category) {
    filteredNews = mockNewsData.filter(item => item.category === category);
  }

  // Sort by published date (newest first)
  return filteredNews.sort((a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
};

/**
 * Start intelligent news discovery with agentic backend
 */
export const discoverNewsWithAgents = async (
  tags: string[],
  categories?: NewsCategory[],
  maxArticles: number = 20
): Promise<{ sessionId: string; status: string; message: string }> => {
  try {
    const response = await startAgenticNewsDiscovery({
      tags,
      categories,
      maxArticles
    });
    return response;
  } catch (error) {
    console.error('Agentic news discovery failed:', error);
    throw error;
  }
};

/**
 * Gets available news categories
 */
export const getNewsCategories = (): { value: NewsCategory; label: string }[] => {
  return [
    { value: 'technology', label: 'Technology' },
    { value: 'ai', label: 'AI & Machine Learning' },
    { value: 'design', label: 'Design & UX' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'photography', label: 'Photography' },
    { value: 'business', label: 'Business' },
    { value: 'tools', label: 'Tools & Resources' },
    { value: 'resources', label: 'Learning Resources' }
  ];
};

/**
 * Searches news by title or description
 * Enhanced with intelligent tag-based search
 */
export const searchNews = async (query: string, category?: NewsCategory): Promise<NewsItem[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));

  let news = await fetchNews(category);

  if (!query.trim()) {
    return news;
  }

  const searchTerm = query.toLowerCase();
  const searchWords = searchTerm.split(' ');

  return news.filter(item => {
    const content = `${item.title} ${item.description} ${item.tags?.join(' ') || ''}`.toLowerCase();

    // Exact phrase match gets highest priority
    if (content.includes(searchTerm)) {
      return true;
    }

    // Tag matching
    if (item.tags) {
      const tagMatch = item.tags.some(tag =>
        tag.toLowerCase().includes(searchTerm) || searchTerm.includes(tag.toLowerCase())
      );
      if (tagMatch) return true;
    }

    // Word-based matching (at least 50% of search words should match)
    const matchedWords = searchWords.filter(word => content.includes(word));
    return matchedWords.length >= Math.ceil(searchWords.length * 0.5);
  }).sort((a, b) => {
    // Sort by relevance score if available, otherwise by date
    if (a.relevanceScore && b.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
};

/**
 * Format date for display with enhanced relative formatting
 */
export const formatNewsDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffDays === 0) {
    if (diffHours === 0) {
      return 'Just now';
    }
    return `${diffHours}h ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
};

/**
 * Check if agentic backend is available
 */
export const checkBackendAvailability = async (): Promise<boolean> => {
  try {
    const health = await agenticNewsService.checkBackendHealth();
    return health.healthy;
  } catch {
    return false;
  }
};

/**
 * Get available tags from articles for suggestion
 */
export const getPopularTags = (): string[] => {
  const allTags = mockNewsData.flatMap(article => article.tags || []);
  const tagCounts = allTags.reduce((counts, tag) => {
    counts[tag] = (counts[tag] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  return Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([tag]) => tag);
};

/**
 * Format trending potential score for display
 */
export const formatTrendingScore = (score?: number): string => {
  if (!score) return 'Unknown';
  if (score >= 80) return 'High 🔥';
  if (score >= 60) return 'Medium 📈';
  if (score >= 40) return 'Low 📊';
  return 'Minimal ➡️';
};

/**
 * Format sentiment for display
 */
export const formatSentiment = (sentiment?: string): string => {
  switch (sentiment) {
    case 'positive': return '😊 Positive';
    case 'negative': return '😟 Negative';
    case 'neutral': return '😐 Neutral';
    default: return '❓ Unknown';
  }
};

// Re-export agentic news service functions for convenience
export {
  agenticNewsService,
  startAgenticNewsDiscovery,
  getAgenticNewsStats,
  checkAgenticBackendHealth,
  startTagMonitoring,
  connectToNewsUpdates,
  disconnectFromNewsUpdates,
  getProcessedNewsResults
} from './agenticNewsService';