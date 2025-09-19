import React, { useState } from 'react';
import Icon from '../Icon';
import { MockupProps } from './types';

const LinkedInMockup: React.FC<MockupProps> = ({
  videoUrl,
  title,
  duration,
  hasAudio,
  estimatedEngagement,
  onDownload,
  onSaveImage
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const user = {
    name: 'Your Company',
    title: 'Industry Leader',
    timeAgo: '2h',
    profilePic: '/api/placeholder/48/48',
    followers: '2,534'
  };

  const postStats = {
    likes: Math.floor(estimatedEngagement * 10).toString(),
    comments: '15',
    reposts: '8',
    views: '1.8K'
  };

  return (
    <div className="bg-white rounded-lg border border-gray-300 shadow-sm max-w-lg mx-auto">
      {/* LinkedIn Post Header */}
      <div className="p-4 pb-3">
        <div className="flex gap-3">
          {/* Profile Picture */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-700 to-blue-800 rounded-full flex items-center justify-center">
              <Icon icon="user" className="w-7 h-7 text-white" />
            </div>
          </div>

          <div className="flex-1">
            {/* User Info */}
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-gray-900 text-sm">{user.name}</div>
                <div className="text-gray-600 text-xs leading-4">{user.title}</div>
                <div className="text-gray-500 text-xs flex items-center gap-1 mt-1">
                  <span>{user.timeAgo}</span>
                  <span>•</span>
                  <Icon icon="globe" className="w-3 h-3" />
                </div>
              </div>
              <button className="text-gray-500 hover:bg-gray-100 p-1 rounded">
                <Icon icon="moreHorizontal" className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Post Content */}
        <div className="mt-3">
          <p className="text-gray-900 text-sm leading-relaxed">
            {title.length > 200 ? `${title.substring(0, 197)}...` : title}
          </p>
        </div>
      </div>

      {/* Video Container - 16:9 aspect ratio */}
      <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
        {videoUrl ? (
          <video
            src={videoUrl}
            controls={false}
            className="w-full h-full object-cover"
            onClick={() => setIsPlaying(!isPlaying)}
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <Icon icon="play" className="w-12 h-12 text-white opacity-70" />
          </div>
        )}

        {!isPlaying && videoUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={() => setIsPlaying(true)}
              className="w-16 h-16 bg-blue-700 hover:bg-blue-800 rounded-full flex items-center justify-center transition-colors shadow-lg"
            >
              <Icon icon="play" className="w-8 h-8 text-white ml-1" />
            </button>
          </div>
        )}

        {/* Video Info */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <div className="bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-white text-xs">
            {duration}
          </div>
          <div className="bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-white text-xs">
            {postStats.views} views
          </div>
        </div>
      </div>

      {/* Engagement Summary */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
              <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center border border-white">
                <Icon icon="thumbsUp" className="w-2 h-2 text-white" />
              </div>
              <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border border-white">
                <Icon icon="heart" className="w-2 h-2 text-white" />
              </div>
              <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center border border-white">
                <Icon icon="star" className="w-2 h-2 text-white" />
              </div>
            </div>
            <span>{postStats.likes} reactions</span>
          </div>

          <div className="flex items-center gap-3">
            <span>{postStats.comments} comments</span>
            <span>{postStats.reposts} reposts</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          <button className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded transition-colors flex-1 justify-center">
            <Icon icon="thumbsUp" className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Like</span>
          </button>

          <button className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded transition-colors flex-1 justify-center">
            <Icon icon="messageSquare" className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Comment</span>
          </button>

          <button className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded transition-colors flex-1 justify-center">
            <Icon icon="repeat" className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Repost</span>
          </button>

          <button className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded transition-colors flex-1 justify-center">
            <Icon icon="send" className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Send</span>
          </button>
        </div>
      </div>

      {/* Additional Info & Professional Context */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center gap-3 text-xs text-gray-600 mb-3">
          <div className="flex items-center gap-1">
            <Icon icon="eye" className="w-3 h-3" />
            <span>{postStats.views} views</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Icon icon="trendingUp" className="w-3 h-3" />
            <span>{estimatedEngagement}% engagement</span>
          </div>
          {hasAudio && (
            <>
              <span>•</span>
              <Icon icon="volume2" className="w-3 h-3" />
              <span>Professional audio</span>
            </>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onDownload}
            className="flex-1 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded transition-colors text-sm font-medium"
          >
            Download Video
          </button>
          {onSaveImage && (
            <button
              onClick={onSaveImage}
              className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors text-sm font-medium"
            >
              Save Image
            </button>
          )}
        </div>

        {/* Professional Notice */}
        <div className="mt-2 text-xs text-gray-500 text-center">
          Professional content optimized for LinkedIn audience
        </div>
      </div>
    </div>
  );
};

export default LinkedInMockup;