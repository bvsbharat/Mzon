import { NewsItem, LiveNewsItem, TrendingTopic, SocialHook, NewsStats, NewsCategory } from '../types';
import { liveNewsService } from './liveNewsService';
import { fetchNews, searchNews, getNewsStats } from './newsService';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expires: number;
  key: string;
}

interface CacheMetadata {
  totalEntries: number;
  lastCleanup: number;
  cacheHits: number;
  cacheMisses: number;
}

export class NewsCacheService {
  private static instance: NewsCacheService;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly CACHE_DIR = 'news_cache';
  private readonly METADATA_FILE = 'cache_metadata.json';
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly TRENDING_TTL = 10 * 60 * 1000; // 10 minutes for trending topics
  private readonly STATS_TTL = 2 * 60 * 1000; // 2 minutes for stats
  private metadata: CacheMetadata = {
    totalEntries: 0,
    lastCleanup: Date.now(),
    cacheHits: 0,
    cacheMisses: 0
  };

  private constructor() {
    this.initializeCache();
    this.setupCleanupInterval();
  }

  public static getInstance(): NewsCacheService {
    if (!NewsCacheService.instance) {
      NewsCacheService.instance = new NewsCacheService();
    }
    return NewsCacheService.instance;
  }

  /**
   * Initialize cache directory and load existing cache
   */
  private async initializeCache(): Promise<void> {
    try {
      // In browser environment, use localStorage as fallback
      if (typeof window !== 'undefined') {
        this.loadFromLocalStorage();
      }
    } catch (error) {
      console.warn('Failed to initialize cache:', error);
    }
  }

  /**
   * Generate cache key for requests
   */
  private generateCacheKey(type: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${type}_${sortedParams}`;
  }

  /**
   * Check if cache entry is valid
   */
  private isValidEntry<T>(entry: CacheEntry<T>): boolean {
    return entry && entry.expires > Date.now();
  }

  /**
   * Get cached data or fetch from API
   */
  async getLatestNews(
    category?: string,
    limit: number = 5,
    forceRefresh: boolean = false
  ): Promise<LiveNewsItem[]> {
    const cacheKey = this.generateCacheKey('latest_news', { category: category || 'all', limit });

    if (!forceRefresh) {
      const cached = this.getFromCache<LiveNewsItem[]>(cacheKey);
      if (cached) {
        this.metadata.cacheHits++;
        console.log('📋 Cache HIT: Latest news served from cache');
        return cached;
      }
    }

    this.metadata.cacheMisses++;
    console.log('🌐 Cache MISS: Fetching latest news from API');

    try {
      const data = await liveNewsService.fetchLatestNews(category, limit, false);
      this.setCache(cacheKey, data, this.DEFAULT_TTL);
      return data;
    } catch (error) {
      console.error('Failed to fetch latest news:', error);

      // Try to return stale cache data as fallback
      const staleCache = this.cache.get(cacheKey);
      if (staleCache) {
        console.log('📋 Returning stale cached data due to API error');
        return staleCache.data;
      }

      throw error;
    }
  }

  /**
   * Get trending topics with caching
   */
  async getTrendingTopics(
    timeframe: string = '24h',
    limit: number = 20,
    category?: string,
    forceRefresh: boolean = false
  ): Promise<TrendingTopic[]> {
    const cacheKey = this.generateCacheKey('trending_topics', { timeframe, limit, category: category || 'all' });

    if (!forceRefresh) {
      const cached = this.getFromCache<TrendingTopic[]>(cacheKey);
      if (cached) {
        this.metadata.cacheHits++;
        console.log('📋 Cache HIT: Trending topics served from cache');
        return cached;
      }
    }

    this.metadata.cacheMisses++;
    console.log('🌐 Cache MISS: Fetching trending topics from API');

    try {
      const data = await liveNewsService.fetchTrendingTopics(timeframe, limit, category);
      this.setCache(cacheKey, data, this.TRENDING_TTL);
      return data;
    } catch (error) {
      console.error('Failed to fetch trending topics:', error);
      const staleCache = this.cache.get(cacheKey);
      if (staleCache) {
        console.log('📋 Returning stale cached trending topics');
        return staleCache.data;
      }
      throw error;
    }
  }

  /**
   * Get social hooks with caching
   */
  async getSocialHooks(
    platforms?: string[],
    limit: number = 10,
    minEngagementPotential: number = 70,
    forceRefresh: boolean = false
  ): Promise<SocialHook[]> {
    const cacheKey = this.generateCacheKey('social_hooks', {
      platforms: platforms?.join(',') || 'all',
      limit,
      minEngagementPotential
    });

    if (!forceRefresh) {
      const cached = this.getFromCache<SocialHook[]>(cacheKey);
      if (cached) {
        this.metadata.cacheHits++;
        console.log('📋 Cache HIT: Social hooks served from cache');
        return cached;
      }
    }

    this.metadata.cacheMisses++;
    console.log('🌐 Cache MISS: Fetching social hooks from API');

    try {
      const data = await liveNewsService.fetchSocialHooks(platforms, limit, minEngagementPotential);
      this.setCache(cacheKey, data, this.DEFAULT_TTL);
      return data;
    } catch (error) {
      console.error('Failed to fetch social hooks:', error);
      const staleCache = this.cache.get(cacheKey);
      if (staleCache) {
        console.log('📋 Returning stale cached social hooks');
        return staleCache.data;
      }
      throw error;
    }
  }

  /**
   * Get news stats with caching
   */
  async getNewsStats(forceRefresh: boolean = false): Promise<NewsStats> {
    const cacheKey = this.generateCacheKey('news_stats', {});

    if (!forceRefresh) {
      const cached = this.getFromCache<NewsStats>(cacheKey);
      if (cached) {
        this.metadata.cacheHits++;
        console.log('📋 Cache HIT: News stats served from cache');
        return cached;
      }
    }

    this.metadata.cacheMisses++;
    console.log('🌐 Cache MISS: Fetching news stats from API');

    try {
      const data = await liveNewsService.getEnhancedStats();
      this.setCache(cacheKey, data, this.STATS_TTL);
      return data;
    } catch (error) {
      console.error('Failed to fetch news stats:', error);
      const staleCache = this.cache.get(cacheKey);
      if (staleCache) {
        console.log('📋 Returning stale cached stats');
        return staleCache.data;
      }
      throw error;
    }
  }

  /**
   * Search news with caching
   */
  async searchNews(
    query: string,
    category?: NewsCategory,
    limit: number = 5,
    forceRefresh: boolean = false
  ): Promise<NewsItem[]> {
    const cacheKey = this.generateCacheKey('search_news', { query, category: category || 'all', limit });

    if (!forceRefresh) {
      const cached = this.getFromCache<NewsItem[]>(cacheKey);
      if (cached) {
        this.metadata.cacheHits++;
        console.log('📋 Cache HIT: Search results served from cache');
        return cached;
      }
    }

    this.metadata.cacheMisses++;
    console.log('🌐 Cache MISS: Searching news via API');

    try {
      const data = await searchNews(query, category);
      this.setCache(cacheKey, data.slice(0, limit), this.DEFAULT_TTL);
      return data.slice(0, limit);
    } catch (error) {
      console.error('Failed to search news:', error);
      const staleCache = this.cache.get(cacheKey);
      if (staleCache) {
        console.log('📋 Returning stale cached search results');
        return staleCache.data;
      }
      throw error;
    }
  }

  /**
   * Get data from cache
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || !this.isValidEntry(entry)) {
      if (entry) {
        this.cache.delete(key); // Remove expired entry
      }
      return null;
    }
    return entry.data;
  }

  /**
   * Set data in cache
   */
  private setCache<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expires: Date.now() + ttl,
      key
    };

    this.cache.set(key, entry);
    this.metadata.totalEntries = this.cache.size;
    this.saveToLocalStorage();
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    this.metadata = {
      totalEntries: 0,
      lastCleanup: Date.now(),
      cacheHits: 0,
      cacheMisses: 0
    };

    if (typeof window !== 'undefined') {
      localStorage.removeItem('news_cache_data');
      localStorage.removeItem('news_cache_metadata');
    }

    console.log('🗑️ News cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheMetadata & { hitRate: number; size: number } {
    const total = this.metadata.cacheHits + this.metadata.cacheMisses;
    return {
      ...this.metadata,
      hitRate: total > 0 ? (this.metadata.cacheHits / total) * 100 : 0,
      size: this.cache.size
    };
  }

  /**
   * Check if data is cached and fresh
   */
  isCached(type: string, params: Record<string, any>): boolean {
    const key = this.generateCacheKey(type, params);
    const entry = this.cache.get(key);
    return !!(entry && this.isValidEntry(entry));
  }

  /**
   * Get cache age for a specific entry
   */
  getCacheAge(type: string, params: Record<string, any>): number | null {
    const key = this.generateCacheKey(type, params);
    const entry = this.cache.get(key);
    if (!entry) return null;
    return Date.now() - entry.timestamp;
  }

  /**
   * Setup periodic cache cleanup
   */
  private setupCleanupInterval(): void {
    // Run cleanup every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires < now) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.metadata.totalEntries = this.cache.size;
      this.metadata.lastCleanup = now;
      console.log(`🧹 Cache cleanup: Removed ${removed} expired entries`);
    }
  }

  /**
   * Save cache to localStorage (fallback for browser environment)
   */
  private saveToLocalStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const cacheData = Array.from(this.cache.entries());
      localStorage.setItem('news_cache_data', JSON.stringify(cacheData));
      localStorage.setItem('news_cache_metadata', JSON.stringify(this.metadata));
    } catch (error) {
      console.warn('Failed to save cache to localStorage:', error);
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromLocalStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const cacheDataStr = localStorage.getItem('news_cache_data');
      const metadataStr = localStorage.getItem('news_cache_metadata');

      if (cacheDataStr) {
        const cacheData = JSON.parse(cacheDataStr) as [string, CacheEntry<any>][];
        this.cache = new Map(cacheData.filter(([_, entry]) => this.isValidEntry(entry)));
      }

      if (metadataStr) {
        this.metadata = JSON.parse(metadataStr);
      }

      console.log(`📋 Loaded ${this.cache.size} cached entries from localStorage`);
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
    }
  }
}

// Export singleton instance
export const newsCacheService = NewsCacheService.getInstance();