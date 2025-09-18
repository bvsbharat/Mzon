

// FIX: Corrected the React import statement. 'aistudio' is not a valid export from 'react'.
import React from 'react';
// FIX: Updated imports to use types.ts to prevent circular dependencies.
import { View, ComposerGenContext } from '../types';
import Icon from '../components/Icon';
import { generateImageFromPrompt } from '../services/geminiService';
import Spinner from '../components/Spinner';
import PromptEnhancer from '../components/PromptEnhancer';

const GENERATION_COST = 4;

interface ImageGeneratorProps {
  onNavigate: (view: View) => void;
  onSendToComposer: (url: string) => void;
  onImageGeneratedForComposer: (url: string, targetSlot: number) => void;
  composerGenContext: ComposerGenContext;
  addImageToLibrary: (url: string) => void;
  credits: number;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
  addNotification: (message: string) => void;
}

const ImageGenerator: React.FC<ImageGeneratorProps> = ({ 
  onNavigate, 
  onSendToComposer,
  onImageGeneratedForComposer,
  composerGenContext,
  addImageToLibrary,
  credits, 
  setCredits,
  addNotification
}) => {
  // FIX: Replaced 'aistudio' with 'React' to correctly use React hooks.
  const [prompt, setPrompt] = React.useState('');
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (credits < GENERATION_COST) {
      setError(`Insufficient credits. You need ${GENERATION_COST} to generate an image.`);
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImageUrl(null);

    try {
      const resultUrl = await generateImageFromPrompt(prompt);
      setCredits(prev => prev - GENERATION_COST);
      setGeneratedImageUrl(resultUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleActionClick = () => {
    if (!generatedImageUrl) return;

    if (composerGenContext !== null) {
      onImageGeneratedForComposer(generatedImageUrl, composerGenContext.targetSlot);
    } else {
      onSendToComposer(generatedImageUrl);
    }
  };
  
  const handleSaveToLibrary = () => {
    if (generatedImageUrl) {
        addImageToLibrary(generatedImageUrl);
        addNotification('Image saved to library!');
    }
  };

  const startOver = () => {
      setPrompt('');
      setGeneratedImageUrl(null);
      setError(null);
  };

  const isForComposerSlot = composerGenContext !== null;

  return (
    <div className="w-full h-full flex flex-col animate-fade-in-up p-4 sm:p-6 lg:p-8">
      <div className="flex-shrink-0 pb-6 pt-6 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Image Generator</h1>
        <p className="mt-2 text-base text-gray-600">
          Create context images like models, scenes, and backgrounds for your products.
          {isForComposerSlot && (
            <span className="block mt-1 font-semibold text-gray-800 bg-yellow-100 p-2 rounded-md">
              Generating an image to add to Composer slot #{composerGenContext.targetSlot + 1}.
            </span>
          )}
        </p>
      </div>

      <div className="flex-grow min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full items-start">
          <div className="lg:col-span-1 bg-white border rounded-lg p-6">
            <PromptEnhancer
              label="Describe the image you want"
              value={prompt}
              onChange={setPrompt}
              placeholder="e.g., A photorealistic model smiling on a city street."
              rows={5}
              credits={credits}
              setCredits={setCredits}
              enableSpeechToText={true}
            />
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating || credits < GENERATION_COST}
              className="mt-4 w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-sm font-semibold rounded-md text-white bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Icon icon="sparkles" className="w-4 h-4 mr-2" />
                  <span>Generate Image</span>
                </>
              )}
            </button>
            {error && <p className="text-red-500 text-xs mt-2 text-center bg-red-50 p-2 rounded-md">{error}</p>}
          </div>

          <div className="lg:col-span-2 bg-white border rounded-lg p-6 flex flex-col items-center justify-center min-h-[300px]">
            {isGenerating && (
              <div className="text-center">
                <Spinner className="w-8 h-8 text-gray-800 mx-auto" />
                <p className="mt-4 text-gray-700 font-semibold">Generating your image...</p>
              </div>
            )}
            {!isGenerating && generatedImageUrl && (
                <div className="w-full text-center">
                    <div className="w-full max-w-2xl mx-auto aspect-square bg-slate-100 rounded-md">
                        <img src={generatedImageUrl} alt="Generated" className="w-full h-full object-contain rounded-md" />
                    </div>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                        <button
                            onClick={handleSaveToLibrary}
                            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold rounded-md text-white bg-gray-800 hover:bg-gray-900"
                        >
                            <Icon icon="save" className="w-4 h-4 mr-2" />
                            Save to Library
                        </button>
                        <button
                            onClick={handleActionClick}
                            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold rounded-md text-white bg-gray-800 hover:bg-gray-900"
                        >
                            <Icon icon="layers" className="w-4 h-4 mr-2" />
                            {isForComposerSlot ? 'Add to Composer' : 'Send to Image Composer'}
                        </button>
                         <button
                            onClick={startOver}
                            className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                            <Icon icon="rotateCcw" className="w-4 h-4 mr-2" />
                            Generate Another
                        </button>
                    </div>
                </div>
            )}
             {!isGenerating && !generatedImageUrl && (
                 <div className="text-center text-gray-500">
                    <Icon icon="image" className="w-12 h-12 mx-auto text-gray-300" />
                    <p className="mt-2 text-sm">Your generated image will appear here.</p>
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageGenerator;