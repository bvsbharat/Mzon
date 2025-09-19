import { NewsItem, NewsCategory, NewsStats } from '../types';
import { agenticNewsService, startAgenticNewsDiscovery } from './agenticNewsService';

// STRICT: NO MOCK DATA - Backend only
// All mock news data removed - system will fail gracefully if backend is not available

/**
 * Gets news statistics - STRICT: Backend only, no mock data
 */
export const getNewsStats = async (): Promise<NewsStats> => {
  try {
    // STRICT: Only try agentic backend
    const backendHealth = await agenticNewsService.checkBackendHealth();

    if (backendHealth.healthy) {
      return await agenticNewsService.getNewsStats();
    } else {
      throw new Error('Backend is not healthy');
    }
  } catch (error) {
    console.error('Backend not available:', error);
    throw new Error('News service backend is not available. Cannot load statistics without backend connection.');
  }
};

/**
 * Fetches news - STRICT: Backend only, no mock data
 */
export const fetchNews = async (category?: NewsCategory): Promise<NewsItem[]> => {
  try {
    // Call the backend API directly
    const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:8000';
    const url = new URL(`${backendUrl}/api/news/latest`);
    
    if (category) {
      url.searchParams.append('category', category);
    }
    url.searchParams.append('limit', '50');

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== 'success') {
      throw new Error(data.message || 'Failed to fetch news');
    }

    return data.data || [];

  } catch (error) {
    console.error('News fetching failed:', error);
    throw new Error(`Cannot fetch news: ${error instanceof Error ? error.message : 'Backend connection failed'}`);
  }
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
 * Searches news using Bright Data SERP API via backend
 */
export const searchNews = async (query: string, category?: NewsCategory): Promise<NewsItem[]> => {
  try {
    // STRICT: Only use backend search with Bright Data
    const backendHealth = await agenticNewsService.checkBackendHealth();

    if (!backendHealth.healthy) {
      throw new Error('Backend is not available for search');
    }

    const searchUrl = new URL(`${process.env.VITE_BACKEND_URL || 'http://localhost:8000'}/api/news/search`);
    searchUrl.searchParams.append('query', query);
    if (category) {
      searchUrl.searchParams.append('category', category);
    }
    searchUrl.searchParams.append('limit', '20');

    const response = await fetch(searchUrl.toString());

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== 'success') {
      throw new Error('Search request failed');
    }

    return data.data || [];

  } catch (error) {
    console.error('News search failed:', error);
    throw new Error(`Cannot search news: ${error instanceof Error ? error.message : 'Search service unavailable'}`);
  }
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
 * Get available tags from articles for suggestion - STRICT: Backend only
 */
export const getPopularTags = async (): Promise<string[]> => {
  try {
    // STRICT: Only get tags from backend
    const backendHealth = await agenticNewsService.checkBackendHealth();

    if (!backendHealth.healthy) {
      throw new Error('Backend is not available for tag suggestions');
    }

    // This would need to be implemented in agenticNewsService for real tags
    throw new Error('Backend tag fetching not yet implemented. Backend connection required.');

  } catch (error) {
    console.error('Popular tags fetching failed:', error);
    throw new Error(`Cannot fetch popular tags: ${error instanceof Error ? error.message : 'Backend connection required'}`);
  }
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