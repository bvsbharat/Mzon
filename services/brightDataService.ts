import { NewsItem, NewsCategory } from '../types';

export interface BrightDataConfig {
  apiKey: string;
  zone: string;
  baseUrl: string;
}

export interface BrightDataNewsResult {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  imageUrl?: string;
  snippet?: string;
}

export interface ViralContentIndicator {
  shareCount?: number;
  engagementRate?: number;
  trendingScore?: number;
  socialHooks?: string[];
  viralPotential?: number;
}

class BrightDataService {
  private config: BrightDataConfig | null = null;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly RATE_LIMIT_DELAY = 1000; // 1 second between requests
  private lastRequestTime = 0;

  constructor() {
    // Initialize with environment variables if available
    const apiKey = process.env.BRIGHT_DATA_API_KEY;
    const zone = process.env.BRIGHT_DATA_ZONE;

    if (apiKey && zone) {
      this.config = {
        apiKey,
        zone,
        baseUrl: 'https://api.brightdata.com/request'
      };
    }
  }

  /**
   * Configure the Bright Data service
   */
  configure(config: BrightDataConfig): void {
    this.config = config;
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return this.config !== null && this.config.apiKey !== '' && this.config.zone !== '';
  }

  /**
   * Fetch latest news articles by category using Bright Data SERP API
   */
  async fetchNewsByCategory(
    category: NewsCategory,
    limit: number = 10,
    freshOnly: boolean = true
  ): Promise<NewsItem[]> {
    if (!this.isConfigured()) {
      throw new Error('Bright Data service is not configured. Please provide API key and zone.');
    }

    const cacheKey = `news_${category}_${limit}_${freshOnly}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      await this.enforceRateLimit();

      const searchQuery = this.buildSearchQuery(category, freshOnly);
      const searchResults = await this.performGoogleNewsSearch(searchQuery, limit);

      const newsItems = await this.transformToNewsItems(searchResults, category);

      // Cache the results
      this.setCachedData(cacheKey, newsItems);

      return newsItems;
    } catch (error) {
      console.error(`Failed to fetch news for category ${category}:`, error);
      throw error;
    }
  }

  /**
   * Fetch trending and viral content
   */
  async fetchViralContent(
    category?: NewsCategory,
    limit: number = 10
  ): Promise<{ newsItems: NewsItem[]; viralIndicators: ViralContentIndicator[] }> {
    if (!this.isConfigured()) {
      throw new Error('Bright Data service is not configured');
    }

    const searchQuery = this.buildViralSearchQuery(category);

    try {
      await this.enforceRateLimit();

      const results = await this.performSocialMediaSearch(searchQuery, limit);
      const newsItems = await this.transformToNewsItems(results, category || 'technology');

      // Analyze viral potential
      const viralIndicators = await this.analyzeViralPotential(results);

      return { newsItems, viralIndicators };
    } catch (error) {
      console.error('Failed to fetch viral content:', error);
      throw error;
    }
  }

  /**
   * Get social media hooks and trending topics
   */
  async getSocialHooks(category: NewsCategory): Promise<string[]> {
    const viralQueries = [
      `${category} trending hooks social media`,
      `viral ${category} content ideas`,
      `${category} social media trends`
    ];

    const hooks: string[] = [];

    for (const query of viralQueries) {
      try {
        await this.enforceRateLimit();
        const results = await this.performGoogleSearch(query, 5);
        const extractedHooks = this.extractSocialHooks(results);
        hooks.push(...extractedHooks);
      } catch (error) {
        console.error(`Failed to get hooks for query: ${query}`, error);
      }
    }

    return [...new Set(hooks)].slice(0, 10); // Remove duplicates and limit to 10
  }

  /**
   * Build search query for specific category
   */
  private buildSearchQuery(category: NewsCategory, freshOnly: boolean): string {
    const categoryKeywords = {
      'technology': 'technology tech innovation software AI',
      'ai': 'artificial intelligence machine learning AI',
      'design': 'design UX UI creative',
      'marketing': 'marketing social media advertising',
      'photography': 'photography visual arts camera',
      'business': 'business startup entrepreneurship',
      'tools': 'tools software apps resources',
      'resources': 'resources learning education'
    };

    const keywords = categoryKeywords[category] || category;
    const timeFilter = freshOnly ? 'when:24h' : 'when:7d';

    return `${keywords} news ${timeFilter}`;
  }

  /**
   * Build search query for viral content
   */
  private buildViralSearchQuery(category?: NewsCategory): string {
    const base = category ? `${category} viral trending` : 'viral trending news';
    return `${base} social media shares engagement when:24h`;
  }

  /**
   * Perform Google News search using Bright Data SERP API
   */
  private async performGoogleNewsSearch(query: string, limit: number): Promise<any[]> {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=nws&hl=en&gl=us&num=${limit}`;

    const requestPayload = {
      zone: this.config!.zone,
      url: searchUrl,
      format: 'json',
      country: 'us',
      render: false
    };

    const response = await this.makeBrightDataRequest(requestPayload);
    return this.parseGoogleNewsResults(response);
  }

  /**
   * Perform social media search for viral content
   */
  private async performSocialMediaSearch(query: string, limit: number): Promise<any[]> {
    // Search across multiple platforms
    const platforms = ['twitter.com', 'reddit.com', 'news.ycombinator.com'];
    const results: any[] = [];

    for (const platform of platforms) {
      try {
        await this.enforceRateLimit();
        const searchUrl = `https://www.google.com/search?q=site:${platform} ${encodeURIComponent(query)}&hl=en&gl=us&num=${Math.ceil(limit / platforms.length)}`;

        const requestPayload = {
          zone: this.config!.zone,
          url: searchUrl,
          format: 'json'
        };

        const response = await this.makeBrightDataRequest(requestPayload);
        const platformResults = this.parseGoogleResults(response);
        results.push(...platformResults);
      } catch (error) {
        console.error(`Failed to search ${platform}:`, error);
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Perform regular Google search
   */
  private async performGoogleSearch(query: string, limit: number): Promise<any[]> {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en&gl=us&num=${limit}`;

    const requestPayload = {
      zone: this.config!.zone,
      url: searchUrl,
      format: 'json'
    };

    const response = await this.makeBrightDataRequest(requestPayload);
    return this.parseGoogleResults(response);
  }

  /**
   * Make request to Bright Data API
   */
  private async makeBrightDataRequest(payload: any): Promise<any> {
    if (!this.config) {
      throw new Error('Bright Data not configured');
    }

    const response = await fetch(this.config.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bright Data API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Parse Google News search results
   */
  private parseGoogleNewsResults(response: any): BrightDataNewsResult[] {
    const results: BrightDataNewsResult[] = [];

    try {
      // Parse based on Bright Data's response format
      const items = response.organic_results || response.news_results || [];

      for (const item of items) {
        const result: BrightDataNewsResult = {
          title: item.title || '',
          description: item.snippet || item.description || '',
          url: item.link || item.url || '',
          source: item.source || item.displayed_link || 'Unknown Source',
          publishedAt: this.parsePublishedDate(item.date || item.published_at),
          imageUrl: item.thumbnail || item.image_url,
          snippet: item.snippet || item.rich_snippet
        };

        if (result.title && result.url) {
          results.push(result);
        }
      }
    } catch (error) {
      console.error('Error parsing Google News results:', error);
    }

    return results;
  }

  /**
   * Parse Google search results
   */
  private parseGoogleResults(response: any): any[] {
    try {
      return response.organic_results || response.results || [];
    } catch (error) {
      console.error('Error parsing Google results:', error);
      return [];
    }
  }

  /**
   * Transform Bright Data results to NewsItem format
   */
  private async transformToNewsItems(results: BrightDataNewsResult[], category: NewsCategory): Promise<NewsItem[]> {
    const newsItems: NewsItem[] = [];

    for (const result of results) {
      try {
        const newsItem: NewsItem = {
          id: this.generateId(result.url),
          title: result.title,
          description: result.description,
          category,
          source: result.source,
          publishedAt: result.publishedAt,
          url: result.url,
          imageUrl: result.imageUrl || this.getDefaultImageForCategory(category),
          credibility: this.calculateCredibilityScore(result),
          engagement: this.calculateEngagementScore(result),
          readingTime: this.estimateReadingTime(result.description),
          isPremium: this.isPremiumSource(result.source),
          isFresh: this.isFreshContent(result.publishedAt),
          isFeatured: false,
          hashtags: this.generateHashtags(result.title, category),
          tags: this.extractTags(result.title, result.description, category),
          relevanceScore: this.calculateRelevanceScore(result, category),
          trendingPotential: await this.calculateTrendingPotential(result),
          sentiment: this.analyzeSentiment(result.title, result.description)
        };

        newsItems.push(newsItem);
      } catch (error) {
        console.error('Error transforming news item:', error);
      }
    }

    return newsItems;
  }

  /**
   * Analyze viral potential from search results
   */
  private async analyzeViralPotential(results: any[]): Promise<ViralContentIndicator[]> {
    return results.map(result => ({
      shareCount: this.extractShareCount(result),
      engagementRate: this.calculateEngagementRate(result),
      trendingScore: this.calculateTrendingScore(result),
      socialHooks: this.extractSocialHooks([result]),
      viralPotential: this.calculateViralPotential(result)
    }));
  }

  /**
   * Extract social hooks from search results
   */
  private extractSocialHooks(results: any[]): string[] {
    const hooks: string[] = [];
    const hookPatterns = [
      /\b\d+\s+(reasons?|ways?|tips?|secrets?)\b/i,
      /\b(how to|why|what|when|where)\b/i,
      /\b(amazing|incredible|shocking|surprising)\b/i,
      /\b(you won't believe|this will|everyone is)\b/i
    ];

    for (const result of results) {
      const text = `${result.title || ''} ${result.snippet || ''}`;

      for (const pattern of hookPatterns) {
        const matches = text.match(pattern);
        if (matches) {
          hooks.push(matches[0]);
        }
      }
    }

    return [...new Set(hooks)];
  }

  // Utility methods
  private generateId(url: string): string {
    return btoa(url).replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
  }

  private parsePublishedDate(dateString: string): string {
    if (!dateString) return new Date().toISOString();

    try {
      // Handle various date formats
      if (dateString.includes('ago')) {
        return this.parseRelativeDate(dateString);
      }
      return new Date(dateString).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  private parseRelativeDate(relativeDate: string): string {
    const now = new Date();
    const match = relativeDate.match(/(\d+)\s*(hour|day|minute)s?\s*ago/i);

    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();

      switch (unit) {
        case 'minute':
          now.setMinutes(now.getMinutes() - value);
          break;
        case 'hour':
          now.setHours(now.getHours() - value);
          break;
        case 'day':
          now.setDate(now.getDate() - value);
          break;
      }
    }

    return now.toISOString();
  }

  private getDefaultImageForCategory(category: NewsCategory): string {
    const defaultImages = {
      'technology': 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=200&fit=crop',
      'ai': 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=200&fit=crop',
      'design': 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=400&h=200&fit=crop',
      'marketing': 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=200&fit=crop',
      'photography': 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400&h=200&fit=crop',
      'business': 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&h=200&fit=crop',
      'tools': 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=400&h=200&fit=crop',
      'resources': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=200&fit=crop'
    };

    return defaultImages[category] || defaultImages.technology;
  }

  private calculateCredibilityScore(result: BrightDataNewsResult): number {
    const trustedSources = ['reuters', 'bbc', 'cnn', 'techcrunch', 'wired', 'guardian', 'nytimes'];
    const source = result.source.toLowerCase();

    const baseTrust = trustedSources.some(trusted => source.includes(trusted)) ? 90 : 70;
    const hasImage = result.imageUrl ? 5 : 0;
    const hasSnippet = result.snippet ? 5 : 0;

    return Math.min(baseTrust + hasImage + hasSnippet, 100);
  }

  private calculateEngagementScore(result: BrightDataNewsResult): number {
    let score = 50;

    // Title factors
    if (result.title.includes('?')) score += 10;
    if (result.title.match(/\b\d+\b/)) score += 5;
    if (result.title.length > 50 && result.title.length < 70) score += 10;

    // Content factors
    if (result.description && result.description.length > 100) score += 10;
    if (result.imageUrl) score += 15;

    return Math.min(score, 100);
  }

  private estimateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.split(' ').length;
    return Math.ceil(wordCount / wordsPerMinute) || 1;
  }

  private isPremiumSource(source: string): boolean {
    const premiumSources = ['wsj', 'ft.com', 'bloomberg', 'economist', 'harvard business review'];
    return premiumSources.some(premium => source.toLowerCase().includes(premium));
  }

  private isFreshContent(publishedAt: string): boolean {
    const publishedDate = new Date(publishedAt);
    const hoursSincePublished = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60);
    return hoursSincePublished < 24;
  }

  private generateHashtags(title: string, category: NewsCategory): string[] {
    const categoryTags = {
      'technology': ['#Tech', '#Innovation'],
      'ai': ['#AI', '#MachineLearning'],
      'design': ['#Design', '#UX'],
      'marketing': ['#Marketing', '#SocialMedia'],
      'photography': ['#Photography', '#Visual'],
      'business': ['#Business', '#Startup'],
      'tools': ['#Tools', '#Software'],
      'resources': ['#Resources', '#Learning']
    };

    const tags = categoryTags[category] || ['#News'];

    // Add trending tag if title suggests it
    if (title.toLowerCase().includes('trend') || title.toLowerCase().includes('new')) {
      tags.push('#Trending');
    }

    return tags.slice(0, 3);
  }

  private extractTags(title: string, description: string, category: NewsCategory): string[] {
    const text = `${title} ${description}`.toLowerCase();
    const commonTags = ['startup', 'innovation', 'trend', 'new', 'launch', 'update', 'report'];

    const extractedTags = commonTags.filter(tag => text.includes(tag));
    extractedTags.unshift(category);

    return [...new Set(extractedTags)].slice(0, 5);
  }

  private calculateRelevanceScore(result: BrightDataNewsResult, category: NewsCategory): number {
    const categoryKeywords = {
      'technology': ['tech', 'software', 'digital', 'innovation'],
      'ai': ['ai', 'artificial', 'machine', 'learning'],
      'design': ['design', 'ux', 'ui', 'creative'],
      'marketing': ['marketing', 'advertising', 'social', 'media'],
      'photography': ['photo', 'camera', 'visual', 'image'],
      'business': ['business', 'startup', 'company', 'market'],
      'tools': ['tool', 'app', 'software', 'platform'],
      'resources': ['resource', 'guide', 'tutorial', 'learn']
    };

    const keywords = categoryKeywords[category] || [];
    const text = `${result.title} ${result.description}`.toLowerCase();

    let score = 50;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        score += 10;
      }
    }

    return Math.min(score, 100);
  }

  private async calculateTrendingPotential(result: BrightDataNewsResult): Promise<number> {
    let score = 50;

    // Time factor
    const publishedDate = new Date(result.publishedAt);
    const hoursOld = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60);
    if (hoursOld < 6) score += 20;
    else if (hoursOld < 24) score += 10;

    // Title factors
    const trendingWords = ['breaking', 'major', 'huge', 'viral', 'trending', 'hot'];
    const titleLower = result.title.toLowerCase();

    for (const word of trendingWords) {
      if (titleLower.includes(word)) {
        score += 15;
      }
    }

    return Math.min(score, 100);
  }

  private analyzeSentiment(title: string, description: string): 'positive' | 'negative' | 'neutral' {
    const text = `${title} ${description}`.toLowerCase();

    const positiveWords = ['success', 'growth', 'launch', 'achievement', 'breakthrough', 'innovation'];
    const negativeWords = ['crisis', 'failure', 'problem', 'issue', 'concern', 'decline'];

    const positiveCount = positiveWords.reduce((count, word) =>
      count + (text.includes(word) ? 1 : 0), 0);
    const negativeCount = negativeWords.reduce((count, word) =>
      count + (text.includes(word) ? 1 : 0), 0);

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private extractShareCount(result: any): number {
    const shareText = result.snippet || result.title || '';
    const shareMatch = shareText.match(/(\d+)\s*(shares?|retweets?|likes?)/i);
    return shareMatch ? parseInt(shareMatch[1]) : 0;
  }

  private calculateEngagementRate(result: any): number {
    const shares = this.extractShareCount(result);
    return Math.min((shares / 1000) * 100, 100); // Normalize to 0-100
  }

  private calculateTrendingScore(result: any): number {
    const trendingWords = ['viral', 'trending', 'breaking', 'hot'];
    const text = `${result.title || ''} ${result.snippet || ''}`.toLowerCase();

    let score = 30;
    for (const word of trendingWords) {
      if (text.includes(word)) {
        score += 20;
      }
    }

    return Math.min(score, 100);
  }

  private calculateViralPotential(result: any): number {
    const shares = this.extractShareCount(result);
    const engagement = this.calculateEngagementRate(result);
    const trending = this.calculateTrendingScore(result);

    return Math.round((shares * 0.4 + engagement * 0.3 + trending * 0.3));
  }

  // Cache management
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // Rate limiting
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      const delay = this.RATE_LIMIT_DELAY - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }
}

// Export singleton instance
export const brightDataService = new BrightDataService();

// Export types and service
export default brightDataService;