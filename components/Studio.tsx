import React from 'react';
import ComparisonSlider from './ComparisonSlider';
// FIX: Updated import to use types.ts to prevent circular dependencies.
import { View } from '../types';
import { GalleryImage } from '../types';
import Icon from './Icon';


interface StudioProps {
  originalImageUrl: string;
  masterImageUrl: string;
  galleryImages: GalleryImage[];
  onStartOver: () => void;
  onNavigate: (view: View) => void;
}

interface ActionButtonProps {
    icon: React.ReactNode;
    label: string;
    description: string;
    onClick: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label, description, onClick }) => (
    <button
        onClick={onClick}
        className="group w-full flex items-center text-left gap-4 p-4 border border-gray-200 rounded-lg bg-white hover:bg-slate-50 hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
    >
        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-slate-100 rounded-lg text-gray-600 group-hover:bg-slate-200 transition-colors">
            {icon}
        </div>
        <div>
            <h4 className="font-semibold text-gray-800 text-sm">{label}</h4>
            <p className="text-gray-500 text-xs">{description}</p>
        </div>
    </button>
);


const Studio: React.FC<StudioProps> = ({ 
    originalImageUrl, 
    masterImageUrl,
    galleryImages, 
    onStartOver,
    onNavigate
}) => {

    return (
        <div className="w-full h-full animate-fade-in-up">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full items-start">
                {/* Left Column: Results */}
                <div className="lg:col-span-2 bg-white border rounded-lg p-6 flex flex-col gap-6">
                    <ComparisonSlider originalImage={originalImageUrl} generatedImage={masterImageUrl} />
                </div>

                {/* Right Column: Actions */}
                <div className="lg:col-span-1 bg-white border rounded-lg p-6 space-y-4">
                    <div>
                        <h3 className="text-base font-semibold text-gray-800">Smart Actions</h3>
                        <p className="text-xs text-gray-500">Your master shot is ready. What's next?</p>
                    </div>

                    <div className="space-y-3">
                        <ActionButton 
                            icon={<Icon icon="grid" className="w-5 h-5"/>} 
                            label="Create More Variations" 
                            description="Generate new scenes and backgrounds."
                            onClick={() => onNavigate('variation')} 
                        />
                        <ActionButton 
                            icon={<Icon icon="layers" className="w-5 h-5"/>} 
                            label="Image Composer"
                            description="Combine your product with a model."
                            onClick={() => onNavigate('composer')} 
                        />
                        <ActionButton 
                            icon={<Icon icon="magicWand" className="w-5 h-5"/>} 
                            label="Magic Edit"
                            description="Modify specific parts of your image."
                            onClick={() => onNavigate('edit')} 
                        />
                    </div>
                    
                    <div className="pt-4 border-t border-dashed">
                         <div className="grid grid-cols-2 gap-3">
                            <a
                                href={masterImageUrl}
                                download="master-product-shot.png"
                                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
                            >
                                <Icon icon="download" className="w-4 h-4 mr-2" />
                                Download
                            </a>
                            <button
                                onClick={onStartOver}
                                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            >
                                <Icon icon="rotateCcw" className="w-4 h-4 mr-2" />
                                Start Over
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Studio;