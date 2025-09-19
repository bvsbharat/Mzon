import { BrandConfiguration } from '../types';

const BRAND_CONFIG_STORAGE_KEY = 'mzon_brand_configuration';

class BrandService {
  private brandConfig: BrandConfiguration | null = null;

  /**
   * Initialize brand service and load saved configuration
   */
  initialize(): void {
    this.loadBrandConfiguration();
  }

  /**
   * Get current brand configuration
   */
  getBrandConfiguration(): BrandConfiguration | null {
    if (!this.brandConfig) {
      this.loadBrandConfiguration();
    }
    return this.brandConfig;
  }

  /**
   * Save brand configuration
   */
  async saveBrandConfiguration(config: BrandConfiguration): Promise<void> {
    try {
      // Validate required fields
      if (!config.brandName || !config.brandDescription || !config.targetAudience) {
        throw new Error('Brand name, description, and target audience are required');
      }

      // Save to localStorage
      localStorage.setItem(BRAND_CONFIG_STORAGE_KEY, JSON.stringify(config));

      // Update in-memory configuration
      this.brandConfig = config;

      console.log('Brand configuration saved successfully');
    } catch (error) {
      console.error('Error saving brand configuration:', error);
      throw error;
    }
  }

  /**
   * Load brand configuration from localStorage
   */
  private loadBrandConfiguration(): void {
    try {
      const stored = localStorage.getItem(BRAND_CONFIG_STORAGE_KEY);
      if (stored) {
        this.brandConfig = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading brand configuration:', error);
      this.brandConfig = null;
    }
  }

  /**
   * Check if brand configuration is set up
   */
  isBrandConfigured(): boolean {
    const config = this.getBrandConfiguration();
    return config !== null &&
           !!config.brandName &&
           !!config.brandDescription &&
           !!config.targetAudience;
  }

  /**
   * Clear brand configuration
   */
  clearBrandConfiguration(): void {
    localStorage.removeItem(BRAND_CONFIG_STORAGE_KEY);
    this.brandConfig = null;
  }

  /**
   * Get brand context for content generation
   */
  getBrandContext(): {
    brandName: string;
    brandVoice: string;
    brandDescription: string;
    targetAudience: string;
    keyMessages: string[];
  } | null {
    const config = this.getBrandConfiguration();
    if (!config || !this.isBrandConfigured()) {
      return null;
    }

    return {
      brandName: config.brandName,
      brandVoice: config.brandVoice,
      brandDescription: config.brandDescription,
      targetAudience: config.targetAudience,
      keyMessages: config.keyMessages.filter(msg => msg.trim() !== '')
    };
  }

  /**
   * Get content generation prompt with brand context
   */
  getBrandPromptContext(config?: BrandConfiguration): string {
    const brandConfig = config || this.getBrandConfiguration();
    if (!brandConfig || !this.isBrandConfigured()) {
      return '';
    }

    const keyMessages = brandConfig.keyMessages
      .filter(msg => msg.trim() !== '')
      .slice(0, 5); // Limit to prevent prompt bloat

    const hashtagPrefs = brandConfig.hashtagPreferences
      .filter(tag => tag.trim() !== '')
      .slice(0, 10)
      .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
      .join(', ');

    const avoidWords = brandConfig.avoidWords
      .filter(word => word.trim() !== '')
      .slice(0, 10);

    let context = `\nBRAND CONTEXT:
Brand: ${brandConfig.brandName}
Voice: ${brandConfig.brandVoice}
Industry: ${brandConfig.industry || 'Not specified'}
Company Size: ${brandConfig.companySize}
Content Style: ${brandConfig.contentStyle}

Brand Description: ${brandConfig.brandDescription}

Target Audience: ${brandConfig.targetAudience}`;

    if (keyMessages.length > 0) {
      context += `\n\nKey Messages:
${keyMessages.map((msg, i) => `${i + 1}. ${msg}`).join('\n')}`;
    }

    if (hashtagPrefs) {
      context += `\n\nPreferred Hashtags: ${hashtagPrefs}`;
    }

    if (avoidWords.length > 0) {
      context += `\n\nWords to Avoid: ${avoidWords.join(', ')}`;
    }

    context += `\n\nIMPORTANT: All generated content must be consistent with the brand voice (${brandConfig.brandVoice}), appeal to the target audience, and incorporate the key messages naturally. Use the brand's preferred hashtags when relevant, and avoid using the specified words to avoid.\n`;

    return context;
  }

  /**
   * Validate if content matches brand guidelines
   */
  validateContentBrandCompliance(
    content: string,
    config?: BrandConfiguration
  ): {
    score: number; // 0-100
    issues: string[];
    suggestions: string[];
  } {
    const brandConfig = config || this.getBrandConfiguration();
    if (!brandConfig || !this.isBrandConfigured()) {
      return { score: 50, issues: ['No brand configuration available'], suggestions: [] };
    }

    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    const lowerContent = content.toLowerCase();

    // Check for words to avoid
    const foundAvoidWords = brandConfig.avoidWords
      .filter(word => word.trim() !== '')
      .filter(word => lowerContent.includes(word.toLowerCase()));

    if (foundAvoidWords.length > 0) {
      issues.push(`Contains words to avoid: ${foundAvoidWords.join(', ')}`);
      score -= foundAvoidWords.length * 15;
    }

    // Check if brand name is mentioned (for brand awareness)
    if (!lowerContent.includes(brandConfig.brandName.toLowerCase())) {
      suggestions.push('Consider mentioning the brand name for better brand awareness');
      score -= 10;
    }

    // Check for preferred hashtags usage
    const preferredHashtags = brandConfig.hashtagPreferences
      .filter(tag => tag.trim() !== '')
      .map(tag => tag.startsWith('#') ? tag.toLowerCase() : `#${tag.toLowerCase()}`);

    const usedPreferredHashtags = preferredHashtags.filter(tag =>
      lowerContent.includes(tag)
    );

    if (preferredHashtags.length > 0 && usedPreferredHashtags.length === 0) {
      suggestions.push('Consider using some of your preferred hashtags');
      score -= 10;
    }

    // Basic voice compliance check
    const voiceKeywords = {
      professional: ['expertise', 'solution', 'industry', 'professional', 'quality'],
      casual: ['easy', 'simple', 'fun', 'awesome', 'cool'],
      friendly: ['hello', 'welcome', 'together', 'help', 'support'],
      authoritative: ['proven', 'leading', 'expert', 'definitive', 'established'],
      playful: ['fun', 'exciting', 'amazing', 'love', 'enjoy'],
      formal: ['therefore', 'however', 'consequently', 'furthermore', 'respectfully']
    };

    const expectedKeywords = voiceKeywords[brandConfig.brandVoice] || [];
    const foundVoiceKeywords = expectedKeywords.filter(keyword =>
      lowerContent.includes(keyword)
    );

    if (foundVoiceKeywords.length === 0 && expectedKeywords.length > 0) {
      suggestions.push(`Consider using language that reflects your ${brandConfig.brandVoice} brand voice`);
      score -= 15;
    }

    // Ensure score doesn't go below 0
    score = Math.max(0, score);

    return { score, issues, suggestions };
  }

  /**
   * Get brand configuration summary for display
   */
  getBrandSummary(): string | null {
    const config = this.getBrandConfiguration();
    if (!config || !this.isBrandConfigured()) {
      return null;
    }

    return `${config.brandName} - ${config.brandVoice} voice targeting ${config.targetAudience}`;
  }

  /**
   * Export brand configuration as JSON
   */
  exportConfiguration(): string {
    const config = this.getBrandConfiguration();
    if (!config) {
      throw new Error('No brand configuration to export');
    }

    return JSON.stringify(config, null, 2);
  }

  /**
   * Import brand configuration from JSON
   */
  async importConfiguration(jsonData: string): Promise<void> {
    try {
      const config = JSON.parse(jsonData) as BrandConfiguration;
      await this.saveBrandConfiguration(config);
    } catch (error) {
      throw new Error('Invalid configuration data');
    }
  }
}

// Export singleton instance
export const brandService = new BrandService();

// Initialize on module load
if (typeof window !== 'undefined') {
  brandService.initialize();
}