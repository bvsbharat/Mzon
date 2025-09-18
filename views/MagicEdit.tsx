import React, { useRef, useState, useEffect, useCallback } from 'react';
// FIX: Updated import to use types.ts to prevent circular dependencies.
import { View } from '../types';
import Icon, { IconName } from '../components/Icon';
import DrawingCanvas, { DrawingCanvasRef } from '../components/DrawingCanvas';
import DrawingToolbar, { DrawingTool } from '../components/DrawingToolbar';
import { magicEditImage, improveMagicEditPrompt, generateMaskedMagicEditIdeas } from '../services/geminiService';
import Spinner from '../components/Spinner';
import ComparisonSlider from '../components/ComparisonSlider';
import SceneIdeasModal from '../components/SceneIdeasModal';
import PromptEnhancer from '../components/PromptEnhancer';
import ImagePreviewModal from '../components/ImagePreviewModal';

const EDIT_COST = 4;
const IDEAS_COST = 2;

interface MagicEditProps {
  imageUrl: string | null;
  onNavigate: (view: View) => void;
  setMasterImage: (url: string | null) => void;
  addImageToLibrary: (url: string) => void;
  credits: number;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
  addNotification: (message: string) => void;
  editedImageUrl: string | null;
  setEditedImageUrl: React.Dispatch<React.SetStateAction<string | null>>;
}

type EditState = 'drawing' | 'generating' | 'result' | 'error';

interface SmartActionButtonProps {
    icon: IconName;
    label: string;
    description: string;
    onClick: () => void;
    disabled: boolean;
}

const SmartActionButton: React.FC<SmartActionButtonProps> = ({ icon, label, description, onClick, disabled }) => (
    <div className="relative group">
        <button
            onClick={onClick}
            disabled={disabled}
            className="w-full h-full flex flex-col items-center justify-center text-center gap-2 p-3 border border-gray-200 rounded-lg bg-white hover:bg-slate-50 hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200"
        >
            <div className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors group-disabled:bg-slate-100">
                <Icon icon={icon} className="w-6 h-6 text-gray-600"/>
            </div>
            <div>
                <h4 className="font-semibold text-gray-800 text-sm">{label}</h4>
            </div>
        </button>
        {!disabled && (
            <div className="whitespace-pre-line text-center absolute bottom-full mb-2 w-max max-w-xs left-1/2 -translate-x-1/2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                {description}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
            </div>
        )}
    </div>
);


const MagicEdit: React.FC<MagicEditProps> = ({ 
    imageUrl, 
    onNavigate, 
    setMasterImage, 
    addImageToLibrary, 
    credits, 
    setCredits, 
    addNotification,
    editedImageUrl,
    setEditedImageUrl 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<DrawingCanvasRef>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const sessionInitialImageUrl = useRef<string | null>(null);


  const [brushSize, setBrushSize] = useState(5);
  const [prompt, setPrompt] = useState('');
  const [tool, setTool] = useState<DrawingTool>('draw');
  const [hasMask, setHasMask] = useState(false);
  
  const [editState, setEditState] = useState<EditState>('drawing');
  const [error, setError] = useState<string | null>(null);

  const [isIdeasModalOpen, setIsIdeasModalOpen] = useState(false);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [sceneIdeas, setSceneIdeas] = useState<string[]>([]);
  const [ideasError, setIdeasError] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);


  const handleResetZoom = useCallback(() => {
    if (viewportRef.current && imageSize.width > 0) {
      const PADDING = 32; // 16px padding on each side
      const { clientWidth, clientHeight } = viewportRef.current;
      const availableWidth = clientWidth - PADDING;
      const availableHeight = clientHeight - PADDING;
      
      const scaleX = availableWidth / imageSize.width;
      const scaleY = availableHeight / imageSize.height;
      
      const newZoom = Math.min(scaleX, scaleY, 1);
      setZoom(newZoom > 0 ? newZoom : 1);
    }
  }, [imageSize]);


  useEffect(() => {
    if (imageUrl) {
      // If the ref is not set, or a new image is loaded (i.e., not from 'continue editing'),
      // then we are starting a new session. We set the ref to this original image.
      if (!sessionInitialImageUrl.current || (editedImageUrl && imageUrl !== editedImageUrl)) {
          sessionInitialImageUrl.current = imageUrl;
      }
        
      setPrompt('');
      setError(null);
      canvasRef.current?.clearCanvas();
      
      if (editedImageUrl) {
        setEditState('result');
      } else {
        setEditState('drawing');
      }

      const img = new Image();
      img.src = imageUrl;
      img.onload = () => {
        setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      };
    }
  }, [imageUrl, editedImageUrl]);
  
  // Effect to reset zoom when image changes or on initial load
  useEffect(() => {
    handleResetZoom();
  }, [imageSize, handleResetZoom]);

  const createCompositeForHint = async (baseImageUrl: string, overlayDataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context not available'));

        const baseImage = new Image();
        baseImage.crossOrigin = "Anonymous";
        baseImage.onload = () => {
            canvas.width = baseImage.naturalWidth;
            canvas.height = baseImage.naturalHeight;

            const overlayImage = new Image();
            overlayImage.crossOrigin = "Anonymous";
            overlayImage.onload = () => {
                ctx.drawImage(baseImage, 0, 0);
                // Make the mask slightly transparent so the underlying object is visible
                ctx.globalAlpha = 0.7; 
                ctx.drawImage(overlayImage, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            overlayImage.onerror = (err) => reject(new Error(`Failed to load overlay image: ${err}`));
            overlayImage.src = overlayDataUrl;
        };
        baseImage.onerror = (err) => reject(new Error(`Failed to load base image: ${err}`));
        baseImage.src = baseImageUrl;
    });
  };

  const handleGenerateIdeas = async (forceRefetch: boolean = false) => {
    if (!imageUrl || !canvasRef.current) return;

    if (credits < IDEAS_COST && !forceRefetch) {
        setIdeasError(`You need ${IDEAS_COST} credits to generate ideas.`);
        setIsIdeasModalOpen(true);
        return;
    }

    setIsIdeasModalOpen(true);
    if (sceneIdeas.length > 0 && !forceRefetch && !ideasError) return;

    setIsGeneratingIdeas(true);
    setIdeasError(null);
    setSceneIdeas([]);

    try {
        const drawingDataUrl = await canvasRef.current.getDrawingDataUrl();
        if (!drawingDataUrl) {
            throw new Error("Could not get the drawing from the canvas.");
        }
        const compositeImageUrl = await createCompositeForHint(imageUrl, drawingDataUrl);
        const ideas = await generateMaskedMagicEditIdeas(compositeImageUrl);
        setSceneIdeas(ideas);
        setCredits(prev => prev - IDEAS_COST);
    } catch (err) {
        setIdeasError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setIsGeneratingIdeas(false);
    }
  };


  const handleImprovePromptForEnhancer = async (currentPrompt: string): Promise<string> => {
    if (!imageUrl || !canvasRef.current) {
        throw new Error("Image and mask are required to improve prompt.");
    }
    const drawingDataUrl = await canvasRef.current.getDrawingDataUrl();
    if (!drawingDataUrl) {
        throw new Error("Could not get the drawing from the canvas.");
    }
    const compositeImageUrl = await createCompositeForHint(imageUrl, drawingDataUrl);
    return improveMagicEditPrompt(compositeImageUrl, currentPrompt);
  };


  const handleSelectIdea = (idea: string) => {
      setPrompt(idea);
      setIsIdeasModalOpen(false);
  };

  const handleFile = useCallback((file: File | null) => {
    if (!file) return;
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setMasterImage(dataUrl);
        setEditedImageUrl(null);
      };
      reader.readAsDataURL(file);
    } else {
      alert('Please upload a valid image file (JPEG, PNG, WEBP).');
    }
  }, [setMasterImage, setEditedImageUrl]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0] || null);
    event.target.value = '';
  };

  const onDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); }, []);
  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0] || null);
  }, [handleFile]);


  const handleGenerate = async () => {
    if (!imageUrl || !prompt.trim() || !canvasRef.current) return;
     if (credits < EDIT_COST) {
        setError(`Insufficient credits. You need ${EDIT_COST} to generate an edit.`);
        setEditState('error');
        return;
    }

    const maskDataUrl = await canvasRef.current.exportCanvas();
    if (!maskDataUrl) {
        setError('Could not get the drawing from the canvas.');
        setEditState('error');
        return;
    }

    setEditState('generating');
    setError(null);

    try {
        const resultUrl = await magicEditImage(imageUrl, maskDataUrl, prompt);
        setCredits(prev => prev - EDIT_COST);
        setEditedImageUrl(resultUrl);
        setEditState('result');
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred.');
        setEditState('error');
    }
  };

  const handleContinueEditing = () => {
    if (editedImageUrl) {
      setMasterImage(editedImageUrl);
      setEditedImageUrl(null);
    }
  };

  const handleStartOver = () => {
    if (sessionInitialImageUrl.current) {
      setMasterImage(sessionInitialImageUrl.current);
      setEditedImageUrl(null);
    }
  };
  
  const handleSaveToLibrary = () => {
    if (editedImageUrl) {
        addImageToLibrary(editedImageUrl);
        addNotification('Image saved to library!');
    }
  };

  const handleNavigateWithImage = (view: View) => {
    if (editedImageUrl) {
        setMasterImage(editedImageUrl);
        onNavigate(view);
    }
  };


  if (!imageUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center text-center animate-fade-in-up p-4">
          <div className="max-w-3xl w-full">
            <div className="pt-6 pb-6 border-b border-gray-200 mb-6">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  Start with Magic Edit
              </h1>
              <p className="mt-4 text-base text-gray-600 max-w-xl mx-auto">
                  To begin, provide an image to edit. You can generate one with our AI or upload your own.
              </p>
            </div>
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-lg border flex flex-col items-center text-center">
                       <div className="w-12 h-12 mx-auto rounded-lg bg-slate-100 flex items-center justify-center">
                          <Icon icon="sparkles" className="w-6 h-6 text-gray-500" />
                      </div>
                      <h2 className="mt-4 font-semibold text-gray-800">Create a Master Shot</h2>
                      <p className="mt-1 text-sm text-gray-600 flex-grow">Let our AI generate a professional master shot from your photos.</p>
                      <button onClick={() => onNavigate('photo')} className="mt-6 w-full inline-flex items-center justify-center px-5 py-2.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Go to Photo Studio</button>
                  </div>
                  <div
                    onDragEnter={onDragEnter}
                    onDragLeave={onDragLeave}
                    onDragOver={onDrop}
                    className={`relative bg-white p-6 rounded-lg border flex flex-col items-center text-center transition-colors ${isDragging ? 'bg-slate-100' : ''}`}
                  >
                       {isDragging && (
                          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center pointer-events-none rounded-lg border-2 border-dashed border-gray-400">
                              <p className="text-lg font-semibold text-gray-700">Drop image to upload</p>
                          </div>
                      )}
                      <div className="w-12 h-12 mx-auto rounded-lg bg-slate-100 flex items-center justify-center">
                          <Icon icon="uploadCloud" className="w-6 h-6 text-gray-500" />
                      </div>
                      <h2 className="mt-4 font-semibold text-gray-800">Upload Your Own</h2>
                      <p className="mt-1 text-sm text-gray-600 flex-grow">Use a high-quality image with a clean background and clear details.</p>
                       <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/png, image/jpeg, image/webp" />
                      <button onClick={() => fileInputRef.current?.click()} className="mt-6 w-full inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-900">Upload Image</button>
                  </div>
              </div>
          </div>
      </div>
    );
  }

  return (
    <>
        <div className="w-full h-full flex flex-col animate-fade-in-up p-4 sm:p-6 lg:p-8">
            <div className="flex-shrink-0 pt-6 pb-6 border-b border-gray-200 mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Magic Edit</h1>
                        <p className="mt-1 text-base text-gray-600">{editedImageUrl ? 'Your edit is complete. Review the result or take further action.' : 'Brush over an area, describe your change, and watch the magic happen.'}</p>
                    </div>
                    <div className="relative group">
                        <button onClick={() => setMasterImage(null)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-50">
                            <Icon icon="arrowPath" className="w-4 h-4" />
                            <span>Change Image</span>
                        </button>
                         <div className="whitespace-pre-line text-center absolute bottom-full right-0 mb-2 w-max max-w-xs px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                            {"Upload or select a\ndifferent source image."}
                            <div className="absolute top-full right-2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4 min-h-0">
                <div className="lg:col-span-2 w-full h-full bg-slate-100 border rounded-lg flex flex-col overflow-hidden">
                    {!editedImageUrl && (
                        <div className="flex-shrink-0 bg-white p-2 border-b border-gray-200 z-10">
                            <DrawingToolbar
                                brushSize={brushSize}
                                setBrushSize={setBrushSize}
                                undo={() => canvasRef.current?.undo()}
                                redo={() => canvasRef.current?.redo()}
                                tool={tool}
                                setTool={setTool}
                                zoom={zoom}
                                onZoomChange={setZoom}
                                onResetZoom={handleResetZoom}
                            />
                        </div>
                    )}
                    <div ref={viewportRef} className="flex-grow p-4 flex items-center justify-center overflow-auto no-scrollbar">
                        {editedImageUrl ? (
                            <div className="w-full h-full flex flex-col items-center justify-center">
                                <div className="w-full max-w-2xl flex items-center justify-end gap-2 mb-2">
                                    <div className="relative group">
                                        <button 
                                            onClick={handleContinueEditing} 
                                            className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 text-xs font-semibold rounded-md text-gray-800 bg-white hover:bg-slate-50"
                                        >
                                            <Icon icon="magicWand" className="w-4 h-4" />
                                            Edit Again
                                        </button>
                                        <div className="whitespace-pre-line text-center absolute bottom-full right-0 mb-2 w-max max-w-xs px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                                            {"Use the edited image\nas a base for new edits."}
                                            <div className="absolute top-full right-2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
                                        </div>
                                    </div>
                                    <div className="relative group">
                                        <button 
                                            onClick={handleStartOver} 
                                            className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 text-xs font-semibold rounded-md text-gray-800 bg-white hover:bg-slate-50"
                                        >
                                            <Icon icon="rotateCcw" className="w-4 h-4" />
                                            Start Over
                                        </button>
                                        <div className="whitespace-pre-line text-center absolute bottom-full right-0 mb-2 w-max max-w-xs px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                                            {"Discard all edits from\nthis session."}
                                            <div className="absolute top-full right-2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="relative group w-full flex-grow flex items-center justify-center">
                                    <ComparisonSlider originalImage={imageUrl} generatedImage={editedImageUrl} />
                                    <div className="absolute top-4 right-4 group- C(]">
                                        <button
                                            onClick={() => setPreviewImageUrl(editedImageUrl)}
                                            className="relative p-2 bg-black/50 rounded-full text-white cursor-pointer hover:bg-black/70"
                                            aria-label="Preview image"
                                        >
                                            <Icon icon="expand" className="w-6 h-6" />
                                        </button>
                                         <div className="whitespace-pre-line text-center absolute bottom-full right-0 mb-2 w-max max-w-xs px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                                            Preview Image
                                            <div className="absolute top-full right-2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            imageSize.width > 0 && (
                                <div
                                    className="relative flex-shrink-0"
                                    style={{
                                        width: imageSize.width * zoom,
                                        height: imageSize.height * zoom,
                                    }}
                                >
                                    <DrawingCanvas
                                        ref={canvasRef}
                                        imageUrl={imageUrl}
                                        brushSize={brushSize}
                                        tool={tool}
                                        onDrawStateChange={setHasMask}
                                    />
                                    {editState === 'generating' && (
                                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg">
                                            <Spinner className="w-8 h-8 text-gray-800" />
                                            <p className="mt-4 text-gray-700 font-semibold">Applying magic edit...</p>
                                        </div>
                                    )}
                                </div>
                            )
                        )}
                    </div>
                </div>

                <div className="lg:col-span-1 bg-white border rounded-lg p-6 overflow-y-auto no-scrollbar flex flex-col">
                    <fieldset disabled={!!editedImageUrl}>
                        <PromptEnhancer
                            label="1. Describe your edit"
                            value={prompt}
                            onChange={setPrompt}
                            placeholder="e.g., Change the color to royal blue"
                            rows={4}
                            credits={credits}
                            setCredits={setCredits}
                            onGetIdeas={() => handleGenerateIdeas(false)}
                            getIdeasDisabled={editState === 'generating' || !hasMask || credits < IDEAS_COST}
                            ideasCost={IDEAS_COST}
                            onImprove={handleImprovePromptForEnhancer}
                            improveDisabled={!hasMask}
                            disabledTooltip={!hasMask ? "Draw on the image to enable." : undefined}
                            enableSpeechToText={true}
                        />
                        <p className="mt-4 text-sm font-medium text-gray-700">2. Generate</p>
                        <button
                            onClick={handleGenerate}
                            disabled={editState === 'generating' || !prompt.trim() || !hasMask || credits < EDIT_COST}
                            className="mt-1 w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-sm font-semibold rounded-md text-white bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {editState === 'generating' ? (
                                <><Spinner className="h-4 w-4 text-white mr-2" /> Generating...</>
                            ) : (
                                <>
                                    <Icon icon="sparkles" className="w-4 h-4 mr-2" /> 
                                    <span>Generate Edit</span>
                                </>
                            )}
                        </button>
                    </fieldset>
                    {editState === 'error' && error && <p className="text-red-500 text-xs mt-2 text-center bg-red-50 p-2 rounded-md">{error}</p>}
                    
                    <div className="mt-6 pt-6 border-t border-dashed">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Smart Actions</h3>
                        <p className="text-xs text-gray-500 my-2">
                            {editedImageUrl ? 'Your new image is ready. What\'s next?' : 'Generate an edit to enable actions.'}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <SmartActionButton icon="grid" label="Create Variation" description={"Generate new scenes\nfor this image."} onClick={() => handleNavigateWithImage('variation')} disabled={!editedImageUrl} />
                            <SmartActionButton icon="layers" label="Image Composer" description={"Combine this image\nwith others."} onClick={() => handleNavigateWithImage('composer')} disabled={!editedImageUrl}/>
                            <SmartActionButton icon="crop" label="Platform Studio" description={"Resize for\nany platform."} onClick={() => handleNavigateWithImage('platform')} disabled={!editedImageUrl} />
                            <SmartActionButton icon="save" label="Save to Library" description={"Save this image to\nyour Asset Library."} onClick={handleSaveToLibrary} disabled={!editedImageUrl} />
                        </div>
                    </div>
                </div>
            </div>
            <SceneIdeasModal isOpen={isIdeasModalOpen} isLoading={isGeneratingIdeas} ideas={sceneIdeas} error={ideasError} onClose={() => setIsIdeasModalOpen(false)} onSelectIdea={handleSelectIdea} onRetry={() => handleGenerateIdeas(true)} />
            {previewImageUrl && (
                <ImagePreviewModal
                    isOpen={!!previewImageUrl}
                    imageUrl={previewImageUrl}
                    onClose={() => setPreviewImageUrl(null)}
                />
            )}
        </div>
    </>
  );
};

export default MagicEdit;