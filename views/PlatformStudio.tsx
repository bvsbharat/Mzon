
import React, { useState, useCallback, useRef } from 'react';
// FIX: Updated import to use types.ts to prevent circular dependencies.
import { View, GalleryImage } from '../types';
import { adaptImage, generateContentWithNewsContext, generateMultiPlatformContent } from '../services/geminiService';
import Spinner from '../components/Spinner';
import ComparisonSlider from '../components/ComparisonSlider';
import Icon, { IconName } from '../components/Icon';
import ImagePreviewModal from '../components/ImagePreviewModal';
import AssetLibraryModal from '../components/AssetLibraryModal';
import NewsDiscoveryPanel from '../components/NewsDiscoveryPanel';

const ADAPTATION_COST = 3;

interface PlatformStudioProps {
  masterImageUrl: string | null;
  onNavigate: (view: View) => void;
  setMasterImage: (url: string | null) => void;
  addImageToLibrary: (url: string) => void;
  credits: number;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
  addNotification: (message: string, type?: 'success' | 'error') => void;
  galleryImages: GalleryImage[];
}

const ASPECT_RATIOS: { name: string; value: string; icon: IconName }[] = [
    { name: 'Story / Reel', value: '9:16', icon: 'smartphone' },
    { name: 'Portrait Post', value: '4:5', icon: 'image' },
    { name: 'Square Post', value: '1:1', icon: 'grid' },
    { name: 'Landscape / Banner', value: '16:9', icon: 'photo' },
];

const PlatformStudio: React.FC<PlatformStudioProps> = ({ 
    masterImageUrl, 
    onNavigate,
    setMasterImage,
    addImageToLibrary,
    credits,
    setCredits,
    addNotification,
    galleryImages
}) => {
    const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>(ASPECT_RATIOS[0].value);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [adaptedImageUrl, setAdaptedImageUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'adapt' | 'news'>('adapt');
    const [newsContext, setNewsContext] = useState<string | null>(null);
    const [generatedContent, setGeneratedContent] = useState<Record<string, string>>({});
    const [isGeneratingContent, setIsGeneratingContent] = useState(false);
    const [newsArticles, setNewsArticles] = useState<any[]>([]);
    const [selectedArticle, setSelectedArticle] = useState<any | null>(null);

    React.useEffect(() => {
        setAdaptedImageUrl(null);
        setError(null);
    }, [masterImageUrl]);

    const handleGenerate = useCallback(async () => {
        if (!masterImageUrl) return;
        if (credits < ADAPTATION_COST) {
            setError(`Insufficient credits. You need ${ADAPTATION_COST} to generate an adaptation.`);
            return;
        }
        setIsGenerating(true);
        setError(null);
        try {
            const resultUrl = await adaptImage(masterImageUrl, selectedAspectRatio);
            setCredits(prev => prev - ADAPTATION_COST);
            setAdaptedImageUrl(resultUrl);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'An error occurred while adapting the image.');
        } finally {
            setIsGenerating(false);
        }
    }, [masterImageUrl, selectedAspectRatio, credits, setCredits]);

    const handleSaveToLibrary = () => {
        if (adaptedImageUrl) {
            addImageToLibrary(adaptedImageUrl);
            addNotification('Adapted image saved to library!');
        }
    };

    const handleNewsContext = useCallback((context: string) => {
        setNewsContext(context);
        addNotification('News context loaded! Ready to generate content.', 'success');
    }, [addNotification]);

    const handleArticlesDiscovered = useCallback((articles: any[]) => {
        setNewsArticles(articles);
        if (articles.length > 0) {
            setSelectedArticle(articles[0]); // Select first article by default
        }
    }, []);

    const handleGenerateContentWithNews = useCallback(async () => {
        if (!newsContext) {
            addNotification('Please discover news first', 'error');
            return;
        }

        if (credits < 5) {
            addNotification('Insufficient credits. You need 5 credits to generate content.', 'error');
            return;
        }

        setIsGeneratingContent(true);
        try {
            const platforms = ['instagram', 'twitter', 'linkedin', 'facebook'];
            const content = await generateMultiPlatformContent(
                newsContext,
                platforms,
                masterImageUrl || undefined
            );

            setGeneratedContent(content);
            setCredits(prev => prev - 5);
            addNotification('Content generated successfully!', 'success');
        } catch (error) {
            console.error('Content generation failed:', error);
            addNotification('Failed to generate content', 'error');
        } finally {
            setIsGeneratingContent(false);
        }
    }, [newsContext, masterImageUrl, credits, setCredits, addNotification]);
    
    const handleFile = useCallback((file: File | null) => {
        if (!file) return;
        if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                setMasterImage(dataUrl);
            };
            reader.readAsDataURL(file);
        } else {
            alert('Please upload a valid image file (JPEG, PNG, WEBP).');
        }
    }, [setMasterImage]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        handleFile(event.target.files?.[0] || null);
        event.target.value = '';
    };

    const onDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
    const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
    const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); }, []);
    const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleFile(e.dataTransfer.files?.[0] || null);
    }, [handleFile]);

    const handleSelectFromLibrary = useCallback((image: GalleryImage) => {
      setMasterImage(image.url);
      setIsLibraryModalOpen(false);
    }, [setMasterImage]);

    if (!masterImageUrl) {
        return (
          <>
            <div className="w-full h-full flex items-center justify-center text-center animate-fade-in-up p-4 sm:p-6 lg:p-8">
              <div className="max-w-3xl w-full">
                <div className="pt-6 pb-6 border-b border-gray-200 mb-6">
                  <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Adapt Image for Any Platform</h1>
                  <p className="mt-4 text-base text-gray-600 max-w-xl mx-auto">Provide a master image by uploading it or choosing from your asset library.</p>
                </div>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop} className={`relative bg-white p-6 rounded-lg border flex flex-col items-center justify-center text-center transition-colors ${ isDragging ? 'bg-slate-100' : '' }`}>
                    {isDragging && (<div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center pointer-events-none rounded-lg border-2 border-dashed border-gray-400"><p className="text-lg font-semibold text-gray-700">Drop image to upload</p></div>)}
                    <div className="w-12 h-12 mx-auto rounded-lg bg-slate-100 flex items-center justify-center"><Icon icon="uploadCloud" className="w-6 h-6 text-gray-500" /></div>
                    <h2 className="mt-4 font-semibold text-gray-800">Upload Image</h2>
                    <p className="mt-1 text-sm text-gray-600 flex-grow">Use any image from your device as the source for adaptation.</p>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/png, image/jpeg, image/webp" />
                    <button onClick={() => fileInputRef.current?.click()} className="mt-6 w-full inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-900">Upload Image</button>
                  </div>
                  <div className="bg-white p-6 rounded-lg border flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 mx-auto rounded-lg bg-slate-100 flex items-center justify-center"><Icon icon="colorPalette" className="w-6 h-6 text-gray-500" /></div>
                    <h2 className="mt-4 font-semibold text-gray-800">Select from Library</h2>
                    <p className="mt-1 text-sm text-gray-600 flex-grow">Choose a previously generated or saved image from your asset library.</p>
                    <button onClick={() => setIsLibraryModalOpen(true)} disabled={galleryImages.length === 0} className="mt-6 w-full inline-flex items-center justify-center px-5 py-2.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Open Library</button>
                  </div>
                </div>
              </div>
            </div>
            <AssetLibraryModal
              isOpen={isLibraryModalOpen}
              onClose={() => setIsLibraryModalOpen(false)}
              galleryImages={galleryImages}
              onImageSelect={handleSelectFromLibrary}
            />
          </>
        );
    }

    return (
        <>
            <div className="w-full h-full flex flex-col animate-fade-in-up p-4 sm:p-6 lg:p-8">
                <div className="flex-shrink-0 pb-6 pt-6 border-b border-gray-200 mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Platform Studio</h1>
                    <p className="mt-2 text-base text-gray-600">Adapt your creative for any platform and generate content from latest news.</p>

                    {/* Tab Navigation */}
                    <div className="flex mt-4 space-x-1 bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('adapt')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                activeTab === 'adapt'
                                    ? 'bg-white text-gray-900 shadow'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            🎨 Image Adaptation
                        </button>
                        <button
                            onClick={() => setActiveTab('news')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                activeTab === 'news'
                                    ? 'bg-white text-gray-900 shadow'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            🤖 News Content Generation
                        </button>
                    </div>
                </div>
                <div className="flex-grow min-h-0">
                    {/* Tab Content */}
                    {activeTab === 'adapt' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                        {/* Left Column: Controls */}
                        <div className="lg:col-span-1 flex flex-col gap-6">
                            <div className="bg-white p-6 rounded-lg border">
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-sm font-medium text-gray-700">1. Source Image</label>
                                            <button onClick={() => setMasterImage(null)} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-gray-600 bg-white border rounded-md hover:bg-gray-50">
                                                <Icon icon="arrowPath" className="w-3 h-3" /> <span>Change</span>
                                            </button>
                                        </div>
                                        <div className="aspect-square w-full bg-slate-100 rounded-md">
                                            <img src={masterImageUrl} alt="Master product shot" className="w-full h-full object-contain rounded-md" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">2. Choose an Aspect Ratio</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {ASPECT_RATIOS.map(ratio => (
                                                <button key={ratio.value} onClick={() => setSelectedAspectRatio(ratio.value)} className={`flex items-center gap-2 p-2 text-sm rounded-md border text-left transition-colors ${selectedAspectRatio === ratio.value ? 'bg-gray-800 text-white border-gray-800' : 'bg-white hover:bg-slate-50 text-gray-700 border-gray-200'}`}>
                                                    <Icon icon={ratio.icon} className="w-4 h-4 flex-shrink-0" />
                                                    <span>{ratio.name} <span className="opacity-60">({ratio.value})</span></span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <button onClick={handleGenerate} disabled={isGenerating || credits < ADAPTATION_COST} className="w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-sm font-semibold rounded-md text-white bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400">
                                        {isGenerating ? (
                                            <><Spinner className="h-4 w-4 text-white mr-2" /> Adapting...</>
                                        ) : (
                                            <>
                                                <Icon icon="sparkles" className="w-4 h-4 mr-2" />
                                                <span>Adapt Image</span>
                                            </>
                                        )}
                                    </button>
                                    {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
                                </div>
                            </div>
                        </div>
                        
                        {/* Right Column: Result */}
                        <div className="lg:col-span-2 flex flex-col bg-white p-6 rounded-lg border">
                             {isGenerating && (
                                <div className="w-full h-full flex flex-col items-center justify-center">
                                    <Spinner className="w-10 h-10 text-gray-800" />
                                    <p className="mt-4 text-gray-700 font-semibold">Adapting your image...</p>
                                </div>
                            )}
                            {!isGenerating && adaptedImageUrl ? (
                                <div className="w-full">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 text-center">Adapted Image</h3>
                                    <div className="relative group max-w-full mx-auto" style={{ aspectRatio: selectedAspectRatio.replace(':', ' / ')}}>
                                        <img src={adaptedImageUrl} alt="Adapted result" className="w-full h-full object-contain" />
                                        <button
                                            onClick={() => setPreviewImageUrl(adaptedImageUrl)}
                                            className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer hover:bg-black/70"
                                            aria-label="Preview image"
                                        >
                                            <Icon icon="expand" className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
                                         <a
                                            href={adaptedImageUrl}
                                            download={`adapted-image-${selectedAspectRatio.replace(':', 'x')}.png`}
                                            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold rounded-md text-white bg-gray-800 hover:bg-gray-900"
                                        >
                                            <Icon icon="download" className="w-4 h-4 mr-2" />
                                            Download
                                        </a>
                                        <button
                                            onClick={handleSaveToLibrary}
                                            className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                        >
                                            <Icon icon="save" className="w-4 h-4 mr-2" />
                                            Save to Library
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                !isGenerating && (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-center text-gray-500 p-8">
                                        <Icon icon="crop" className="w-12 h-12 text-gray-300" />
                                        <h3 className="mt-4 text-lg font-semibold text-gray-800">Ready to Adapt</h3>
                                        <p className="mt-1 text-sm">Your adapted image will appear here.</p>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                    )}

                    {activeTab === 'news' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <NewsDiscoveryPanel
                                    onNewsContext={handleNewsContext}
                                    onArticlesDiscovered={handleArticlesDiscovered}
                                    onError={(msg) => addNotification(msg, 'error')}
                                    onSuccess={(msg) => addNotification(msg, 'success')}
                                />

                                <div className="space-y-6">
                                    {/* Content Generation Section */}
                                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">📱 Generate Content</h3>
                                        <div className="space-y-4">
                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <p className="text-sm text-gray-600">
                                                    {newsContext ? (
                                                        <span className="flex items-center gap-2">
                                                            <Icon name="check" className="w-4 h-4 text-green-600" />
                                                            News context loaded and ready for content generation
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-2">
                                                            <Icon name="info" className="w-4 h-4 text-blue-600" />
                                                            Discover news first to generate contextual content
                                                        </span>
                                                    )}
                                                </p>
                                            </div>

                                            <button
                                                onClick={handleGenerateContentWithNews}
                                                disabled={!newsContext || isGeneratingContent || credits < 5}
                                                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                {isGeneratingContent ? (
                                                    <>
                                                        <Spinner />
                                                        <span>Generating Content...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Icon name="sparkles" className="w-4 h-4" />
                                                        <span>Generate Multi-Platform Content (5 credits)</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Generated Content Display */}
                                    {Object.keys(generatedContent).length > 0 && (
                                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                                            <h4 className="text-lg font-semibold text-gray-900 mb-4">✨ Generated Content</h4>
                                            <div className="space-y-4">
                                                {Object.entries(generatedContent).map(([platform, content]) => (
                                                    <div key={platform} className="border border-gray-200 rounded-lg p-4">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <h5 className="font-medium text-gray-900 capitalize">
                                                                {platform === 'instagram' && '📷'}
                                                                {platform === 'twitter' && '🐦'}
                                                                {platform === 'linkedin' && '💼'}
                                                                {platform === 'facebook' && '👍'}
                                                                {' '}{platform}
                                                            </h5>
                                                            <button
                                                                onClick={() => navigator.clipboard.writeText(content)}
                                                                className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                                                            >
                                                                Copy
                                                            </button>
                                                        </div>
                                                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{content}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Generated Images Display */}
                                    {selectedArticle && selectedArticle.generated_images && (
                                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                                            <h4 className="text-lg font-semibold text-gray-900 mb-4">🎨 Generated Images</h4>
                                            <div className="space-y-4">
                                                {Object.entries(selectedArticle.generated_images).map(([platform, imageUrl]) => (
                                                    <div key={platform} className="border border-gray-200 rounded-lg p-4">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <h5 className="font-medium text-gray-900 capitalize">
                                                                {platform === 'instagram' && '📷'}
                                                                {platform === 'twitter' && '🐦'}
                                                                {platform === 'linkedin' && '💼'}
                                                                {platform === 'facebook' && '👍'}
                                                                {' '}{platform}
                                                            </h5>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => addImageToLibrary(imageUrl as string)}
                                                                    className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                                                                >
                                                                    Save to Library
                                                                </button>
                                                                <a
                                                                    href={imageUrl as string}
                                                                    download={`news-${platform}-image.png`}
                                                                    className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                                                                >
                                                                    Download
                                                                </a>
                                                            </div>
                                                        </div>
                                                        <div className="relative">
                                                            <img
                                                                src={imageUrl as string}
                                                                alt={`Generated ${platform} image`}
                                                                className="w-full max-w-xs mx-auto rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                                                onClick={() => setPreviewImageUrl(imageUrl as string)}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Article Selector */}
                                    {newsArticles.length > 1 && (
                                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                                            <h4 className="text-lg font-semibold text-gray-900 mb-4">📰 Select Article</h4>
                                            <div className="space-y-2">
                                                {newsArticles.map((article, index) => (
                                                    <button
                                                        key={index}
                                                        onClick={() => setSelectedArticle(article)}
                                                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                                            selectedArticle === article
                                                                ? 'border-blue-500 bg-blue-50'
                                                                : 'border-gray-200 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <div className="font-medium text-gray-900">{article.title}</div>
                                                        <div className="text-sm text-gray-600 mt-1">{article.summary}</div>
                                                        {article.generated_images && (
                                                            <div className="text-xs text-blue-600 mt-1">
                                                                🎨 {Object.keys(article.generated_images).length} images
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
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

export default PlatformStudio;