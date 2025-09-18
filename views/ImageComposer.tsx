// FIX: Corrected the React import statement. 'aistudio' is not a valid export from 'react'.
import React, { Dispatch, SetStateAction } from 'react';
// FIX: Updated imports to use types.ts to prevent circular dependencies.
import { View, ComposerGenContext } from '../types';
import Icon, { IconName } from '../components/Icon';
import { composeImages, generateComposeIdeasFromSheet, improveComposePromptFromSheet, createImageSheet } from '../services/geminiService';
import Spinner from '../components/Spinner';
import PromptEnhancer from '../components/PromptEnhancer';
import SceneIdeasModal from '../components/SceneIdeasModal';
import AddImageModal from '../components/AddImageModal';
import ImagePreviewModal from '../components/ImagePreviewModal';


const COMPOSE_COST = 4;
const IDEAS_COST = 2;
const MAX_CONTEXT_IMAGES = 4;

interface ImageComposerProps {
  imageUrl: string | null;
  contextImageUrls: string[];
  // FIX: Use explicitly imported `Dispatch` and `SetStateAction` types to prevent namespace errors.
  setContextImageUrls: Dispatch<SetStateAction<string[]>>;
  setComposerGenContext: (context: ComposerGenContext) => void;
  onNavigate: (view: View) => void;
  setMasterImage: (url: string | null) => void;
  addImageToLibrary: (url: string) => void;
  credits: number;
  setCredits: Dispatch<SetStateAction<number>>;
  addNotification: (message: string) => void;
  composedImageUrl: string | null;
  setComposedImageUrl: Dispatch<SetStateAction<string | null>>;
}

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


const ImageComposer: React.FC<ImageComposerProps> = ({ 
    imageUrl, 
    contextImageUrls,
    setContextImageUrls,
    setComposerGenContext,
    onNavigate, 
    setMasterImage, 
    addImageToLibrary, 
    credits, 
    setCredits,
    addNotification,
    composedImageUrl,
    setComposedImageUrl,
}) => {
  // FIX: Replaced 'aistudio' with 'React' to correctly use React hooks.
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = React.useState('');
  const [isComposing, setIsComposing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [isIdeasModalOpen, setIsIdeasModalOpen] = React.useState(false);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = React.useState(false);
  const [sceneIdeas, setSceneIdeas] = React.useState<string[]>([]);
  const [ideasError, setIdeasError] = React.useState<string | null>(null);

  const [modalSlot, setModalSlot] = React.useState<number | null>(null);
  const uploadFileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [previewImageUrl, setPreviewImageUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    // When the product image changes, reset local state.
    // The parent App component handles resetting composedImageUrl and contextImageUrls.
    setPrompt('');
    setError(null);
    setSceneIdeas([]);
    setIdeasError(null);
  }, [imageUrl]);

  const handleGenerateIdeas = async (forceRefetch: boolean = false) => {
    if (!imageUrl || contextImageUrls.length === 0) return;
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
        const allImageUrls = [imageUrl, ...contextImageUrls.filter(url => url)];
        const sheetUrl = await createImageSheet(allImageUrls);
        const ideas = await generateComposeIdeasFromSheet(sheetUrl);
        setSceneIdeas(ideas);
        setCredits(prev => prev - IDEAS_COST);
    } catch (err) {
        setIdeasError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setIsGeneratingIdeas(false);
    }
  };

  const handleImprovePrompt = async (currentPrompt: string): Promise<string> => {
    if (!imageUrl || contextImageUrls.length === 0) {
        return Promise.reject(new Error("Product and at least one context image are required."));
    }
    const allImageUrls = [imageUrl, ...contextImageUrls.filter(url => url)];
    const sheetUrl = await createImageSheet(allImageUrls);
    return improveComposePromptFromSheet(sheetUrl, currentPrompt);
  };

  const handleSelectIdea = (idea: string) => {
      setPrompt(idea);
      setIsIdeasModalOpen(false);
  };

  const handleFile = React.useCallback((file: File | null) => {
    if (!file) return;
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            setMasterImage(dataUrl);
        };
        reader.readAsDataURL(file);
    } else {
      alert('Please upload a valid image file (JPEG, PNG, WEBP).');
    }
  }, [setMasterImage]);

  const handleProductImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0] || null);
    event.target.value = '';
  };

  const onDragEnter = React.useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const onDragLeave = React.useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
  const onDragOver = React.useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); }, []);
  const onDrop = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0] || null);
  }, [handleFile]);


  const handleCompose = async () => {
    if (!imageUrl || contextImageUrls.length === 0 || !prompt.trim()) return;
    if (credits < COMPOSE_COST) {
        setError(`Insufficient credits. You need ${COMPOSE_COST} to compose an image.`);
        return;
    }

    setIsComposing(true);
    setError(null);
    setComposedImageUrl(null);

    try {
        const resultUrl = await composeImages(imageUrl, contextImageUrls, prompt);
        setCredits(prev => prev - COMPOSE_COST);
        setComposedImageUrl(resultUrl);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setIsComposing(false);
    }
  };

  const handleNavigateWithImage = (view: View) => {
    if (composedImageUrl) {
        setMasterImage(composedImageUrl);
        onNavigate(view);
    }
  };

  const handleStartOver = () => {
    // Keep product image and context images, but clear the result and prompt.
    setComposedImageUrl(null);
    setError(null);
    setIsComposing(false);
  };

  const handleSaveToLibrary = () => {
    if (composedImageUrl) {
      addImageToLibrary(composedImageUrl);
      addNotification('Image saved to library!');
    }
  };
  
  const handleContextImageUpload = React.useCallback((files: FileList) => {
    if (modalSlot === null) return;

    const validFiles = Array.from(files).filter(file =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    );

    if (validFiles.length === 0) {
      if (files.length > 0) alert('Please upload valid image files (JPEG, PNG, WEBP).');
      setModalSlot(null);
      return;
    }

    const currentImageCount = contextImageUrls.length;
    const availableSlots = MAX_CONTEXT_IMAGES - currentImageCount;

    if (availableSlots <= 0) {
      alert(`You have reached the maximum of ${MAX_CONTEXT_IMAGES} context images.`);
      setModalSlot(null);
      return;
    }

    const filesToAdd = validFiles.slice(0, availableSlots);

    if (filesToAdd.length < validFiles.length) {
      alert(`You can only add a total of ${MAX_CONTEXT_IMAGES} context images. ${filesToAdd.length} of your selected images will be added.`);
    }

    const dataUrlPromises = filesToAdd.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target?.result as string);
        reader.onerror = err => reject(err);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(dataUrlPromises)
      .then(dataUrls => {
        setContextImageUrls(prevUrls => [...prevUrls, ...dataUrls]);
      })
      .catch(error => {
        console.error("Error reading files:", error);
        alert("An error occurred while uploading images.");
      })
      .finally(() => {
        setModalSlot(null);
      });
  }, [modalSlot, contextImageUrls.length, setContextImageUrls]);
  
  const removeContextImage = (index: number) => {
    setContextImageUrls(prev => {
        const newUrls = [...prev];
        newUrls.splice(index, 1);
        return newUrls;
    });
  };

  const handleGenerateClick = () => {
    if (modalSlot !== null) {
      setComposerGenContext({ targetSlot: modalSlot });
      onNavigate('imageGenerator');
    }
  };

  if (!imageUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center text-center animate-fade-in-up p-4 sm:p-6 lg:p-8">
          <div className="max-w-3xl w-full">
            <div className="pt-6 pb-6 border-b border-gray-200 mb-6">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  Start Composing Images
              </h1>
              <p className="mt-4 text-base text-gray-600 max-w-xl mx-auto">
                  To begin, provide a base product image. You can generate one with our AI or upload your own.
              </p>
            </div>
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-lg border flex flex-col items-center text-center">
                       <div className="w-12 h-12 mx-auto rounded-lg bg-slate-100 flex items-center justify-center">
                          <Icon icon="sparkles" className="w-6 h-6 text-gray-500" />
                      </div>
                      <h2 className="mt-4 font-semibold text-gray-800">
                          Create a Master Shot
                      </h2>
                      <p className="mt-1 text-sm text-gray-600 flex-grow">
                          Let our AI generate a professional, studio-quality master shot from your photos.
                      </p>
                      <button
                          onClick={() => onNavigate('photo')}
                          className="mt-6 w-full inline-flex items-center justify-center px-5 py-2.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                          Go to Photo Studio
                      </button>
                  </div>
                  <div
                    onDragEnter={onDragEnter}
                    onDragLeave={onDragLeave}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
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
                      <h2 className="mt-4 font-semibold text-gray-800">
                          Upload Your Own
                      </h2>
                      <p className="mt-1 text-sm text-gray-600 flex-grow">
                          For best results, use a high-quality image with a clean background and clear details.
                      </p>
                       <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleProductImageUpload}
                          className="hidden"
                          accept="image/png, image/jpeg, image/webp"
                      />
                      <button
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-6 w-full inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-900"
                      >
                          Upload Image
                      </button>
                  </div>
              </div>
          </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col animate-fade-in-up p-4 sm:p-6 lg:p-8">
      <div className="flex-shrink-0 pb-6 pt-6 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Image Composer</h1>
        <p className="mt-2 text-base text-gray-600">
          Combine your product with other images to create a 'Shop the Look' scene.
        </p>
      </div>

      <div className="flex-grow min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className='bg-white border rounded-lg p-3'>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">1. Your Product</p>
                             <div className="relative group">
                                <button onClick={() => setMasterImage(null)} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-gray-600 bg-white border rounded-md hover:bg-gray-50">
                                    <Icon icon="arrowPath" className="w-3 h-3" /> <span>Change</span>
                                </button>
                                <div className="whitespace-pre-line text-center absolute bottom-full right-0 mb-2 w-max max-w-xs px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                                    {"Upload or select a\ndifferent product image."}
                                    <div className="absolute top-full right-2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
                                </div>
                            </div>
                        </div>
                        <div className="aspect-square w-full bg-slate-100 rounded-md flex items-center justify-center">
                            <img src={imageUrl} alt="Product to compose" className="max-w-full max-h-full object-contain" />
                        </div>
                    </div>

                    <div className='bg-white border rounded-lg p-3'>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">2. Add Context Images ({contextImageUrls.length}/{MAX_CONTEXT_IMAGES})</p>
                        <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: MAX_CONTEXT_IMAGES }).map((_, index) => {
                            const imageUrl = contextImageUrls[index];
                            if (imageUrl) {
                            return (
                                <div key={index} className="relative aspect-square w-full group">
                                <img src={imageUrl} alt={`Context ${index + 1}`} className="w-full h-full object-cover rounded-lg border border-gray-300" />
                                <button onClick={() => removeContextImage(index)} className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 hover:scale-110 transition-transform shadow-md" aria-label="Remove image">
                                    <Icon icon="xCircle" className="w-full h-full" />
                                </button>
                                </div>
                            );
                            }
                            if (index <= contextImageUrls.length) {
                            return (
                                <button
                                    key={`add-slot-${index}`}
                                    onClick={() => setModalSlot(index)}
                                    className="aspect-square w-full bg-slate-50 rounded-md flex items-center justify-center border-2 border-dashed cursor-pointer transition-colors border-gray-200 hover:border-gray-300"
                                    aria-label="Add context image"
                                >
                                    <div className="text-center p-2">
                                    <Icon icon="plus" className="mx-auto h-6 w-6 text-gray-400" />
                                    <p className="mt-1 text-xs text-gray-500">Add Image</p>
                                    </div>
                                </button>
                            );
                            }
                            return <div key={`placeholder-${index}`} className="aspect-square w-full bg-slate-100 rounded-lg border border-gray-200" />;
                        })}
                        </div>
                    </div>
                </div>
                
                {isComposing && (
                    <div className="bg-white border rounded-lg p-6 flex flex-col items-center justify-center min-h-[300px]">
                        <Spinner className="w-8 h-8 text-gray-800" />
                        <p className="mt-4 font-semibold text-gray-700">Composing your scene...</p>
                    </div>
                )}
                
                {composedImageUrl && !isComposing && (
                    <div className="bg-white border rounded-lg p-6">
                         <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 text-center">Composition Result</h3>
                         <div className="relative group aspect-square w-full bg-slate-100 rounded-md">
                            <img src={composedImageUrl} alt="Composed result" className="w-full h-full object-contain rounded-md" />
                            <button
                                onClick={() => setPreviewImageUrl(composedImageUrl)}
                                className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer hover:bg-black/70"
                                aria-label="Preview image"
                            >
                                <Icon icon="expand" className="w-6 h-6" />
                            </button>
                         </div>
                    </div>
                )}
            </div>

            <div className="lg:col-span-1 bg-white border rounded-lg p-6 flex flex-col">
                <div className="flex-grow">
                    <PromptEnhancer
                    label="3. Composition Instructions"
                    value={prompt}
                    onChange={setPrompt}
                    onGetIdeas={() => handleGenerateIdeas(false)}
                    getIdeasDisabled={isComposing || !imageUrl || contextImageUrls.length === 0 || credits < IDEAS_COST}
                    placeholder="e.g., Arrange the items artfully on a light wood surface."
                    rows={5}
                    credits={credits}
                    setCredits={setCredits}
                    ideasCost={IDEAS_COST}
                    onImprove={handleImprovePrompt}
                    improveDisabled={!imageUrl || contextImageUrls.length === 0}
                    enableSpeechToText={true}
                    />
                    <button
                    onClick={handleCompose}
                    disabled={contextImageUrls.length === 0 || !prompt.trim() || isComposing || credits < COMPOSE_COST}
                    className="mt-4 w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-sm font-semibold rounded-md text-white bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                    {isComposing ? (
                        <><Spinner className="w-4 h-4 mr-2" /> Composing...</>
                    ) : (
                        <><Icon icon="sparkles" className="w-4 h-4 mr-2" /><span>Compose Image</span></>
                    )}
                    </button>
                    {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
                </div>

                <div className="mt-6 pt-6 border-t border-dashed">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Smart Actions</h3>
                    <p className="text-xs text-gray-500 my-2">
                        {composedImageUrl ? 'Your new image is ready. What\'s next?' : 'Generate a composition to enable actions.'}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <SmartActionButton icon="rotateCcw" label="Compose Another" description={"Clear the result and\ncompose a new scene."} onClick={handleStartOver} disabled={!composedImageUrl} />
                        <SmartActionButton icon="magicWand" label="Magic Edit" description={"Edit parts of\nthe image."} onClick={() => handleNavigateWithImage('edit')} disabled={!composedImageUrl} />
                        <SmartActionButton icon="crop" label="Platform Studio" description={"Resize for\nany platform."} onClick={() => handleNavigateWithImage('platform')} disabled={!composedImageUrl} />
                        <SmartActionButton icon="save" label="Save to Library" description={"Save to your\nAsset Library."} onClick={handleSaveToLibrary} disabled={!composedImageUrl} />
                    </div>
                </div>
            </div>
        </div>
      </div>
      <SceneIdeasModal
          isOpen={isIdeasModalOpen}
          isLoading={isGeneratingIdeas}
          ideas={sceneIdeas}
          error={ideasError}
          onClose={() => setIsIdeasModalOpen(false)}
          onSelectIdea={handleSelectIdea}
          onRetry={() => handleGenerateIdeas(true)}
      />
      <AddImageModal 
        isOpen={modalSlot !== null}
        onClose={() => setModalSlot(null)}
        onUploadClick={() => uploadFileInputRef.current?.click()}
        onGenerateClick={handleGenerateClick}
      />
      <input
        type="file"
        ref={uploadFileInputRef}
        className="hidden"
        accept="image/png, image/jpeg, image/webp"
        multiple
        onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleContextImageUpload(e.target.files);
            }
            e.target.value = '';
        }}
      />
       {previewImageUrl && (
          <ImagePreviewModal
              isOpen={!!previewImageUrl}
              imageUrl={previewImageUrl}
              onClose={() => setPreviewImageUrl(null)}
          />
      )}
    </div>
  );
};

export default ImageComposer;