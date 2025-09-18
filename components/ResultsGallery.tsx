import React, { useState } from 'react';
import ImagePreviewModal from './ImagePreviewModal';
import { GalleryImage } from '../types';
import Icon from './Icon';

interface ResultsGalleryProps {
  images: GalleryImage[];
  masterImageId?: string;
}

const ResultsGallery: React.FC<ResultsGalleryProps> = ({ images, masterImageId }) => {
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

    if (!images || images.length === 0) {
        return <div className="text-center text-slate-500 p-8">Your generated images will appear here.</div>;
    }

    return (
        <>
            <div className="grid grid-cols-3 gap-2">
                {images.map((image, index) => (
                    <div key={image.id} className="relative aspect-square group">
                        <button 
                            onClick={() => setPreviewImageUrl(image.url)}
                            className="w-full h-full rounded-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            aria-label={`Preview generated image ${index + 1}`}
                        >
                            <img 
                                src={image.url} 
                                alt={`Generated image ${index + 1}`} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                            />
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                               <Icon icon="expand" className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </button>
                        {image.id === masterImageId && (
                            <div className="absolute top-2 left-2 bg-gray-100 text-gray-600 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm pointer-events-none">
                                MASTER
                            </div>
                        )}
                    </div>
                ))}
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

export default ResultsGallery;