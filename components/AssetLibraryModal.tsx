
import React, { useEffect } from 'react';
import { GalleryImage } from '../types';
import Icon from './Icon';

interface AssetLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  galleryImages: GalleryImage[];
  onImageSelect: (image: GalleryImage) => void;
}

const AssetLibraryModal: React.FC<AssetLibraryModalProps> = ({ isOpen, onClose, galleryImages, onImageSelect }) => {
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
      aria-labelledby="library-modal-title"
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-lg shadow-2xl animate-slide-up-fade flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h2 id="library-modal-title" className="text-base font-semibold text-gray-900">Select from Asset Library</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <Icon icon="x" className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {galleryImages.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {galleryImages.map(image => (
                <button
                  key={image.id}
                  onClick={() => onImageSelect(image)}
                  className="aspect-square group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800 rounded-lg"
                  aria-label={`Select ${image.name}`}
                >
                  <img src={image.url} alt={image.name} className="w-full h-full object-cover rounded-md border border-gray-200 group-hover:opacity-80 transition-opacity" />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center text-slate-500 py-16">
              <Icon icon="photo" className="w-12 h-12 mx-auto text-gray-300" />
              <h3 className="mt-2 text-lg font-semibold">Library is Empty</h3>
              <p className="text-sm">Generate some images to see them here.</p>
            </div>
          )}
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

export default AssetLibraryModal;
