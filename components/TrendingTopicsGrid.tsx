import React, { useState } from 'react';
import { TrendingTopic } from '../types';
import Icon from './Icon';

interface TrendingTopicsGridProps {
  topics: TrendingTopic[];
  loading: boolean;
  onTopicClick?: (topic: TrendingTopic) => void;
  onCreateContent?: (topic: TrendingTopic) => void;
}

const TrendingTopicsGrid: React.FC<TrendingTopicsGridProps> = ({
  topics,
  loading,
  onTopicClick,
  onCreateContent
}) => {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'hot':
        return '🔥';
      case 'rising':
        return '📈';
      case 'emerging':
        return '🚀';
      case 'declining':
        return '📉';
      default:
        return '📊';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'hot':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'rising':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'emerging':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'declining':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getChangeRateColor = (changeRate: number) => {
    if (changeRate > 50) return 'text-green-600';
    if (changeRate > 0) return 'text-green-500';
    if (changeRate === 0) return 'text-gray-500';
    return 'text-red-500';
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    }
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toString();
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
            <div className="flex items-center justify-between mb-2">
              <div className="h-5 bg-gray-200 rounded-full w-16"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <div className="h-4 bg-gray-200 rounded w-12"></div>
                <div className="h-4 bg-gray-200 rounded w-12"></div>
                <div className="h-4 bg-gray-200 rounded w-12"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-10"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div className="text-center py-16">
        <Icon icon="trending-up" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No trending topics</h3>
        <p className="text-gray-500">Check back later for trending topics</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {topics.map((topic) => (
        <div
          key={topic.id}
          className={`bg-white border-2 rounded-lg p-4 hover:shadow-lg transition-all duration-200 cursor-pointer ${
            selectedTopic === topic.id
              ? 'border-blue-500 shadow-md'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => {
            setSelectedTopic(topic.id);
            onTopicClick?.(topic);
          }}
        >
          {/* Header with trend status and volume */}
          <div className="flex items-center justify-between mb-3">
            <span
              className={`px-3 py-1 text-xs font-medium rounded-full border ${getTrendColor(
                topic.trend
              )}`}
            >
              {getTrendIcon(topic.trend)} {topic.trend.charAt(0).toUpperCase() + topic.trend.slice(1)}
            </span>
            <span className="text-xs text-gray-500 font-medium">
              {formatVolume(topic.volume)} mentions
            </span>
          </div>

          {/* Keyword */}
          <h3 className="font-semibold text-gray-900 mb-3 text-lg leading-tight">
            {topic.keyword}
          </h3>

          {/* Platforms */}
          <div className="flex flex-wrap gap-1 mb-3">
            {topic.platforms?.slice(0, 4).map((platform, idx) => (
              <span
                key={idx}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded capitalize"
              >
                {platform}
              </span>
            ))}
            {topic.platforms && topic.platforms.length > 4 && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded">
                +{topic.platforms.length - 4}
              </span>
            )}
          </div>

          {/* Footer with change rate and actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${getChangeRateColor(topic.changeRate || 0)}`}>
                {topic.changeRate && topic.changeRate > 0 ? '+' : ''}
                {topic.changeRate || 0}%
              </span>
              <span className="text-xs text-gray-400">
                {topic.timeframe || '24h'}
              </span>
            </div>

            {onCreateContent && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateContent(topic);
                }}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                title="Create content from this trending topic"
              >
                <Icon icon="plus" className="w-3 h-3" />
                Create
              </button>
            )}
          </div>

          {/* Category and Geography (if available) */}
          {(topic.category || topic.geography) && (
            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
              {topic.category && (
                <span className="capitalize">{topic.category}</span>
              )}
              {topic.geography && (
                <span>{topic.geography}</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default TrendingTopicsGrid;