import React, { useState, useCallback, useRef, useEffect } from 'react';
import Icon from './Icon';

interface ImageSimpleUploaderProps {
  onImageUpload: (dataUrl: string) => void;
  preloadedImageUrl?: string | null;
}

const ImageSimpleUploader: React.FC<ImageSimpleUploaderProps> = ({ onImageUpload, preloadedImageUrl }) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (preloadedImageUrl) {
      setImagePreview(preloadedImageUrl);
    }
  }, [preloadedImageUrl]);


  const handleFile = useCallback((file: File | null) => {
    if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      if (file) alert('Please upload a valid image file (JPEG, PNG, WEBP).');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      onImageUpload(dataUrl);
    };
    reader.readAsDataURL(file);
  }, [onImageUpload]);

  const onDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); }, []);
  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleRemoveImage = () => {
      setImagePreview(null);
      onImageUpload(''); // Signal removal
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
  };

  if (imagePreview) {
    return (
        <div className="relative aspect-square w-full group">
            <img src={imagePreview} alt="Context preview" className="w-full h-full object-cover rounded-lg border border-gray-300" />
            <button
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 hover:scale-110 transition-transform"
                aria-label="Remove context image"
            >
                <Icon icon="xCircle" className="w-full h-full" />
            </button>
        </div>
    );
  }

  return (
    <div
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`relative aspect-square w-full bg-slate-50 rounded-md flex items-center justify-center border-2 border-dashed cursor-pointer transition-colors ${
        isDragging ? 'border-gray-400 bg-slate-100' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="text-center p-4">
        <Icon icon="uploadCloud" className="mx-auto h-8 w-8 text-gray-400" />
        <p className="mt-2 text-sm font-medium text-gray-600">
          Upload model or background
        </p>
        <p className="text-xs text-gray-500 mt-1">Drag & drop or click</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/png, image/jpeg, image/webp"
        onChange={(e) => handleFile(e.target.files ? e.target.files[0] : null)}
      />
      {isDragging && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center pointer-events-none rounded-md">
            <p className="text-lg font-semibold text-gray-700">Drop to upload</p>
        </div>
      )}
    </div>
  );
};

export default ImageSimpleUploader;
