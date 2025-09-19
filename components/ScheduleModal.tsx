import React, { useState, useEffect } from 'react';
import { SocialPlatformConfig, ScheduleContentRequest } from '../types';
import Icon from './Icon';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (contentData: ScheduleContentRequest) => void;
  platformConfigs: SocialPlatformConfig[];
  initialData?: Partial<ScheduleContentRequest>;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  onSchedule,
  platformConfigs,
  initialData
}) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['twitter']);
  const [contentText, setContentText] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [title, setTitle] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaUrlInput, setMediaUrlInput] = useState('');

  // Initialize form with initial data
  useEffect(() => {
    if (initialData) {
      if (initialData.platform) setSelectedPlatforms([initialData.platform]);
      if (initialData.content_text) setContentText(initialData.content_text);
      if (initialData.hashtags) setHashtags(initialData.hashtags);
      if (initialData.title) setTitle(initialData.title);
      if (initialData.media_urls) setMediaUrls(initialData.media_urls);
      if (initialData.scheduled_time) setScheduledTime(initialData.scheduled_time);
    }
  }, [initialData]);

  // Set default scheduled time to 1 hour from now
  useEffect(() => {
    if (isOpen && !scheduledTime) {
      const defaultTime = new Date();
      defaultTime.setHours(defaultTime.getHours() + 1);
      setScheduledTime(defaultTime.toISOString().slice(0, 16));
    }
  }, [isOpen, scheduledTime]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!contentText.trim()) {
      alert('Content text is required');
      return;
    }

    if (selectedPlatforms.length === 0) {
      alert('Please select at least one platform');
      return;
    }

    if (!scheduledTime) {
      alert('Please set a scheduled time');
      return;
    }

    // Submit for each selected platform
    selectedPlatforms.forEach(platform => {
      const contentData: ScheduleContentRequest = {
        platform: platform as any,
        content_text: formatContentForPlatform(contentText, platform),
        hashtags: hashtags.filter(tag => tag.trim()),
        scheduled_time: scheduledTime,
        title: title.trim() || undefined,
        media_urls: mediaUrls.filter(url => url.trim()),
        ai_generated: false
      };

      onSchedule(contentData);
    });
  };

  const formatContentForPlatform = (content: string, platform: string): string => {
    const config = platformConfigs.find(p => p.platform === platform);
    if (!config) return content;

    if (content.length <= config.maxLength) {
      return content;
    }

    return content.substring(0, config.maxLength - 3) + '...';
  };

  const addHashtag = () => {
    if (hashtagInput.trim() && !hashtags.includes(hashtagInput.trim())) {
      const newTag = hashtagInput.trim().startsWith('#')
        ? hashtagInput.trim()
        : `#${hashtagInput.trim()}`;
      setHashtags([...hashtags, newTag]);
      setHashtagInput('');
    }
  };

  const removeHashtag = (index: number) => {
    setHashtags(hashtags.filter((_, i) => i !== index));
  };

  const addMediaUrl = () => {
    if (mediaUrlInput.trim() && !mediaUrls.includes(mediaUrlInput.trim())) {
      setMediaUrls([...mediaUrls, mediaUrlInput.trim()]);
      setMediaUrlInput('');
    }
  };

  const removeMediaUrl = (index: number) => {
    setMediaUrls(mediaUrls.filter((_, i) => i !== index));
  };

  const togglePlatform = (platform: string) => {
    if (selectedPlatforms.includes(platform)) {
      setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platform]);
    }
  };

  const getCharacterCount = (platform: string) => {
    const config = platformConfigs.find(p => p.platform === platform);
    if (!config) return contentText.length;

    const formatted = formatContentForPlatform(contentText, platform);
    return formatted.length;
  };

  const getCharacterColor = (platform: string) => {
    const config = platformConfigs.find(p => p.platform === platform);
    if (!config) return 'text-gray-500';

    const count = getCharacterCount(platform);
    const percentage = count / config.maxLength;

    if (percentage > 0.9) return 'text-red-500';
    if (percentage > 0.7) return 'text-yellow-500';
    return 'text-gray-500';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Schedule Social Media Post</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <Icon icon="x" className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Platform Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Platforms
            </label>
            <div className="grid grid-cols-2 gap-3">
              {platformConfigs.map(config => (
                <button
                  key={config.platform}
                  type="button"
                  onClick={() => togglePlatform(config.platform)}
                  className={`p-3 border rounded-lg flex items-center gap-3 transition-colors ${
                    selectedPlatforms.includes(config.platform)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="capitalize font-medium">{config.platform}</span>
                  {selectedPlatforms.includes(config.platform) && (
                    <Icon icon="check" className="w-4 h-4 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Title (Optional) */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title (Optional)
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title for internal organization"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Content Text */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              Content
            </label>
            <textarea
              id="content"
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              placeholder="Write your social media post content..."
              rows={4}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {/* Character Count for Selected Platforms */}
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              {selectedPlatforms.map(platform => {
                const config = platformConfigs.find(p => p.platform === platform);
                return config ? (
                  <div key={platform} className="flex items-center gap-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="capitalize">{platform}:</span>
                    <span className={getCharacterColor(platform)}>
                      {getCharacterCount(platform)}/{config.maxLength}
                    </span>
                  </div>
                ) : null;
              })}
            </div>
          </div>

          {/* Hashtags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hashtags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
                placeholder="Add hashtag (without #)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addHashtag}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {hashtags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeHashtag(index)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Icon icon="x" className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Media URLs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Media URLs (Optional)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={mediaUrlInput}
                onChange={(e) => setMediaUrlInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMediaUrl())}
                placeholder="https://example.com/image.jpg"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addMediaUrl}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>
            <div className="space-y-2">
              {mediaUrls.map((url, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                >
                  <Icon icon="image" className="w-4 h-4 text-gray-500" />
                  <span className="flex-1 text-sm text-gray-700 truncate">{url}</span>
                  <button
                    type="button"
                    onClick={() => removeMediaUrl(index)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Icon icon="x" className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Scheduled Time */}
          <div>
            <label htmlFor="scheduledTime" className="block text-sm font-medium text-gray-700 mb-2">
              Scheduled Time
            </label>
            <input
              type="datetime-local"
              id="scheduledTime"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Schedule Post{selectedPlatforms.length > 1 ? 's' : ''}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleModal;