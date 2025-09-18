
import React, { useState } from 'react';
import { BackgroundConfig } from '../services/geminiService';
import BackgroundOptions from './BackgroundOptions';
import Icon from './Icon';

interface EditorProps {
    originalImageUrls: string[];
    onGenerate: (config: BackgroundConfig) => void;
    onBack: () => void;
    // FIX: Add credits and setCredits to the props interface to satisfy BackgroundOptions' requirements.
    credits: number;
    setCredits: React.Dispatch<React.SetStateAction<number>>;
}

const Editor: React.FC<EditorProps> = ({ originalImageUrls, onGenerate, onBack, credits, setCredits }) => {
    const [backgroundConfig, setBackgroundConfig] = useState<BackgroundConfig>({ type: 'preset', value: 'White Studio' });

    const primaryImageUrl = originalImageUrls[0];

    return (
        <div className="w-full animate-fade-in-up">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
                {/* Left Column: Options */}
                <div className="lg:col-span-1 bg-white border rounded-lg p-6 flex flex-col">
                     <div className="mb-4">
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Settings</h2>
                     </div>
                    <BackgroundOptions onChange={setBackgroundConfig} imageUrl={primaryImageUrl} credits={credits} setCredits={setCredits} />
                    <div className="mt-6">
                         <button
                            onClick={() => onGenerate(backgroundConfig)}
                            className="w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-sm font-semibold rounded-md text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
                         >
                            <Icon icon="sparkles" className="w-4 h-4 mr-2" />
                            Generate
                         </button>
                         <button 
                            onClick={onBack}
                            className="w-full mt-3 inline-flex items-center justify-center px-5 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        >
                            Upload different photos
                        </button>
                    </div>
                </div>

                {/* Right Column: Image Preview */}
                <div className="lg:col-span-2 flex flex-col items-center justify-center bg-white border rounded-lg p-4">
                    <div className="w-full max-w-2xl mx-auto aspect-square flex items-center justify-center bg-slate-100 rounded-md">
                         <img src={primaryImageUrl} alt="Original product" className="max-w-full max-h-full object-contain" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Editor;
