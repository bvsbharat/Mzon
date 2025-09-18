import React, { useState, useEffect } from 'react';
import { BackgroundConfig } from '../services/geminiService';
import { PRESET_PROMPTS, COMMERCIAL_TEMPLATES } from '../constants';
import { generateSceneIdeas } from '../services/geminiService';
import SceneIdeasModal from './SceneIdeasModal';
import PromptEnhancer from './PromptEnhancer';

const IDEAS_COST = 2;

interface BackgroundOptionsProps {
  onChange: (config: BackgroundConfig) => void;
  imageUrl?: string;
  credits: number;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
  enableSpeechToText?: boolean;
}

type Tab = 'presets' | 'templates' | 'ai';

const presets = Object.keys(PRESET_PROMPTS);
const commercialTemplates = Object.keys(COMMERCIAL_TEMPLATES);

const BackgroundOptions: React.FC<BackgroundOptionsProps> = ({ onChange, imageUrl, credits, setCredits, enableSpeechToText = false }) => {
  const [activeTab, setActiveTab] = useState<Tab>('ai');
  const [selectedPreset, setSelectedPreset] = useState<string>(presets[0]);
  const [selectedCommercial, setSelectedCommercial] = useState<string>(commercialTemplates[0]);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  
  const [isIdeasModalOpen, setIsIdeasModalOpen] = useState(false);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [sceneIdeas, setSceneIdeas] = useState<string[]>([]);
  const [ideasError, setIdeasError] = useState<string | null>(null);

  useEffect(() => {
    let config: BackgroundConfig;
    if (activeTab === 'presets') {
      config = { type: 'preset', value: selectedPreset };
    } else if (activeTab === 'templates') {
      config = { type: 'commercial', value: selectedCommercial };
    } else { // ai
      config = { type: 'ai', value: aiPrompt };
    }
    onChange(config);
  }, [activeTab, selectedPreset, selectedCommercial, aiPrompt, onChange]);

  const handleGenerateIdeas = async (forceRefetch: boolean = false) => {
    if (!imageUrl) return;

    if (credits < IDEAS_COST && !forceRefetch) {
        setIdeasError(`You need ${IDEAS_COST} credits to generate ideas.`);
        setIsIdeasModalOpen(true);
        return;
    }

    setIsIdeasModalOpen(true);
    if (sceneIdeas.length > 0 && !forceRefetch && !ideasError) {
        return; // Just open the modal if ideas are already there and no error
    }

    setIsGeneratingIdeas(true);
    setIdeasError(null);
    setSceneIdeas([]);
    try {
        const ideas = await generateSceneIdeas(imageUrl);
        setSceneIdeas(ideas);
        setCredits(prev => prev - IDEAS_COST);
    } catch (err) {
        setIdeasError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setIsGeneratingIdeas(false);
    }
  };

  const handleSelectIdea = (idea: string) => {
    setAiPrompt(idea);
    setActiveTab('ai');
    setIsIdeasModalOpen(false);
  };

  const renderTabs = () => (
    <div className="flex border-b">
      <TabButton
        label="AI Scene"
        isActive={activeTab === 'ai'}
        onClick={() => setActiveTab('ai')}
      />
      <TabButton
        label="Templates"
        isActive={activeTab === 'templates'}
        onClick={() => setActiveTab('templates')}
      />
      <TabButton
        label="Presets"
        isActive={activeTab === 'presets'}
        onClick={() => setActiveTab('presets')}
      />
    </div>
  );
  
  const renderContent = () => {
    switch (activeTab) {
      case 'ai':
        return (
          <PromptEnhancer
            value={aiPrompt}
            onChange={setAiPrompt}
            onGetIdeas={() => handleGenerateIdeas(false)}
            getIdeasDisabled={!imageUrl || isGeneratingIdeas || credits < IDEAS_COST}
            label="Describe your custom scene"
            placeholder="e.g., On a sandy beach with waves..."
            rows={4}
            credits={credits}
            setCredits={setCredits}
            ideasCost={IDEAS_COST}
            enableSpeechToText={enableSpeechToText}
          />
        );
      case 'templates':
        return (
          <div className="grid grid-cols-2 gap-2">
            {commercialTemplates.map(template => (
              <button
                key={template}
                onClick={() => setSelectedCommercial(template)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors text-left border ${
                  selectedCommercial === template
                    ? 'border-gray-800 text-gray-900 bg-white'
                    : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200'
                }`}
              >
                {template}
              </button>
            ))}
          </div>
        );
      case 'presets':
        return (
          <div className="grid grid-cols-2 gap-2">
            {presets.map(preset => (
              <button
                key={preset}
                onClick={() => setSelectedPreset(preset)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors text-left border ${
                  selectedPreset === preset
                    ? 'border-gray-800 text-gray-900 bg-white'
                    : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
        <div className="w-full">
            {renderTabs()}
            <div className="pt-4">{renderContent()}</div>
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
    </>
  );
};

interface TabButtonProps {
    label: string;
    isActive: boolean;
    onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-1 px-3 py-2 text-sm font-medium focus:outline-none ${
            isActive
            ? 'border-b-2 border-gray-800 text-gray-800'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/0 border-b-2 border-transparent'
        }`}
        role="tab"
        aria-selected={isActive}
    >
        {label}
    </button>
)

export default BackgroundOptions;