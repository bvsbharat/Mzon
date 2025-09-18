import React, { useState } from 'react';
import { NewsItem, VideoStyle, SocialPlatform } from '../types';
import Icon from './Icon';

interface VideoCreatorProps {
  selectedNewsItem: NewsItem;
  onBack: () => void;
  onGenerateVideo: (config: VideoGenerationConfig) => void;
}

interface VideoGenerationConfig {
  style: VideoStyle;
  duration: number;
  aspectRatio: string;
  targetPlatforms: SocialPlatform[];
  includeText: boolean;
  includeHashtags: boolean;
  voiceOver: boolean;
  backgroundMusic: boolean;
}

const VideoCreator: React.FC<VideoCreatorProps> = ({
  selectedNewsItem,
  onBack,
  onGenerateVideo
}) => {
  const [config, setConfig] = useState<VideoGenerationConfig>({
    style: 'news_report',
    duration: 30,
    aspectRatio: '16:9',
    targetPlatforms: [],
    includeText: true,
    includeHashtags: true,
    voiceOver: false,
    backgroundMusic: false
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const videoStyles: { id: VideoStyle; name: string; description: string; icon: string }[] = [
    {
      id: 'news_report',
      name: 'News Report',
      description: 'Professional news-style presentation with graphics and transitions',
      icon: 'tv'
    },
    {
      id: 'social_story',
      name: 'Social Story',
      description: 'Engaging story format perfect for social media consumption',
      icon: 'users'
    },
    {
      id: 'explainer',
      name: 'Explainer',
      description: 'Educational format that breaks down complex topics',
      icon: 'lightbulb'
    },
    {
      id: 'highlight_reel',
      name: 'Highlight Reel',
      description: 'Fast-paced compilation of key points and visuals',
      icon: 'star'
    }
  ];

  const durationOptions = [15, 30, 60, 90, 120];
  const aspectRatios = [
    { value: '16:9', label: '16:9 (Landscape)', platforms: ['youtube', 'facebook'] },
    { value: '9:16', label: '9:16 (Portrait)', platforms: ['tiktok', 'instagram'] },
    { value: '1:1', label: '1:1 (Square)', platforms: ['instagram', 'facebook'] },
    { value: '4:5', label: '4:5 (Portrait)', platforms: ['instagram'] }
  ];

  const platforms: { id: SocialPlatform; name: string; color: string }[] = [
    { id: 'youtube', name: 'YouTube', color: 'bg-red-600' },
    { id: 'instagram', name: 'Instagram', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
    { id: 'tiktok', name: 'TikTok', color: 'bg-black' },
    { id: 'facebook', name: 'Facebook', color: 'bg-blue-600' },
    { id: 'twitter', name: 'Twitter', color: 'bg-sky-500' }
  ];

  const handlePlatformToggle = (platform: SocialPlatform) => {
    setConfig(prev => ({
      ...prev,
      targetPlatforms: prev.targetPlatforms.includes(platform)
        ? prev.targetPlatforms.filter(p => p !== platform)
        : [...prev.targetPlatforms, platform]
    }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerateVideo(config);
    } catch (error) {
      console.error('Video generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon icon="arrowLeft" className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Video Creator</h1>
            <p className="text-gray-600">Generate video content from news article</p>
          </div>
        </div>

        {/* News Context */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {selectedNewsItem.source.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900">{selectedNewsItem.source}</span>
                <span className="text-sm text-blue-600">Source Article</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{selectedNewsItem.title}</h3>
              <p className="text-gray-600 text-sm">{selectedNewsItem.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Video Style Selection */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose Video Style</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {videoStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setConfig(prev => ({ ...prev, style: style.id }))}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    config.style === style.id
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      config.style === style.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon icon={style.icon as any} className="w-4 h-4" />
                    </div>
                    <h3 className="font-medium text-gray-900">{style.name}</h3>
                  </div>
                  <p className="text-sm text-gray-600">{style.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Duration & Format */}
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Duration</h3>
              <div className="flex flex-wrap gap-2">
                {durationOptions.map((duration) => (
                  <button
                    key={duration}
                    onClick={() => setConfig(prev => ({ ...prev, duration }))}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      config.duration === duration
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {duration}s
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Aspect Ratio</h3>
              <div className="space-y-2">
                {aspectRatios.map((ratio) => (
                  <button
                    key={ratio.value}
                    onClick={() => setConfig(prev => ({ ...prev, aspectRatio: ratio.value }))}
                    className={`w-full p-3 rounded-lg border text-left transition-colors ${
                      config.aspectRatio === ratio.value
                        ? 'bg-indigo-50 border-indigo-600'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{ratio.label}</div>
                    <div className="text-sm text-gray-500">
                      Optimized for: {ratio.platforms.join(', ')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Target Platforms */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Target Platforms</h3>
            <div className="flex flex-wrap gap-3">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => handlePlatformToggle(platform.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                    config.targetPlatforms.includes(platform.id)
                      ? 'bg-white border-gray-400 shadow-sm'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className={`w-4 h-4 rounded ${platform.color}`}></div>
                  <span className="text-sm font-medium text-gray-900">{platform.name}</span>
                  {config.targetPlatforms.includes(platform.id) && (
                    <Icon icon="check" className="w-4 h-4 text-green-600" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Video Options */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Video Options</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  checked={config.includeText}
                  onChange={(e) => setConfig(prev => ({ ...prev, includeText: e.target.checked }))}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Include Text Overlay</div>
                  <div className="text-sm text-gray-500">Add key quotes and headlines</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  checked={config.includeHashtags}
                  onChange={(e) => setConfig(prev => ({ ...prev, includeHashtags: e.target.checked }))}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Include Hashtags</div>
                  <div className="text-sm text-gray-500">Add relevant hashtags from article</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  checked={config.voiceOver}
                  onChange={(e) => setConfig(prev => ({ ...prev, voiceOver: e.target.checked }))}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <div>
                  <div className="font-medium text-gray-900">AI Voice-Over</div>
                  <div className="text-sm text-gray-500">Generate narration from article</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  checked={config.backgroundMusic}
                  onChange={(e) => setConfig(prev => ({ ...prev, backgroundMusic: e.target.checked }))}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Background Music</div>
                  <div className="text-sm text-gray-500">Add appropriate soundtrack</div>
                </div>
              </label>
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || config.targetPlatforms.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating Video...
                </>
              ) : (
                <>
                  <Icon icon="play" className="w-4 h-4" />
                  Generate Video
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCreator;