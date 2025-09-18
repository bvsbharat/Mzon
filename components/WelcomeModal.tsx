
import React from 'react';
import Icon from './Icon';

interface WelcomeModalProps {
  onStart: () => void;
  onSkip: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ onStart, onSkip }) => {
  return (
    <div
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl text-center p-8 sm:p-12 animate-fade-in-up">
        <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center border-4 border-white shadow-sm">
          <Icon icon="rocket" className="w-8 h-8 text-gray-800" />
        </div>
        <h1 className="mt-6 text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
          Welcome to Digital Studio!
        </h1>
        <p className="mt-4 text-base text-gray-600 max-w-md mx-auto">
          Turn your product photos into professional-grade assets in just a few clicks. Let's take a quick tour to see how it works.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onStart}
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 text-sm font-semibold rounded-md text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors"
          >
            Start Guided Tour
          </button>
          <button
            onClick={onSkip}
            className="w-full sm:w-auto text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Skip for now
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default WelcomeModal;
