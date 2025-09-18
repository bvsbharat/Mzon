
import React, { useState, useEffect, useLayoutEffect } from 'react';

interface OnboardingTooltipProps {
  targetRef: React.RefObject<HTMLElement>;
  text: string;
  step: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
  position?: 'top' | 'bottom' | 'left' | 'right';
  isLastStep?: boolean;
}

const OnboardingTooltip: React.FC<OnboardingTooltipProps> = ({
  targetRef,
  text,
  step,
  totalSteps,
  onNext,
  onSkip,
  position = 'bottom',
  isLastStep = false,
}) => {
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: -9999, left: -9999 });

  useLayoutEffect(() => {
    if (targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      let newCoords = { top: 0, left: 0 };
      switch (position) {
        case 'top':
          newCoords = { top: rect.top - 10, left: rect.left + rect.width / 2 };
          break;
        case 'bottom':
          newCoords = { top: rect.bottom + 10, left: rect.left + rect.width / 2 };
          break;
        case 'left':
            newCoords = { top: rect.top + rect.height / 2, left: rect.left - 10 };
            break;
        case 'right':
            newCoords = { top: rect.top + rect.height / 2, left: rect.right + 10 };
            break;
      }
      setCoords(newCoords);
    }
  }, [targetRef, position]);

  const getTransformClass = () => {
    switch (position) {
      case 'top': return '-translate-x-1/2 -translate-y-full';
      case 'bottom': return '-translate-x-1/2';
      case 'left': return '-translate-x-full -translate-y-1/2';
      case 'right': return '-translate-y-1/2';
    }
  };

  return (
    <div
      className="fixed top-0 left-0 z-[101] w-screen h-screen bg-black/30 animate-fade-in"
      onClick={(e) => {
        // Prevent clicks on the overlay from propagating, but allow skipping
        e.stopPropagation();
      }}
    >
      <div
        className={`absolute w-72 bg-gray-800 text-white p-4 rounded-lg shadow-2xl animate-pop-in ${getTransformClass()}`}
        style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm">{text}</p>
        <div className="flex justify-between items-center mt-4">
          <span className="text-xs font-bold text-gray-400">
            {step} / {totalSteps}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onSkip}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Skip Tour
            </button>
            <button
              onClick={onNext}
              className="px-3 py-1.5 text-xs font-semibold rounded-md text-gray-900 bg-white hover:bg-gray-200 transition-colors"
            >
              {isLastStep ? 'Finish Tour' : 'Next'}
            </button>
          </div>
        </div>
      </div>
       <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
        @keyframes pop-in { 
          from { opacity: 0; transform: scale(0.95) ${getTransformClass()}; }
          to { opacity: 1; transform: scale(1) ${getTransformClass()}; }
        }
        .animate-pop-in { animation: pop-in 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default OnboardingTooltip;
