import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';

const StorageStatus: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const storageStatus = storageService.getStorageStatus();
    setStatus(storageStatus);

    // Only show the status if S3 is not configured (to help with setup)
    if (!storageStatus.s3Available) {
      setIsVisible(true);

      // Auto-hide after 10 seconds
      const timer = setTimeout(() => setIsVisible(false), 10000);
      return () => clearTimeout(timer);
    }
  }, []);

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

        alert(`Test upload ${result.isS3 ? 'succeeded' : 'used fallback'}: ${result.url.substring(0, 50)}...`);
      }
    } catch (error) {
      alert(`Test upload failed: ${error}`);
    }
  };

  if (!isVisible || !status) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-sm shadow-lg z-50">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-semibold text-yellow-800 mb-1">
            Storage Configuration
          </h3>
          <p className="text-xs text-yellow-700 mb-2">
            {status.storageType}
          </p>
          {!status.s3Available && (
            <p className="text-xs text-yellow-600 mb-3">
              Images will be stored locally. Configure AWS S3 for cloud storage.
            </p>
          )}
          <button
            onClick={testS3Upload}
            className="text-xs bg-yellow-200 hover:bg-yellow-300 px-2 py-1 rounded text-yellow-800"
          >
            Test Storage
          </button>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-yellow-600 hover:text-yellow-800 text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default StorageStatus;