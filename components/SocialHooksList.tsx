import React, { useState } from 'react';
import { SocialHook } from '../types';
import Icon from './Icon';

interface SocialHooksListProps {
  hooks: SocialHook[];
  loading: boolean;
  onHookClick?: (hook: SocialHook) => void;
  onCreateContent?: (hook: SocialHook) => void;
  onCopyContent?: (content: string) => void;
}

const SocialHooksList: React.FC<SocialHooksListProps> = ({
  hooks,
  loading,
  onHookClick,
  onCreateContent,
  onCopyContent
}) => {
  const [selectedHook, setSelectedHook] = useState<string | null>(null);
  const [copiedContent, setCopiedContent] = useState<string | null>(null);

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'twitter':
        return '🐦';
      case 'instagram':
        return '📷';
      case 'linkedin':
        return '💼';
      case 'facebook':
        return '👥';
      case 'tiktok':
        return '🎵';
      case 'youtube':
        return '📺';
      default:
        return '📱';
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'twitter':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'instagram':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'linkedin':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'facebook':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'tiktok':
        return 'bg-black text-white border-gray-200';
      case 'youtube':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEngagementColor = (engagement: number) => {
    if (engagement >= 90) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (engagement >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (engagement >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (engagement >= 60) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getHookTypeIcon = (hookType: string) => {
    switch (hookType) {
      case 'trending_hashtag':
        return '#️⃣';
      case 'viral_topic':
        return '🌟';
      case 'breaking_news':
        return '⚡';
      case 'meme':
        return '😄';
      case 'controversy':
        return '🔥';
      default:
        return '📌';
    }
  };

  const formatTimeRemaining = (expiryTime: string) => {
    const now = new Date();
    const expiry = new Date(expiryTime);
    const diffMs = expiry.getTime() - now.getTime();

    if (diffMs <= 0) return 'Expired';

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d remaining`;
    if (diffHours > 0) return `${diffHours}h remaining`;
    return 'Expires soon';
  };

  const handleCopyContent = async (content: string, hookId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedContent(hookId);
      onCopyContent?.(content);

      setTimeout(() => setCopiedContent(null), 2000);
    } catch (error) {
      console.error('Failed to copy content:', error);
    }
  };

  const getUrgencyIndicator = (expiryTime: string, engagementPotential: number) => {
    const now = new Date();
    const expiry = new Date(expiryTime);
    const hoursRemaining = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursRemaining <= 2 && engagementPotential >= 85) {
      return { text: 'URGENT', color: 'bg-red-500 text-white animate-pulse' };
    }
    if (hoursRemaining <= 6 && engagementPotential >= 80) {
      return { text: 'HIGH', color: 'bg-orange-500 text-white' };
    }
    if (engagementPotential >= 85) {
      return { text: 'HOT', color: 'bg-green-500 text-white' };
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-5 bg-gray-200 rounded-full w-16"></div>
                <div className="h-5 bg-gray-200 rounded-full w-20"></div>
              </div>
              <div className="h-5 bg-gray-200 rounded-full w-12"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
            <div className="flex flex-wrap gap-1 mb-3">
              <div className="h-4 bg-gray-200 rounded w-16"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
            <div className="flex items-center justify-between">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (hooks.length === 0) {
    return (
      <div className="text-center py-16">
        <Icon icon="hash" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No social hooks</h3>
        <p className="text-gray-500">Check back later for viral opportunities</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hooks.map((hook) => {
        const urgency = getUrgencyIndicator(hook.expiryTime, hook.engagementPotential);
        const isCopied = copiedContent === hook.id;

        return (
          <div
            key={hook.id}
            className={`bg-white border-2 rounded-lg p-5 hover:shadow-md transition-all duration-200 cursor-pointer ${
              selectedHook === hook.id
                ? 'border-blue-500 shadow-md'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => {
              setSelectedHook(hook.id);
              onHookClick?.(hook);
            }}
          >
            {/* Header with platform, engagement, and urgency */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getPlatformColor(hook.platform)}`}>
                  {getPlatformIcon(hook.platform)} {hook.platform}
                </span>

                <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getEngagementColor(hook.engagementPotential)}`}>
                  {hook.engagementPotential}% engagement
                </span>

                <span className={`px-2 py-1 text-xs rounded-full ${getHookTypeIcon(hook.hookType)}`}>
                  {getHookTypeIcon(hook.hookType)} {hook.hookType.replace('_', ' ')}
                </span>

                {urgency && (
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${urgency.color}`}>
                    {urgency.text}
                  </span>
                )}
              </div>

              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getDifficultyColor(hook.difficulty)}`}>
                {hook.difficulty}
              </span>
            </div>

            {/* Content */}
            <div className="mb-4">
              <p className="text-gray-900 font-medium text-lg leading-relaxed">
                {hook.content}
              </p>
            </div>

            {/* Hashtags */}
            {hook.trendingHashtags && hook.trendingHashtags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {hook.trendingHashtags.slice(0, 6).map((hashtag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyContent(hashtag, `${hook.id}-hashtag-${idx}`);
                    }}
                  >
                    {hashtag}
                  </span>
                ))}
                {hook.trendingHashtags.length > 6 && (
                  <span className="px-2 py-1 text-xs bg-gray-50 text-gray-500 rounded">
                    +{hook.trendingHashtags.length - 6} more
                  </span>
                )}
              </div>
            )}

            {/* Footer with timing and actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>
                  ⏰ Optimal: {new Date(hook.optimalPostTime).toLocaleTimeString()}
                </span>
                <span className={formatTimeRemaining(hook.expiryTime).includes('Expired') ? 'text-red-500 font-medium' : ''}>
                  ⏳ {formatTimeRemaining(hook.expiryTime)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyContent(hook.content, hook.id);
                  }}
                  className={`flex items-center gap-1 px-3 py-1 text-xs rounded transition-colors ${
                    isCopied
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Copy content"
                >
                  <Icon icon={isCopied ? "check" : "copy"} className="w-3 h-3" />
                  {isCopied ? 'Copied!' : 'Copy'}
                </button>

                {onCreateContent && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateContent(hook);
                    }}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                    title="Create content from this hook"
                  >
                    <Icon icon="plus" className="w-3 h-3" />
                    Create
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SocialHooksList;