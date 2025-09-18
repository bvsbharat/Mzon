import React, { useState, useCallback } from 'react';
import { deepAgentNewsService, checkDeepAgentHealth } from '../services/deepAgentNewsService';
import Icon from './Icon';
import Spinner from './Spinner';

interface NewsDiscoveryPanelProps {
  onNewsContext: (context: string) => void;
  onArticlesDiscovered?: (articles: any[]) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

interface NewsSession {
  sessionId: string;
  articles: any[];
  status: 'discovering' | 'complete' | 'error';
  tags: string[];
  progress?: number;
}

const NewsDiscoveryPanel: React.FC<NewsDiscoveryPanelProps> = ({
  onNewsContext,
  onArticlesDiscovered,
  onError,
  onSuccess
}) => {
  const [tags, setTags] = useState('AI, social media, content creation');
  const [maxArticles, setMaxArticles] = useState(5);
  const [newsSession, setNewsSession] = useState<NewsSession | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [streamMessages, setStreamMessages] = useState<any[]>([]);
  const [backendHealth, setBackendHealth] = useState<any>(null);

  // Check backend health on component mount
  React.useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await checkDeepAgentHealth();
        setBackendHealth(health);
      } catch (error) {
        console.error('Failed to check backend health:', error);
        setBackendHealth({ healthy: false, message: 'Connection failed' });
      }
    };
    checkHealth();
  }, []);

  const handleStartDiscovery = useCallback(async () => {
    if (!tags.trim()) {
      onError('Please enter at least one topic tag');
      return;
    }

    const tagList = tags.split(',').map(tag => tag.trim()).filter(tag => tag);

    setIsDiscovering(true);
    setStreamMessages([]);
    setNewsSession(null);

    try {
      // Start discovery session
      const { sessionId } = await deepAgentNewsService.startNewsDiscovery(tagList, maxArticles);

      // Connect to WebSocket for real-time updates
      deepAgentNewsService.connectToDeepAgent(
        sessionId,
        tagList,
        maxArticles,
        // onUpdate
        (update) => {
          setStreamMessages(prev => [...prev, update]);
          if (update.progress) {
            setNewsSession(prev => prev ? { ...prev, progress: update.progress } : null);
          }
        },
        // onComplete
        async (data) => {
          setIsDiscovering(false);

          try {
            // Get the news content as context
            const newsContext = await deepAgentNewsService.getNewsContentAsContext(sessionId);

            const articles = data.articles || [];

            setNewsSession({
              sessionId,
              articles,
              status: 'complete',
              tags: tagList,
              progress: 100
            });

            onNewsContext(newsContext);
            if (onArticlesDiscovered) {
              onArticlesDiscovered(articles);
            }

            const imageCount = articles.reduce((sum: number, article: any) =>
              sum + (article.generated_images ? Object.keys(article.generated_images).length : 0), 0);

            onSuccess(`Discovery complete! Found ${articles.length} articles with ${imageCount} generated images`);
          } catch (error) {
            console.error('Failed to get news context:', error);
            onError('Failed to process news content');
          }
        },
        // onError
        (error) => {
          setIsDiscovering(false);
          onError(`News discovery failed: ${error}`);
          setNewsSession(prev => prev ? { ...prev, status: 'error' } : null);
        }
      );

      setNewsSession({
        sessionId,
        articles: [],
        status: 'discovering',
        tags: tagList
      });

    } catch (error) {
      console.error('Failed to start discovery:', error);
      setIsDiscovering(false);
      onError('Failed to start news discovery');
    }
  }, [tags, maxArticles, onNewsContext, onError, onSuccess]);

  const getConnectionStatus = () => {
    if (!backendHealth) return { color: 'text-yellow-600', text: 'Checking...', icon: 'clock' };
    if (backendHealth.healthy) return { color: 'text-green-600', text: 'Connected', icon: 'check' };
    return { color: 'text-red-600', text: 'Disconnected', icon: 'x' };
  };

  const status = getConnectionStatus();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">🤖 News Discovery</h3>
        <div className="flex items-center gap-2">
          <Icon name={status.icon as any} className={`w-4 h-4 ${status.color}`} />
          <span className={`text-sm ${status.color}`}>{status.text}</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Input Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Topics (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="AI, social media, content creation"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isDiscovering}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Articles
            </label>
            <select
              value={maxArticles}
              onChange={(e) => setMaxArticles(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isDiscovering}
            >
              <option value={3}>3 articles</option>
              <option value={5}>5 articles</option>
              <option value={8}>8 articles</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleStartDiscovery}
          disabled={isDiscovering || !backendHealth?.healthy}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isDiscovering ? (
            <>
              <Spinner />
              <span>Discovering News...</span>
            </>
          ) : (
            <>
              <Icon name="search" className="w-4 h-4" />
              <span>Start Discovery</span>
            </>
          )}
        </button>

        {/* Progress and Status */}
        {newsSession && (
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm text-gray-500">{newsSession.progress || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${newsSession.progress || 0}%` }}
              ></div>
            </div>

            {newsSession.status === 'complete' && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Icon name="check" className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-800 font-medium">
                    Discovery complete! Found {newsSession.articles.length} articles
                  </span>
                </div>
                <div className="text-xs text-green-600 mt-1">
                  Topics: {newsSession.tags.join(', ')}
                </div>
                {newsSession.articles.length > 0 && newsSession.articles[0].generated_images && (
                  <div className="text-xs text-green-600 mt-1">
                    🎨 Generated {Object.keys(newsSession.articles[0].generated_images).length * newsSession.articles.length} platform-optimized images
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stream Messages */}
        {streamMessages.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Agent Activity</h4>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {streamMessages.slice(-10).map((msg, index) => (
                <div
                  key={index}
                  className={`text-xs p-2 rounded border-l-2 ${
                    msg.type === 'complete' ? 'bg-green-50 border-green-500' :
                    msg.type === 'error' ? 'bg-red-50 border-red-500' :
                    msg.type === 'start' ? 'bg-blue-50 border-blue-500' :
                    'bg-gray-50 border-gray-300'
                  }`}
                >
                  <div className="font-medium">
                    {msg.agent ? msg.agent.toUpperCase() : 'SYSTEM'}
                  </div>
                  <div className="text-gray-600">{msg.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsDiscoveryPanel;