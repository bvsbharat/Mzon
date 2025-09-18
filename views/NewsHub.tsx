import React, { useState, useEffect } from 'react';
import { NewsItem, NewsCategory, NewsStats } from '../types';
import { fetchNews, getNewsCategories, searchNews, formatNewsDate, getNewsStats } from '../services/newsService';
import Icon from '../components/Icon';
import NewsStatsBar from '../components/NewsStatsBar';
import NewsListItem from '../components/NewsListItem';

interface NewsHubProps {
  onNavigate: (view: string) => void;
  onNewsSelected: (newsItem: NewsItem) => void;
}

const NewsHub: React.FC<NewsHubProps> = ({ onNavigate, onNewsSelected }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [stats, setStats] = useState<NewsStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'latest' | 'generated' | 'history' | 'api' | 'settings'>('latest');

  const categories = getNewsCategories();

  useEffect(() => {
    loadNews();
    loadStats();
  }, [selectedCategory]);

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

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const statsData = await getNewsStats();
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
    loadNews();
    loadStats();
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
            { key: 'latest', label: 'Latest News', icon: 'newspaper' },
            { key: 'generated', label: 'Generated Content', icon: 'image' },
            { key: 'history', label: 'Content History', icon: 'clock' },
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
        {activeTab === 'latest' && (
          <>
            {/* Search and Filters */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Premium AI News Feed</h2>
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
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                </div>
              ) : news.length === 0 ? (
                <div className="text-center py-16">
                  <Icon icon="newspaper" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No news found</h3>
                  <p className="text-gray-500">
                    {searchQuery ? 'Try adjusting your search terms.' : 'No articles available in this category.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {news.map((item) => (
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

        {/* Placeholder content for other tabs */}
        {activeTab !== 'latest' && (
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