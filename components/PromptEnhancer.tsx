import React, { useState, useEffect, useRef } from 'react';
import Icon from './Icon';
import Spinner from './Spinner';
import { improvePrompt } from '../services/geminiService';
import { PROMPT_CHIPS } from '../constants';

const IMPROVE_COST = 2;

// FIX: Define the SpeechRecognition interface to provide types for the non-standard browser API, resolving compilation errors.
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

// FIX: Define the constructor type for SpeechRecognition.
interface SpeechRecognitionStatic {
    new(): SpeechRecognition;
}

// Add a global declaration for the SpeechRecognition API to support vendor prefixes.
declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic;
    webkitSpeechRecognition: SpeechRecognitionStatic;
  }
}

interface KeywordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectChip: (chipText: string) => void;
}

const KeywordsModal: React.FC<KeywordsModalProps> = ({ isOpen, onClose, onSelectChip }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl animate-slide-up-fade flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Icon icon="magicWand" className="w-5 h-5 text-gray-500" />
            Add Keywords
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <Icon icon="x" className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {Object.entries(PROMPT_CHIPS).map(([category, chips]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">{category}</h3>
              <div className="flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => onSelectChip(chip)}
                    className="px-3 py-1.5 text-sm text-gray-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
        .animate-slide-up-fade { animation: slide-up-fade 0.3s ease-out forwards; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up-fade { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};


interface PromptEnhancerProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  credits: number;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
  rows?: number;
  onGetIdeas?: () => void;
  getIdeasDisabled?: boolean;
  ideasCost?: number;
  onImprove?: (currentPrompt: string) => Promise<string>;
  improveDisabled?: boolean;
  enableSpeechToText?: boolean;
  disabledTooltip?: string;
}

const PromptEnhancer: React.FC<PromptEnhancerProps> = ({
  value,
  onChange,
  label,
  placeholder,
  credits,
  setCredits,
  rows = 4,
  onGetIdeas,
  getIdeasDisabled,
  onImprove,
  improveDisabled,
  enableSpeechToText = false,
  disabledTooltip,
}) => {
  const [isImproving, setIsImproving] = useState(false);
  const [improveError, setImproveError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [speechApiAvailable, setSpeechApiAvailable] = useState(false);
  const [isKeywordsModalOpen, setIsKeywordsModalOpen] = useState(false);

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

  const handleToggleRecording = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      recognition.onstart = () => {
        setIsRecording(true);
      };
      recognition.onend = () => {
        setIsRecording(false);
      };
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        alert(`Speech recognition error: ${event.error}. Please check microphone permissions.`);
        setIsRecording(false);
      };
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        // FIX: Corrected the 'onChange' call to pass a string value constructed from the 'value' prop, instead of a function, to match the prop's type signature.
        onChange((value ? value + ' ' : '') + transcript.trim());
      };
      
      recognition.start();
    }
  };


  const handleImprovePrompt = async () => {
    if (!value.trim() || isImproving) return;
    if (credits < IMPROVE_COST) {
        setImproveError(`Insufficient credits. You need ${IMPROVE_COST}.`);
        setTimeout(() => setImproveError(null), 3000);
        return;
    }
    setIsImproving(true);
    setImproveError(null);
    try {
      const improved = onImprove
        ? await onImprove(value)
        : await improvePrompt(value);
      
      onChange(improved);
      setCredits(prev => prev - IMPROVE_COST);
    } catch (err) {
      console.error("Failed to improve prompt:", err);
      setImproveError("Could not improve prompt.");
      setTimeout(() => setImproveError(null), 3000);
    } finally {
      setIsImproving(false);
    }
  };

  const handleSelectChip = (chipText: string) => {
    const trimmedValue = value.trim();
    if (trimmedValue === '') {
      onChange(chipText);
    } else if (trimmedValue.endsWith(',')) {
      onChange(`${trimmedValue} ${chipText}`);
    } else {
      onChange(`${trimmedValue}, ${chipText}`);
    }
  };

  return (
    <div>
      <label htmlFor={`prompt-enhancer-${label}`} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative w-full mt-2">
        <textarea
          id={`prompt-enhancer-${label}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isRecording ? "Listening..." : placeholder}
          rows={rows}
          className="block w-full text-sm p-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 resize-none"
        />
        {enableSpeechToText && speechApiAvailable && (
          <div className="absolute bottom-2 right-2 group">
            <button
              type="button"
              onClick={handleToggleRecording}
              className={`p-1.5 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-500 ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              aria-label={isRecording ? 'Stop recording' : 'Record prompt'}
            >
              <Icon icon="microphone" className="w-4 h-4" />
            </button>
            <div className="whitespace-pre-line text-center absolute bottom-full right-0 mb-2 w-max max-w-xs px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
              {"Use your voice\nto dictate the prompt."}
              <div className="absolute top-full right-2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 mt-2">
        <div className="relative group">
          <button
            onClick={handleImprovePrompt}
            disabled={improveDisabled || !value.trim() || isImproving || credits < IMPROVE_COST}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isImproving ? (
              <Spinner className="w-3 h-3" />
            ) : (
              <Icon icon="sparkles" className="w-3 h-3" />
            )}
            <span>Improve</span>
          </button>
          <div className="whitespace-pre-line text-center absolute bottom-full right-0 mb-2 w-max max-w-xs px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
            {improveDisabled && disabledTooltip ? disabledTooltip : "Let AI rewrite your prompt\nfor better results."}
            <div className="absolute top-full right-2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
          </div>
          {improveError && <div className="absolute top-full right-0 mt-1 text-xs text-red-600">{improveError}</div>}
        </div>
        <div className="relative group">
          <button
            onClick={() => setIsKeywordsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border rounded-md hover:bg-gray-50 transition-colors"
            aria-label="Add keywords"
          >
            <Icon icon="tag" className="w-3 h-3" />
            <span>Keywords</span>
          </button>
          <div className="whitespace-pre-line text-center absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
            {"Add descriptive terms for\nlighting, style, and more."}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
          </div>
        </div>
        {onGetIdeas && (
          <div className="relative group">
            <button
              onClick={onGetIdeas}
              disabled={getIdeasDisabled}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Icon icon="lightbulb" className="w-3 h-3" />
              <span>Get Ideas</span>
            </button>
            <div className="whitespace-pre-line text-center absolute bottom-full right-0 mb-2 w-max max-w-xs px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
               {getIdeasDisabled && disabledTooltip ? disabledTooltip : "Generate creative ideas\nbased on your image."}
               <div className="absolute top-full right-2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
            </div>
          </div>
        )}
      </div>
      <KeywordsModal
        isOpen={isKeywordsModalOpen}
        onClose={() => setIsKeywordsModalOpen(false)}
        onSelectChip={handleSelectChip}
      />
    </div>
  );
};

export default PromptEnhancer;