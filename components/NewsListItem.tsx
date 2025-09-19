import React, { useState } from 'react';
import { NewsItem, NewsCategory, SocialPlatform } from '../types';
import { formatNewsDate, getNewsCategories } from '../services/newsService';
import { articleContentService, ArticleContent } from '../services/articleContentService';
import Icon from './Icon';

interface NewsListItemProps {
  newsItem: NewsItem;
  onGenerateContent: (newsItem: NewsItem) => void;
  onReadArticle: (url: string) => void;
  onFetchContent?: (newsItem: NewsItem, content: ArticleContent) => void;
  onSchedulePost?: (newsItem: NewsItem) => void;
}

const NewsListItem: React.FC<NewsListItemProps> = ({
  newsItem,
  onGenerateContent,
  onReadArticle,
  onFetchContent,
  onSchedulePost
}) => {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isFetchingContent, setIsFetchingContent] = useState(false);
  const [fetchedContent, setFetchedContent] = useState<ArticleContent | null>(null);
  const categories = getNewsCategories();

  const getCategoryColor = (category: NewsCategory) => {
    const colors = {
      technology: 'bg-blue-100 text-blue-800',
      ai: 'bg-purple-100 text-purple-800',
      design: 'bg-pink-100 text-pink-800',
      marketing: 'bg-green-100 text-green-800',
      photography: 'bg-yellow-100 text-yellow-800',
      business: 'bg-indigo-100 text-indigo-800',
      tools: 'bg-gray-100 text-gray-800',
      resources: 'bg-orange-100 text-orange-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getSourceInitials = (source: string) => {
    return source.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase();
  };

  const socialPlatforms: { platform: SocialPlatform; icon: string; color: string }[] = [
    { platform: 'instagram', icon: 'camera', color: 'text-pink-600' },
    { platform: 'linkedin', icon: 'user', color: 'text-blue-700' },
    { platform: 'twitter', icon: 'twitter', color: 'text-sky-500' },
    { platform: 'facebook', icon: 'facebook', color: 'text-blue-600' },
    { platform: 'threads', icon: 'threads', color: 'text-gray-900' }
  ];

  const handleSocialShare = (platform: SocialPlatform) => {
    // In a real implementation, this would open the platform's sharing dialog
    console.log(`Sharing to ${platform}:`, newsItem.title);
    setShowShareMenu(false);
  };

  const handleFetchContent = async () => {
    if (isFetchingContent || fetchedContent) return;

    setIsFetchingContent(true);
    try {
      const content = await articleContentService.fetchArticleContent(newsItem, {
        extractSocialHooks: true,
        analyzeSentiment: true,
        maxLength: 5000 // Limit content length for performance
      });
      setFetchedContent(content);

      // Notify parent component
      if (onFetchContent) {
        onFetchContent(newsItem, content);
      }
    } catch (error) {
      console.error('Failed to fetch article content:', error);
    } finally {
      setIsFetchingContent(false);
    }
  };

  const handleGenerateWithContent = () => {
    if (fetchedContent) {
      // Create enhanced news item with content
      const enhancedNewsItem = {
        ...newsItem,
        content: fetchedContent.content,
        summary: fetchedContent.summary,
        keyPoints: fetchedContent.keyPoints
      };
      onGenerateContent(enhancedNewsItem);
    } else {
      onGenerateContent(newsItem);
    }
  };

  return (
    <div className="bg-white border-b border-gray-100 px-6 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-4">
        {/* Publisher Avatar */}
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
          {getSourceInitials(newsItem.source)}
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            {/* Content Column */}
            <div className="flex-1 min-w-0">
              {/* Header with badges */}
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-gray-900">{newsItem.source}</span>

                {newsItem.isPremium && (
                  <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <Icon icon="star" className="w-3 h-3 fill-current" />
                    Premium
                  </div>
                )}

                {newsItem.isFresh && (
                  <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                    Fresh
                  </div>
                )}

                {newsItem.isFeatured && (
                  <div className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <Icon icon="star" className="w-3 h-3 fill-current" />
                    Featured
                  </div>
                )}

                <div className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(newsItem.category)}`}>
                  {categories.find(cat => cat.value === newsItem.category)?.label || newsItem.category}
                </div>

                <span className="text-sm text-gray-500">{formatNewsDate(newsItem.publishedAt)}</span>
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                {newsItem.title}
              </h3>

              {/* Description */}
              <p className="text-gray-600 mb-3 line-clamp-2">
                {newsItem.description}
              </p>

              {/* Metrics */}
              <div className="flex items-center gap-6 text-sm text-gray-500 mb-3">
                <div className="flex items-center gap-1">
                  <Icon icon="checkCircle" className="w-4 h-4 text-green-500" />
                  <span className="font-medium">Credibility: {newsItem.credibility}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Icon icon="bolt" className="w-4 h-4 text-orange-500" />
                  <span className="font-medium">Engagement: {newsItem.engagement}/100</span>
                </div>
                <div className="flex items-center gap-1">
                  <Icon icon="clock" className="w-4 h-4" />
                  <span>Reading: {newsItem.readingTime} min</span>
                </div>
              </div>

              {/* Hashtags */}
              <div className="flex items-center gap-2 mb-4">
                {newsItem.hashtags.map((hashtag, index) => (
                  <span key={index} className="text-blue-600 text-sm font-medium">
                    {hashtag}
                  </span>
                ))}
              </div>

              {/* Fetched Content Preview */}
              {fetchedContent && !fetchedContent.error && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon icon="checkCircle" className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Article Content Fetched</span>
                    <span className="text-xs text-blue-600">
                      {fetchedContent.wordCount} words • {fetchedContent.readingTime} min read
                    </span>
                    {fetchedContent.viralPotential && fetchedContent.viralPotential > 70 && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-medium">
                        🔥 Viral Potential: {fetchedContent.viralPotential}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-blue-700 line-clamp-2 mb-2">
                    {fetchedContent.summary}
                  </p>

                  {/* Key Points */}
                  {fetchedContent.keyPoints.length > 0 && (
                    <div className="mb-2">
                      <span className="text-xs text-blue-700 font-medium mb-1 block">Key Points:</span>
                      <div className="flex flex-wrap gap-2">
                        {fetchedContent.keyPoints.slice(0, 3).map((point, index) => (
                          <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {point.length > 30 ? point.substring(0, 30) + '...' : point}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Social Hooks */}
                  {fetchedContent.socialHooks && fetchedContent.socialHooks.length > 0 && (
                    <div className="mb-2">
                      <span className="text-xs text-blue-700 font-medium mb-1 block">Social Hooks:</span>
                      <div className="flex flex-wrap gap-2">
                        {fetchedContent.socialHooks.slice(0, 3).map((hook, index) => (
                          <span key={index} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            📈 {hook.length > 25 ? hook.substring(0, 25) + '...' : hook}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Author and Tags */}
                  <div className="flex items-center justify-between text-xs text-blue-600">
                    <span>
                      {fetchedContent.author && `By ${fetchedContent.author} • `}
                      Extracted {new Date(fetchedContent.extractedAt).toLocaleTimeString()}
                    </span>
                    {fetchedContent.tags.length > 0 && (
                      <div className="flex gap-1">
                        {fetchedContent.tags.slice(0, 3).map((tag, index) => (
                          <span key={index} className="bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded text-xs">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {fetchedContent?.error && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Icon icon="alertTriangle" className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800">
                      Could not fetch full article content. Using available summary for content generation.
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleGenerateWithContent}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <Icon icon="image" className="w-4 h-4" />
                  {fetchedContent ? 'Generate Content' : 'Generate Content'}
                </button>

                <button
                  onClick={handleFetchContent}
                  disabled={isFetchingContent || !!fetchedContent}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    isFetchingContent || fetchedContent
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {isFetchingContent ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                      Fetching...
                    </>
                  ) : fetchedContent ? (
                    <>
                      <Icon icon="checkCircle" className="w-4 h-4 text-green-600" />
                      Content Fetched
                    </>
                  ) : (
                    <>
                      <Icon icon="download" className="w-4 h-4" />
                      Fetch Article
                    </>
                  )}
                </button>

                <button
                  onClick={() => onReadArticle(newsItem.url)}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Icon icon="arrowLeft" className="w-4 h-4 rotate-180" />
                  Read Article
                </button>

                {/* Schedule Post Button */}
                {onSchedulePost && (
                  <button
                    onClick={() => onSchedulePost(newsItem)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Icon icon="calendar" className="w-4 h-4" />
                    Schedule Post
                  </button>
                )}

                {/* Social Share */}
                <div className="relative">
                  <button
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label="Share options"
                  >
                    <Icon icon="arrowLeftRight" className="w-4 h-4" />
                  </button>

                  {showShareMenu && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10">
                      <div className="text-xs text-gray-500 mb-2 px-2">Open Content in New Tab:</div>
                      <div className="flex gap-1">
                        {socialPlatforms.map(({ platform, icon, color }) => (
                          <button
                            key={platform}
                            onClick={() => handleSocialShare(platform)}
                            className={`p-2 rounded hover:bg-gray-50 transition-colors ${color}`}
                            title={`Share on ${platform}`}
                          >
                            <Icon icon={icon as any} className="w-4 h-4" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Article Image */}
            {newsItem.imageUrl && (
              <div className="w-32 h-24 flex-shrink-0">
                <img
                  src={newsItem.imageUrl}
                  alt={newsItem.title}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsListItem;