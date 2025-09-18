import React, { useState, useEffect } from 'react';
import { NewsItem, NewsCategory, NewsStats, LiveNewsItem, TrendingTopic, SocialHook } from '../types';
import { fetchNews, getNewsCategories, searchNews, formatNewsDate, getNewsStats } from '../services/newsService';
import { liveNewsService } from '../services/liveNewsService';
import Icon from '../components/Icon';
import NewsStatsBar from '../components/NewsStatsBar';
import NewsListItem from '../components/NewsListItem';

interface NewsHubProps {
  onNavigate: (view: string) => void;
  onNewsSelected: (newsItem: NewsItem) => void;
}

const NewsHub: React.FC<NewsHubProps> = ({ onNavigate, onNewsSelected }) => {
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

  const checkBackendHealth = async () => {
    try {
      const isHealthy = await liveNewsService.checkBackendHealth();
      setBackendAvailable(isHealthy);
    } catch (error) {
      console.warn('Backend health check failed:', error);
      setBackendAvailable(false);
    }
  };

  const loadAllData = async () => {
    await Promise.all([
      loadStats(),
      loadTrendingTopics(),
      loadSocialHooks()
    ]);
  };

  const loadNews = async () => {
    setLoading(true);
    try {
      const category = selectedCategory === 'all' ? undefined : selectedCategory;
      const newsData = await fetchNews(category);
      setNews(newsData);
    } catch (error) {
      console.error('Failed to load news:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLiveData = async () => {
    setLiveNewsLoading(true);
    try {
      const category = selectedCategory === 'all' ? undefined : selectedCategory;
      const liveNewsData = await liveNewsService.fetchLatestNews(category, 50, false);
      setLiveNews(liveNewsData);
    } catch (error) {
      console.error('Failed to load live news:', error);
      // Fallback to regular news
      await loadNews();
    } finally {
      setLiveNewsLoading(false);
    }
  };

  const loadTrendingTopics = async () => {
    if (!backendAvailable) return;

    setTrendingLoading(true);
    try {
      const trending = await liveNewsService.fetchTrendingTopics('24h', 20);
      setTrendingTopics(trending);
    } catch (error) {
      console.error('Failed to load trending topics:', error);
    } finally {
      setTrendingLoading(false);
    }
  };

  const loadSocialHooks = async () => {
    if (!backendAvailable) return;

    setHooksLoading(true);
    try {
      const hooks = await liveNewsService.fetchSocialHooks(['twitter', 'instagram', 'linkedin'], 15, 70);
      setSocialHooks(hooks);
    } catch (error) {
      console.error('Failed to load social hooks:', error);
    } finally {
      setHooksLoading(false);
    }
  };

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      let statsData;
      if (backendAvailable) {
        statsData = await liveNewsService.getEnhancedStats();
      } else {
        statsData = await getNewsStats();
      }
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      loadNews();
      return;
    }

    setSearchLoading(true);
    try {
      const category = selectedCategory === 'all' ? undefined : selectedCategory;
      const searchResults = await searchNews(query, category);
      setNews(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleRefresh = () => {
    if (backendAvailable) {
      loadLiveData();
    } else {
      loadNews();
    }
    loadStats();
    if (backendAvailable) {
      loadTrendingTopics();
      loadSocialHooks();
    }
  };

  const handleGenerateContent = (newsItem: NewsItem) => {
    onNewsSelected(newsItem);
  };

  const handleReadArticle = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
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
                  {backendAvailable && (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                      Real-time
                    </span>
                  )}
                  {!backendAvailable && (
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                      Mock Data
                    </span>
                  )}
                </div>
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Icon icon="refreshCw" className="w-4 h-4" />
                  Refresh
                </button>
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
                    />
                  ))}
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

            {trendingLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
              </div>
            ) : trendingTopics.length === 0 ? (
              <div className="text-center py-16">
                <Icon icon="trending-up" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No trending topics</h3>
                <p className="text-gray-500">Check back later for trending topics</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trendingTopics.map((topic) => (
                  <div key={topic.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        topic.trend === 'hot' ? 'bg-red-100 text-red-800' :
                        topic.trend === 'rising' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {topic.trend === 'hot' ? '🔥 Hot' :
                         topic.trend === 'rising' ? '📈 Rising' :
                         '🚀 Emerging'}
                      </span>
                      <span className="text-xs text-gray-500">{topic.volume?.toLocaleString()} mentions</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{topic.keyword}</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        {topic.platforms?.slice(0, 3).map((platform, idx) => (
                          <span key={idx} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                            {platform}
                          </span>
                        ))}
                      </div>
                      <span className={`text-xs font-medium ${
                        (topic.changeRate || 0) > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {topic.changeRate > 0 ? '+' : ''}{topic.changeRate}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Social Hooks Tab */}
        {activeTab === 'hooks' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">🎣 Social Hooks</h2>
              <p className="text-gray-600 text-sm">Viral opportunities and social media hooks</p>
            </div>

            {hooksLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
              </div>
            ) : socialHooks.length === 0 ? (
              <div className="text-center py-16">
                <Icon icon="hash" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No social hooks</h3>
                <p className="text-gray-500">Check back later for viral opportunities</p>
              </div>
            ) : (
              <div className="space-y-4">
                {socialHooks.map((hook) => (
                  <div key={hook.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          hook.platform === 'twitter' ? 'bg-blue-100 text-blue-800' :
                          hook.platform === 'instagram' ? 'bg-pink-100 text-pink-800' :
                          hook.platform === 'linkedin' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {hook.platform}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          hook.engagementPotential >= 85 ? 'bg-green-100 text-green-800' :
                          hook.engagementPotential >= 70 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {hook.engagementPotential}% engagement
                        </span>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        hook.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        hook.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {hook.difficulty}
                      </span>
                    </div>

                    <p className="text-gray-900 mb-3 font-medium">{hook.content}</p>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {hook.trendingHashtags?.slice(0, 5).map((hashtag, idx) => (
                        <span key={idx} className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded">
                          {hashtag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Optimal: {new Date(hook.optimalPostTime).toLocaleTimeString()}</span>
                      <span>Expires: {new Date(hook.expiryTime).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
    </div>
  );
};

export default NewsHub;