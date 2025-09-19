import React, { useState } from 'react';
import { GeneratedContent, EmailContent, SocialPlatform } from '../types';
import { brandService } from '../services/brandService';
import Icon from './Icon';

interface GeneratedContentViewerProps {
  content: GeneratedContent[];
  onEditContent?: (contentId: string, updatedContent: string) => void;
  onRegenerateContent?: (contentId: string) => void;
  onCopyContent?: (content: string) => void;
  onSaveToLibrary?: (content: GeneratedContent) => void;
  isGenerating?: boolean;
}

const GeneratedContentViewer: React.FC<GeneratedContentViewerProps> = ({
  content,
  onEditContent,
  onRegenerateContent,
  onCopyContent,
  onSaveToLibrary,
  isGenerating = false
}) => {
  const [activeTab, setActiveTab] = useState<'social_post' | 'email' | 'article' | 'all'>('all');
  const [selectedContent, setSelectedContent] = useState<GeneratedContent | null>(null);
  const [editingContent, setEditingContent] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const filteredContent = content.filter(item =>
    activeTab === 'all' || item.type === activeTab
  );

  const getPlatformIcon = (platform?: SocialPlatform) => {
    const icons = {
      instagram: 'camera',
      facebook: 'facebook',
      twitter: 'twitter',
      linkedin: 'briefcase',
      youtube: 'play',
      tiktok: 'music',
      threads: 'message'
    };
    return platform ? icons[platform] || 'message' : 'message';
  };

  const getPlatformColor = (platform?: SocialPlatform) => {
    const colors = {
      instagram: 'from-purple-500 to-pink-500',
      facebook: 'from-blue-600 to-blue-700',
      twitter: 'from-sky-400 to-sky-600',
      linkedin: 'from-blue-700 to-blue-800',
      youtube: 'from-red-600 to-red-700',
      tiktok: 'from-gray-900 to-black',
      threads: 'from-gray-800 to-gray-900'
    };
    return platform ? colors[platform] || 'from-gray-600 to-gray-700' : 'from-gray-600 to-gray-700';
  };

  const getTypeIcon = (type: GeneratedContent['type']) => {
    const icons = {
      social_post: 'message',
      email: 'mail',
      article: 'edit',
      campaign: 'zap'
    };
    return icons[type] || 'edit';
  };

  const formatEngagementScore = (score: number) => {
    if (score >= 80) return { text: 'Excellent', color: 'text-green-600' };
    if (score >= 60) return { text: 'Good', color: 'text-blue-600' };
    if (score >= 40) return { text: 'Fair', color: 'text-yellow-600' };
    return { text: 'Needs Work', color: 'text-red-600' };
  };

  const formatBrandCompliance = (score: number) => {
    if (score >= 90) return { text: 'Excellent', color: 'text-green-600' };
    if (score >= 70) return { text: 'Good', color: 'text-blue-600' };
    if (score >= 50) return { text: 'Fair', color: 'text-yellow-600' };
    return { text: 'Poor', color: 'text-red-600' };
  };

  const handleStartEditing = (contentItem: GeneratedContent) => {
    setEditingContent(contentItem.id);
    setEditingText(contentItem.content);
  };

  const handleSaveEdit = (contentId: string) => {
    if (onEditContent) {
      onEditContent(contentId, editingText);
    }
    setEditingContent(null);
    setEditingText('');
  };

  const handleCancelEdit = () => {
    setEditingContent(null);
    setEditingText('');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    if (onCopyContent) {
      onCopyContent(text);
    }
  };

  const renderEmailContent = (emailContent: EmailContent) => {
    return (
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Subject Line</h4>
          <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{emailContent.subject}</p>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Preheader</h4>
          <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">{emailContent.preheader}</p>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Email Body</h4>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{
              __html: emailContent.bodyHtml
            }} />
          </div>
        </div>

        {emailContent.callToAction && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Call to Action</h4>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-blue-800 font-medium">{emailContent.callToAction.text}</p>
              <p className="text-blue-600 text-sm">{emailContent.callToAction.url}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isGenerating) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Generating Content</h3>
          <p className="text-gray-600">Using AI to create engaging content based on the news article...</p>
        </div>
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <Icon icon="edit" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Generated Yet</h3>
          <p className="text-gray-600">Generated content will appear here once you start creating posts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header with Tabs */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Generated Content</h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Icon icon="checkCircle" className="w-4 h-4 text-green-500" />
            {content.length} {content.length === 1 ? 'item' : 'items'} generated
          </div>
        </div>

        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          {['all', 'social_post', 'email', 'article'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'social_post' ? 'Social Media' : tab.replace('_', ' ')}
              {tab !== 'all' && (
                <span className="ml-2 text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded-full">
                  {content.filter(item => item.type === tab).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content List */}
      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        {filteredContent.map((contentItem) => (
          <div key={contentItem.id} className="p-6">
            {/* Content Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {/* Type Icon */}
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Icon icon={getTypeIcon(contentItem.type) as any} className="w-5 h-5 text-white" />
                </div>

                {/* Platform Info */}
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 capitalize">
                      {contentItem.type.replace('_', ' ')}
                    </h4>
                    {contentItem.platform && (
                      <div className={`w-6 h-6 bg-gradient-to-r ${getPlatformColor(contentItem.platform)} rounded-full flex items-center justify-center`}>
                        <Icon icon={getPlatformIcon(contentItem.platform) as any} className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    Generated {new Date(contentItem.generatedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStartEditing(contentItem)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit content"
                >
                  <Icon icon="edit" className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleCopy(contentItem.content)}
                  className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="Copy content"
                >
                  <Icon icon="copy" className="w-4 h-4" />
                </button>
                {onRegenerateContent && (
                  <button
                    onClick={() => onRegenerateContent(contentItem.id)}
                    className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    title="Regenerate content"
                  >
                    <Icon icon="refreshCw" className="w-4 h-4" />
                  </button>
                )}
                {onSaveToLibrary && (
                  <button
                    onClick={() => onSaveToLibrary(contentItem)}
                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Save to library"
                  >
                    <Icon icon="bookmark" className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Content Body */}
            <div className="mb-4">
              {editingContent === contentItem.id ? (
                <div className="space-y-4">
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Edit your content..."
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(contentItem.id)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : contentItem.type === 'email' ? (
                renderEmailContent(contentItem as EmailContent)
              ) : (
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">{contentItem.content}</p>
                </div>
              )}
            </div>

            {/* Hashtags */}
            {contentItem.hashtags.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {contentItem.hashtags.map((hashtag, index) => (
                    <span key={index} className="text-blue-600 text-sm bg-blue-50 px-2 py-1 rounded-full">
                      {hashtag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Metrics */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Icon icon="trending-up" className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Engagement:</span>
                <span className={`font-medium ${formatEngagementScore(contentItem.estimatedEngagement).color}`}>
                  {formatEngagementScore(contentItem.estimatedEngagement).text}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Icon icon="star" className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Brand Fit:</span>
                <span className={`font-medium ${formatBrandCompliance(contentItem.brandCompliance).color}`}>
                  {formatBrandCompliance(contentItem.brandCompliance).text}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Icon icon="edit" className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{contentItem.wordCount} words</span>
              </div>
            </div>

            {/* Variations */}
            {contentItem.variations && contentItem.variations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h5 className="text-sm font-medium text-gray-700 mb-2">
                  Alternative Versions ({contentItem.variations.length})
                </h5>
                <div className="grid gap-2">
                  {contentItem.variations.slice(0, 2).map((variation, index) => (
                    <div key={variation.id} className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-gray-700 text-sm line-clamp-2">{variation.content}</p>
                      <button
                        onClick={() => setSelectedContent(variation)}
                        className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                      >
                        View Full Version
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Full Content Modal */}
      {selectedContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Content Preview</h3>
              <button
                onClick={() => setSelectedContent(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon icon="x" className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              {selectedContent.type === 'email' ? (
                renderEmailContent(selectedContent as EmailContent)
              ) : (
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedContent.content}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneratedContentViewer;