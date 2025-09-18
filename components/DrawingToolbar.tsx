import React from 'react';
import Icon from './Icon';

export type DrawingTool = 'draw' | 'erase';

interface DrawingToolbarProps {
  brushSize: number;
  setBrushSize: (size: number) => void;
  undo: () => void;
  redo: () => void;
  tool: DrawingTool;
  setTool: (tool: DrawingTool) => void;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  onResetZoom: () => void;
}

const ToolbarButton: React.FC<{ onClick: () => void; tooltip: string; 'aria-label': string; children: React.ReactNode }> = ({ onClick, tooltip, 'aria-label': ariaLabel, children }) => (
  <div className="relative group">
    <button onClick={onClick} className="p-2 rounded-md hover:bg-slate-100 text-gray-600" aria-label={ariaLabel}>
      {children}
    </button>
    <div className="whitespace-pre-line text-center absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
      {tooltip}
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
    </div>
  </div>
);


const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  brushSize,
  setBrushSize,
  undo,
  redo,
  tool,
  setTool,
  zoom,
  onZoomChange,
  onResetZoom,
}) => {
  return (
    <div className="w-full bg-white flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <ToolbarButton onClick={undo} tooltip="Undo (Ctrl+Z)" aria-label="Undo"><Icon icon="undo" className="w-5 h-5" /></ToolbarButton>
        <ToolbarButton onClick={redo} tooltip="Redo (Ctrl+Y)" aria-label="Redo"><Icon icon="redo" className="w-5 h-5" /></ToolbarButton>
      </div>
      <div className="h-6 w-px bg-gray-200" />
      {/* Tools */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md">
        <button onClick={() => setTool('draw')} className={`px-2 py-1 rounded-md text-gray-600 text-sm flex items-center gap-2 ${tool === 'draw' ? 'bg-white shadow-sm' : ''}`} aria-label="Pencil"><Icon icon="brush" className="w-5 h-5" /> Brush</button>
        <button onClick={() => setTool('erase')} className={`px-2 py-1 rounded-md text-gray-600 text-sm flex items-center gap-2 ${tool === 'erase' ? 'bg-white shadow-sm' : ''}`} aria-label="Eraser"><Icon icon="eraser" className="w-5 h-5" /> Eraser</button>
      </div>
      <div className="h-6 w-px bg-gray-200" />
      {/* Brush Size */}
      <div className="flex items-center gap-2">
        <label htmlFor="brush-size" className="sr-only">Brush Size</label>
        <Icon icon="brush" className="w-5 h-5 text-gray-500" />
        <input id="brush-size" type="range" min="1" max="100" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-24 cursor-pointer" />
        <span className="text-sm text-gray-600 font-mono w-8 text-left">{brushSize}</span>
      </div>
      <div className="h-6 w-px bg-gray-200" />
      {/* Zoom Controls */}
      <div className="flex items-center gap-1">
        <ToolbarButton onClick={() => onZoomChange(Math.max(zoom / 1.5, 0.1))} tooltip="Zoom Out" aria-label="Zoom out"><Icon icon="zoomOut" className="w-5 h-5" /></ToolbarButton>
        <div className="relative group">
          <button onClick={onResetZoom} className="p-1.5 w-16 text-center rounded-md hover:bg-slate-100 text-gray-600 text-xs font-semibold">{Math.round(zoom * 100)}%</button>
           <div className="whitespace-pre-line text-center absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
            Fit to Screen
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
          </div>
        </div>
        <ToolbarButton onClick={() => onZoomChange(Math.min(zoom * 1.5, 8))} tooltip="Zoom In" aria-label="Zoom in"><Icon icon="zoomIn" className="w-5 h-5" /></ToolbarButton>
      </div>
    </div>
  );
};

export default DrawingToolbar;