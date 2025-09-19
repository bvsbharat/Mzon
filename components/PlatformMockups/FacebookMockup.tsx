import React, { useState } from 'react';
import Icon from '../Icon';
import { MockupProps } from './types';

const FacebookMockup: React.FC<MockupProps> = ({
  videoUrl,
  title,
  duration,
  hasAudio,
  estimatedEngagement,
  onDownload,
  onSaveImage
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const page = {
    name: 'Your Brand',
    timeAgo: '2h',
    profilePic: '/api/placeholder/40/40',
    verified: true
  };

  const videoStats = {
    reactions: Math.floor(estimatedEngagement * 15).toString(),
    comments: '47',
    shares: '12',
    views: '2.4K'
  };

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-lg mx-auto">
      {/* Facebook Post Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
              <Icon icon="user" className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-gray-900">{page.name}</span>
                {page.verified && (
                  <Icon icon="checkCircle" className="w-4 h-4 text-blue-600" />
                )}
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <span>{page.timeAgo}</span>
                <span>•</span>
                <Icon icon="globe" className="w-3 h-3" />
              </div>
            </div>
          </div>

          <button className="text-gray-500 hover:text-gray-700">
            <Icon icon="moreHorizontal" className="w-5 h-5" />
          </button>
        </div>

        {/* Post Text */}
        <div className="mt-3">
          <p className="text-gray-900 text-sm leading-relaxed">
            {title.length > 150 ? `${title.substring(0, 150)}...` : title}
          </p>
        </div>
      </div>

      {/* Video Container - 9:16 aspect ratio for mobile/vertical */}
      <div className="relative bg-black" style={{ aspectRatio: '9/16' }}>
        {videoUrl ? (
          <video
            src={videoUrl}
            controls={true}
            className="w-full h-full object-cover"
            autoPlay={false}
            muted={true}
            playsInline={true}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onLoadedData={() => {
              console.log('Video loaded successfully');
            }}
            onError={(e) => {
              console.error('Video error:', e);
            }}
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <Icon icon="play" className="w-12 h-12 text-white opacity-70" />
            <span className="text-white text-sm ml-2">No video available</span>
          </div>
        )}

        {/* Full-screen button overlay */}
        {videoUrl && (
          <div className="absolute top-2 right-2">
            <button
              onClick={onDownload}
              className="p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
              title="View Full Screen"
            >
              <Icon icon="maximize" className="w-4 h-4 text-white" />
            </button>
          </div>
        )}

        {/* Video Info Overlay */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-xs">
          <div className="bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
            {duration}
          </div>
          <div className="bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
            {videoStats.views} views
          </div>
        </div>
      </div>

      {/* Engagement Stats */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1">
              <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center border border-white">
                <Icon icon="thumbsUp" className="w-2.5 h-2.5 text-white" />
              </div>
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border border-white">
                <Icon icon="heart" className="w-2.5 h-2.5 text-white" />
              </div>
            </div>
            <span>{videoStats.reactions}</span>
          </div>

          <div className="flex items-center gap-3">
            <span>{videoStats.comments} comments</span>
            <span>{videoStats.shares} shares</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-3 py-2">
        <div className="flex items-center justify-between">
          <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors flex-1 justify-center">
            <Icon icon="thumbsUp" className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-600">Like</span>
          </button>

          <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors flex-1 justify-center">
            <Icon icon="messageCircle" className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-600">Comment</span>
          </button>

          <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors flex-1 justify-center">
            <Icon icon="share" className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-600">Share</span>
          </button>
        </div>
      </div>

      {/* Additional Info & Download */}
      <div className="p-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          <div className="flex items-center gap-1">
            <Icon icon="eye" className="w-3 h-3" />
            <span>{videoStats.views} views</span>
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

        <div className="flex gap-2">
          <button
            onClick={onDownload}
            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Download Video
          </button>
          {onSaveImage && (
            <button
              onClick={onSaveImage}
              className="px-3 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors text-sm font-medium"
            >
              Save Image
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacebookMockup;