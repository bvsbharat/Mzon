import React, { useState } from 'react';
import { NewsItem } from '../types';
import { socialSchedulingService } from '../services/socialSchedulingService';
import { airiaService } from '../services/airiaService';
import Icon from './Icon';

interface AiriaLinkedInPostProps {
  newsItem?: NewsItem;
  content?: string;
  hashtags?: string[];
  onPostSuccess?: (contentId: string) => void;
  onPostError?: (error: string) => void;
  className?: string;
}

const AiriaLinkedInPost: React.FC<AiriaLinkedInPostProps> = ({
  newsItem,
  content: initialContent,
  hashtags: initialHashtags,
  onPostSuccess,
  onPostError,
  className = ''
}) => {
  const [content, setContent] = useState(initialContent || '');
  const [hashtags, setHashtags] = useState<string[]>(initialHashtags || []);
  const [newHashtag, setNewHashtag] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [postStatus, setPostStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const isAiriaConfigured = airiaService.isConfigured();
  const configStatus = airiaService.getConfigurationStatus();

  // Auto-generate content from news item if provided
  React.useEffect(() => {
    if (newsItem && !initialContent) {
      const generatedContent = `📰 Industry Update: ${newsItem.title}

${newsItem.description}

What are your thoughts on this development? 💭

#Industry #Business #${newsItem.category}`;
      
      setContent(generatedContent);
      setHashtags(['Industry', 'Business', newsItem.category, ...(newsItem.hashtags || [])]);
    }
  }, [newsItem, initialContent]);

  const handleAddHashtag = () => {
    if (newHashtag.trim() && !hashtags.includes(newHashtag.trim())) {
      setHashtags([...hashtags, newHashtag.trim()]);
      setNewHashtag('');
    }
  };

  const handleRemoveHashtag = (index: number) => {
    setHashtags(hashtags.filter((_, i) => i !== index));
  };

  const handlePostToLinkedIn = async () => {
    if (!content.trim()) {
      onPostError?.('Content cannot be empty');
      return;
    }

    if (!isAiriaConfigured) {
      onPostError?.('Airia AI agent is not configured. Please set up your API credentials.');
      return;
    }

    setIsPosting(true);
    setPostStatus('idle');

    try {
      const result = await socialSchedulingService.postImmediately(
        'linkedin',
        content,
        hashtags
      );

      if (result.success) {
        setPostStatus('success');
        onPostSuccess?.(result.content_id);
      } else {
        setPostStatus('error');
        onPostError?.(result.error || 'Failed to post to LinkedIn');
      }
    } catch (error) {
      setPostStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      onPostError?.(errorMessage);
    } finally {
      setIsPosting(false);
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setPostStatus('idle');
      }, 3000);
    }
  };

  const getButtonText = () => {
    if (isPosting) return 'Posting to LinkedIn...';
    if (postStatus === 'success') return 'Posted Successfully!';
    if (postStatus === 'error') return 'Post Failed';
    return 'Post to LinkedIn via AI Agent';
  };

  const getButtonColor = () => {
    if (postStatus === 'success') return 'bg-green-600 hover:bg-green-700 border-green-600';
    if (postStatus === 'error') return 'bg-red-600 hover:bg-red-700 border-red-600';
    if (!isAiriaConfigured) return 'bg-gray-400 border-gray-400 cursor-not-allowed';
    return 'bg-blue-700 hover:bg-blue-800 border-blue-700';
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-700 to-blue-800 rounded-lg flex items-center justify-center">
          <Icon icon="briefcase" className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">LinkedIn Post</h3>
          <p className="text-sm text-gray-500">
            {isAiriaConfigured ? 'Powered by Airia AI Agent' : 'Requires Airia configuration'}
          </p>
        </div>
      </div>

      {/* Configuration Status */}
      {!isAiriaConfigured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <Icon icon="alertTriangle" className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-yellow-800 mb-1">
                Airia AI Agent Configuration Required
              </h4>
              <p className="text-sm text-yellow-700 mb-2">
                To post directly to LinkedIn, configure your Airia credentials:
              </p>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• {configStatus.hasApiKey ? '✅' : '❌'} VITE_AIRIA_API_KEY</li>
                <li>• {configStatus.hasUserId ? '✅' : '❌'} VITE_AIRIA_USER_ID</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* News Context */}
      {newsItem && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {newsItem.source.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-blue-700">{newsItem.source}</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  Source Article
                </span>
              </div>
              <h4 className="font-medium text-gray-900 text-sm mb-1">{newsItem.title}</h4>
              <p className="text-gray-600 text-xs">{newsItem.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Content Editor */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Post Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your LinkedIn post content..."
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-500">
              {content.length}/3000 characters
            </span>
            <span className="text-xs text-gray-500">
              LinkedIn professional format
            </span>
          </div>
        </div>

        {/* Hashtags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hashtags
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {hashtags.map((hashtag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm"
              >
                #{hashtag}
                <button
                  onClick={() => handleRemoveHashtag(index)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Icon icon="x" className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newHashtag}
              onChange={(e) => setNewHashtag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddHashtag()}
              placeholder="Add hashtag..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <button
              onClick={handleAddHashtag}
              disabled={!newHashtag.trim()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Add
            </button>
          </div>
        </div>

        {/* Post Button */}
        <div className="flex justify-end">
          <button
            onClick={handlePostToLinkedIn}
            disabled={isPosting || !content.trim() || !isAiriaConfigured}
            className={`
              flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-lg border transition-all duration-200
              ${getButtonColor()}
              ${isPosting || !content.trim() || !isAiriaConfigured ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {isPosting ? (
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
            ) : postStatus === 'success' ? (
              <Icon icon="checkCircle" className="w-5 h-5" />
            ) : postStatus === 'error' ? (
              <Icon icon="alertTriangle" className="w-5 h-5" />
            ) : (
              <Icon icon="briefcase" className="w-5 h-5" />
            )}
            {getButtonText()}
          </button>
        </div>

        {/* Success/Error Messages */}
        {postStatus === 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Icon icon="checkCircle" className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Successfully posted to LinkedIn via Airia AI Agent!
              </span>
            </div>
          </div>
        )}

        {postStatus === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Icon icon="alertTriangle" className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">
                Failed to post to LinkedIn. Please try again.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiriaLinkedInPost;
