import React, { useState, useRef } from 'react';
import Icon from '../Icon';
import { MockupProps } from './types';

const YouTubeMockup: React.FC<MockupProps> = ({
  videoUrl,
  title,
  duration,
  hasAudio,
  estimatedEngagement,
  onDownload,
  onSaveImage
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Mock data
  const channel = {
    name: 'Your Channel',
    subscribers: '24.5K',
    profilePic: '/api/placeholder/40/40',
    verified: true
  };

  const videoStats = {
    views: '1,247',
    likes: Math.floor(estimatedEngagement * 12.5).toString(),
    dislikes: '3',
    comments: '89',
    shares: '23'
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (duration: string) => {
    return duration.replace('s', '');
  };

  const formatViews = (views: string) => {
    return `${views} views`;
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="bg-black rounded-lg overflow-hidden shadow-2xl max-w-2xl mx-auto">
      {/* YouTube Video Player - 16:9 aspect ratio */}
      <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
        {/* Video Container */}
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-cover"
            onClick={handlePlayPause}
            onTimeUpdate={(e) => setCurrentTime(Math.floor((e.target as HTMLVideoElement).currentTime))}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
          />
        ) : (
          <div className="w-full h-full bg-gray-900 flex items-center justify-center">
            <div className="flex flex-col items-center justify-center text-white">
              <Icon icon="play" className="w-16 h-16 mb-3 opacity-70" />
              <span className="text-lg opacity-70">Video Loading...</span>
            </div>
          </div>
        )}

        {/* Play Button Overlay */}
        {!isPlaying && videoUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={handlePlayPause}
              className="w-20 h-20 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-colors shadow-2xl"
            >
              <Icon icon="play" className="w-10 h-10 text-white ml-1" />
            </button>
          </div>
        )}

        {/* YouTube Controls */}
        {showControls && videoUrl && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            {/* Progress Bar */}
            <div className="mb-3">
              <div className="w-full h-1 bg-white/30 rounded-full">
                <div
                  className="h-full bg-red-600 rounded-full transition-all duration-300"
                  style={{ width: `${(currentTime / parseInt(formatDuration(duration))) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={handlePlayPause} className="text-white hover:text-red-400 transition-colors">
                  <Icon icon={isPlaying ? "pause" : "play"} className="w-8 h-8" />
                </button>

                <button className="text-white hover:text-red-400 transition-colors">
                  <Icon icon={hasAudio ? "volume2" : "volumeX"} className="w-6 h-6" />
                </button>

                <div className="text-white text-sm">
                  {formatTime(currentTime)} / {formatDuration(duration)}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="text-white hover:text-red-400 transition-colors">
                  <Icon icon="settings" className="w-6 h-6" />
                </button>

                <button className="text-white hover:text-red-400 transition-colors">
                  <Icon icon="maximize" className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* YouTube Video Info */}
      <div className="bg-white p-4">
        {/* Title and Stats */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
            {title}
          </h3>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>{formatViews(videoStats.views)}</span>
              <span>•</span>
              <span>2 hours ago</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{estimatedEngagement}% engagement</span>
            </div>
          </div>
        </div>

        {/* Channel Info and Actions */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center">
              <Icon icon="user" className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-medium text-gray-900">{channel.name}</span>
                {channel.verified && (
                  <Icon icon="checkCircle" className="w-4 h-4 text-gray-500" />
                )}
              </div>
              <div className="text-sm text-gray-600">{channel.subscribers} subscribers</div>
            </div>
          </div>

          <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full font-medium transition-colors">
            Subscribe
          </button>
        </div>

        {/* Engagement Actions */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <div className="flex items-center gap-6">
            <button className="flex items-center gap-2 text-gray-700 hover:text-red-600 transition-colors">
              <Icon icon="thumbsUp" className="w-5 h-5" />
              <span className="text-sm">{videoStats.likes}</span>
            </button>

            <button className="flex items-center gap-2 text-gray-700 hover:text-red-600 transition-colors">
              <Icon icon="thumbsDown" className="w-5 h-5" />
              <span className="text-sm">{videoStats.dislikes}</span>
            </button>

            <button className="flex items-center gap-2 text-gray-700 hover:text-red-600 transition-colors">
              <Icon icon="share" className="w-5 h-5" />
              <span className="text-sm">Share</span>
            </button>

            <button className="flex items-center gap-2 text-gray-700 hover:text-red-600 transition-colors">
              <Icon icon="download" className="w-5 h-5" />
              <span className="text-sm">Save</span>
            </button>
          </div>

          <button className="text-gray-500 hover:text-gray-700 transition-colors">
            <Icon icon="moreHorizontal" className="w-5 h-5" />
          </button>
        </div>

        {/* Additional Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <Icon icon="eye" className="w-3 h-3" />
            <span>{videoStats.views} views</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Icon icon="messageSquare" className="w-3 h-3" />
            <span>{videoStats.comments} comments</span>
          </div>
          {hasAudio && (
            <>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Icon icon="volume2" className="w-3 h-3" />
                <span>Audio enabled</span>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onDownload}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
          >
            Download Video
          </button>
          {onSaveImage && (
            <button
              onClick={onSaveImage}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors font-medium"
            >
              Save Thumbnail
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default YouTubeMockup;