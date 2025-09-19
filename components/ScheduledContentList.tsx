import React, { useState } from 'react';
import { ScheduledContent, SocialPlatformConfig } from '../types';
import Icon from './Icon';

interface ScheduledContentListProps {
  content: ScheduledContent[];
  loading: boolean;
  onUpdateStatus: (contentId: string, status: 'posted' | 'failed' | 'cancelled') => void;
  onEdit: (content: ScheduledContent) => void;
  platformConfigs: SocialPlatformConfig[];
}

const ScheduledContentList: React.FC<ScheduledContentListProps> = ({
  content,
  loading,
  onUpdateStatus,
  onEdit,
  platformConfigs
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (contentId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(contentId)) {
      newExpanded.delete(contentId);
    } else {
      newExpanded.add(contentId);
    }
    setExpandedItems(newExpanded);
  };

  const getPlatformConfig = (platform: string): SocialPlatformConfig | undefined => {
    return platformConfigs.find(config => config.platform === platform);
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      const absDiffMins = Math.abs(diffMins);
      const absDiffHours = Math.abs(diffHours);
      const absDiffDays = Math.abs(diffDays);

      if (absDiffMins < 60) {
        return `${absDiffMins} minutes ago`;
      } else if (absDiffHours < 24) {
        return `${absDiffHours} hours ago`;
      } else {
        return `${absDiffDays} days ago`;
      }
    } else {
      if (diffMins < 60) {
        return `in ${diffMins} minutes`;
      } else if (diffHours < 24) {
        return `in ${diffHours} hours`;
      } else {
        return `in ${diffDays} days`;
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return 'clock';
      case 'posted': return 'checkCircle';
      case 'failed': return 'xCircle';
      case 'cancelled': return 'minusCircle';
      default: return 'clock';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600 bg-blue-100';
      case 'posted': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Icon icon="calendar" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Scheduled Content</h3>
          <p className="text-gray-500">Schedule your first social media post to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="divide-y divide-gray-100">
        {content.map((item) => {
          const platformConfig = getPlatformConfig(item.platform);
          const isExpanded = expandedItems.has(item.id);

          return (
            <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-4">
                {/* Platform Icon */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium shrink-0"
                  style={{ backgroundColor: platformConfig?.color || '#6B7280' }}
                >
                  {item.platform[0].toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 capitalize">
                          {item.platform}
                        </h3>
                        {item.ai_generated && (
                          <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                            AI Generated
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{formatRelativeTime(item.scheduled_time)}</span>
                        <span>
                          {new Date(item.scheduled_time).toLocaleDateString()} at{' '}
                          {new Date(item.scheduled_time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                      <Icon icon={getStatusIcon(item.status)} className="w-3 h-3" />
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </div>
                  </div>

                  {/* Title */}
                  {item.title && (
                    <h4 className="font-medium text-gray-800 mb-2">{item.title}</h4>
                  )}

                  {/* Content Preview */}
                  <div className="mb-3">
                    <p className="text-gray-700 leading-relaxed">
                      {isExpanded || item.content_text.length <= 200
                        ? item.content_text
                        : `${item.content_text.substring(0, 200)}...`
                      }
                    </p>
                    {item.content_text.length > 200 && (
                      <button
                        onClick={() => toggleExpanded(item.id)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-1"
                      >
                        {isExpanded ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>

                  {/* Hashtags */}
                  {item.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {item.hashtags.map((tag, index) => (
                        <span
                          key={index}
                          className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Media URLs */}
                  {item.media_urls.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-2">Media attachments:</p>
                      <div className="space-y-1">
                        {item.media_urls.map((url, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                            <Icon icon="image" className="w-4 h-4" />
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 truncate"
                            >
                              {url}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Source News */}
                  {item.source_news && (
                    <div className="mb-3 p-3 bg-gray-100 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Icon icon="newspaper" className="w-4 h-4" />
                        <span>Generated from:</span>
                        <a
                          href={item.source_news.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 font-medium truncate"
                        >
                          {item.source_news.title}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Engagement Data (for posted content) */}
                  {item.status === 'posted' && item.engagement_data && (
                    <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800 font-medium mb-2">Performance</p>
                      <div className="flex items-center gap-6 text-sm text-green-700">
                        <div className="flex items-center gap-1">
                          <Icon icon="heart" className="w-4 h-4" />
                          <span>{item.engagement_data.likes} likes</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Icon icon="share" className="w-4 h-4" />
                          <span>{item.engagement_data.shares} shares</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Icon icon="messageCircle" className="w-4 h-4" />
                          <span>{item.engagement_data.comments} comments</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Message (for failed content) */}
                  {item.status === 'failed' && item.last_error && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800 font-medium mb-1">Error</p>
                      <p className="text-sm text-red-700">{item.last_error}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
                    {item.status === 'scheduled' && (
                      <>
                        <button
                          onClick={() => onEdit(item)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                          <Icon icon="edit" className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => onUpdateStatus(item.id, 'posted')}
                          className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                        >
                          <Icon icon="checkCircle" className="w-4 h-4" />
                          Mark as Posted
                        </button>
                        <button
                          onClick={() => onUpdateStatus(item.id, 'cancelled')}
                          className="text-sm text-gray-600 hover:text-gray-700 font-medium flex items-center gap-1"
                        >
                          <Icon icon="x" className="w-4 h-4" />
                          Cancel
                        </button>
                      </>
                    )}

                    {item.status === 'failed' && item.retry_count && item.retry_count < 3 && (
                      <button
                        onClick={() => onUpdateStatus(item.id, 'posted')}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                      >
                        <Icon icon="refresh" className="w-4 h-4" />
                        Retry
                      </button>
                    )}

                    <div className="text-sm text-gray-500 ml-auto">
                      Created {formatRelativeTime(item.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScheduledContentList;