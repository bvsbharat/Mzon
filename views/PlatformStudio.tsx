
import React, { useState, useCallback, useRef } from 'react';
// FIX: Updated import to use types.ts to prevent circular dependencies.
import { View, GalleryImage } from '../types';
import { adaptImage } from '../services/geminiService';
import Spinner from '../components/Spinner';
import ComparisonSlider from '../components/ComparisonSlider';
import Icon, { IconName } from '../components/Icon';
import ImagePreviewModal from '../components/ImagePreviewModal';
import AssetLibraryModal from '../components/AssetLibraryModal';

const ADAPTATION_COST = 3;

interface PlatformStudioProps {
  masterImageUrl: string | null;
  onNavigate: (view: View) => void;
  setMasterImage: (url: string | null) => void;
  addImageToLibrary: (url: string) => void;
  credits: number;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
  addNotification: (message: string) => void;
  galleryImages: GalleryImage[];
}

const ASPECT_RATIOS: { name: string; value: string; icon: IconName }[] = [
    { name: 'Story / Reel', value: '9:16', icon: 'smartphone' },
    { name: 'Portrait Post', value: '4:5', icon: 'image' },
    { name: 'Square Post', value: '1:1', icon: 'grid' },
    { name: 'Landscape / Banner', value: '16:9', icon: 'photo' },
];

const PlatformStudio: React.FC<PlatformStudioProps> = ({ 
    masterImageUrl, 
    onNavigate,
    setMasterImage,
    addImageToLibrary,
    credits,
    setCredits,
    addNotification,
    galleryImages
}) => {
    const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>(ASPECT_RATIOS[0].value);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [adaptedImageUrl, setAdaptedImageUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);

    React.useEffect(() => {
        setAdaptedImageUrl(null);
        setError(null);
    }, [masterImageUrl]);

    const handleGenerate = useCallback(async () => {
        if (!masterImageUrl) return;
        if (credits < ADAPTATION_COST) {
            setError(`Insufficient credits. You need ${ADAPTATION_COST} to generate an adaptation.`);
            return;
        }
        setIsGenerating(true);
        setError(null);
        try {
            const resultUrl = await adaptImage(masterImageUrl, selectedAspectRatio);
            setCredits(prev => prev - ADAPTATION_COST);
            setAdaptedImageUrl(resultUrl);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'An error occurred while adapting the image.');
        } finally {
            setIsGenerating(false);
        }
    }, [masterImageUrl, selectedAspectRatio, credits, setCredits]);

    const handleSaveToLibrary = () => {
        if (adaptedImageUrl) {
            addImageToLibrary(adaptedImageUrl);
            addNotification('Adapted image saved to library!');
        }
    };
    
    const handleFile = useCallback((file: File | null) => {
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

    const handleSelectFromLibrary = useCallback((image: GalleryImage) => {
      setMasterImage(image.url);
      setIsLibraryModalOpen(false);
    }, [setMasterImage]);

    if (!masterImageUrl) {
        return (
          <>
            <div className="w-full h-full flex items-center justify-center text-center animate-fade-in-up p-4 sm:p-6 lg:p-8">
              <div className="max-w-3xl w-full">
                <div className="pt-6 pb-6 border-b border-gray-200 mb-6">
                  <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Adapt Image for Any Platform</h1>
                  <p className="mt-4 text-base text-gray-600 max-w-xl mx-auto">Provide a master image by uploading it or choosing from your asset library.</p>
                </div>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop} className={`relative bg-white p-6 rounded-lg border flex flex-col items-center justify-center text-center transition-colors ${ isDragging ? 'bg-slate-100' : '' }`}>
                    {isDragging && (<div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center pointer-events-none rounded-lg border-2 border-dashed border-gray-400"><p className="text-lg font-semibold text-gray-700">Drop image to upload</p></div>)}
                    <div className="w-12 h-12 mx-auto rounded-lg bg-slate-100 flex items-center justify-center"><Icon icon="uploadCloud" className="w-6 h-6 text-gray-500" /></div>
                    <h2 className="mt-4 font-semibold text-gray-800">Upload Image</h2>
                    <p className="mt-1 text-sm text-gray-600 flex-grow">Use any image from your device as the source for adaptation.</p>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/png, image/jpeg, image/webp" />
                    <button onClick={() => fileInputRef.current?.click()} className="mt-6 w-full inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-900">Upload Image</button>
                  </div>
                  <div className="bg-white p-6 rounded-lg border flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 mx-auto rounded-lg bg-slate-100 flex items-center justify-center"><Icon icon="colorPalette" className="w-6 h-6 text-gray-500" /></div>
                    <h2 className="mt-4 font-semibold text-gray-800">Select from Library</h2>
                    <p className="mt-1 text-sm text-gray-600 flex-grow">Choose a previously generated or saved image from your asset library.</p>
                    <button onClick={() => setIsLibraryModalOpen(true)} disabled={galleryImages.length === 0} className="mt-6 w-full inline-flex items-center justify-center px-5 py-2.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Open Library</button>
                  </div>
                </div>
              </div>
            </div>
            <AssetLibraryModal
              isOpen={isLibraryModalOpen}
              onClose={() => setIsLibraryModalOpen(false)}
              galleryImages={galleryImages}
              onImageSelect={handleSelectFromLibrary}
            />
          </>
        );
    }

    return (
        <>
            <div className="w-full h-full flex flex-col animate-fade-in-up p-4 sm:p-6 lg:p-8">
                <div className="flex-shrink-0 pb-6 pt-6 border-b border-gray-200 mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Platform Studio</h1>
                    <p className="mt-2 text-base text-gray-600">Adapt your creative for any platform with a single click.</p>
                </div>
                <div className="flex-grow min-h-0">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                        {/* Left Column: Controls */}
                        <div className="lg:col-span-1 flex flex-col gap-6">
                            <div className="bg-white p-6 rounded-lg border">
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-sm font-medium text-gray-700">1. Source Image</label>
                                            <button onClick={() => setMasterImage(null)} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-gray-600 bg-white border rounded-md hover:bg-gray-50">
                                                <Icon icon="arrowPath" className="w-3 h-3" /> <span>Change</span>
                                            </button>
                                        </div>
                                        <div className="aspect-square w-full bg-slate-100 rounded-md">
                                            <img src={masterImageUrl} alt="Master product shot" className="w-full h-full object-contain rounded-md" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">2. Choose an Aspect Ratio</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {ASPECT_RATIOS.map(ratio => (
                                                <button key={ratio.value} onClick={() => setSelectedAspectRatio(ratio.value)} className={`flex items-center gap-2 p-2 text-sm rounded-md border text-left transition-colors ${selectedAspectRatio === ratio.value ? 'bg-gray-800 text-white border-gray-800' : 'bg-white hover:bg-slate-50 text-gray-700 border-gray-200'}`}>
                                                    <Icon icon={ratio.icon} className="w-4 h-4 flex-shrink-0" />
                                                    <span>{ratio.name} <span className="opacity-60">({ratio.value})</span></span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <button onClick={handleGenerate} disabled={isGenerating || credits < ADAPTATION_COST} className="w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-sm font-semibold rounded-md text-white bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400">
                                        {isGenerating ? (
                                            <><Spinner className="h-4 w-4 text-white mr-2" /> Adapting...</>
                                        ) : (
                                            <>
                                                <Icon icon="sparkles" className="w-4 h-4 mr-2" />
                                                <span>Adapt Image</span>
                                            </>
                                        )}
                                    </button>
                                    {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
                                </div>
                            </div>
                        </div>
                        
                        {/* Right Column: Result */}
                        <div className="lg:col-span-2 flex flex-col bg-white p-6 rounded-lg border">
                             {isGenerating && (
                                <div className="w-full h-full flex flex-col items-center justify-center">
                                    <Spinner className="w-10 h-10 text-gray-800" />
                                    <p className="mt-4 text-gray-700 font-semibold">Adapting your image...</p>
                                </div>
                            )}
                            {!isGenerating && adaptedImageUrl ? (
                                <div className="w-full">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 text-center">Adapted Image</h3>
                                    <div className="relative group max-w-full mx-auto" style={{ aspectRatio: selectedAspectRatio.replace(':', ' / ')}}>
                                        <img src={adaptedImageUrl} alt="Adapted result" className="w-full h-full object-contain" />
                                        <button
                                            onClick={() => setPreviewImageUrl(adaptedImageUrl)}
                                            className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer hover:bg-black/70"
                                            aria-label="Preview image"
                                        >
                                            <Icon icon="expand" className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
                                         <a
                                            href={adaptedImageUrl}
                                            download={`adapted-image-${selectedAspectRatio.replace(':', 'x')}.png`}
                                            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold rounded-md text-white bg-gray-800 hover:bg-gray-900"
                                        >
                                            <Icon icon="download" className="w-4 h-4 mr-2" />
                                            Download
                                        </a>
                                        <button
                                            onClick={handleSaveToLibrary}
                                            className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                        >
                                            <Icon icon="save" className="w-4 h-4 mr-2" />
                                            Save to Library
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                !isGenerating && (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-center text-gray-500 p-8">
                                        <Icon icon="crop" className="w-12 h-12 text-gray-300" />
                                        <h3 className="mt-4 text-lg font-semibold text-gray-800">Ready to Adapt</h3>
                                        <p className="mt-1 text-sm">Your adapted image will appear here.</p>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {previewImageUrl && (
                <ImagePreviewModal
                    isOpen={!!previewImageUrl}
                    imageUrl={previewImageUrl}
                    onClose={() => setPreviewImageUrl(null)}
                />
            )}
        </>
    );
};

export default PlatformStudio;