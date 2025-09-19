import { NewsItem } from '../types';
import brightDataService from './brightDataService';

export interface ArticleContent {
  id: string;
  url: string;
  title: string;
  content: string;
  summary: string;
  keyPoints: string[];
  wordCount: number;
  readingTime: number;
  publishedAt: string;
  author?: string;
  tags: string[];
  extractedAt: string;
  socialHooks?: string[];
  viralPotential?: number;
  error?: string;
}

export interface ContentExtractionOptions {
  includeImages?: boolean;
  includeLinks?: boolean;
  maxLength?: number;
  extractSocialHooks?: boolean;
  analyzeSentiment?: boolean;
}

class ArticleContentService {
  private contentCache: Map<string, ArticleContent> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  /**
   * Fetches and extracts content from a news article URL
   */
  async fetchArticleContent(
    newsItem: NewsItem,
    options: ContentExtractionOptions = {}
  ): Promise<ArticleContent> {
    const cacheKey = this.getCacheKey(newsItem.url, options);

    // Check cache first
    const cached = this.getCachedContent(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Try Bright Data for content extraction first
      const content = await this.extractWithBrightData(newsItem, options);

      // Cache the result
      this.cacheContent(cacheKey, content);

      return content;
    } catch (error) {
      console.error('Failed to fetch article content with Bright Data:', error);

      // Fallback to existing method
      try {
        const fallbackContent = await this.extractWithFallback(newsItem, options);
        this.cacheContent(cacheKey, fallbackContent);
        return fallbackContent;
      } catch (fallbackError) {
        console.error('Fallback content extraction also failed:', fallbackError);

        // Return error content
        return this.createErrorContent(newsItem, 'Unable to extract article content');
      }
    }
  }

  /**
   * Extract content using Bright Data (primary method)
   */
  private async extractWithBrightData(
    newsItem: NewsItem,
    options: ContentExtractionOptions
  ): Promise<ArticleContent> {
    if (!brightDataService.isConfigured()) {
      throw new Error('Bright Data service is not configured');
    }

    // Use Bright Data to fetch the full webpage
    const requestPayload = {
      zone: process.env.BRIGHT_DATA_ZONE || 'web_scraper_zone',
      url: newsItem.url,
      format: 'json',
      render: true, // Enable JavaScript rendering
      extract: {
        title: 'h1, .article-title, .entry-title, .post-title',
        content: '.article-content, .entry-content, .post-content, article p',
        author: '.author, .byline, .article-author',
        publishDate: '.published, .date, .article-date',
        tags: '.tags a, .categories a, .article-tags a'
      }
    };

    const response = await this.makeBrightDataRequest(requestPayload);
    return this.processExtractedContent(newsItem, response, options);
  }

  /**
   * Extract content using fallback methods
   */
  private async extractWithFallback(
    newsItem: NewsItem,
    options: ContentExtractionOptions
  ): Promise<ArticleContent> {
    const content = await this.extractContentFromUrl(newsItem.url);

    if (!content || content.length < 100) {
      throw new Error('Article content too short or empty');
    }

    return this.processExtractedContent(newsItem, { content }, options);
  }

  /**
   * Make request to Bright Data API
   */
  private async makeBrightDataRequest(payload: any): Promise<any> {
    const response = await fetch('https://api.brightdata.com/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BRIGHT_DATA_API_KEY || 'demo-key'}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Bright Data API error: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Process extracted content into ArticleContent format
   */
  private processExtractedContent(
    newsItem: NewsItem,
    extractedData: any,
    options: ContentExtractionOptions
  ): ArticleContent {
    // Extract text content
    const content = this.cleanExtractedText(extractedData.content || extractedData.text || '');

    // Generate summary
    const summary = this.generateSummary(content);

    // Extract key points
    const keyPoints = this.extractKeyPoints(content, newsItem);

    // Calculate metrics
    const wordCount = this.countWords(content);
    const readingTime = Math.ceil(wordCount / 200); // 200 words per minute

    // Extract tags
    const tags = this.extractTags(content, extractedData.tags || []);

    // Extract social hooks if requested
    const socialHooks = options.extractSocialHooks ? this.extractSocialHooks(content) : undefined;

    // Calculate viral potential
    const viralPotential = this.calculateViralPotential(content, newsItem);

    return {
      id: this.generateContentId(newsItem.url),
      url: newsItem.url,
      title: extractedData.title || newsItem.title,
      content: options.maxLength ? content.substring(0, options.maxLength) : content,
      summary,
      keyPoints,
      wordCount,
      readingTime,
      publishedAt: extractedData.publishDate || newsItem.publishedAt,
      author: extractedData.author,
      tags,
      extractedAt: new Date().toISOString(),
      socialHooks,
      viralPotential
    };
  }

  /**
   * Clean extracted text content
   */
  private cleanExtractedText(rawContent: string): string {
    if (!rawContent) return '';

    // Remove HTML tags
    let cleaned = rawContent.replace(/<[^>]*>/g, '');

    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Remove unwanted patterns
    cleaned = cleaned.replace(/Advertisement|Subscribe|Sign up|Newsletter/gi, '');
    cleaned = cleaned.replace(/Share on (Facebook|Twitter|LinkedIn)/gi, '');

    return cleaned;
  }

  /**
   * Extract social media hooks from content
   */
  private extractSocialHooks(content: string): string[] {
    const hooks: string[] = [];

    // Patterns that tend to go viral
    const hookPatterns = [
      /\b\d+\s+(reasons?|ways?|tips?|secrets?|facts?)\b/gi,
      /\b(this will change|you won't believe|everyone is talking about)\b/gi,
      /\b(how to|why|what|when|where)\s+[^.]{10,50}/gi,
      /\b(amazing|incredible|shocking|surprising|breakthrough)\b/gi
    ];

    for (const pattern of hookPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        hooks.push(...matches.map(match => match.trim()).slice(0, 2));
      }
    }

    return [...new Set(hooks)].slice(0, 5);
  }

  /**
   * Calculate viral potential based on content analysis
   */
  private calculateViralPotential(content: string, newsItem: NewsItem): number {
    let score = 30;

    // Content factors
    if (content.length > 1000) score += 10;
    if (content.includes('breaking') || content.includes('exclusive')) score += 15;

    // Title factors
    const title = newsItem.title.toLowerCase();
    if (title.includes('?')) score += 10;
    if (title.match(/\b\d+\b/)) score += 5;

    // Timing factor
    if (newsItem.isFresh) score += 20;

    // Category factor
    const viralCategories = ['ai', 'technology', 'marketing'];
    if (viralCategories.includes(newsItem.category)) score += 10;

    // Existing engagement
    if (newsItem.engagement && newsItem.engagement > 80) score += 15;

    return Math.min(score, 100);
  }

  /**
   * Extract relevant tags from content
   */
  private extractTags(content: string, existingTags: string[] = []): string[] {
    const tags = new Set(existingTags);

    // Common tech/business terms
    const keywords = [
      'technology', 'innovation', 'startup', 'business', 'AI', 'machine learning',
      'software', 'development', 'design', 'marketing', 'social media',
      'cryptocurrency', 'blockchain', 'fintech', 'e-commerce'
    ];

    const contentLower = content.toLowerCase();

    for (const keyword of keywords) {
      if (contentLower.includes(keyword.toLowerCase())) {
        tags.add(keyword);
      }
    }

    return Array.from(tags).slice(0, 8);
  }

  /**
   * Generate content ID
   */
  private generateContentId(url: string): string {
    return btoa(url).replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
  }

  /**
   * Create error content when extraction fails
   */
  private createErrorContent(newsItem: NewsItem, errorMessage: string): ArticleContent {
    return {
      id: this.generateContentId(newsItem.url),
      url: newsItem.url,
      title: newsItem.title,
      content: newsItem.description,
      summary: newsItem.description,
      keyPoints: [],
      wordCount: newsItem.description.split(' ').length,
      readingTime: 1,
      publishedAt: newsItem.publishedAt,
      tags: newsItem.tags || [],
      extractedAt: new Date().toISOString(),
      error: errorMessage
    };
  }

  /**
   * Cache management
   */
  private getCacheKey(url: string, options: ContentExtractionOptions): string {
    return `${url}_${JSON.stringify(options)}`;
  }

  /**
   * Extracts content from URL using various methods (legacy fallback)
   */
  private async extractContentFromUrl(url: string): Promise<string> {
    try {
      // Method 1: Try using fetch with CORS (for same-origin or CORS-enabled sites)
      const response = await fetch(url, {
        mode: 'cors',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)'
        }
      });

      if (response.ok) {
        const html = await response.text();
        return this.extractTextFromHtml(html);
      }
    } catch (error) {
      console.warn('Direct fetch failed, trying alternative method:', error);
    }

    // Method 2: Try using a CORS proxy or reader mode API
    try {
      // Use a public reader API service (you may want to replace with your preferred service)
      const readerResponse = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
      if (readerResponse.ok) {
        const html = await readerResponse.text();
        return this.extractTextFromHtml(html);
      }
    } catch (error) {
      console.warn('CORS proxy fetch failed:', error);
    }

    throw new Error('Unable to fetch article content from any source');
  }

  /**
   * Extracts readable text content from HTML
   */
  private extractTextFromHtml(html: string): string {
    // Create a temporary DOM element to parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove script and style elements
    const scripts = doc.querySelectorAll('script, style, nav, header, footer, aside, .advertisement, .ads');
    scripts.forEach(el => el.remove());

    // Try to find main content areas
    const contentSelectors = [
      'article',
      '[role="main"]',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      'main',
      '.article-body',
      '.story-body'
    ];

    let content = '';

    for (const selector of contentSelectors) {
      const element = doc.querySelector(selector);
      if (element) {
        content = element.textContent || element.innerText || '';
        if (content.length > 200) { // Ensure we found substantial content
          break;
        }
      }
    }

    // Fallback: use body content if no specific content area found
    if (!content || content.length < 200) {
      const body = doc.querySelector('body');
      content = body?.textContent || body?.innerText || '';
    }

    // Clean up the content
    return this.cleanContent(content);
  }

  /**
   * Cleans extracted content
   */
  private cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n\s*\n/g, '\n\n') // Normalize line breaks
      .trim();
  }

  /**
   * Generates a summary from content
   */
  private generateSummary(content: string): string {
    // Take first 2-3 sentences or first 300 characters
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);

    if (sentences.length === 0) {
      return content.substring(0, 300).trim() + (content.length > 300 ? '...' : '');
    }

    let summary = '';
    for (const sentence of sentences.slice(0, 3)) {
      const trimmed = sentence.trim();
      if (trimmed && (summary.length + trimmed.length) < 400) {
        summary += (summary ? '. ' : '') + trimmed;
      } else {
        break;
      }
    }

    return summary + (summary.endsWith('.') ? '' : '.');
  }

  /**
   * Extracts key points from content
   */
  private extractKeyPoints(content: string, newsItem: NewsItem): string[] {
    const keyPoints: string[] = [];

    // Use existing tags as base
    if (newsItem.tags && newsItem.tags.length > 0) {
      keyPoints.push(...newsItem.tags.slice(0, 3));
    }

    // Extract potential key points from content
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);

    // Look for sentences with key indicators
    const keyIndicators = [
      /according to/i,
      /research shows/i,
      /study finds/i,
      /experts say/i,
      /data shows/i,
      /results indicate/i,
      /findings suggest/i
    ];

    for (const sentence of sentences.slice(0, 10)) {
      if (keyPoints.length >= 5) break;

      const trimmed = sentence.trim();
      if (trimmed.length > 30 && trimmed.length < 150) {
        // Check if sentence contains key indicators
        if (keyIndicators.some(pattern => pattern.test(trimmed))) {
          keyPoints.push(trimmed);
        }
      }
    }

    // Ensure we have at least some key points
    if (keyPoints.length < 2 && sentences.length > 0) {
      // Add first meaningful sentence as a key point
      const firstSentence = sentences.find(s => s.trim().length > 30 && s.trim().length < 150);
      if (firstSentence && !keyPoints.includes(firstSentence.trim())) {
        keyPoints.push(firstSentence.trim());
      }
    }

    return keyPoints.slice(0, 5); // Limit to 5 key points
  }

  /**
   * Counts words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Caches content with timestamp
   */
  private cacheContent(cacheKey: string, content: ArticleContent): void {
    this.contentCache.set(cacheKey, content);

    // Limit cache size
    if (this.contentCache.size > 100) {
      const firstKey = this.contentCache.keys().next().value;
      this.contentCache.delete(firstKey);
    }
  }

  /**
   * Gets cached content if still valid
   */
  private getCachedContent(cacheKey: string): ArticleContent | null {
    const cached = this.contentCache.get(cacheKey);
    if (!cached) return null;

    const age = Date.now() - new Date(cached.extractedAt).getTime();
    if (age > this.CACHE_DURATION) {
      this.contentCache.delete(cacheKey);
      return null;
    }

    return cached;
  }

  /**
   * Clears expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [url, content] of this.contentCache.entries()) {
      const age = now - new Date(content.fetchedAt).getTime();
      if (age > this.CACHE_DURATION) {
        this.contentCache.delete(url);
      }
    }
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): { size: number; urls: string[] } {
    return {
      size: this.contentCache.size,
      urls: Array.from(this.contentCache.keys())
    };
  }

  /**
   * Batch fetch multiple articles
   */
  async fetchMultipleArticles(
    newsItems: NewsItem[],
    options: ContentExtractionOptions = {}
  ): Promise<ArticleContent[]> {
    const promises = newsItems.map(item =>
      this.fetchArticleContent(item, options).catch(error => {
        console.error(`Failed to fetch content for ${item.title}:`, error);
        return this.createErrorContent(item, 'Batch extraction failed');
      })
    );

    return Promise.all(promises);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.contentCache.clear();
  }
}

// Export singleton instance
export const articleContentService = new ArticleContentService();

// Cleanup expired cache every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    articleContentService.clearExpiredCache();
  }, 5 * 60 * 1000);
}