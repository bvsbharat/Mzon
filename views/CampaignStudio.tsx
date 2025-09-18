
import React, { useState, useCallback, useRef, useEffect } from 'react';
// FIX: Updated import to use types.ts to prevent circular dependencies.
import { View, GalleryImage } from '../types';
import Icon from '../components/Icon';
import Spinner from '../components/Spinner';
import { generateCampaignPrompts, generateVariation, BackgroundConfig } from '../services/geminiService';
import ImagePreviewModal from '../components/ImagePreviewModal';
import AssetLibraryModal from '../components/AssetLibraryModal';

const STRATEGY_COST = 2;
const CREATIVE_COST = 4;

// Speech Recognition types for voice input
interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
  onresult: ((event: any) => void) | null;
  start: () => void;
  stop: () => void;
}
interface SpeechRecognitionStatic {
    new(): SpeechRecognition;
}
declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic;
    webkitSpeechRecognition: SpeechRecognitionStatic;
  }
}

export type Creative = {
  id: string;
  prompt: string;
  imageUrl: string | null;
  status: 'pending' | 'generating' | 'complete' | 'error';
  saved: boolean;
};

interface CampaignStudioProps {
  masterImageUrl: string | null;
  setMasterImage: (url: string | null) => void;
  onNavigate: (view: View) => void;
  addImageToLibrary: (url: string, name: string) => void;
  credits: number;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
  addNotification: (message: string) => void;
  galleryImages: GalleryImage[];
  creatives: Creative[];
  setCreatives: React.Dispatch<React.SetStateAction<Creative[]>>;
}

type GenerationState = 'idle' | 'strategizing' | 'generating' | 'complete' | 'error';

const CampaignStudio: React.FC<CampaignStudioProps> = ({
  masterImageUrl,
  setMasterImage,
  onNavigate,
  addImageToLibrary,
  credits,
  setCredits,
  addNotification,
  galleryImages,
  creatives,
  setCreatives,
}) => {
  const [brandDescription, setBrandDescription] = useState('');
  const [campaignGoals, setCampaignGoals] = useState('');
  const [numberOfCreatives, setNumberOfCreatives] = useState(4);
  const [generationState, setGenerationState] = useState<GenerationState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [speechApiAvailable, setSpeechApiAvailable] = useState(false);
  const [recordingField, setRecordingField] = useState<'brand' | 'goals' | null>(null);

  useEffect(() => {
    // This effect is crucial for restoring the state of the studio when navigating away and back.
    // It derives the UI state from the `creatives` prop, which is the source of truth.
    if (creatives.length > 0) {
        const hasPendingOrGenerating = creatives.some(c => c.status === 'generating' || c.status === 'pending');
        if (hasPendingOrGenerating) {
            setGenerationState('generating');
        } else {
            // All are 'complete' or 'error'
            setGenerationState('complete');
        }
    } else {
        // When creatives are cleared, we check the current state. If we are in the middle of
        // starting a generation ('strategizing'), we don't want this effect to override it.
        // The handler will move the state to 'generating' once prompts are ready.
        if (generationState !== 'strategizing') {
            setGenerationState('idle');
        }
    }
  }, [creatives, masterImageUrl, generationState]);

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
        const recognitionInstance = new SpeechRecognitionAPI();
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = false;
        recognitionInstance.lang = 'en-US';
        recognitionRef.current = recognitionInstance;
        setSpeechApiAvailable(true);
    }
  }, []);

  const handleToggleRecording = (field: 'brand' | 'goals') => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (recordingField === field) {
        recognition.stop();
    } else {
        if (recordingField) {
            recognition.stop();
        }

        recognition.onstart = () => {
            setRecordingField(field);
        };
        recognition.onend = () => {
            setRecordingField(null);
        };
        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            alert(`Speech recognition error: ${event.error}. Please check microphone permissions.`);
            setRecordingField(null);
        };
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            if (field === 'brand') {
                setBrandDescription(prev => (prev ? prev.trim() + ' ' : '') + transcript.trim());
            } else if (field === 'goals') {
                setCampaignGoals(prev => (prev ? prev.trim() + ' ' : '') + transcript.trim());
            }
        };
        
        recognition.start();
    }
  };

  const totalCost = STRATEGY_COST + (numberOfCreatives * CREATIVE_COST);
  const canAfford = credits >= totalCost;

  const handleFile = useCallback((file: File | null) => {
    if (!file) return;
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setMasterImage(dataUrl);
        // State reset is now handled by the parent component's useEffect
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

  const handleGenerateCampaign = () => {
    if (!masterImageUrl || !brandDescription.trim() || !campaignGoals.trim() || !canAfford) return;

    // Set initial state to show immediate feedback.
    // The useEffect is designed to not override this state.
    setGenerationState('strategizing');
    setCreatives([]);
    setError(null);
    setCredits(prev => prev - totalCost);

    // Use setTimeout to ensure the UI updates before the async operation starts
    setTimeout(async () => {
      try {
        // Step 1: Generate the creative strategy (prompts)
        const prompts = await generateCampaignPrompts(masterImageUrl!, brandDescription, campaignGoals, numberOfCreatives);
        
        // Step 2: Set up the creative jobs. The useEffect will handle switching to 'generating' state.
        const initialCreatives = prompts.map(p => ({ id: crypto.randomUUID(), prompt: p, imageUrl: null, status: 'pending' as const, saved: false }));
        setCreatives(initialCreatives);
  
        // Step 3: Execute each creative generation job sequentially.
        for (let i = 0; i < initialCreatives.length; i++) {
          const creativeJob = initialCreatives[i];
          // Mark the current creative as 'generating'
          setCreatives(prev => prev.map(c => c.id === creativeJob.id ? { ...c, status: 'generating' } : c));
          
          try {
            const variationConfig: BackgroundConfig = { type: 'ai', value: creativeJob.prompt };
            const resultUrl = await generateVariation(masterImageUrl!, variationConfig);
            // Mark the current creative as 'complete' with the result
            setCreatives(prev => prev.map(c => c.id === creativeJob.id ? { ...c, status: 'complete', imageUrl: resultUrl } : c));
          } catch (err) {
            console.error(`Error generating creative ${i + 1}:`, err);
            // Mark the current creative as 'error'
            setCreatives(prev => prev.map(c => c.id === creativeJob.id ? { ...c, status: 'error' } : c));
          }
        }
        // The useEffect will set the final 'complete' state once all creatives are done.
        addNotification('Campaign generation complete!');
  
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred during strategy generation.');
        setGenerationState('error');
        setCredits(prev => prev + totalCost); // Refund credits on strategy failure
      }
    }, 50); // A small delay to allow the browser to repaint
  };
  
  const handleSaveSingleImage = (creativeId: string) => {
    const creative = creatives.find(c => c.id === creativeId);
    if (creative && creative.imageUrl && !creative.saved) {
        addImageToLibrary(creative.imageUrl, `Campaign: ${creative.prompt.substring(0, 30)}...`);
        setCreatives(prev => prev.map(c => c.id === creativeId ? { ...c, saved: true } : c));
        addNotification(`Creative saved to library.`);
    }
  };

  const handleSaveAllImages = () => {
      const creativesToSave = creatives.filter(c => c.status === 'complete' && !c.saved);
      if (creativesToSave.length === 0) return;

      creativesToSave.forEach(creative => {
          if (creative.imageUrl) {
              addImageToLibrary(creative.imageUrl, `Campaign: ${creative.prompt.substring(0, 30)}...`);
          }
      });
      
      const savedIds = new Set(creativesToSave.map(c => c.id));
      setCreatives(prev => prev.map(c => savedIds.has(c.id) ? { ...c, saved: true } : c));
      addNotification(`${creativesToSave.length} new creative(s) saved to library!`);
  };

  const getGridClass = (count: number): string => {
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-1 sm:grid-cols-2";
    if (count === 3) return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";
    if (count === 4) return "grid-cols-2";
    if (count <= 6) return "grid-cols-2 md:grid-cols-3";
    if (count >= 7) return "grid-cols-2 md:grid-cols-4";
    return "grid-cols-2 md:grid-cols-4"; // Default
  };

  if (!masterImageUrl) {
    return (
      <>
        <div className="w-full h-full flex items-center justify-center text-center animate-fade-in-up p-4 sm:p-6 lg:p-8">
          <div className="max-w-3xl w-full">
            <div className="pt-6 pb-6 border-b border-gray-200 mb-6">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Build Your Next Campaign
              </h1>
              <p className="mt-4 text-base text-gray-600 max-w-xl mx-auto">
                Provide a product image by uploading it directly or choosing from your asset library.
              </p>
            </div>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop} className={`relative bg-white p-6 rounded-lg border flex flex-col items-center justify-center text-center transition-colors ${ isDragging ? 'bg-slate-100' : '' }`}>
                {isDragging && (<div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center pointer-events-none rounded-lg border-2 border-dashed border-gray-400"><p className="text-lg font-semibold text-gray-700">Drop image to upload</p></div>)}
                <div className="w-12 h-12 mx-auto rounded-lg bg-slate-100 flex items-center justify-center"><Icon icon="uploadCloud" className="w-6 h-6 text-gray-500" /></div>
                <h2 className="mt-4 font-semibold text-gray-800">Upload Image</h2>
                <p className="mt-1 text-sm text-gray-600 flex-grow">For best results, use a high-quality master shot with a clean background.</p>
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

  const renderResults = () => {
    if (generationState === 'idle') {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 p-8 bg-white border rounded-lg">
          <Icon icon="compass" className="w-12 h-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-800">Your Campaign Awaits</h3>
          <p className="mt-1 text-sm">Fill out the strategy on the left and let our AI generate your creative assets.</p>
        </div>
      );
    }

    if (generationState === 'strategizing') {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 p-8 bg-white border rounded-lg">
          <Spinner className="w-10 h-10 text-gray-800" />
          <h3 className="mt-4 text-lg font-semibold text-gray-800">Generating Creative Strategy...</h3>
          <p className="mt-1 text-sm">Our AI creative director is brainstorming concepts for your campaign.</p>
        </div>
      );
    }
    
    const unsavedCount = creatives.filter(c => c.status === 'complete' && !c.saved).length;
    const gridClass = getGridClass(numberOfCreatives);
    const itemClass = numberOfCreatives === 1 ? '' : 'aspect-square';
    const imageClass = numberOfCreatives === 1 ? 'object-contain' : 'object-cover';

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold text-gray-800">
                    Campaign Creatives ({creatives.filter(c => c.status === 'complete').length}/{numberOfCreatives})
                </h3>
                {generationState === 'complete' && unsavedCount > 0 && (
                    <button
                        onClick={handleSaveAllImages}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-gray-800 rounded-md hover:bg-gray-900 transition-colors"
                    >
                        <Icon icon="save" className="w-4 h-4" />
                        Save All to Library ({unsavedCount})
                    </button>
                )}
            </div>
            <div className={`grid ${gridClass} gap-4`}>
                {creatives.map((creative, idx) => (
                    <div key={creative.id} className={`${itemClass} bg-white border rounded-lg flex flex-col animate-fade-in-up transition-all overflow-hidden`} style={{ animationDelay: `${idx * 50}ms`}}>
                        {creative.status === 'pending' && (
                            <div className="w-full h-full flex flex-col justify-center items-center text-center bg-slate-50 p-3 text-gray-500">
                                 <Icon icon="image" className="w-8 h-8 text-gray-400" />
                                 <p className="mt-2 text-xs font-medium">Waiting to generate...</p>
                            </div>
                        )}
                        {creative.status === 'generating' && (
                             <div className="w-full h-full relative flex flex-col justify-center items-center text-center bg-slate-100 p-3 overflow-hidden">
                                 <div className="absolute inset-0 bg-slate-50 animate-pulse"></div>
                                 <Spinner className="w-6 h-6 text-gray-600 z-10" />
                             </div>
                        )}
                        {creative.status === 'complete' && creative.imageUrl && (
                            <div className="w-full h-full relative group">
                                <img src={creative.imageUrl} alt={creative.prompt} className={`w-full h-full ${imageClass}`} />
                                 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 gap-2">
                                    <button onClick={() => handleSaveSingleImage(creative.id)} disabled={creative.saved} className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/40 rounded-full text-white disabled:opacity-50 disabled:cursor-help" title={creative.saved ? "Saved" : "Save to Library"}>
                                        <Icon icon={creative.saved ? 'checkCircle' : 'save'} className="w-4 h-4"/>
                                    </button>
                                    <button onClick={() => setPreviewImageUrl(creative.imageUrl)} className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/40 rounded-full text-white" title="Preview Image">
                                        <Icon icon="expand" className="w-4 h-4"/>
                                    </button>
                                    <button onClick={() => { setMasterImage(creative.imageUrl!); onNavigate('platform'); }} className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/40 rounded-full text-white" title="Adapt for Platforms">
                                        <Icon icon="crop" className="w-4 h-4"/>
                                    </button>
                                    <a href={creative.imageUrl} download={`campaign-creative-${creative.id}.png`} className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/40 rounded-full text-white" aria-label="Download" title="Download Image">
                                        <Icon icon="download" className="w-4 h-4"/>
                                    </a>
                                </div>
                            </div>
                        )}
                        {creative.status === 'error' && (
                            <div className="w-full h-full flex flex-col justify-center items-center text-center bg-red-50 text-red-700 p-3">
                                <Icon icon="xCircle" className="w-8 h-8"/>
                                <p className="mt-2 text-sm font-semibold">Generation Failed</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
  };

  return (
    <>
      <div className="w-full h-full flex flex-col animate-fade-in-up p-4 sm:p-6 lg:p-8">
        <div className="flex-shrink-0 pb-6 pt-6 border-b border-gray-200 mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Campaign Builder</h1>
          <p className="mt-2 text-base text-gray-600">
            Define your strategy and generate a batch of on-brand creatives in one go.
          </p>
        </div>
        <div className="flex-grow min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Left Column: Controls */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              <div className="bg-white p-6 rounded-lg border">
                  <div className="space-y-4">
                      <div>
                          <div className="flex justify-between items-center mb-2">
                              <label className="text-sm font-medium text-gray-700">1. Product Image</label>
                              <button onClick={() => setMasterImage(null)} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-gray-600 bg-white border rounded-md hover:bg-gray-50">
                                  <Icon icon="arrowPath" className="w-3 h-3" /> <span>Change</span>
                              </button>
                          </div>
                          <div className="aspect-square w-full bg-slate-100 rounded-md">
                              <img src={masterImageUrl} alt="Master product shot" className="w-full h-full object-contain rounded-md" />
                          </div>
                      </div>
                      <div>
                          <label htmlFor="brand-desc" className="block text-sm font-medium text-gray-700">2. Brand Description</label>
                            <div className="relative mt-1 group">
                                <textarea id="brand-desc" value={brandDescription} onChange={e => setBrandDescription(e.target.value)} placeholder={recordingField === 'brand' ? "Listening..." : "e.g., Minimalist, sustainable, modern"} rows={3} className="block w-full text-sm p-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 resize-none" />
                                {speechApiAvailable && (
                                    <div className="absolute bottom-2 right-2">
                                        <button
                                            type="button"
                                            onClick={() => handleToggleRecording('brand')}
                                            className={`p-1.5 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-500 ${
                                                recordingField === 'brand'
                                                ? 'bg-red-500 text-white animate-pulse'
                                                : 'text-gray-500 hover:bg-gray-100'
                                            }`}
                                            aria-label={recordingField === 'brand' ? 'Stop recording' : 'Record brand description'}
                                        >
                                            <Icon icon="microphone" className="w-4 h-4" />
                                        </button>
                                        <div className="whitespace-pre-line text-center absolute bottom-full right-0 mb-2 w-max max-w-xs px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                                            {"Use your voice to dictate."}
                                            <div className="absolute top-full right-2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                      </div>
                      <div>
                          <label htmlFor="campaign-goals" className="block text-sm font-medium text-gray-700">3. Campaign Goals</label>
                            <div className="relative mt-1 group">
                                <textarea id="campaign-goals" value={campaignGoals} onChange={e => setCampaignGoals(e.target.value)} placeholder={recordingField === 'goals' ? "Listening..." : "e.g., Drive engagement for a summer launch"} rows={3} className="block w-full text-sm p-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 resize-none" />
                                {speechApiAvailable && (
                                    <div className="absolute bottom-2 right-2">
                                        <button
                                            type="button"
                                            onClick={() => handleToggleRecording('goals')}
                                            className={`p-1.5 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-500 ${
                                                recordingField === 'goals'
                                                ? 'bg-red-500 text-white animate-pulse'
                                                : 'text-gray-500 hover:bg-gray-100'
                                            }`}
                                            aria-label={recordingField === 'goals' ? 'Stop recording' : 'Record campaign goals'}
                                        >
                                            <Icon icon="microphone" className="w-4 h-4" />
                                        </button>
                                        <div className="whitespace-pre-line text-center absolute bottom-full right-0 mb-2 w-max max-w-xs px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                                            {"Use your voice to dictate."}
                                            <div className="absolute top-full right-2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                      </div>
                      <div>
                          <label htmlFor="num-creatives" className="block text-sm font-medium text-gray-700">4. Number of Creatives ({numberOfCreatives})</label>
                          <input id="num-creatives" type="range" min="1" max="8" value={numberOfCreatives} onChange={e => setNumberOfCreatives(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-2" />
                      </div>
                  </div>
                  <div className="mt-6">
                      <button
                          onClick={handleGenerateCampaign}
                          disabled={!brandDescription.trim() || !campaignGoals.trim() || !canAfford || generationState === 'generating' || generationState === 'strategizing'}
                          className="w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-sm font-semibold rounded-md text-white bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                           {generationState === 'strategizing' ? (
                                <>
                                    <Spinner className="w-4 h-4 mr-2" />
                                    <span>Strategizing...</span>
                                </>
                            ) : generationState === 'generating' ? (
                                <>
                                    <Spinner className="w-4 h-4 mr-2" />
                                    <span>Generating...</span>
                                </>
                            ) : (
                                <>
                                    <Icon icon="sparkles" className="w-4 h-4 mr-2" />
                                    <span>Generate Campaign ({totalCost} Credits)</span>
                                </>
                            )}
                      </button>
                      {!canAfford && <p className="text-red-600 text-xs text-center mt-2">Insufficient credits. You need {totalCost} to run this campaign.</p>}
                      {error && <p className="text-red-600 text-xs text-center mt-2 bg-red-50 p-2 rounded-md">{error}</p>}
                  </div>
              </div>
            </div>
            {/* Right Column: Result */}
            <div className="lg:col-span-2 min-h-0 h-full overflow-y-auto no-scrollbar">
              {renderResults()}
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

export default CampaignStudio;
