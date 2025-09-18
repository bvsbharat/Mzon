
import React, { useEffect } from 'react';
import Icon from './Icon';

const IdeaSpinner: React.FC = () => (
  <svg className="animate-spin h-8 w-8 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

interface SceneIdeasModalProps {
  isOpen: boolean;
  isLoading: boolean;
  ideas: string[];
  error: string | null;
  onClose: () => void;
  onSelectIdea: (idea: string) => void;
  onRetry: () => void;
}

const SceneIdeasModal: React.FC<SceneIdeasModalProps> = ({
  isOpen,
  isLoading,
  ideas,
  error,
  onClose,
  onSelectIdea,
  onRetry,
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
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

  if (!isOpen) return null;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center py-8">
          <div className="inline-block"><IdeaSpinner /></div>
          <p className="mt-4 text-slate-600 text-sm">Our AI is brainstorming creative ideas...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center">
          <p className="font-semibold text-red-600 text-sm">Oh no! Something went wrong.</p>
          <p className="mt-2 text-xs text-slate-600 bg-red-50 p-3 rounded-md">{error}</p>
          <button
            onClick={onRetry}
            className="mt-4 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-900"
          >
            Try Again
          </button>
        </div>
      );
    }

    if (ideas.length > 0) {
        return (
          <div className="w-full">
            <div className="space-y-2">
              {ideas.map((idea, index) => (
                <button
                  key={index}
                  onClick={() => onSelectIdea(idea)}
                  className="w-full text-left p-3 bg-slate-50 hover:bg-slate-100 rounded-md transition-colors group border"
                >
                  <p className="font-medium text-gray-700 text-sm">{idea}</p>
                </button>
              ))}
            </div>
            <div className="mt-5 text-center">
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                aria-label="Get new scene ideas"
              >
                <Icon icon="refreshCw" className="w-3.5 h-3.5" />
                <span>Get New Ideas</span>
              </button>
            </div>
          </div>
        );
    }
    
    return null;
  };

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
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Icon icon="lightbulb" className="w-5 h-5 text-yellow-500" />
            AI Scene Ideas
          </h2>
          <button
              onClick={onClose}
              className="p-1 rounded-full text-gray-500 hover:bg-gray-100"
              aria-label="Close ideas"
          >
              <Icon icon="x" className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 min-h-[150px] flex items-center justify-center">
          {renderContent()}
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
export default SceneIdeasModal;
