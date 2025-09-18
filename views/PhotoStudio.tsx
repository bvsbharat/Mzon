// FIX: Corrected the React import statement. 'aistudio' is not a valid export from 'react'.
import React from 'react';
import { generateProShot, BackgroundConfig } from '../services/geminiService';
import ImageUploader from '../components/ImageUploader';
import { GalleryImage, View } from '../types';
import ImagePreviewModal from '../components/ImagePreviewModal';
import Icon from '../components/Icon';
import OnboardingTooltip from '../components/OnboardingTooltip';

type AppState = 'idle' | 'processing' | 'selection' | 'studio' | 'error';
const GENERATION_COST = 16; // 4 images * 4 credits each

interface PhotoStudioProps {
  activeStudioImage: string | null;
  setMasterImage: (url: string | null) => void;
  onNavigate: (view: View) => void;
  credits: number;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
  onboardingActive: boolean;
  onboardingStep: number;
  onNextOnboardingStep: () => void;
  onCompleteOnboarding: () => void;
  onSkipOnboarding: () => void;
  addImageToLibrary: (imageUrl: string, name?: string, imageType?: 'generated' | 'uploaded' | 'variation' | 'composed' | 'edited') => void;
  addNotification: (message: string) => void;
}

const PhotoStudio: React.FC<PhotoStudioProps> = ({
  activeStudioImage,
  setMasterImage,
  onNavigate,
  credits,
  setCredits,
  onboardingActive,
  onboardingStep,
  onNextOnboardingStep,
  onCompleteOnboarding,
  onSkipOnboarding,
  addImageToLibrary,
  addNotification,
}) => {
  // FIX: Replaced 'aistudio' with 'React' to correctly use React hooks.
  const [originalImageUrls, setOriginalImageUrls] = React.useState<string[]>([]);
  const [appState, setAppState] = React.useState<AppState>('idle');
  const [error, setError] = React.useState<string | null>(null);

  const [masterShotCandidates, setMasterShotCandidates] = React.useState<GalleryImage[]>([]);
  const [selectedMasterId, setSelectedMasterId] = React.useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = React.useState<string | null>(null);

  // Refs for onboarding tooltips
  const uploaderRef = React.useRef<HTMLDivElement>(null);
  const selectionGridRef = React.useRef<HTMLDivElement>(null);
  const confirmBtnRef = React.useRef<HTMLDivElement>(null);
  const smartActionsRef = React.useRef<HTMLDivElement>(null);


  const generateMasterCandidates = React.useCallback(async (dataUrls: string[]) => {
    if (dataUrls.length === 0) return;
    
    if (credits < GENERATION_COST) {
        setError(`You need ${GENERATION_COST} credits to generate master shots, but you only have ${credits}.`);
        setAppState('error');
        return;
    }

    setAppState('processing');
    setError(null);
    setMasterShotCandidates([]);
    setSelectedMasterId(null);

    setOriginalImageUrls(dataUrls);

    try {
      const masterConfig: BackgroundConfig = { type: 'preset', value: 'White Studio' };
      
      const generationPromises = Array(4).fill(null).map(() => generateProShot(dataUrls, masterConfig));
      const results = await Promise.all(generationPromises);
      
      setCredits(prev => prev - GENERATION_COST);
      // FIX: The `GalleryImage` type requires more properties than just `id` and `url`. This adds the missing properties with default values.
      const candidates: GalleryImage[] = results.map((url, index) => ({
        id: crypto.randomUUID(),
        url,
        name: `Master Candidate #${index + 1}`,
        tags: [],
        isFavorite: false,
        createdAt: Date.now(),
      }));
      setMasterShotCandidates(candidates);
      setAppState('selection');
      if (onboardingActive && onboardingStep === 1) {
        onNextOnboardingStep();
      }

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setAppState('error');
    }
  }, [credits, setCredits, onboardingActive, onboardingStep, onNextOnboardingStep]);

  const handleSelectMasterWithOnboarding = (id: string) => {
    if (onboardingActive && onboardingStep === 2) {
      onNextOnboardingStep();
    }
    setSelectedMasterId(id);
  };

  const handleMasterSelectionConfirm = React.useCallback(() => {
    if (!selectedMasterId) return;

    const selectedImage = masterShotCandidates.find(img => img.id === selectedMasterId);
    if (selectedImage) {
        setMasterImage(selectedImage.url);
        setAppState('studio');
        if (onboardingActive && onboardingStep === 3) {
          onNextOnboardingStep();
        }
    }
  }, [selectedMasterId, masterShotCandidates, setMasterImage, onboardingActive, onboardingStep, onNextOnboardingStep]);

  const resetState = () => {
    setOriginalImageUrls([]);
    setMasterImage(null);
    setMasterShotCandidates([]);
    setSelectedMasterId(null);
    setAppState('idle');
    setError(null);
  };
  
  const handleSaveToLibrary = () => {
    if (activeStudioImage) {
      // The `setMasterImage` function already adds the image to the library.
      // This action provides explicit user feedback that it's been saved.
      addImageToLibrary(activeStudioImage, 'Master Shot', 'uploaded');
      addNotification('Master shot saved to library!');
    }
  };
  
  const actions = [
      { key: 'variation', icon: 'grid' as const, label: "Create Variations", description: "Generate new backgrounds.", handler: () => onNavigate('variation') },
      { key: 'composer', icon: 'layers' as const, label: "Image Composer", description: "Combine with other images.", handler: () => onNavigate('composer') },
      { key: 'edit', icon: 'magicWand' as const, label: "Magic Edit", description: "Edit parts of the image.", handler: () => onNavigate('edit') },
      { key: 'campaign', icon: 'compass' as const, label: "Campaign Builder", description: "Generate a full ad campaign.", handler: () => onNavigate('campaign') },
      { key: 'save', icon: 'save' as const, label: "Save to Library", description: "Save this master shot to your assets.", handler: handleSaveToLibrary },
      { key: 'startOver', icon: 'rotateCcw' as const, label: "Start Over", description: "Start the process with new images.", handler: resetState }
  ];

  const renderContent = () => {
    switch (appState) {
      case 'idle':
        return (
          <div ref={uploaderRef} className={onboardingActive && onboardingStep === 1 ? 'onboarding-highlight' : ''}>
            <ImageUploader onImagesUpload={generateMasterCandidates} credits={credits} cost={GENERATION_COST} />
            {onboardingActive && onboardingStep === 1 && (
              <OnboardingTooltip
                targetRef={uploaderRef}
                text="Start here! Upload or drag & drop up to 4 photos of your product."
                step={1}
                totalSteps={4}
                onNext={onNextOnboardingStep}
                onSkip={onSkipOnboarding}
                position="bottom"
              />
            )}
          </div>
        );
      case 'processing':
        return (
          <div className="text-center p-8 bg-white rounded-lg border border-gray-200 w-full max-w-md animate-fade-in-up">
            <div className="w-12 h-12 mx-auto rounded-lg bg-gray-100 flex items-center justify-center">
                <Icon icon="sparkles" className="w-6 h-6 text-gray-600 animate-pulse" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 mt-5">
                Crafting master shot candidates...
            </h2>
            <p className="text-gray-600 mt-2 text-balance text-sm">
              Our AI is generating four professional shots on a pure white background for you to choose from.
            </p>
          </div>
        );
      case 'selection':
        return (
            <>
                <div className="w-full max-w-4xl mx-auto text-center animate-fade-in-up">
                    <div className="pb-6 border-b border-gray-200 mb-6">
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                            Select Your Master Shot
                        </h1>
                        <p className="mt-4 text-base text-gray-600 max-w-xl mx-auto">
                            We've generated four options. Choose the best one to use in the studio.
                        </p>
                    </div>
                    <div ref={selectionGridRef} className={`mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 ${onboardingActive && onboardingStep === 2 ? 'onboarding-highlight' : ''}`}>
                        {masterShotCandidates.map((image) => (
                           <div key={image.id} className="relative aspect-square w-full group">
                                <button 
                                    onClick={() => handleSelectMasterWithOnboarding(image.id)}
                                    className={`w-full h-full block rounded-lg focus:outline-none transition-all duration-200 ${
                                        selectedMasterId === image.id ? 'ring-4 ring-offset-2 ring-gray-800' : 'ring-1 ring-gray-200 hover:ring-gray-400'
                                    }`}
                                >
                                    <img src={image.url} alt="Master shot candidate" className="w-full h-full object-cover rounded-md" />
                                    {selectedMasterId === image.id && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-md pointer-events-none">
                                            <Icon icon="checkCircle" className="w-10 h-10 text-white" />
                                        </div>
                                    )}
                                </button>
                                <div className="absolute top-2 right-2 group- C(]">
                                    <button
                                        onClick={() => setPreviewImageUrl(image.url)}
                                        className="relative p-1.5 bg-black/50 rounded-full text-white z-10 cursor-pointer hover:bg-black/70"
                                        aria-label="Preview image"
                                    >
                                        <Icon icon="expand" className="w-5 h-5" />
                                    </button>
                                    <div className="whitespace-pre-line text-center absolute bottom-full right-0 mb-2 w-max max-w-xs px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                                        Preview Image
                                        <div className="absolute top-full right-2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div ref={confirmBtnRef} className={`mt-8 hidden md:inline-block ${onboardingActive && onboardingStep === 3 ? 'onboarding-highlight' : ''}`}>
                        <button
                            onClick={handleMasterSelectionConfirm}
                            disabled={!selectedMasterId}
                            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 text-sm font-semibold rounded-md text-white bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            Select Master Shot & Continue
                        </button>
                    </div>
                </div>
                 {onboardingActive && onboardingStep === 2 && (
                  <OnboardingTooltip
                    targetRef={selectionGridRef}
                    text="Our AI generated four options. Pick the best one to be your 'Master Shot'."
                    step={2}
                    totalSteps={4}
                    onNext={onNextOnboardingStep}
                    onSkip={onSkipOnboarding}
                    position="bottom"
                  />
                )}
                {onboardingActive && onboardingStep === 3 && (
                  <OnboardingTooltip
                    targetRef={confirmBtnRef}
                    text="Perfect! Confirm your choice to enter the Studio."
                    step={3}
                    totalSteps={4}
                    onNext={onNextOnboardingStep}
                    onSkip={onSkipOnboarding}
                    position="top"
                  />
                )}
                {previewImageUrl && (
                    <ImagePreviewModal
                        isOpen={!!previewImageUrl}
                        imageUrl={previewImageUrl}
                        onClose={() => setPreviewImageUrl(null)}
                    />
                )}
            </>
        );
      case 'studio':
        return (
            <div className="w-full max-w-4xl mx-auto text-center animate-fade-in-up">
                <div className="pb-6 border-b border-gray-200 mb-6">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                        Your Master Shot is Ready!
                    </h1>
                    <p className="mt-4 text-base text-gray-600 max-w-xl mx-auto">
                        The selected image has been saved to your library. <span className="font-bold text-gray-800">What would you like to do next?</span>
                    </p>
                </div>

                 <div ref={smartActionsRef} className={`mb-8 ${onboardingActive && onboardingStep === 4 ? 'onboarding-highlight' : ''}`}>
                     <div className="hidden md:grid md:grid-cols-3 gap-4">
                        {actions.map(action => (
                            <div key={action.key} className="relative group">
                                <button
                                    onClick={action.handler}
                                    className="w-full h-full flex flex-col items-center justify-center text-center gap-2 p-4 border border-gray-200 rounded-lg bg-white hover:bg-slate-50 hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                >
                                    <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors">
                                        <Icon icon={action.icon} className="w-6 h-6 text-gray-600"/>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-800 text-sm">{action.label}</h4>
                                    </div>
                                </button>
                                <div className="whitespace-pre-line text-center absolute bottom-full mb-2 w-max max-w-xs left-1/2 -translate-x-1/2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                                    {action.description}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                     <div className="space-y-3 md:hidden">
                        <h3 className="text-base font-semibold text-gray-800 text-left">What's Next?</h3>
                        {actions.map(action => (
                            <button
                                key={action.key}
                                onClick={action.handler}
                                className="w-full flex items-center text-left gap-4 p-4 border border-gray-200 rounded-lg bg-white active:bg-slate-50"
                            >
                                <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-slate-100 rounded-lg">
                                    <Icon icon={action.icon} className="w-5 h-5 text-gray-600"/>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-800 text-sm">{action.label}</h4>
                                    <p className="text-gray-500 text-xs mt-0.5">{action.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-4 border rounded-lg">
                    <div className="aspect-square max-w-md mx-auto bg-slate-100 rounded-md">
                        <img src={activeStudioImage!} alt="Selected master shot" className="w-full h-full object-contain rounded-md" />
                    </div>
                </div>

                <div className="mt-8 hidden md:flex md:justify-center">
                    <div className="relative group">
                        <button
                            onClick={() => setAppState('selection')}
                            className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                            <Icon icon="arrowLeft" className="w-4 h-4 mr-2" />
                            Choose Another Master
                        </button>
                        <div className="whitespace-pre-line text-center absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                            {"Go back to the four\ngenerated options."}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
                        </div>
                    </div>
                </div>
                {onboardingActive && onboardingStep === 4 && (
                  <OnboardingTooltip
                    targetRef={smartActionsRef}
                    text="Your Master Shot is ready! Use these tools to create stunning variations, compositions, and more."
                    step={4}
                    totalSteps={4}
                    onNext={onCompleteOnboarding}
                    onSkip={onSkipOnboarding}
                    position="top"
                    isLastStep={true}
                  />
                )}
            </div>
        );
      case 'error':
        return (
          <div className="text-center p-8 bg-white rounded-lg border border-gray-200 w-full max-w-md">
             <div className="w-12 h-12 mx-auto rounded-lg bg-red-100 flex items-center justify-center">
                <Icon icon="xCircle" className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mt-5">An Error Occurred</h2>
            <p className="text-gray-600 mt-2 text-sm bg-red-50 p-3 rounded-md">{error}</p>
            <button
              onClick={resetState}
              className="mt-6 inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
            >
              Start Over
            </button>
          </div>
        );
    }
  };
  
  const renderFooter = () => {
    if (appState === 'selection') {
      return (
        <div className="flex-shrink-0 pt-4 border-t border-gray-200 bg-white/90 backdrop-blur-sm md:hidden">
          <div className="px-4 pb-4">
            <button
              onClick={handleMasterSelectionConfirm}
              disabled={!selectedMasterId}
              className="w-full inline-flex items-center justify-center px-8 py-3 text-sm font-semibold rounded-md text-white bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Select Master Shot & Continue
            </button>
          </div>
        </div>
      );
    }

    if (appState === 'studio' && activeStudioImage) {
      return (
        <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white/90 backdrop-blur-sm md:hidden">
            <button
                onClick={() => setAppState('selection')}
                className="w-full inline-flex items-center justify-center px-5 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
                <Icon icon="arrowLeft" className="w-4 h-4 mr-2" />
                Choose Another Master
            </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
        <div className="flex-grow flex items-center justify-center overflow-y-auto no-scrollbar px-4 py-8 md:p-6 lg:p-8">
            {renderContent()}
        </div>
        {renderFooter()}
    </div>
  );
};

export default PhotoStudio;