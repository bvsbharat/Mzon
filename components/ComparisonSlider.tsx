import React, { useState, useRef, useCallback, useEffect } from 'react';
import Icon from './Icon';

interface ComparisonSliderProps {
  originalImage: string;
  generatedImage: string;
}

const ComparisonSlider: React.FC<ComparisonSliderProps> = ({ originalImage, generatedImage }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
  };

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleMove(e.clientX);
  }, [handleMove]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    handleMove(e.touches[0].clientX);
  }, [handleMove]);


  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleTouchMove, handleMouseUp]);


  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-square max-w-2xl mx-auto select-none overflow-hidden rounded-lg cursor-ew-resize border border-gray-200 bg-slate-100"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <img
        src={generatedImage}
        alt="Generated product shot"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        draggable="false"
      />
      <div
        className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img
          src={originalImage}
          alt="Original product"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          draggable="false"
        />
      </div>
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white/50 cursor-ew-resize pointer-events-none"
        style={{ left: `calc(${sliderPosition}% - 1px)` }}
      >
        <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full border border-gray-300 flex items-center justify-center cursor-ew-resize pointer-events-auto backdrop-blur-sm"
            aria-label="Drag to compare images"
            role="slider"
            aria-valuenow={sliderPosition}
        >
          <Icon icon="arrowLeftRight" className="w-5 h-5 text-gray-700" />
        </div>
      </div>
    </div>
  );
};

export default ComparisonSlider;