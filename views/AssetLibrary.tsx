

import React, { useState, useMemo, useEffect } from 'react';
// FIX: Updated import to use types.ts to prevent circular dependencies.
import { View } from '../types';
import { GalleryImage } from '../types';
import Icon from '../components/Icon';
import ImagePreviewModal from '../components/ImagePreviewModal';

interface AssetLibraryProps {
  masterImageId: string | null;
  galleryImages: GalleryImage[];
  onNavigate: (view: View) => void;
  onUpdateImage: (imageId: string, updates: Partial<Omit<GalleryImage, 'id' | 'url' | 'createdAt'>>) => void;
  onDeleteImage: (imageId: string) => void;
  onSetAsMaster: (image: GalleryImage) => void;
}

interface EditModalProps {
    image: GalleryImage;
    onClose: () => void;
    onSave: (updates: Partial<Omit<GalleryImage, 'id' | 'url' | 'createdAt'>>) => void;
}

const EditModal: React.FC<EditModalProps> = ({ image, onClose, onSave }) => {
    const [name, setName] = useState(image.name);
    const [tags, setTags] = useState(image.tags);
    const [tagInput, setTagInput] = useState('');

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            const newTag = tagInput.trim().toLowerCase();
            if (!tags.includes(newTag)) {
                setTags([...tags, newTag]);
            }
            setTagInput('');
        }
    };
    
    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };
    
    const handleSave = () => {
        onSave({ name, tags });
        onClose();
    };

    return (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl animate-slide-up-fade flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-base font-semibold text-gray-900">Edit Asset</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-100" aria-label="Close">
                        <Icon icon="x" className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label htmlFor="assetName" className="block text-sm font-medium text-gray-700">Name</label>
                        <input type="text" id="assetName" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full text-sm p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tags</label>
                        <div className="mt-1 flex flex-wrap items-center gap-2 p-2 border border-gray-300 rounded-md">
                            {tags.map(tag => (
                                <span key={tag} className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-medium px-2 py-1 rounded-full">
                                    {tag}
                                    <button onClick={() => removeTag(tag)} className="text-gray-500 hover:text-gray-800">
                                        <Icon icon="xCircle" className="w-3.5 h-3.5" />
                                    </button>
                                </span>
                            ))}
                            <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder="Add a tag..." className="flex-grow text-sm border-0 focus:ring-0 p-1" />
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t bg-slate-50 flex justify-end">
                    <button onClick={handleSave} className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold rounded-md text-white bg-gray-800 hover:bg-gray-900">
                        Save Changes
                    </button>
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

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmButtonText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message, confirmButtonText = 'Confirm' }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-title"
    >
      <div
        className="relative max-w-sm w-full bg-white rounded-lg shadow-2xl animate-slide-up-fade flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 flex items-start space-x-4">
          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-red-100">
            <Icon icon="trash" className="h-6 w-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h2 id="confirmation-title" className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="mt-2 text-sm text-gray-600">{message}</p>
          </div>
        </div>
        <div className="p-4 border-t bg-slate-50 flex justify-end space-x-3">
            <button
                onClick={onClose}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
            >
                Cancel
            </button>
             <button
                onClick={() => { onConfirm(); onClose(); }}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                {confirmButtonText}
              </button>
        </div>
      </div>
       <style>{`
          .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
          .animate-slide-up-fade { animation: slide-up-fade 0.3s ease-out forwards; }
        `}</style>
    </div>
  );
};

const ActionButton: React.FC<{ onClick: (e: React.MouseEvent) => void, 'aria-label': string, tooltip: string, children: React.ReactNode }> = ({ onClick, 'aria-label': ariaLabel, tooltip, children }) => (
    <div className="relative group/action">
        <button onClick={onClick} className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full" aria-label={ariaLabel}>
            {children}
        </button>
        <div className="whitespace-pre-line text-center absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover/action:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
            {tooltip}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
        </div>
    </div>
);


const AssetLibrary: React.FC<AssetLibraryProps> = ({ masterImageId, galleryImages, onNavigate, onUpdateImage, onDeleteImage, onSetAsMaster }) => {
    
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'favorites'>('all');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
    const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
    const [imageToDelete, setImageToDelete] = useState<GalleryImage | null>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

    const filteredAndSortedImages = useMemo(() => {
        let images = galleryImages
            .filter(image => {
                if (filter === 'favorites') {
                    return image.isFavorite;
                }
                return true;
            })
            .filter(image => {
                const query = searchQuery.toLowerCase();
                if (!query) return true;
                const nameMatch = image.name.toLowerCase().includes(query);
                const tagMatch = image.tags.some(tag => tag.toLowerCase().includes(query));
                return nameMatch || tagMatch;
            });

        images.sort((a, b) => {
            if (sortBy === 'newest') return b.createdAt - a.createdAt;
            return a.createdAt - b.createdAt;
        });

        return images;
    }, [galleryImages, searchQuery, filter, sortBy]);

    if (galleryImages.length === 0) {
        return (
          <div className="w-full h-full flex items-center justify-center text-center animate-fade-in-up p-4 sm:p-6 lg:p-8">
            <div className="bg-white p-8 rounded-lg border">
              <div className="w-12 h-12 mx-auto rounded-lg bg-slate-100 flex items-center justify-center">
                <Icon icon="photo" className="w-6 h-6 text-gray-500" />
              </div>
              <h1 className="mt-4 text-xl font-bold tracking-tight text-gray-900">Your Library is Empty</h1>
              <p className="mt-2 text-base text-gray-600">Generate a master image in the Photo Studio to get started.</p>
              <button onClick={() => onNavigate('photo')} className="mt-6 inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-900">
                Go to Photo Studio
              </button>
            </div>
          </div>
        );
    }
    
    return (
        <>
            <div className="w-full h-full flex flex-col animate-fade-in-up p-4 sm:p-6 lg:p-8">
                <div className="flex-shrink-0 pb-6 pt-6 border-b border-gray-200 mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Asset Library</h1>
                    <p className="mt-2 text-base text-gray-600">Manage all your generated images and creations.</p>
                </div>
                
                {/* Toolbar */}
                <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div className="relative w-full sm:w-64">
                        <Icon icon="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        <input type="search" placeholder="Search by name or tag..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-slate-100 p-1 rounded-md">
                            <button onClick={() => setFilter('all')} className={`px-3 py-1 text-sm font-medium rounded ${filter === 'all' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-600'}`}>All</button>
                            <button onClick={() => setFilter('favorites')} className={`px-3 py-1 text-sm font-medium rounded ${filter === 'favorites' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-600'}`}>Favorites</button>
                        </div>
                        <select value={sortBy} onChange={e => setSortBy(e.target.value as 'newest' | 'oldest')} className="text-sm border border-gray-300 rounded-md py-2 pl-3 pr-8 focus:ring-indigo-500 focus:border-indigo-500">
                            <option value="newest">Sort: Newest</option>
                            <option value="oldest">Sort: Oldest</option>
                        </select>
                    </div>
                </div>

                <div className="flex-grow bg-white p-4 rounded-lg border overflow-y-auto min-h-0">
                    {filteredAndSortedImages.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                            {filteredAndSortedImages.map(image => (
                                <div key={image.id} className="relative aspect-square group flex flex-col">
                                    <div className="relative w-full h-full">
                                        <img src={image.url} alt={image.name} className="w-full h-full object-cover rounded-md border border-gray-200" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-md">
                                            <div className="absolute top-2 right-2 flex flex-col gap-3">
                                                <ActionButton onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(image.url); }} tooltip="Preview" aria-label="Preview">
                                                    <Icon icon="expand" className="w-5 h-5 text-white" />
                                                </ActionButton>
                                                <ActionButton onClick={(e) => {e.stopPropagation(); onUpdateImage(image.id, { isFavorite: !image.isFavorite })}} tooltip={image.isFavorite ? "Unfavorite" : "Favorite"} aria-label="Favorite">
                                                    <Icon icon="star" className={`w-5 h-5 transition-colors ${image.isFavorite ? 'text-yellow-400 fill-current' : 'text-white'}`} />
                                                </ActionButton>
                                                <ActionButton onClick={(e) => {e.stopPropagation(); setEditingImage(image)}} tooltip="Edit Details" aria-label="Edit">
                                                    <Icon icon="edit" className="w-5 h-5 text-white" />
                                                </ActionButton>
                                                <div className="relative group/action">
                                                    <a href={image.url} download={`${image.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}.png`} onClick={(e) => e.stopPropagation()} className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full" aria-label="Download">
                                                        <Icon icon="download" className="w-5 h-5 text-white" />
                                                    </a>
                                                     <div className="whitespace-pre-line text-center absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover/action:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                                                        Download
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
                                                    </div>
                                                </div>
                                                <ActionButton onClick={(e) => {e.stopPropagation(); setImageToDelete(image)}} tooltip="Delete" aria-label="Delete">
                                                    <Icon icon="trash" className="w-5 h-5 text-white" />
                                                </ActionButton>
                                            </div>
                                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                                                 <div className="relative group/action">
                                                    <button onClick={(e) => {e.stopPropagation(); onSetAsMaster(image)}} className="w-auto px-3 py-1.5 text-xs text-white bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full font-semibold">
                                                        Set as Master
                                                    </button>
                                                    <div className="whitespace-pre-line text-center absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover/action:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                                                        {"Use this image in\nall studio playgrounds."}
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {image.id === masterImageId && (
                                            <div className="absolute top-2 left-2 bg-gray-800 text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm pointer-events-none">
                                                MASTER
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-2 text-left">
                                        <p className="text-sm font-medium text-gray-800 truncate">{image.name}</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {image.tags.slice(0, 3).map(tag => (
                                                <span key={tag} className="bg-slate-100 text-slate-600 text-[10px] font-medium px-1.5 py-0.5 rounded">#{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-slate-500 py-16">
                            <Icon icon="search" className="w-12 h-12 mx-auto text-gray-300" />
                            <h3 className="mt-2 text-lg font-semibold">No Results Found</h3>
                            <p className="text-sm">Try adjusting your search or filters.</p>
                        </div>
                    )}
                </div>
            </div>
            {editingImage && (
                <EditModal 
                    image={editingImage}
                    onClose={() => setEditingImage(null)}
                    onSave={(updates) => onUpdateImage(editingImage.id, updates)}
                />
            )}
            {previewImageUrl && (
                <ImagePreviewModal
                    isOpen={!!previewImageUrl}
                    imageUrl={previewImageUrl}
                    onClose={() => setPreviewImageUrl(null)}
                />
            )}
            <ConfirmationModal
                isOpen={!!imageToDelete}
                onClose={() => setImageToDelete(null)}
                onConfirm={() => {
                    if (imageToDelete) {
                        onDeleteImage(imageToDelete.id);
                    }
                }}
                title="Delete Asset"
                message={`Are you sure you want to delete "${imageToDelete?.name}"? This action cannot be undone.`}
                confirmButtonText="Delete"
            />
        </>
    );
};

export default AssetLibrary;