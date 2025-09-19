import React, { useState } from 'react';
import Icon from '../Icon';
import { MockupProps } from './types';

const InstagramMockup: React.FC<MockupProps> = ({
  videoUrl,
  title,
  duration,
  hasAudio,
  estimatedEngagement,
  onDownload,
  onSaveImage
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  // Mock user data
  const user = {
    username: 'your_brand',
    displayName: 'Your Brand',
    profilePic: '/api/placeholder/32/32',
    verified: true
  };

  // Mock engagement numbers
  const engagement = {
    views: '12.4K',
    likes: Math.floor(estimatedEngagement * 124).toString(),
    comments: '89',
    shares: '23'
  };

  const formatViews = (views: string) => {
    return `${views} views`;
  };

  return (
    <div className="bg-black rounded-2xl overflow-hidden shadow-2xl max-w-[320px] mx-auto">
      {/* Instagram Story Container - Phone-like 9:16 aspect ratio */}
      <div className="relative bg-black" style={{ aspectRatio: '9/16' }}>

        {/* Story Progress Bar */}
        <div className="absolute top-2 left-4 right-4 z-20">
          <div className="flex gap-1">
            <div className="flex-1 h-0.5 bg-white/30 rounded-full">
              <div className="h-full w-full bg-white rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="absolute top-6 left-4 right-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center ring-2 ring-white">
              <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                <Icon icon="user" className="w-3 h-3 text-gray-600" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-white text-sm font-semibold">{user.username}</span>
                {user.verified && (
                  <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                    <Icon icon="checkCircle" className="w-2 h-2 text-white" />
                  </div>
                )}
              </div>
              <div className="text-white/70 text-xs">2m</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="text-white">
              <Icon icon="play" className="w-5 h-5" />
            </button>
            <button className="text-white">
              <Icon icon="volume2" className={`w-5 h-5 ${!hasAudio ? 'opacity-50' : ''}`} />
            </button>
            <button className="text-white">
              <Icon icon="moreHorizontal" className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Container */}
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
          {videoUrl ? (
            <video
              src={videoUrl}
              controls={false}
              autoPlay
              loop
              muted={!hasAudio}
              className="w-full h-full object-cover"
              onClick={() => setIsPlaying(!isPlaying)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-white">
              <Icon icon="play" className="w-12 h-12 mb-2 opacity-70" />
              <span className="text-sm opacity-70">Video Loading...</span>
            </div>
          )}

          {!isPlaying && videoUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={() => setIsPlaying(true)}
                className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30"
              >
                <Icon icon="play" className="w-8 h-8 text-white ml-1" />
              </button>
            </div>
          )}
        </div>

        {/* Bottom Caption Area */}
        <div className="absolute bottom-20 left-4 right-16 z-20">
          <p className="text-white text-sm font-medium leading-tight drop-shadow-lg">
            {title.length > 80 ? `${title.substring(0, 80)}...` : title}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-white/80 text-xs">{formatViews(engagement.views)}</span>
            <span className="text-white/80 text-xs">•</span>
            <span className="text-white/80 text-xs">{duration}</span>
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-6 z-20">
          <button className="flex flex-col items-center">
            <div className="w-11 h-11 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
              <Icon icon="heart" className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-xs mt-1">{engagement.likes}</span>
          </button>

          <button className="flex flex-col items-center">
            <div className="w-11 h-11 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
              <Icon icon="messageCircle" className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-xs mt-1">{engagement.comments}</span>
          </button>

          <button className="flex flex-col items-center">
            <div className="w-11 h-11 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
              <Icon icon="share" className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-xs mt-1">{engagement.shares}</span>
          </button>

          <button className="flex flex-col items-center">
            <div className="w-11 h-11 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
              <Icon icon="bookmark" className="w-6 h-6 text-white" />
            </div>
          </button>
        </div>
      </div>

      {/* Action Buttons Below */}
      <div className="p-4 bg-black border-t border-gray-800">
        <div className="flex items-center gap-2 text-xs text-white/70 mb-3">
          <div className="flex items-center gap-1">
            <Icon icon="eye" className="w-3 h-3" />
            <span>{engagement.views} views</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Icon icon="zap" className="w-3 h-3" />
            <span>{estimatedEngagement}% engagement</span>
          </div>
          {hasAudio && (
            <>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Icon icon="volume2" className="w-3 h-3" />
                <span>Audio</span>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onDownload}
            className="flex-1 px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all text-sm font-medium"
          >
            Download
          </button>
          {onSaveImage && (
            <button
              onClick={onSaveImage}
              className="px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              Save Image
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstagramMockup;