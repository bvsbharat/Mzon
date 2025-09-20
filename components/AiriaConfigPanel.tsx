import React, { useState, useEffect } from 'react';
import { airiaService } from '../services/airiaService';

interface AiriaConfigPanelProps {
  onConfigurationChange?: (isConfigured: boolean) => void;
}

const AiriaConfigPanel: React.FC<AiriaConfigPanelProps> = ({ onConfigurationChange }) => {
  const [configStatus, setConfigStatus] = useState({
    hasApiKey: false,
    hasUserId: false,
    isFullyConfigured: false
  });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const status = airiaService.getConfigurationStatus();
    setConfigStatus(status);
    onConfigurationChange?.(status.isFullyConfigured);
  }, [onConfigurationChange]);

  const handleRefreshStatus = () => {
    const status = airiaService.getConfigurationStatus();
    setConfigStatus(status);
    onConfigurationChange?.(status.isFullyConfigured);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${
            configStatus.isFullyConfigured ? 'bg-green-500' : 'bg-yellow-500'
          }`} />
          <h3 className="text-lg font-semibold text-gray-900">
            Airia AI Agent Configuration
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            configStatus.isFullyConfigured 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {configStatus.isFullyConfigured ? 'Configured' : 'Setup Required'}
          </span>
          <svg 
            className={`w-5 h-5 text-gray-400 transform transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="mt-4 space-y-4">
            <div className="text-sm text-gray-600">
              Configure your Airia AI agent to enable automatic social media posting.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  configStatus.hasApiKey ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-sm font-medium">API Key</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  configStatus.hasApiKey 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {configStatus.hasApiKey ? 'Set' : 'Missing'}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  configStatus.hasUserId ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-sm font-medium">User ID</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  configStatus.hasUserId 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {configStatus.hasUserId ? 'Set' : 'Missing'}
                </span>
              </div>
            </div>

            {!configStatus.isFullyConfigured && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-yellow-800 mb-2">
                  Setup Instructions
                </h4>
                <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                  <li>Add your Airia API key to <code className="bg-yellow-100 px-1 rounded">VITE_AIRIA_API_KEY</code> in your .env file</li>
                  <li>Add your Airia User ID to <code className="bg-yellow-100 px-1 rounded">VITE_AIRIA_USER_ID</code> in your .env file</li>
                  <li>Restart your development server</li>
                  <li>Click "Refresh Status" to verify the configuration</li>
                </ol>
              </div>
            )}

            {configStatus.isFullyConfigured && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-semibold text-green-800">
                    Airia AI agent is ready for social media posting!
                  </span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Your content will be automatically posted to social media platforms when you select "Post Now" or schedule posts for immediate delivery.
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleRefreshStatus}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Refresh Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiriaConfigPanel;
