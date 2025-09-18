import React, { useState, useCallback, useRef } from 'react';
import CameraCapture from './CameraCapture';
import Icon from './Icon';

const MAX_IMAGES = 4;

interface ImageFile {
  id: string;
  dataUrl: string;
}

interface ImageUploaderProps {
  onImagesUpload: (dataUrls: string[]) => void;
  credits: number;
  cost: number;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesUpload, credits, cost }) => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    const newImageFiles = Array.from(files)
      .filter(file => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
      .slice(0, MAX_IMAGES - images.length);

    if (newImageFiles.length === 0) {
      if (files.length > 0) alert('Please upload valid image files (JPEG, PNG, WEBP).');
      return;
    }
    
    newImageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setImages(prev => [...prev, { id: crypto.randomUUID(), dataUrl }]);
      };
      reader.onerror = (error) => {
        console.error("Error reading file:", error);
        alert("Sorry, there was an error reading one of your files.");
      };
      reader.readAsDataURL(file);
    });
  }, [images.length]);

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const onDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); }, []);
  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleCameraCapture = (file: File) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    handleFiles(dataTransfer.files);
    setShowCamera(false);
  };

  const handleContinue = () => {
    if (images.length > 0) {
        onImagesUpload(images.map(img => img.dataUrl));
    }
  };

  const canAfford = credits >= cost;

  // FIX: Defined the missing renderSlot function to handle rendering of image previews and upload slots.
  const renderSlot = (i: number) => {
    const image = images[i];
    if (image) {
      // Slot with an image and a remove button
      return (
        <div key={image.id} className="relative group aspect-square">
          <img
            src={image.dataUrl}
            alt={`Preview ${i + 1}`}
            className="w-full h-full object-cover rounded-lg border border-gray-200"
          />
          <button
            onClick={() => removeImage(image.id)}
            className="absolute -top-2 -right-2 p-1 bg-white rounded-full text-gray-500 hover:text-red-500 shadow-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
            aria-label={`Remove image ${i + 1}`}
          >
            <Icon icon="xCircle" className="w-6 h-6" />
          </button>
        </div>
      );
    }
  
    // Check if this is the next empty slot to be filled
    if (i === images.length) {
      // Active uploader slot
      return (
        <button
          key={`add-slot-${i}`}
          onClick={() => fileInputRef.current?.click()}
          className="aspect-square w-full flex flex-col items-center justify-center text-center bg-white border-2 border-dashed border-gray-300 rounded-lg hover:bg-slate-50 transition-colors"
          aria-label="Add an image"
        >
          <Icon icon="uploadCloud" className="w-8 h-8 text-gray-400" />
          <span className="mt-1 text-xs text-gray-500">Upload Image</span>
        </button>
      );
    }
  
    // Inactive placeholder slot
    return (
      <div key={`placeholder-${i}`} className="aspect-square w-full bg-slate-100 rounded-lg border border-gray-200" />
    );
  };

  return (
    <div className="w-full max-w-3xl mx-auto text-center animate-fade-in-up">
      <div className="pb-6 border-b border-gray-200 mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Upload Your Product Photos
        </h1>
        <p className="mt-4 text-base text-gray-600 max-w-xl mx-auto">
          Provide up to 4 images of your product. More angles and details will result in a higher quality master shot.
        </p>
      </div>

      <div
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={`relative mt-8 p-4 border rounded-lg transition-colors ${ isDragging ? 'bg-slate-100' : 'bg-white'}`}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: MAX_IMAGES }).map((_, i) => renderSlot(i))}
        </div>
        <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept="image/png, image/jpeg, image/webp"
            onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = '';
            }}
        />
        {isDragging && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center pointer-events-none rounded-lg border-2 border-dashed border-gray-400">
                <p className="text-lg font-semibold text-gray-700">Drop images anywhere</p>
            </div>
        )}
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
            onClick={handleContinue}
            disabled={images.length === 0 || !canAfford}
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 text-sm font-semibold rounded-md text-white bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
            Create Master Shots
        </button>
        {images.length < MAX_IMAGES && (
             <button
                onClick={() => setShowCamera(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                aria-label="Use camera to add a photo"
            >
                <Icon icon="camera" className="w-5 h-5" />
                Use Camera
            </button>
        )}
         {showCamera && (
            <CameraCapture
                onCapture={handleCameraCapture}
                onClose={() => setShowCamera(false)}
            />
        )}
      </div>
       {!canAfford && images.length > 0 && (
            <p className="mt-4 text-sm text-red-600">
                Insufficient credits. You need {cost} credits to generate master shots.
            </p>
        )}
    </div>
  );
};

export default ImageUploader;