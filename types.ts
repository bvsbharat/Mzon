

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
}

export interface NewsStats {
  freshArticles: number;
  premiumSources: number;
  activeAPIs: number;
  lastUpdate: string;
  totalArticles: number;
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
