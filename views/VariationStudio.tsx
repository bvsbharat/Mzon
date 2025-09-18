// FIX: Corrected the React import statement. 'aistudio' is not a valid export from 'react'.
import React from 'react';
// FIX: Updated import to use types.ts to prevent circular dependencies.
import { View } from '../types';
import { generateVariation, BackgroundConfig } from '../services/geminiService';
import BackgroundOptions from '../components/BackgroundOptions';
import Spinner from '../components/Spinner';
import ComparisonSlider from '../components/ComparisonSlider';
import Icon, { IconName } from '../components/Icon';
import ImagePreviewModal from '../components/ImagePreviewModal';

const GENERATION_COST = 4;

interface VariationStudioProps {
  masterImageUrl: string | null;
  onNavigate: (view: View) => void;
  setMasterImage: (url: string | null) => void;
  addImageToLibrary: (url: string) => void;
  credits: number;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
  addNotification: (message: string) => void;
  latestVariationUrl: string | null;
  setLatestVariationUrl: React.Dispatch<React.SetStateAction<string | null>>;
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


const VariationStudio: React.FC<VariationStudioProps> = ({ 
    masterImageUrl, 
    onNavigate,
    setMasterImage,
    addImageToLibrary,
    credits,
    setCredits,
    addNotification,
    latestVariationUrl,
    setLatestVariationUrl
}) => {
    // FIX: Replaced 'aistudio' with 'React' to correctly use React hooks.
    const [backgroundConfig, setBackgroundConfig] = React.useState<BackgroundConfig>({ type: 'preset', value: 'White Studio' });
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const [previewImageUrl, setPreviewImageUrl] = React.useState<string | null>(null);

    React.useEffect(() => {
        // Clear local error when master image changes, as the result is cleared by the parent.
        setError(null);
    }, [masterImageUrl]);

    const handleGenerateVariation = React.useCallback(async () => {
        if (!masterImageUrl) return;
        if (credits < GENERATION_COST) {
            setError(`Insufficient credits. You need ${GENERATION_COST} to generate a variation.`);
            return;
        }
        setIsGenerating(true);
        setError(null);
        try {
            const resultUrl = await generateVariation(masterImageUrl, backgroundConfig);
            setCredits(prev => prev - GENERATION_COST);
            setLatestVariationUrl(resultUrl);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'An error occurred while creating the variation.');
        } finally {
            setIsGenerating(false);
        }
      }, [masterImageUrl, backgroundConfig, credits, setCredits, setLatestVariationUrl]);

    const handleNavigateWithImage = (view: View) => {
        if (latestVariationUrl) {
            setMasterImage(latestVariationUrl);
            onNavigate(view);
        }
    };

    const handleSaveToLibrary = () => {
        if (latestVariationUrl) {
            addImageToLibrary(latestVariationUrl);
            addNotification('Image saved to library!');
        }
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

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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

    if (!masterImageUrl) {
        return (
            <div className="w-full h-full flex items-center justify-center text-center animate-fade-in-up p-4 sm:p-6 lg:p-8">
                <div className="max-w-3xl w-full">
                    <div className="pt-6 pb-6 border-b border-gray-200 mb-6">
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                            Start Creating Variations
                        </h1>
                        <p className="mt-4 text-base text-gray-600 max-w-xl mx-auto">
                            Choose how you want to provide a master image for generating new scenes.
                        </p>
                    </div>
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Option 1: Go to Photo Studio */}
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
                        {/* Option 2: Upload your own */}
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
                                onChange={handleFileUpload}
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
        <>
            <div className="w-full h-full flex flex-col animate-fade-in-up p-4 sm:p-6 lg:p-8">
                <div className="flex-shrink-0 pb-6 pt-6 border-b border-gray-200 mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Create Variation</h1>
                    <p className="mt-2 text-base text-gray-600">Generate new scenes and backgrounds for your master shot.</p>
                </div>
                <div className="flex-grow min-h-0">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                        {/* Left Column: Controls */}
                        <div className="lg:col-span-1 flex flex-col gap-6">
                            <div className="bg-white p-6 rounded-lg border">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Create a Variation</h3>
                                <div className="mt-4">
                                    <BackgroundOptions 
                                        key={masterImageUrl}
                                        onChange={setBackgroundConfig} 
                                        imageUrl={masterImageUrl} 
                                        credits={credits} 
                                        setCredits={setCredits} 
                                        enableSpeechToText={true} 
                                    />
                                </div>
                                <div className="mt-4">
                                    <button
                                        onClick={handleGenerateVariation}
                                        disabled={isGenerating || credits < GENERATION_COST}
                                        className="w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-sm font-semibold rounded-md text-white bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400"
                                    >
                                        {isGenerating ? (
                                            <><Spinner className="h-4 w-4 text-white mr-2" /> Generating...</>
                                        ) : (
                                            <>
                                                <Icon icon="sparkles" className="w-4 h-4 mr-2" />
                                                <span>Generate Variation</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                                {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
                            </div>

                            <div className="bg-white p-6 rounded-lg border">
                                <div className="text-left">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Smart Actions</h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {latestVariationUrl ? 'What would you like to do next?' : 'Generate a variation to enable actions.'}
                                    </p>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    <SmartActionButton
                                        icon="layers"
                                        label="Image Composer"
                                        description={"Combine with\nother images."}
                                        onClick={() => handleNavigateWithImage('composer')}
                                        disabled={!latestVariationUrl}
                                    />
                                    <SmartActionButton
                                        icon="magicWand"
                                        label="Magic Edit"
                                        description={"Edit parts of\nthe image."}
                                        onClick={() => handleNavigateWithImage('edit')}
                                        disabled={!latestVariationUrl}
                                    />
                                    <SmartActionButton
                                        icon="crop"
                                        label="Platform Studio"
                                        description={"Resize for\nany platform."}
                                        onClick={() => handleNavigateWithImage('platform')}
                                        disabled={!latestVariationUrl}
                                    />
                                    <SmartActionButton
                                        icon="save"
                                        label="Save to Library"
                                        description={"Save to your\nAsset Library."}
                                        onClick={handleSaveToLibrary}
                                        disabled={!latestVariationUrl}
                                    />
                                </div>
                            </div>
                        </div>
                        
                        {/* Right Column: Result */}
                        <div className="lg:col-span-2 flex flex-col bg-white p-6 rounded-lg border">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    {latestVariationUrl ? 'Compare Before & After' : 'Master Image'}
                                </h3>
                                <div className="relative group">
                                    <button
                                        onClick={() => setMasterImage(null)}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border rounded-md hover:bg-gray-50 transition-colors"
                                    >
                                        <Icon icon="arrowPath" className="w-3 h-3" />
                                        <span>Change</span>
                                    </button>
                                    <div className="whitespace-pre-line text-center absolute bottom-full right-0 mb-2 w-max max-w-xs px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                                        {"Upload or select a\ndifferent master image."}
                                        <div className="absolute top-full right-2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
                                    </div>
                                </div>
                            </div>
                            {latestVariationUrl ? (
                                <div className="w-full">
                                    <div className="relative group">
                                        <ComparisonSlider 
                                            originalImage={masterImageUrl!} 
                                            generatedImage={latestVariationUrl} 
                                        />
                                        <div className="absolute top-4 right-4 group- C(]">
                                            <button
                                                onClick={() => setPreviewImageUrl(latestVariationUrl)}
                                                className="relative p-2 bg-black/50 rounded-full text-white z-10 cursor-pointer hover:bg-black/70"
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
                                <div className="aspect-square w-full bg-slate-100 rounded-md flex items-center justify-center">
                                    <img src={masterImageUrl} alt="Master product shot" className="w-full h-full object-contain rounded-md" />
                                </div>
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

export default VariationStudio;