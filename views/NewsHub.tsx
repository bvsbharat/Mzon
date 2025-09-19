import React, { useState, useEffect } from 'react';
import { NewsItem, NewsCategory, NewsStats, LiveNewsItem, TrendingTopic, SocialHook } from '../types';
import { fetchNews, getNewsCategories, searchNews, formatNewsDate, getNewsStats } from '../services/newsService';
import { liveNewsService } from '../services/liveNewsService';
import { liveNewsWebSocket } from '../services/liveNewsWebSocket';
import { newsCacheService } from '../services/newsCacheService';
import Icon from '../components/Icon';
import NewsStatsBar from '../components/NewsStatsBar';
import NewsListItem from '../components/NewsListItem';
import TrendingTopicsGrid from '../components/TrendingTopicsGrid';
import SocialHooksList from '../components/SocialHooksList';
import LiveNewsFeed from '../components/LiveNewsFeed';
import ScheduleModal from '../components/ScheduleModal';
import { socialSchedulingService } from '../services/socialSchedulingService';

interface NewsHubProps {
  onNavigate: (view: string) => void;
  onNewsSelected: (newsItem: NewsItem) => void;
  addNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const NewsHub: React.FC<NewsHubProps> = ({ onNavigate, onNewsSelected, addNotification }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [liveNews, setLiveNews] = useState<LiveNewsItem[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [socialHooks, setSocialHooks] = useState<SocialHook[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveNewsLoading, setLiveNewsLoading] = useState(true);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [hooksLoading, setHooksLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [stats, setStats] = useState<NewsStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'live' | 'trending' | 'hooks' | 'generated' | 'api' | 'settings'>('live');
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [cacheStats, setCacheStats] = useState(newsCacheService.getCacheStats());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLoadMore, setShowLoadMore] = useState(false);
  const [currentLimit, setCurrentLimit] = useState(5);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedNewsForScheduling, setSelectedNewsForScheduling] = useState<NewsItem | null>(null);
  const [platformConfigs] = useState([
    { platform: 'twitter', color: '#1DA1F2', maxLength: 280 },
    { platform: 'linkedin', color: '#0077B5', maxLength: 3000 },
    { platform: 'instagram', color: '#E4405F', maxLength: 2200 },
    { platform: 'facebook', color: '#1877F2', maxLength: 63206 }
  ]);

  const categories = getNewsCategories();

  useEffect(() => {
    checkBackendHealth();
    loadAllData();
  }, []);

  useEffect(() => {
    if (backendAvailable) {
      loadLiveData();
    } else {
      loadNews();
    }
  }, [selectedCategory, backendAvailable]);

  useEffect(() => {
    if (backendAvailable && realtimeEnabled) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [backendAvailable, realtimeEnabled]);

  const checkBackendHealth = async () => {
    try {
      const isHealthy = await liveNewsService.checkBackendHealth();
      setBackendAvailable(isHealthy);
    } catch (error) {
      console.warn('Backend health check failed:', error);
      setBackendAvailable(false);
    }
  };

  const loadAllData = async (forceRefresh: boolean = false) => {
    console.log(`🔄 Loading all data (forceRefresh: ${forceRefresh})`);
    setIsRefreshing(forceRefresh);

    try {
      // Load all data in parallel using cache service
      await Promise.all([
        loadStats(forceRefresh),
        loadLiveData(forceRefresh),
        backendAvailable && loadTrendingTopics(forceRefresh),
        backendAvailable && loadSocialHooks(forceRefresh)
      ].filter(Boolean));

      setLastRefresh(new Date());
      setCacheStats(newsCacheService.getCacheStats());
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadNews = async (forceRefresh: boolean = false) => {
    setLoading(true);
    try {
      const category = selectedCategory === 'all' ? undefined : selectedCategory;
      const newsData = await newsCacheService.getLatestNews(category, currentLimit, forceRefresh);
      setNews(newsData as NewsItem[]);
      setShowLoadMore(newsData.length === currentLimit && currentLimit < 20);
    } catch (error) {
      console.error('Failed to load news:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLiveData = async (forceRefresh: boolean = false) => {
    setLiveNewsLoading(true);
    try {
      const category = selectedCategory === 'all' ? undefined : selectedCategory;
      const liveNewsData = await newsCacheService.getLatestNews(category, currentLimit, forceRefresh);
      setLiveNews(liveNewsData);
      setShowLoadMore(liveNewsData.length === currentLimit && currentLimit < 20);
    } catch (error) {
      console.error('Failed to load live news:', error);
      // Fallback to regular news with cache
      await loadNews(forceRefresh);
    } finally {
      setLiveNewsLoading(false);
    }
  };

  const loadTrendingTopics = async (forceRefresh: boolean = false) => {
    if (!backendAvailable) return;

    setTrendingLoading(true);
    try {
      const trending = await newsCacheService.getTrendingTopics('24h', 20, undefined, forceRefresh);
      setTrendingTopics(trending);
    } catch (error) {
      console.error('Failed to load trending topics:', error);
    } finally {
      setTrendingLoading(false);
    }
  };

  const loadSocialHooks = async (forceRefresh: boolean = false) => {
    if (!backendAvailable) return;

    setHooksLoading(true);
    try {
      const hooks = await newsCacheService.getSocialHooks(['twitter', 'instagram', 'linkedin'], 15, 70, forceRefresh);
      setSocialHooks(hooks);
    } catch (error) {
      console.error('Failed to load social hooks:', error);
    } finally {
      setHooksLoading(false);
    }
  };

  const loadStats = async (forceRefresh: boolean = false) => {
    setStatsLoading(true);
    try {
      const statsData = await newsCacheService.getNewsStats(forceRefresh);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const connectWebSocket = () => {
    if (wsConnected) return;

    liveNewsWebSocket.connect({
      onConnect: (clientId) => {
        console.log('🔌 WebSocket connected:', clientId);
        setWsConnected(true);
      },
      onInitialData: (data) => {
        console.log('📡 Received initial WebSocket data');
        setLiveNews(data.latest_news);
        setTrendingTopics(data.trending_topics);
        setSocialHooks(data.social_hooks);
        setLiveNewsLoading(false);
        setTrendingLoading(false);
        setHooksLoading(false);
      },
      onLiveUpdate: (data) => {
        console.log('📡 Received live WebSocket update');
        // Update only the latest news and trending topics
        setLiveNews(prev => {
          const newItems = data.latest_news.filter(item =>
            !prev.some(existing => existing.id === item.id)
          );
          return [...newItems, ...prev].slice(0, 50); // Keep latest 50 items
        });
        setTrendingTopics(data.trending_topics);
      },
      onError: (error) => {
        console.error('❌ WebSocket error:', error);
        setWsConnected(false);
      },
      onDisconnect: () => {
        console.log('🔌 WebSocket disconnected');
        setWsConnected(false);
      }
    });
  };

  const disconnectWebSocket = () => {
    liveNewsWebSocket.disconnect();
    setWsConnected(false);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      // Return to cached news when search is cleared
      if (backendAvailable) {
        await loadLiveData();
      } else {
        await loadNews();
      }
      return;
    }

    setSearchLoading(true);
    try {
      const category = selectedCategory === 'all' ? undefined : selectedCategory;
      const searchResults = await newsCacheService.searchNews(query, category, currentLimit);
      setNews(searchResults);
      setLiveNews(searchResults as LiveNewsItem[]);
      setShowLoadMore(searchResults.length === currentLimit);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    await loadAllData(true); // Force refresh bypasses cache
  };

  const handleLoadMore = async () => {
    const newLimit = Math.min(currentLimit + 5, 20);
    setCurrentLimit(newLimit);

    // Load more data with new limit
    if (searchQuery) {
      await handleSearch(searchQuery);
    } else if (backendAvailable) {
      await loadLiveData(true); // Force refresh to get more data
    } else {
      await loadNews(true);
    }
  };

  const handleGenerateContent = (newsItem: NewsItem) => {
    onNewsSelected(newsItem);
  };

  const handleReadArticle = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSchedulePost = (newsItem: NewsItem) => {
    setSelectedNewsForScheduling(newsItem);
    setShowScheduleModal(true);
  };

  const handleScheduleSubmit = async (contentData: any) => {
    try {
      // Generate initial content from news if not provided
      if (!contentData.content_text && selectedNewsForScheduling) {
        const generatedContent = await socialSchedulingService.generateContentFromNews(
          selectedNewsForScheduling.id,
          contentData.platform,
          {
            includeHashtags: true,
            maxLength: platformConfigs.find(p => p.platform === contentData.platform)?.maxLength || 280
          }
        );
        contentData.content_text = generatedContent.content_text;
        contentData.hashtags = generatedContent.hashtags;
        contentData.ai_generated = true;
        contentData.source_news = {
          title: selectedNewsForScheduling.title,
          url: selectedNewsForScheduling.url
        };
      }

      const result = await socialSchedulingService.scheduleContent(contentData);
      setShowScheduleModal(false);
      setSelectedNewsForScheduling(null);

      if (addNotification) {
        addNotification(
          `Post scheduled for ${new Date(result.scheduled_time).toLocaleString()}`,
          'success'
        );
      }
    } catch (error) {
      console.error('Failed to schedule post:', error);
      if (addNotification) {
        addNotification('Failed to schedule post. Please try again.', 'error');
      }
    }
  };

  return (
    <div className="flex-grow flex flex-col bg-white overflow-hidden">
      {/* Stats Bar */}
      <NewsStatsBar stats={stats || {
        freshArticles: 0,
        premiumSources: 0,
        activeAPIs: 0,
        lastUpdate: new Date().toISOString(),
        totalArticles: 0
      }} isLoading={statsLoading} />

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white">
        <nav className="flex space-x-8 px-6">
          {[
            { key: 'live', label: backendAvailable ? 'Live News' : 'Latest News', icon: 'zap' },
            ...(backendAvailable ? [{ key: 'trending', label: 'Trending Topics', icon: 'trending-up' }] : []),
            ...(backendAvailable ? [{ key: 'hooks', label: 'Social Hooks', icon: 'hash' }] : []),
            { key: 'generated', label: 'Generated Content', icon: 'image' },
            { key: 'api', label: 'API Status', icon: 'bolt' },
            { key: 'settings', label: 'Settings', icon: 'gear' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon icon={tab.icon as any} className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'live' && (
          <>
            {/* Search and Filters */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {backendAvailable ? '⚡ Live News Feed' : 'Premium AI News Feed'}
                  </h2>
                  {wsConnected && (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      Live Connected
                    </span>
                  )}
                  {backendAvailable && !wsConnected && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      API Mode
                    </span>
                  )}
                  {!backendAvailable && (
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                      Mock Data
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {backendAvailable && (
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={realtimeEnabled}
                        onChange={(e) => setRealtimeEnabled(e.target.checked)}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      Real-time Updates
                    </label>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className={`flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors ${
                        isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <Icon icon="refreshCw" className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </button>

                    {lastRefresh && (
                      <span className="text-xs text-gray-500">
                        Updated: {lastRefresh.toLocaleTimeString()}
                      </span>
                    )}

                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <div className={`w-2 h-2 rounded-full ${cacheStats.hitRate > 50 ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                      Cache: {cacheStats.hitRate.toFixed(0)}% hit rate
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Icon icon="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search news articles..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  {searchLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as NewsCategory | 'all')}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* News Feed */}
            <div className="flex-1 overflow-y-auto">
              {(backendAvailable ? liveNewsLoading : loading) ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                </div>
              ) : (backendAvailable ? liveNews : news).length === 0 ? (
                <div className="text-center py-16">
                  <Icon icon="newspaper" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No news found</h3>
                  <p className="text-gray-500">
                    {searchQuery ? 'Try adjusting your search terms.' : 'No articles available in this category.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {(backendAvailable ? liveNews : news).map((item) => (
                    <NewsListItem
                      key={item.id}
                      newsItem={item}
                      onGenerateContent={handleGenerateContent}
                      onReadArticle={handleReadArticle}
                      onSchedulePost={handleSchedulePost}
                      onFetchContent={(newsItem, content) => {
                        // Store fetched content in the news item for content generation
                        console.log('Article content fetched:', content);
                        // This could be expanded to update the news item with content
                      }}
                    />
                  ))}

                  {showLoadMore && !isRefreshing && (
                    <div className="p-6 text-center border-t border-gray-100">
                      <button
                        onClick={handleLoadMore}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Load More Articles ({currentLimit}/20)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Trending Topics Tab */}
        {activeTab === 'trending' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">🔥 Trending Topics</h2>
              <p className="text-gray-600 text-sm">Real-time trending topics with virality analysis</p>
            </div>

            <TrendingTopicsGrid
              topics={trendingTopics}
              loading={trendingLoading}
              onTopicClick={(topic) => console.log('Topic clicked:', topic)}
              onCreateContent={(topic) => {
                // Convert topic to news item format for content generation
                const mockNewsItem = {
                  id: topic.id,
                  title: `Trending: ${topic.keyword}`,
                  description: `Create content around the trending topic: ${topic.keyword}`,
                  category: topic.category || 'technology',
                  source: 'Trending Topics',
                  publishedAt: new Date().toISOString(),
                  url: '#',
                  tags: [topic.keyword],
                  hashtags: [],
                  credibility: 80,
                  engagement: 85,
                  readingTime: 2,
                  isPremium: false,
                  isFresh: true,
                  isFeatured: false,
                  relevanceScore: 90,
                  trendingPotential: 95,
                  sentiment: 'positive' as const
                } as NewsItem;
                onNewsSelected(mockNewsItem);
              }}
            />
          </div>
        )}

        {/* Social Hooks Tab */}
        {activeTab === 'hooks' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">🎣 Social Hooks</h2>
              <p className="text-gray-600 text-sm">Viral opportunities and social media hooks</p>
            </div>

            <SocialHooksList
              hooks={socialHooks}
              loading={hooksLoading}
              onHookClick={(hook) => console.log('Hook clicked:', hook)}
              onCreateContent={(hook) => {
                // Convert hook to news item format for content generation
                const mockNewsItem = {
                  id: hook.id,
                  title: `Social Hook: ${hook.hookType.replace('_', ' ')}`,
                  description: hook.content,
                  category: 'marketing' as const,
                  source: `${hook.platform} Hook`,
                  publishedAt: new Date().toISOString(),
                  url: '#',
                  tags: [hook.platform, hook.hookType],
                  hashtags: hook.trendingHashtags || [],
                  credibility: 75,
                  engagement: hook.engagementPotential,
                  readingTime: 1,
                  isPremium: false,
                  isFresh: true,
                  isFeatured: hook.engagementPotential > 85,
                  relevanceScore: hook.engagementPotential,
                  trendingPotential: hook.engagementPotential,
                  sentiment: 'positive' as const
                } as NewsItem;
                onNewsSelected(mockNewsItem);
              }}
              onCopyContent={(content) => console.log('Content copied:', content)}
            />
          </div>
        )}

        {/* Placeholder content for other tabs */}
        {!['live', 'trending', 'hooks'].includes(activeTab) && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Icon icon="gear" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h3>
              <p className="text-gray-500">Coming soon...</p>
            </div>
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          setSelectedNewsForScheduling(null);
        }}
        onSchedule={handleScheduleSubmit}
        platformConfigs={platformConfigs}
        initialData={selectedNewsForScheduling ? {
          title: selectedNewsForScheduling.title,
          content_text: `${selectedNewsForScheduling.title}\n\n${selectedNewsForScheduling.description}\n\nRead more: ${selectedNewsForScheduling.url}`,
          hashtags: selectedNewsForScheduling.hashtags || []
        } : undefined}
      />
    </div>
  );
};

export default NewsHub;