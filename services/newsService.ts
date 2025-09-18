import { NewsItem, NewsCategory, NewsStats } from '../types';

// Mock news data for demonstration
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
    hashtags: ['#AI', '#GenerativeAI', '#TechNews']
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
    hashtags: ['#Design', '#UX', '#Trends2024']
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
    hashtags: ['#Marketing', '#Automation', '#SocialMedia']
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
    hashtags: ['#Photography', '#DigitalPhotography', '#AI']
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
    hashtags: ['#Startups', '#Funding', '#CreativeTech']
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
    hashtags: ['#Tools', '#Design', '#CreativeTools']
  }
];

/**
 * Gets news statistics for dashboard display
 */
export const getNewsStats = async (): Promise<NewsStats> => {
  await new Promise(resolve => setTimeout(resolve, 200));

  const freshArticles = mockNewsData.filter(item => item.isFresh).length;
  const premiumSources = mockNewsData.filter(item => item.isPremium).length;

  return {
    freshArticles,
    premiumSources,
    activeAPIs: 1, // Mock value for now
    lastUpdate: new Date().toISOString(),
    totalArticles: mockNewsData.length
  };
};

/**
 * Simulates fetching news from an API
 * In a real implementation, this would make HTTP requests to news APIs like NewsAPI, RSS feeds, etc.
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
 */
export const searchNews = async (query: string, category?: NewsCategory): Promise<NewsItem[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));

  let news = await fetchNews(category);

  if (!query.trim()) {
    return news;
  }

  const searchTerm = query.toLowerCase();
  return news.filter(item =>
    item.title.toLowerCase().includes(searchTerm) ||
    item.description.toLowerCase().includes(searchTerm)
  );
};

/**
 * Format date for display
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