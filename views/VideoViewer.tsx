import React, { useState, useRef, useEffect } from 'react';
import { View, SocialContentResult } from '../types';
import Icon from '../components/Icon';

interface VideoViewerProps {
  onNavigate: (view: View) => void;
  videoData: SocialContentResult | null;
  onClose: () => void;
}

const VideoViewer: React.FC<VideoViewerProps> = ({
  onNavigate,
  videoData,
  onClose
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!videoRef.current) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(prev => Math.min(1, prev + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(prev => Math.max(0, prev - 0.1));
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (isFullscreen) {
            toggleFullscreen();
          } else {
            onClose();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [duration, isFullscreen]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = (parseFloat(e.target.value) / 100) * duration;
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const handleSeekMouseDown = () => {
    setIsDraggingSeek(true);
  };

  const handleSeekMouseUp = () => {
    setIsDraggingSeek(false);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!videoData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <Icon icon="video" className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-xl">No video data available</p>
          <button
            onClick={onClose}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-black relative overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Header */}
      <div className={`absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <Icon icon="x" className="w-6 h-6 text-white" />
            </button>
            <div className="text-white">
              <h1 className="text-lg font-semibold">{videoData.title}</h1>
              <p className="text-sm text-gray-300">{videoData.platform} • {videoData.duration || 'Video'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(videoData.videoUrl, '_blank')}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <Icon icon="externalLink" className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <Icon icon={isFullscreen ? "minimize" : "maximize"} className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Video Container */}
      <div className="relative w-full h-screen flex items-center justify-center">
        <video
          ref={videoRef}
          src={videoData.videoUrl}
          className="max-w-full max-h-full object-contain"
          onClick={togglePlay}
          poster={videoData.thumbnailUrl}
        />

        {/* Play/Pause Overlay */}
        {!isPlaying && (
          <div
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
            onClick={togglePlay}
          >
            <div className="w-20 h-20 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-colors">
              <Icon icon="play" className="w-10 h-10 text-white ml-1" />
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {duration === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className={`absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="p-4">
          {/* Progress Bar */}
          <div className="mb-4">
            <input
              type="range"
              min="0"
              max="100"
              value={isDraggingSeek ? undefined : progress}
              onChange={handleSeekChange}
              onMouseDown={handleSeekMouseDown}
              onMouseUp={handleSeekMouseUp}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                         [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full
                         [&::-webkit-slider-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:bg-blue-400"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${progress}%, #4b5563 ${progress}%, #4b5563 100%)`
              }}
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <Icon icon={isPlaying ? "pause" : "play"} className="w-6 h-6 text-white" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <Icon icon={isMuted ? "volumeX" : "volume2"} className="w-5 h-5 text-white" />
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-20 h-1 bg-gray-600 rounded appearance-none cursor-pointer"
                />
              </div>

              <div className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>

              <select
                value={playbackRate}
                onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                className="bg-black/50 text-white border border-gray-600 rounded px-2 py-1 text-sm"
              >
                <option value={0.25}>0.25x</option>
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('contentCreator')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
              >
                Create More
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <Icon icon={isFullscreen ? "minimize" : "maximize"} className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="absolute top-20 right-4 text-white text-xs bg-black/50 backdrop-blur-sm rounded-lg p-3 opacity-50 hover:opacity-100 transition-opacity">
        <div className="font-semibold mb-2">Keyboard Shortcuts:</div>
        <div className="space-y-1">
          <div><kbd className="bg-gray-700 px-1 rounded">Space</kbd> Play/Pause</div>
          <div><kbd className="bg-gray-700 px-1 rounded">←/→</kbd> Seek ±10s</div>
          <div><kbd className="bg-gray-700 px-1 rounded">↑/↓</kbd> Volume</div>
          <div><kbd className="bg-gray-700 px-1 rounded">M</kbd> Mute</div>
          <div><kbd className="bg-gray-700 px-1 rounded">F</kbd> Fullscreen</div>
          <div><kbd className="bg-gray-700 px-1 rounded">Esc</kbd> Exit</div>
        </div>
      </div>
    </div>
  );
};

export default VideoViewer;