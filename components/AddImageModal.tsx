
import React, { useEffect } from 'react';
import Icon from './Icon';

interface AddImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadClick: () => void;
  onGenerateClick: () => void;
}

const AddImageModal: React.FC<AddImageModalProps> = ({ isOpen, onClose, onUploadClick, onGenerateClick }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md bg-white rounded-lg shadow-2xl animate-slide-up-fade flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-base font-semibold text-gray-900">Add a Context Image</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <Icon icon="x" className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={onUploadClick}
            className="group flex flex-col items-center justify-center text-center gap-3 p-6 border border-gray-200 rounded-lg bg-white hover:bg-slate-50 hover:border-gray-300 transition-all duration-200"
          >
            <div className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors">
              <Icon icon="uploadCloud" className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Upload Image</h3>
              <p className="text-xs text-gray-500 mt-1">From your device</p>
            </div>
          </button>

          <button
            onClick={onGenerateClick}
            className="group flex flex-col items-center justify-center text-center gap-3 p-6 border border-gray-200 rounded-lg bg-white hover:bg-slate-50 hover:border-gray-300 transition-all duration-200"
          >
            <div className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors">
              <Icon icon="sparkles" className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Generate with AI</h3>
              <p className="text-xs text-gray-500 mt-1">Create a new one</p>
            </div>
          </button>
        </div>
      </div>
      <style>{`
        .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
        .animate-slide-up-fade { animation: slide-up-fade 0.3s ease-out forwards; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up-fade { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default AddImageModal;
