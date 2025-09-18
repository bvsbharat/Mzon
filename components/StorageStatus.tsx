import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { localStorageService } from '../services/localStorageService';

interface StorageStatusProps {
  galleryImageCount?: number;
}

const StorageStatus: React.FC<StorageStatusProps> = ({ galleryImageCount = 0 }) => {
  const [status, setStatus] = useState<any>(null);
  const [localStorageInfo, setLocalStorageInfo] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const storageStatus = storageService.getStorageStatus();
    const localInfo = localStorageService.getStorageInfo();
    const metadata = localStorageService.getGalleryMetadata();

    setStatus(storageStatus);
    setLocalStorageInfo({
      ...localInfo,
      metadata,
      imagesCount: galleryImageCount
    });

    // Show status for 15 seconds on first load, or if there are storage issues
    if (!storageStatus.s3Available || localInfo.percentage > 80) {
      setIsVisible(true);
      const timer = setTimeout(() => setIsVisible(false), 15000);
      return () => clearTimeout(timer);
    }
  }, [galleryImageCount]);

  const testS3Upload = async () => {
    try {
      // Create a simple test image (red 100x100 pixel)
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, 100, 100);
        const testDataUrl = canvas.toDataURL('image/png');

        const result = await storageService.storeImage(testDataUrl, {
          imageType: 'generated',
          customName: 'test-image'
        });

        const message = result.isS3
          ? `✅ S3 upload successful!`
          : `⚠️ S3 failed (${result.errorType}), used local storage`;

        alert(message);
      }
    } catch (error) {
      alert(`Test upload failed: ${error}`);
    }
  };

  const clearLocalStorage = () => {
    if (confirm('Clear all locally stored images? This cannot be undone.')) {
      localStorageService.clearGalleryData();
      alert('Local storage cleared!');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!isVisible || !status || !localStorageInfo) return null;

  const isStorageWarning = localStorageInfo.percentage > 80;

  return (
    <div className={`fixed bottom-4 right-4 rounded-lg p-4 max-w-sm shadow-lg z-50 transition-all duration-300 ${
      isStorageWarning
        ? 'bg-red-50 border border-red-200'
        : 'bg-blue-50 border border-blue-200'
    }`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-sm font-semibold ${
              isStorageWarning ? 'text-red-800' : 'text-blue-800'
            }`}>
              Storage Status
            </h3>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`text-xs px-2 py-1 rounded ${
                isStorageWarning
                  ? 'bg-red-200 hover:bg-red-300 text-red-800'
                  : 'bg-blue-200 hover:bg-blue-300 text-blue-800'
              }`}
            >
              {isExpanded ? 'Less' : 'More'}
            </button>
          </div>

          <div className={`text-xs ${isStorageWarning ? 'text-red-700' : 'text-blue-700'} mb-2`}>
            <div className="flex justify-between">
              <span>Images:</span>
              <span>{localStorageInfo.imagesCount} stored</span>
            </div>
            <div className="flex justify-between">
              <span>Local Storage:</span>
              <span>{formatBytes(localStorageInfo.used)} ({localStorageInfo.percentage.toFixed(1)}%)</span>
            </div>
            <div className="flex justify-between">
              <span>Cloud Storage:</span>
              <span>{status.s3Available ? 'Available' : 'Unavailable'}</span>
            </div>
          </div>

          {/* Storage usage bar */}
          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                localStorageInfo.percentage > 90 ? 'bg-red-500' :
                localStorageInfo.percentage > 80 ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
              style={{ width: `${Math.min(localStorageInfo.percentage, 100)}%` }}
            />
          </div>

          {isExpanded && (
            <div className="space-y-2 mb-3">
              {isStorageWarning && (
                <div className="text-xs text-red-600 bg-red-100 p-2 rounded">
                  ⚠️ Storage almost full. Consider clearing old images.
                </div>
              )}

              {!status.s3Available && (
                <div className="text-xs text-yellow-600 bg-yellow-100 p-2 rounded">
                  💡 Configure AWS S3 for unlimited cloud storage.
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={testS3Upload}
                  className={`text-xs px-3 py-1 rounded transition-colors ${
                    status.s3Available
                      ? 'bg-green-200 hover:bg-green-300 text-green-800'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  Test Storage
                </button>
                <button
                  onClick={clearLocalStorage}
                  className="text-xs bg-red-200 hover:bg-red-300 px-3 py-1 rounded text-red-800"
                >
                  Clear Local
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsVisible(false)}
          className={`ml-2 hover:opacity-75 text-lg leading-none ${
            isStorageWarning ? 'text-red-600' : 'text-blue-600'
          }`}
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default StorageStatus;