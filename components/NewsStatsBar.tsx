import React from 'react';
import { NewsStats } from '../types';
import Icon from './Icon';

interface NewsStatsBarProps {
  stats: NewsStats;
  isLoading?: boolean;
}

const NewsStatsBar: React.FC<NewsStatsBarProps> = ({ stats, isLoading = false }) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <h1 className="text-2xl font-bold text-gray-900">Explore Hook and Latest News</h1>
    </div>
  );
};

export default NewsStatsBar;