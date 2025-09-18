
import React, { useEffect } from 'react';
import Icon from './Icon';

interface ImagePreviewModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ isOpen, imageUrl, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-preview-title"
    >
      <div
        className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-2xl animate-slide-up-fade flex flex-col"
        onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking inside
      >
        <div className="p-4 border-b flex justify-between items-center">
             <h2 id="image-preview-title" className="text-base font-semibold text-gray-900">Image Preview</h2>
            <button
                onClick={onClose}
                className="p-1 rounded-full text-gray-500 hover:bg-gray-100"
                aria-label="Close preview"
            >
                <Icon icon="x" className="w-5 h-5" />
            </button>
        </div>
        <div className="flex-grow p-4 overflow-auto">
             <img src={imageUrl} alt="Generated product shot preview" className="w-full h-full object-contain rounded-md" />
        </div>
        <div className="p-4 border-t bg-slate-50 flex justify-end">
             <a
                href={imageUrl}
                download="professional-product-shot.png"
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold rounded-md text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
                aria-label="Download generated image"
              >
                <Icon icon="download" className="w-4 h-4 mr-2" />
                Download
              </a>
        </div>
      </div>
       <style>{`
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slide-up-fade {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
          .animate-slide-up-fade { animation: slide-up-fade 0.3s ease-out forwards; }
        `}</style>
    </div>
  );
};

export default ImagePreviewModal;
