import React, { useState } from 'react';
import Icon from '../Icon';
import { MockupProps } from './types';

const TikTokMockup: React.FC<MockupProps> = ({
  videoUrl,
  title,
  duration,
  hasAudio,
  estimatedEngagement,
  onDownload,
  onSaveImage
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  // Mock data
  const user = {
    username: '@yourbrand',
    displayName: 'Your Brand',
    profilePic: '/api/placeholder/48/48',
    verified: true
  };

  const videoStats = {
    likes: `${Math.floor(estimatedEngagement * 1.2)}K`,
    comments: '234',
    shares: '89',
    bookmarks: '45'
  };

  const formatTitle = (title: string) => {
    return title.length > 100 ? `${title.substring(0, 100)}...` : title;
  };

  return (
    <div className="bg-black rounded-2xl overflow-hidden shadow-2xl max-w-[320px] mx-auto">
      {/* TikTok Video Container - Phone-like 9:16 aspect ratio */}
      <div className="relative bg-black" style={{ aspectRatio: '9/16' }}>

        {/* Top Header */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <button className="text-white">
              <Icon icon="arrowLeft" className="w-6 h-6" />
            </button>
            <span className="text-white text-sm font-medium">Following</span>
            <span className="text-white/60 text-sm mx-2">|</span>
            <span className="text-white/60 text-sm">For You</span>
          </div>

          <div className="flex items-center gap-3">
            <button className="text-white">
              <Icon icon="search" className="w-6 h-6" />
            </button>
            <button className="text-white">
              <Icon icon="menu" className="w-6 h-6" />
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
              <Icon icon="play" className="w-16 h-16 mb-3 opacity-70" />
              <span className="text-lg opacity-70">Video Loading...</span>
            </div>
          )}

          {!isPlaying && videoUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={() => setIsPlaying(true)}
                className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
              >
                <Icon icon="play" className="w-8 h-8 text-white ml-1" />
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar Actions */}
        <div className="absolute right-3 bottom-20 flex flex-col gap-4 z-20">
          {/* Profile */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center ring-2 ring-white">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <Icon icon="user" className="w-5 h-5 text-gray-600" />
                </div>
              </div>
              {!isFollowing && (
                <button
                  onClick={() => setIsFollowing(true)}
                  className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white"
                >
                  <Icon icon="plus" className="w-3 h-3 text-white" />
                </button>
              )}
            </div>
          </div>

          {/* Like */}
          <button className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 flex items-center justify-center">
              <Icon icon="heart" className="w-8 h-8 text-white drop-shadow-lg" />
            </div>
            <span className="text-white text-xs font-medium drop-shadow-lg">{videoStats.likes}</span>
          </button>

          {/* Comment */}
          <button className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 flex items-center justify-center">
              <Icon icon="messageCircle" className="w-8 h-8 text-white drop-shadow-lg" />
            </div>
            <span className="text-white text-xs font-medium drop-shadow-lg">{videoStats.comments}</span>
          </button>

          {/* Bookmark */}
          <button className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 flex items-center justify-center">
              <Icon icon="bookmark" className="w-8 h-8 text-white drop-shadow-lg" />
            </div>
            <span className="text-white text-xs font-medium drop-shadow-lg">{videoStats.bookmarks}</span>
          </button>

          {/* Share */}
          <button className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 flex items-center justify-center">
              <Icon icon="share" className="w-8 h-8 text-white drop-shadow-lg" />
            </div>
            <span className="text-white text-xs font-medium drop-shadow-lg">{videoStats.shares}</span>
          </button>

          {/* Music Note (spinning) */}
          <div className="flex flex-col items-center gap-1 mt-2">
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center animate-spin">
              <Icon icon="music" className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        {/* Bottom Caption Area */}
        <div className="absolute bottom-4 left-4 right-20 z-20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-white font-semibold text-sm drop-shadow-lg">{user.username}</span>
            {user.verified && (
              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <Icon icon="check" className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </div>

          <p className="text-white text-sm font-medium leading-tight drop-shadow-lg mb-2">
            {formatTitle(title)}
          </p>

          <div className="flex items-center gap-2 text-white/80 text-xs">
            <Icon icon="music" className="w-3 h-3" />
            <span>Original audio - {user.displayName}</span>
          </div>

          <div className="flex items-center gap-3 mt-2 text-white/70 text-xs">
            <span>{duration}</span>
            <span>•</span>
            <span>{estimatedEngagement}% engagement</span>
            {hasAudio && (
              <>
                <span>•</span>
                <Icon icon="volume2" className="w-3 h-3" />
              </>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div className="h-full bg-white w-1/3 transition-all duration-1000"></div>
        </div>
      </div>

      {/* Action Buttons Below */}
      <div className="p-4 bg-black">
        <div className="flex items-center gap-2 text-xs text-white/70 mb-3">
          <div className="flex items-center gap-1">
            <Icon icon="heart" className="w-3 h-3" />
            <span>{videoStats.likes} likes</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Icon icon="messageCircle" className="w-3 h-3" />
            <span>{videoStats.comments} comments</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Icon icon="share" className="w-3 h-3" />
            <span>{videoStats.shares} shares</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onDownload}
            className="flex-1 px-3 py-2 bg-gradient-to-r from-pink-600 to-red-600 text-white rounded-lg hover:from-pink-700 hover:to-red-700 transition-all text-sm font-medium"
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

export default TikTokMockup;