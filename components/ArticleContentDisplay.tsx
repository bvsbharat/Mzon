import React, { useState } from 'react';
import { ArticleContent } from '../services/articleContentService';
import Icon from './Icon';

interface ArticleContentDisplayProps {
  articleContent: ArticleContent;
  onClose?: () => void;
  showFullContent?: boolean;
  className?: string;
}

const ArticleContentDisplay: React.FC<ArticleContentDisplayProps> = ({
  articleContent,
  onClose,
  showFullContent = false,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(showFullContent);
  const [activeSection, setActiveSection] = useState<'summary' | 'keyPoints' | 'fullContent'>('summary');

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatReadingTime = (wordCount: number, readingTime: number) => {
    return `${wordCount.toLocaleString()} words • ${readingTime} min read`;
  };

  if (articleContent.error) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <Icon icon="alertTriangle" className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-yellow-800 mb-1">Content Fetch Error</h4>
            <p className="text-sm text-yellow-700 mb-2">{articleContent.error}</p>
            <p className="text-xs text-yellow-600">
              Using available article summary and metadata for content generation.
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-yellow-100 rounded transition-colors"
            >
              <Icon icon="x" className="w-4 h-4 text-yellow-600" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Icon icon="checkCircle" className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Article Content Fetched</h3>
              <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                {formatReadingTime(articleContent.wordCount, articleContent.readingTime)}
              </span>
            </div>
            <h4 className="text-base font-medium text-gray-800 mb-2 line-clamp-2">
              {articleContent.title}
            </h4>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Icon icon="clock" className="w-4 h-4" />
                <span>Fetched {new Date(articleContent.fetchedAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <Icon icon="globe" className="w-4 h-4" />
                <span className="truncate max-w-xs">{new URL(articleContent.url).hostname}</span>
              </div>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-blue-100 rounded-lg transition-colors ml-4"
            >
              <Icon icon="x" className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex px-6">
          {[
            { key: 'summary', label: 'Summary', icon: 'edit' },
            { key: 'keyPoints', label: 'Key Points', icon: 'list' },
            { key: 'fullContent', label: 'Full Content', icon: 'file-text' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                activeSection === tab.key
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon icon={tab.icon as any} className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content Sections */}
      <div className="p-6">
        {activeSection === 'summary' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Article Summary
              </h4>
              <button
                onClick={() => handleCopy(articleContent.summary)}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Icon icon="copy" className="w-4 h-4" />
                Copy Summary
              </button>
            </div>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 leading-relaxed">
                {articleContent.summary}
              </p>
            </div>
          </div>
        )}

        {activeSection === 'keyPoints' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Key Points ({articleContent.keyPoints.length})
              </h4>
              <button
                onClick={() => handleCopy(articleContent.keyPoints.join('\n• '))}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Icon icon="copy" className="w-4 h-4" />
                Copy Points
              </button>
            </div>
            {articleContent.keyPoints.length > 0 ? (
              <ul className="space-y-3">
                {articleContent.keyPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5 flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">{point}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Icon icon="list" className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No key points extracted from this article.</p>
              </div>
            )}
          </div>
        )}

        {activeSection === 'fullContent' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Full Article Content
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(articleContent.content)}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <Icon icon="copy" className="w-4 h-4" />
                  Copy All
                </button>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-700 transition-colors"
                >
                  <Icon icon={isExpanded ? 'minimize-2' : 'maximize-2'} className="w-4 h-4" />
                  {isExpanded ? 'Collapse' : 'Expand'}
                </button>
              </div>
            </div>
            <div
              className={`prose prose-sm max-w-none overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50 ${
                isExpanded ? 'max-h-96' : 'max-h-48'
              }`}
            >
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                {isExpanded ? articleContent.content : `${articleContent.content.substring(0, 500)}...`}
              </div>
            </div>
            {!isExpanded && articleContent.content.length > 500 && (
              <button
                onClick={() => setIsExpanded(true)}
                className="w-full text-sm text-blue-600 hover:text-blue-700 py-2 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Read More ({(articleContent.content.length - 500).toLocaleString()} more characters)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Content quality: High • Suitable for content generation
          </div>
          <div className="flex items-center gap-2">
            <a
              href={articleContent.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Icon icon="arrowLeft" className="w-4 h-4 rotate-180" />
              View Original
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleContentDisplay;