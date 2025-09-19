import React, { useState } from 'react';
import Icon from '../Icon';
import { MockupProps } from './types';

const TwitterMockup: React.FC<MockupProps> = ({
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
    name: 'Your Brand',
    username: '@yourbrand',
    timeAgo: '2h',
    profilePic: '/api/placeholder/40/40',
    verified: true
  };

  const tweetStats = {
    retweets: Math.floor(estimatedEngagement * 8).toString(),
    likes: Math.floor(estimatedEngagement * 15).toString(),
    replies: '23',
    views: '4.2K'
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm max-w-lg mx-auto">
      {/* Twitter Post Header */}
      <div className="p-4">
        <div className="flex gap-3">
          {/* Profile Picture */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <Icon icon="user" className="w-7 h-7 text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {/* User Info */}
            <div className="flex items-center gap-1 mb-1">
              <span className="font-bold text-gray-900">{user.name}</span>
              {user.verified && (
                <Icon icon="checkCircle" className="w-5 h-5 text-blue-500" />
              )}
              <span className="text-gray-500">{user.username}</span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-500">{user.timeAgo}</span>
              <button className="ml-auto text-gray-500 hover:text-gray-700">
                <Icon icon="moreHorizontal" className="w-5 h-5" />
              </button>
            </div>

            {/* Tweet Text */}
            <div className="mb-3">
              <p className="text-gray-900 text-[15px] leading-5">
                {title.length > 280 ? `${title.substring(0, 277)}...` : title}
              </p>
            </div>

            {/* Video Container - 16:9 aspect ratio with Twitter's rounded corners */}
            <div className="relative bg-black rounded-2xl overflow-hidden mb-3" style={{ aspectRatio: '16/9' }}>
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
                    className="w-16 h-16 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors shadow-lg"
                  >
                    <Icon icon="play" className="w-8 h-8 text-white ml-1" />
                  </button>
                </div>
              )}

              {/* Video Duration & Views */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <div className="bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-white text-xs">
                  {duration}
                </div>
                <div className="bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-white text-xs">
                  {tweetStats.views} views
                </div>
              </div>
            </div>

            {/* Engagement Actions */}
            <div className="flex items-center justify-between max-w-md">
              <button className="flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-colors group">
                <div className="p-2 rounded-full group-hover:bg-blue-50 transition-colors">
                  <Icon icon="messageCircle" className="w-5 h-5" />
                </div>
                <span className="text-sm">{tweetStats.replies}</span>
              </button>

              <button className="flex items-center gap-2 text-gray-500 hover:text-green-500 transition-colors group">
                <div className="p-2 rounded-full group-hover:bg-green-50 transition-colors">
                  <Icon icon="repeat" className="w-5 h-5" />
                </div>
                <span className="text-sm">{tweetStats.retweets}</span>
              </button>

              <button className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors group">
                <div className="p-2 rounded-full group-hover:bg-red-50 transition-colors">
                  <Icon icon="heart" className="w-5 h-5" />
                </div>
                <span className="text-sm">{tweetStats.likes}</span>
              </button>

              <button className="text-gray-500 hover:text-blue-500 transition-colors group">
                <div className="p-2 rounded-full group-hover:bg-blue-50 transition-colors">
                  <Icon icon="bookmark" className="w-5 h-5" />
                </div>
              </button>

              <button className="text-gray-500 hover:text-blue-500 transition-colors group">
                <div className="p-2 rounded-full group-hover:bg-blue-50 transition-colors">
                  <Icon icon="share" className="w-5 h-5" />
                </div>
              </button>
            </div>

            {/* Additional Stats */}
            <div className="flex items-center gap-4 text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1">
                <Icon icon="eye" className="w-3 h-3" />
                <span>{tweetStats.views} views</span>
              </div>
              <span>•</span>
              <span>{estimatedEngagement}% engagement</span>
              {hasAudio && (
                <>
                  <span>•</span>
                  <Icon icon="volume2" className="w-3 h-3" />
                  <span>Audio</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <button
            onClick={onDownload}
            className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors text-sm font-medium"
          >
            Download Video
          </button>
          {onSaveImage && (
            <button
              onClick={onSaveImage}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors text-sm font-medium"
            >
              Save Image
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TwitterMockup;