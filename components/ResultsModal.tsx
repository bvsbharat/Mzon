import React, { useState, useEffect } from 'react';
import { SocialContentResult, GeneratedContent, PublishPlatform } from '../types';
import Icon from './Icon';
import PlatformMockup from './PlatformMockups/PlatformMockup';
import { composioService } from '../services/composioService';

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentResults: SocialContentResult[];
  previousResults: SocialContentResult[];
  onOpenVideoViewer?: (videoData: SocialContentResult) => void;
  addNotification?: (notification: { type: 'success' | 'error' | 'info'; message: string }) => void;
}

const ResultsModal: React.FC<ResultsModalProps> = ({
  isOpen,
  onClose,
  currentResults,
  previousResults,
  onOpenVideoViewer,
  addNotification
}) => {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [selectedResult, setSelectedResult] = useState<SocialContentResult | null>(null);
  const [isPublishing, setIsPublishing] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    if (isOpen && currentResults.length > 0) {
      setSelectedResult(currentResults[0]);
      setActiveTab('current');
    }
  }, [isOpen, currentResults]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const allResults = activeTab === 'current' ? currentResults : previousResults;

  const handleFullScreenVideo = (result: SocialContentResult) => {
    if (onOpenVideoViewer && result.videoUrl) {
      onOpenVideoViewer(result);
    }
  };

  const handleDownload = (result: SocialContentResult) => {
    if (result.videoUrl) {
      // Create download link
      const link = document.createElement('a');
      link.href = result.videoUrl;
      link.download = `${result.platform}-video-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSaveImage = async (result: SocialContentResult) => {
    if (result.thumbnailUrl || result.compositeImageUrl) {
      const imageUrl = result.thumbnailUrl || result.compositeImageUrl;
      try {
        const response = await fetch(imageUrl!);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${result.platform}-image-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Failed to save image:', error);
      }
    }
  };

  const handlePublishContent = async (result: SocialContentResult, platform: PublishPlatform) => {
    if (!composioService.isAvailable()) {
      addNotification?.({
        type: 'error',
        message: 'Publishing service is not available. Please check your API keys.'
      });
      return;
    }

    const publishKey = `${result.id}_${platform}`;

    try {
      setIsPublishing(prev => new Map(prev.set(publishKey, true)));

      // Create publish content from the result
      const publishContent = `${result.title}\n\n${result.description || ''}`;

      const publishOptions = {
        platform,
        content: publishContent,
        title: result.title,
        hashtags: result.hashtags || [],
        images: result.thumbnailUrl || result.compositeImageUrl ? [result.thumbnailUrl || result.compositeImageUrl!] : []
      };

      console.log(`📤 Publishing to ${platform}:`, publishOptions);

      const publishResult = await composioService.publishContent(publishOptions);

      if (publishResult.success) {
        addNotification?.({
          type: 'success',
          message: `Successfully published to ${platform}!`
        });
        console.log(`✅ Published to ${platform}:`, publishResult);
      } else {
        throw new Error(publishResult.error || 'Unknown publishing error');
      }
    } catch (error) {
      console.error(`❌ Failed to publish to ${platform}:`, error);
      addNotification?.({
        type: 'error',
        message: `Failed to publish to ${platform}: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsPublishing(prev => {
        const newMap = new Map(prev);
        newMap.delete(publishKey);
        return newMap;
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      {/* Modal Container */}
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-900">Generated Content Results</h2>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('current')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'current'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Current ({currentResults.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'history'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                History ({previousResults.length})
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Icon icon="x" className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Results List Sidebar */}
          <div className="w-80 bg-gray-50 border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                {activeTab === 'current' ? 'Current Results' : 'Previous Results'}
              </h3>

              {allResults.length === 0 ? (
                <div className="text-center py-8">
                  <Icon icon="fileText" className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No results available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allResults.map((result, index) => (
                    <div
                      key={`${result.id}-${index}`}
                      onClick={() => setSelectedResult(result)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedResult?.id === result.id
                          ? 'bg-blue-100 border-blue-300 ring-1 ring-blue-300'
                          : 'bg-white hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                          {result.thumbnailUrl || result.compositeImageUrl ? (
                            <img
                              src={result.thumbnailUrl || result.compositeImageUrl}
                              alt={result.platform}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                              <Icon icon="image" className="w-5 h-5 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 capitalize">{result.platform}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {result.duration || 'Static'} • {new Date(result.timestamp).toLocaleDateString()}
                          </p>
                          {result.videoUrl && (
                            <div className="flex items-center gap-1 mt-1">
                              <Icon icon="video" className="w-3 h-3 text-blue-500" />
                              <span className="text-xs text-blue-600">Video</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Preview Area */}
          <div className="flex-1 bg-white overflow-y-auto">
            {selectedResult ? (
              <div className="p-6">
                <div className="max-w-4xl mx-auto">
                  {/* Result Header */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 capitalize">
                        {selectedResult.platform} Content
                      </h3>
                      <div className="flex items-center gap-2">
                        {selectedResult.videoUrl && (
                          <button
                            onClick={() => handleFullScreenVideo(selectedResult)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                          >
                            <Icon icon="maximize" className="w-4 h-4" />
                            Full Screen
                          </button>
                        )}
                        <button
                          onClick={() => handleDownload(selectedResult)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Icon icon="download" className="w-4 h-4" />
                          Download
                        </button>
                        {(selectedResult.thumbnailUrl || selectedResult.compositeImageUrl) && (
                          <button
                            onClick={() => handleSaveImage(selectedResult)}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
                          >
                            <Icon icon="image" className="w-4 h-4" />
                            Save Image
                          </button>
                        )}

                        {/* Publish Buttons */}
                        {composioService.isAvailable() && (
                          <>
                            <button
                              onClick={() => handlePublishContent(selectedResult, 'linkedin')}
                              disabled={isPublishing.get(`${selectedResult.id}_linkedin`)}
                              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center gap-2"
                              title="Publish to LinkedIn"
                            >
                              {isPublishing.get(`${selectedResult.id}_linkedin`) ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Icon icon="linkedin" className="w-4 h-4" />
                              )}
                              LinkedIn
                            </button>
                            <button
                              onClick={() => handlePublishContent(selectedResult, 'email')}
                              disabled={isPublishing.get(`${selectedResult.id}_email`)}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors flex items-center gap-2"
                              title="Send via Email"
                            >
                              {isPublishing.get(`${selectedResult.id}_email`) ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Icon icon="mail" className="w-4 h-4" />
                              )}
                              Email
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      Generated on {new Date(selectedResult.timestamp).toLocaleString()}
                      {selectedResult.duration && ` • Duration: ${selectedResult.duration}`}
                      {selectedResult.estimatedEngagement && ` • Engagement: ${selectedResult.estimatedEngagement}%`}
                    </div>
                  </div>

                  {/* Platform Mockup */}
                  <div className="flex justify-center">
                    <div className="max-w-md">
                      <PlatformMockup
                        platform={selectedResult.platform}
                        videoUrl={selectedResult.videoUrl}
                        imageUrl={selectedResult.compositeImageUrl}
                        thumbnailUrl={selectedResult.thumbnailUrl}
                        title={selectedResult.title}
                        duration={selectedResult.duration}
                        hasAudio={selectedResult.hasAudio}
                        estimatedEngagement={selectedResult.estimatedEngagement || 75}
                        onDownload={() => handleFullScreenVideo(selectedResult)}
                        onSaveImage={() => handleSaveImage(selectedResult)}
                      />
                    </div>
                  </div>

                  {/* Additional Content Info */}
                  <div className="mt-8 space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Content Title</h4>
                      <p className="text-gray-700">{selectedResult.title}</p>
                    </div>

                    {selectedResult.description && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                        <p className="text-gray-700">{selectedResult.description}</p>
                      </div>
                    )}

                    {selectedResult.hashtags && selectedResult.hashtags.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Hashtags</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedResult.hashtags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Icon icon="monitor" className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-xl text-gray-500">Select a result to preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsModal;