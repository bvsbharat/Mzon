import React, { useState, useEffect } from 'react';
import { LiveNewsItem } from '../types';
import Icon from './Icon';
import NewsListItem from './NewsListItem';

interface LiveNewsFeedProps {
  news: LiveNewsItem[];
  loading: boolean;
  onNewsSelected: (newsItem: LiveNewsItem) => void;
  onRefresh?: () => void;
  showBreakingOnly?: boolean;
  onToggleBreaking?: (showBreaking: boolean) => void;
}

const LiveNewsFeed: React.FC<LiveNewsFeedProps> = ({
  news,
  loading,
  onNewsSelected,
  onRefresh,
  showBreakingOnly = false,
  onToggleBreaking
}) => {
  const [sortBy, setSortBy] = useState<'latest' | 'viral' | 'trending'>('latest');
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      onRefresh?.();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, onRefresh]);

  const sortedNews = React.useMemo(() => {
    let filtered = showBreakingOnly ? news.filter(item => item.isBreaking) : news;

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'viral':
          return b.viralityScore - a.viralityScore;
        case 'trending':
          return (b.trendingRank || 999) - (a.trendingRank || 999);
        case 'latest':
        default:
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      }
    });
  }, [news, sortBy, showBreakingOnly]);

  const breakingNewsCount = news.filter(item => item.isBreaking).length;
  const viralNewsCount = news.filter(item => item.viralityScore > 80).length;
  const averageEngagement = news.length > 0
    ? Math.round(news.reduce((sum, item) => sum + item.engagement, 0) / news.length)
    : 0;

  const handleReadArticle = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const formatViralityScore = (score: number) => {
    if (score >= 90) return { text: 'Extremely Viral', color: 'text-red-600', bg: 'bg-red-50' };
    if (score >= 80) return { text: 'Highly Viral', color: 'text-orange-600', bg: 'bg-orange-50' };
    if (score >= 60) return { text: 'Moderately Viral', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    if (score >= 40) return { text: 'Somewhat Viral', color: 'text-blue-600', bg: 'bg-blue-50' };
    return { text: 'Low Viral', color: 'text-gray-600', bg: 'bg-gray-50' };
  };

  const formatEngagementVelocity = (velocity: number) => {
    if (velocity >= 2.0) return { text: 'Rapidly Spreading', icon: '🚀' };
    if (velocity >= 1.5) return { text: 'Fast Growth', icon: '📈' };
    if (velocity >= 1.0) return { text: 'Steady Growth', icon: '↗️' };
    if (velocity >= 0.5) return { text: 'Slow Growth', icon: '➡️' };
    return { text: 'Minimal Growth', icon: '📊' };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with metrics and controls */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        {/* Real-time metrics */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700">Live Feed</span>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Icon icon="zap" className="w-4 h-4 text-red-500" />
                {breakingNewsCount} Breaking
              </span>
              <span className="flex items-center gap-1">
                <Icon icon="trending-up" className="w-4 h-4 text-orange-500" />
                {viralNewsCount} Viral
              </span>
              <span className="flex items-center gap-1">
                <Icon icon="activity" className="w-4 h-4 text-blue-500" />
                {averageEngagement}% Avg Engagement
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Auto-refresh
            </label>

            <button
              onClick={onRefresh}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icon icon="refreshCw" className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="latest">Latest First</option>
              <option value="viral">Most Viral</option>
              <option value="trending">Trending Rank</option>
            </select>

            {onToggleBreaking && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showBreakingOnly}
                  onChange={(e) => onToggleBreaking(e.target.checked)}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-gray-700">Breaking news only</span>
              </label>
            )}
          </div>

          <div className="text-sm text-gray-500">
            {sortedNews.length} articles • Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* News Feed */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-gray-500">Loading live news...</p>
            </div>
          </div>
        ) : sortedNews.length === 0 ? (
          <div className="text-center py-16">
            <Icon icon="newspaper" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {showBreakingOnly ? 'No breaking news' : 'No news found'}
            </h3>
            <p className="text-gray-500">
              {showBreakingOnly
                ? 'No breaking news at the moment. Check back later.'
                : 'Try adjusting your filters or refreshing the feed.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sortedNews.map((item) => {
              const viralityInfo = formatViralityScore(item.viralityScore);
              const velocityInfo = formatEngagementVelocity(item.realTimeMetrics.viralityVelocity);

              return (
                <div key={item.id} className="relative">
                  {/* Breaking news indicator */}
                  {item.isBreaking && (
                    <div className="absolute top-4 left-4 z-10">
                      <span className="px-2 py-1 text-xs font-bold bg-red-500 text-white rounded-full animate-pulse">
                        BREAKING
                      </span>
                    </div>
                  )}

                  {/* Trending rank indicator */}
                  {item.trendingRank && item.trendingRank <= 10 && (
                    <div className="absolute top-4 right-4 z-10">
                      <span className="px-2 py-1 text-xs font-bold bg-orange-500 text-white rounded-full">
                        #{item.trendingRank} Trending
                      </span>
                    </div>
                  )}

                  <div className={`${item.isBreaking ? 'pl-20' : ''} ${item.trendingRank ? 'pr-20' : ''}`}>
                    <NewsListItem
                      newsItem={item}
                      onGenerateContent={onNewsSelected}
                      onReadArticle={handleReadArticle}
                    />
                  </div>

                  {/* Enhanced metrics bar */}
                  <div className="px-6 pb-3 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-4">
                        <span className={`px-2 py-1 rounded-full ${viralityInfo.bg} ${viralityInfo.color} font-medium`}>
                          🔥 {viralityInfo.text}
                        </span>

                        <span className="text-gray-600">
                          {velocityInfo.icon} {velocityInfo.text}
                        </span>

                        {item.socialEngagement && (
                          <span className="text-gray-600">
                            💬 {item.socialEngagement.totalEngagement?.toLocaleString()} interactions
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-gray-500">
                        <span>👀 {item.realTimeMetrics.views?.toLocaleString()} views</span>
                        <span>📤 {item.realTimeMetrics.shares?.toLocaleString()} shares</span>
                        <span>💭 {item.realTimeMetrics.comments?.toLocaleString()} comments</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveNewsFeed;