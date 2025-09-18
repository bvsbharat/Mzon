

import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { DrawingTool } from './DrawingToolbar';

interface DrawingCanvasProps {
  imageUrl: string;
  brushSize: number;
  tool: DrawingTool;
  onDrawStateChange?: (hasDrawing: boolean) => void;
}

export interface DrawingCanvasRef {
  undo: () => void;
  redo: () => void;
  clearCanvas: () => void;
  exportCanvas: () => Promise<string | null>;
  getDrawingDataUrl: () => Promise<string | null>;
}

const MASK_COLOR = '#00FF00'; // Vibrant green for high visibility

const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(({ imageUrl, brushSize, tool, onDrawStateChange }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Set up canvas and load image
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    contextRef.current = context;

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = imageUrl;
    image.onload = () => {
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      context.clearRect(0, 0, canvas.width, canvas.height);
      const initialImageData = context.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([initialImageData]);
      setHistoryIndex(0);
      onDrawStateChange?.(false);
    };
     image.onerror = () => {
      console.error("Failed to load image for canvas.");
    }
  }, [imageUrl, onDrawStateChange]);

  const getCoords = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    
    return { x, y };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const coords = getCoords(e);
    const context = contextRef.current;
    if (!context || !coords) return;

    context.globalCompositeOperation = tool === 'erase' ? 'destination-out' : 'source-over';
    context.beginPath();
    context.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const endDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const context = contextRef.current;
    if (!context || !isDrawing) return;
    context.closePath();
    setIsDrawing(false);
    saveHistory();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || !contextRef.current) return;
    const context = contextRef.current;
    const coords = getCoords(e);
    if (!coords) return;

    context.lineTo(coords.x, coords.y);
    context.strokeStyle = MASK_COLOR;
    context.lineWidth = brushSize;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.stroke();
  };

  const saveHistory = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;
    const newImageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImageData);
    const newIndex = newHistory.length - 1;
    setHistoryIndex(newIndex);
    onDrawStateChange?.(newIndex > 0);
  };
  
  useImperativeHandle(ref, () => ({
    undo() {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        contextRef.current?.putImageData(history[newIndex], 0, 0);
        onDrawStateChange?.(newIndex > 0);
      }
    },
    redo() {
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        contextRef.current?.putImageData(history[newIndex], 0, 0);
        onDrawStateChange?.(true);
      }
    },
    clearCanvas() {
        const canvas = canvasRef.current;
        const context = contextRef.current;
        if (canvas && context) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            if (history.length > 0) {
                const initialImageData = history[0];
                setHistory([initialImageData]);
                setHistoryIndex(0);
                onDrawStateChange?.(false);
            }
        }
    },
    exportCanvas: () => {
      return new Promise((resolve) => {
        const canvas = canvasRef.current; // The user's drawing canvas
        if (!canvas) {
          resolve(null);
          return;
        }

        const maskCanvas = document.createElement('canvas');
        const maskCtx = maskCanvas.getContext('2d');
        if (!maskCtx) {
          resolve(null);
          return;
        }

        const originalImage = new Image();
        originalImage.crossOrigin = "anonymous";
        originalImage.src = imageUrl;
        originalImage.onload = () => {
          maskCanvas.width = originalImage.naturalWidth;
          maskCanvas.height = originalImage.naturalHeight;

          maskCtx.fillStyle = 'black';
          maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
          
          maskCtx.drawImage(canvas, 0, 0, maskCanvas.width, maskCanvas.height);

          maskCtx.globalCompositeOperation = 'source-in';

          maskCtx.fillStyle = 'white';
          maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

          resolve(maskCanvas.toDataURL('image/png'));
        };
        originalImage.onerror = () => resolve(null);
      });
    },
    getDrawingDataUrl: () => {
      return new Promise((resolve) => {
        const canvas = canvasRef.current;
        if (!canvas) {
          resolve(null);
          return;
        }
        resolve(canvas.toDataURL('image/png'));
      });
    },
  }));

  return (
    <>
        <img src={imageUrl} alt="Background for editing" className="w-full h-full object-contain pointer-events-none select-none" draggable="false" />
        <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseUp={endDrawing}
            onMouseLeave={endDrawing}
            onMouseMove={draw}
            onTouchStart={startDrawing}
            onTouchEnd={endDrawing}
            onTouchMove={draw}
            className="absolute top-0 left-0 w-full h-full"
            style={{ touchAction: 'none', cursor: 'crosshair' }}
        />
    </>
  );
});

export default DrawingCanvas;