// FIX: Corrected the React import statement. 'aistudio' is not a valid export from 'react'.
import React from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import PhotoStudio from './views/PhotoStudio';
import ImageComposer from './views/ImageComposer';
import MagicEdit from './views/MagicEdit';
import VariationStudio from './views/VariationStudio';
import AssetLibrary from './views/AssetLibrary';
import ImageGenerator from './views/ImageGenerator';
import CampaignStudio, { Creative } from './views/CampaignStudio';
import PlatformStudio from './views/PlatformStudio';
import NewsHub from './views/NewsHub';
import ContentCreator from './views/ContentCreator';
import VideoCreator from './components/VideoCreator';
import ProtectedRoute from './components/ProtectedRoute';
// FIX: Moved View and ComposerGenContext to types.ts to resolve a circular dependency.
import { GalleryImage, View, ComposerGenContext, NewsContentWorkflow, NewsItem, MediaType } from './types';
import NotificationHost, { Notification } from './components/NotificationHost';
import WelcomeModal from './components/WelcomeModal';
import CompletionModal from './components/CompletionModal';
import StorageStatus from './components/StorageStatus';
import { storageService, ImageMetadata } from './services/storageService';

const VIEW_TITLES: Record<View, string> = {
  photo: 'Photo Studio',
  variation: 'Create Variation',
  composer: 'Image Composer',
  edit: 'Magic Edit',
  library: 'Asset Library',
  imageGenerator: 'Image Generator',
  campaign: 'Campaign Builder',
  platform: 'Platform Studio',
  newsHub: 'Latest News',
  contentCreator: 'Content Creator',
};

const App: React.FC = () => {
  // FIX: Replaced 'aistudio' with 'React' to correctly use React hooks.
  const [activeView, setActiveView] = React.useState<View>('photo');
  const [activeStudioImage, setActiveStudioImage] = React.useState<string | null>(null);
  const [masterImageId, setMasterImageId] = React.useState<string | null>(null);
  const [composerContextImageUrls, setComposerContextImageUrls] = React.useState<string[]>([]);
  const [composerGenContext, setComposerGenContext] = React.useState<ComposerGenContext>(null);
  const [galleryImages, setGalleryImages] = React.useState<GalleryImage[]>([]);
  const [credits, setCredits] = React.useState(100000);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);

  // State for preserving studio results across navigation
  const [latestVariationUrl, setLatestVariationUrl] = React.useState<string | null>(null);
  const [composedImageUrl, setComposedImageUrl] = React.useState<string | null>(null);
  const [editedImageUrl, setEditedImageUrl] = React.useState<string | null>(null);
  const [campaignCreatives, setCampaignCreatives] = React.useState<Creative[]>([]);

  // State for onboarding flow
  const [onboardingActive, setOnboardingActive] = React.useState(false);
  const [onboardingStep, setOnboardingStep] = React.useState(0);
  const [showCompletionModal, setShowCompletionModal] = React.useState(false);

  // News content workflow state
  const [newsWorkflow, setNewsWorkflow] = React.useState<NewsContentWorkflow>({
    selectedNewsItem: null,
    step: 'news_selection',
    mediaType: null,
    targetPlatforms: [],
    generatedAssets: {
      images: [],
      videos: [],
      text: '',
      hashtags: []
    }
  });

  // Check for onboarding completion on initial mount
  /*
  React.useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('onboardingCompleted');
    if (hasCompletedOnboarding !== 'true') {
      setOnboardingActive(true);
      setOnboardingStep(0); // 0 corresponds to the Welcome Modal
    }
  }, []);
  */

  // Invalidate studio results when the master image changes
  React.useEffect(() => {
    setLatestVariationUrl(null);
    setComposedImageUrl(null);
    setEditedImageUrl(null);
    setCampaignCreatives([]);
    setComposerContextImageUrls([]);
  }, [activeStudioImage]);


  const addNotification = (message: string, type: 'success' | 'error' = 'success') => {
    const id = crypto.randomUUID();
    setNotifications(prev => [...prev, { id, message, type }]);
  };

  const removeNotification = (id: string) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleNavigate = (view: View) => {
    setActiveView(view);
    setIsSidebarOpen(false); // Close sidebar on navigation
  };
  
  const setMasterImage = (imageUrl: string | null) => {
    if (imageUrl === null) {
        setActiveStudioImage(null);
        // Do not clear masterImageId, so the last master remains marked in the library.
    } else {
        const newMaster: GalleryImage = {
            id: crypto.randomUUID(),
            url: imageUrl,
            name: `Master Shot ${new Date().toLocaleTimeString()}`,
            tags: ['master'],
            isFavorite: true,
            createdAt: Date.now(),
        };
        setActiveStudioImage(newMaster.url);
        setMasterImageId(newMaster.id);
        setGalleryImages(prev => {
            const filtered = prev.filter(p => p.url !== imageUrl);
            return [newMaster, ...filtered];
        });
    }
  };

  const addImageToLibrary = async (imageUrl: string, name: string = 'Generated Image', imageType?: ImageMetadata['imageType']) => {
      if (!galleryImages.some(img => img.url === imageUrl)) {
          try {
              // Store the image using the storage service (S3 if configured, otherwise data URL)
              const storageResult = await storageService.storeImage(imageUrl, {
                  imageType: imageType || 'generated',
                  customName: name.toLowerCase().replace(/\s+/g, '-'),
              });

              const newImage: GalleryImage = {
                  id: crypto.randomUUID(),
                  url: storageResult.url, // This will be S3 URL if upload succeeded, or data URL as fallback
                  name: `${name} #${galleryImages.length + 1}`,
                  tags: storageResult.isS3 ? ['s3-stored'] : ['local'],
                  isFavorite: false,
                  createdAt: Date.now()
              };

              setGalleryImages(prev => [newImage, ...prev]);

              // Show notification about storage method
              if (storageResult.isS3) {
                  addNotification(`${name} saved to cloud storage`, 'success');
              } else if (storageResult.error) {
                  addNotification(`${name} saved locally (cloud storage unavailable)`, 'success');
              }
          } catch (error) {
              console.error('Failed to store image:', error);

              // Fallback to original behavior if storage service fails
              const newImage: GalleryImage = {
                  id: crypto.randomUUID(),
                  url: imageUrl,
                  name: `${name} #${galleryImages.length + 1}`,
                  tags: ['local'],
                  isFavorite: false,
                  createdAt: Date.now()
              };
              setGalleryImages(prev => [newImage, ...prev]);
              addNotification(`${name} saved locally`, 'success');
          }
      }
  };

  const updateGalleryImage = (imageId: string, updates: Partial<Omit<GalleryImage, 'id' | 'url' | 'createdAt'>>) => {
      setGalleryImages(prev => prev.map(img => 
          img.id === imageId ? { ...img, ...updates } : img
      ));
  };

  const deleteGalleryImage = async (imageId: string) => {
      const deletedImage = galleryImages.find(img => img.id === imageId);
      if (!deletedImage) return;

      try {
          // Attempt to delete from storage (S3 if applicable)
          await storageService.deleteImage(deletedImage.url);
      } catch (error) {
          console.error('Failed to delete image from storage:', error);
          // Continue with local deletion even if cloud deletion fails
      }

      setGalleryImages(prev => prev.filter(img => img.id !== imageId));

      if(deletedImage.url === activeStudioImage) {
          setActiveStudioImage(null);
      }
      if(deletedImage.id === masterImageId) {
          setMasterImageId(null);
      }
      addNotification(`Deleted "${deletedImage.name}"`, 'success');
  };
  
  const handleSetMasterFromLibrary = (image: GalleryImage) => {
      setActiveStudioImage(image.url);
      setMasterImageId(image.id);
      updateGalleryImage(image.id, {
          isFavorite: true,
          tags: [...new Set([...image.tags, 'master'])]
      });
      addNotification(`Set "${image.name}" as the new master image.`);
      handleNavigate('variation');
  };

  const handleComposerImageGenerated = (imageUrl: string, targetSlot: number) => {
    setComposerContextImageUrls(prev => {
        const newUrls = [...prev];
        // Ensure the array is long enough
        while (newUrls.length <= targetSlot) {
            newUrls.push(''); // or some placeholder if needed
        }
        newUrls[targetSlot] = imageUrl; // Replace or add at the specific index
        return newUrls.filter(url => url); // Clean up empty spots if any logic creates them
    });
    setComposerGenContext(null);
    handleNavigate('composer'); // Navigate back
  };

  const handleSendToComposer = (imageUrl: string) => {
    if (composerContextImageUrls.length < 4) {
        setComposerContextImageUrls(prev => [...prev, imageUrl]);
    }
    handleNavigate('composer');
  };

  // Onboarding handlers
  const handleStartOnboarding = () => {
    setOnboardingStep(1); // Move to the first interactive step
  };

  const handleSkipOnboarding = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    setOnboardingActive(false);
  };

  const handleNextOnboardingStep = () => {
    setOnboardingStep(prev => prev + 1);
  };
  
  const handleCompleteOnboarding = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    setOnboardingActive(false);
    setShowCompletionModal(true);
  };

  // News workflow handlers
  const handleNewsSelected = (newsItem: NewsItem) => {
    setNewsWorkflow(prev => ({
      ...prev,
      selectedNewsItem: newsItem,
      step: 'media_type_selection',
      generatedAssets: {
        images: [],
        videos: [],
        text: newsItem.description,
        hashtags: newsItem.hashtags
      }
    }));
    setActiveView('contentCreator');
    addNotification(`Selected "${newsItem.title}" for content creation`);
  };

  const handleMediaTypeSelected = (mediaType: MediaType) => {
    setNewsWorkflow(prev => ({
      ...prev,
      mediaType,
      step: 'content_generation'
    }));

    // Navigate to appropriate tool based on media type
    if (mediaType === 'image') {
      setActiveView('imageGenerator');
    } else if (mediaType === 'video') {
      // Video creator is now available
      addNotification('Video creation ready!');
    } else {
      // Mixed media - stay in content creator
      addNotification('Mixed media creation ready!');
    }
  };

  const handleWorkflowReset = () => {
    setNewsWorkflow({
      selectedNewsItem: null,
      step: 'news_selection',
      mediaType: null,
      targetPlatforms: [],
      generatedAssets: {
        images: [],
        videos: [],
        text: '',
        hashtags: []
      }
    });
  };

  const handleVideoGeneration = async (config: any) => {
    addNotification('Generating video... This may take a few moments.');

    // Simulate video generation process
    setTimeout(() => {
      const mockVideoUrl = `https://example.com/generated-video-${Date.now()}.mp4`;

      setNewsWorkflow(prev => ({
        ...prev,
        step: 'content_finalization',
        generatedAssets: {
          ...prev.generatedAssets,
          videos: [...prev.generatedAssets.videos, mockVideoUrl]
        }
      }));

      addNotification('Video generated successfully!');
      setActiveView('contentCreator');
    }, 3000);
  };


  const renderView = () => {
    switch (activeView) {
      case 'photo':
        return <PhotoStudio 
                  activeStudioImage={activeStudioImage}
                  setMasterImage={setMasterImage}
                  onNavigate={handleNavigate} 
                  credits={credits}
                  setCredits={setCredits}
                  onboardingActive={onboardingActive}
                  onboardingStep={onboardingStep}
                  onNextOnboardingStep={handleNextOnboardingStep}
                  onCompleteOnboarding={handleCompleteOnboarding}
                  onSkipOnboarding={handleSkipOnboarding}
                  addImageToLibrary={addImageToLibrary}
                  addNotification={addNotification}
                />;
      case 'variation':
        return <VariationStudio
                  masterImageUrl={activeStudioImage}
                  onNavigate={handleNavigate}
                  setMasterImage={setMasterImage}
                  addImageToLibrary={addImageToLibrary}
                  credits={credits}
                  setCredits={setCredits}
                  addNotification={addNotification}
                  latestVariationUrl={latestVariationUrl}
                  setLatestVariationUrl={setLatestVariationUrl}
                />;
      case 'composer':
        return <ImageComposer
                  imageUrl={activeStudioImage}
                  contextImageUrls={composerContextImageUrls}
                  // FIX: Passed the correct state setter function `setComposerContextImageUrls` to the `setContextImageUrls` prop.
                  setContextImageUrls={setComposerContextImageUrls}
                  setComposerGenContext={setComposerGenContext}
                  onNavigate={handleNavigate}
                  setMasterImage={setMasterImage}
                  addImageToLibrary={addImageToLibrary}
                  credits={credits}
                  setCredits={setCredits}
                  addNotification={addNotification}
                  composedImageUrl={composedImageUrl}
                  setComposedImageUrl={setComposedImageUrl}
                />;
      case 'edit':
        return <MagicEdit
                  imageUrl={activeStudioImage}
                  onNavigate={handleNavigate}
                  setMasterImage={setMasterImage}
                  addImageToLibrary={addImageToLibrary}
                  credits={credits}
                  setCredits={setCredits}
                  addNotification={addNotification}
                  editedImageUrl={editedImageUrl}
                  setEditedImageUrl={setEditedImageUrl}
                />;
      case 'library':
        return <AssetLibrary
                  masterImageId={masterImageId}
                  galleryImages={galleryImages}
                  onNavigate={handleNavigate}
                  onUpdateImage={updateGalleryImage}
                  onDeleteImage={deleteGalleryImage}
                  onSetAsMaster={handleSetMasterFromLibrary}
                />;
      case 'imageGenerator':
          return <ImageGenerator
                    onNavigate={handleNavigate}
                    onSendToComposer={handleSendToComposer}
                    onImageGeneratedForComposer={handleComposerImageGenerated}
                    composerGenContext={composerGenContext}
                    addImageToLibrary={addImageToLibrary}
                    credits={credits}
                    setCredits={setCredits}
                    addNotification={addNotification}
                  />;
      case 'campaign':
          return <CampaignStudio
                    masterImageUrl={activeStudioImage}
                    setMasterImage={setMasterImage}
                    onNavigate={handleNavigate}
                    addImageToLibrary={addImageToLibrary}
                    credits={credits}
                    setCredits={setCredits}
                    addNotification={addNotification}
                    galleryImages={galleryImages}
                    creatives={campaignCreatives}
                    setCreatives={setCampaignCreatives}
                  />;
      case 'platform':
          return <PlatformStudio
                    masterImageUrl={activeStudioImage}
                    setMasterImage={setMasterImage}
                    onNavigate={handleNavigate}
                    addImageToLibrary={addImageToLibrary}
                    credits={credits}
                    setCredits={setCredits}
                    addNotification={addNotification}
                    galleryImages={galleryImages}
                  />;
      case 'newsHub':
          return <NewsHub
                    onNavigate={handleNavigate}
                    onNewsSelected={handleNewsSelected}
                  />;
      case 'contentCreator':
          // Show VideoCreator when in video content generation step
          if (newsWorkflow.step === 'content_generation' &&
              newsWorkflow.mediaType === 'video' &&
              newsWorkflow.selectedNewsItem) {
            return <VideoCreator
                      selectedNewsItem={newsWorkflow.selectedNewsItem}
                      onBack={handleWorkflowReset}
                      onGenerateVideo={handleVideoGeneration}
                    />;
          }

          return <ContentCreator
                    onNavigate={handleNavigate}
                    addImageToLibrary={addImageToLibrary}
                    addNotification={addNotification}
                    newsWorkflow={newsWorkflow}
                    onMediaTypeSelected={handleMediaTypeSelected}
                    onWorkflowReset={handleWorkflowReset}
                  />;
      default:
        return <PhotoStudio 
                  activeStudioImage={activeStudioImage}
                  setMasterImage={setMasterImage}
                  onNavigate={handleNavigate} 
                  credits={credits}
                  setCredits={setCredits}
                  onboardingActive={onboardingActive}
                  onboardingStep={onboardingStep}
                  onNextOnboardingStep={handleNextOnboardingStep}
                  onCompleteOnboarding={handleCompleteOnboarding}
                  onSkipOnboarding={handleSkipOnboarding}
                  addImageToLibrary={addImageToLibrary}
                  addNotification={addNotification}
                />;
    }
  };

  return (
    <ProtectedRoute>
      <div className="h-screen flex bg-white font-sans text-gray-800 antialiased overflow-hidden">
        <Sidebar
          activeView={activeView}
          setActiveView={handleNavigate}
          credits={credits}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col min-w-0 relative">
          <Header onMenuClick={() => setIsSidebarOpen(true)} title={VIEW_TITLES[activeView]} />
          <main className="flex-grow flex flex-col bg-slate-50 overflow-y-auto">
            <div className="flex-grow flex flex-col">
              {renderView()}
            </div>
          </main>
        </div>

        <NotificationHost notifications={notifications} onRemoveNotification={removeNotification} />
        <StorageStatus />

        {/* {onboardingActive && onboardingStep === 0 && (
          <WelcomeModal onStart={handleStartOnboarding} onSkip={handleSkipOnboarding} />
        )}
        {showCompletionModal && (
          <CompletionModal onClose={() => setShowCompletionModal(false)} />
        )} */}

        <style>{`
          @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-up {
            animation: fade-in-up 0.5s ease-out forwards;
          }
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }
          @keyframes slide-in-right {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          .animate-slide-in-right {
            animation: slide-in-right 0.5s ease-out forwards;
          }
          @keyframes slide-out-right {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
          }
          .animate-slide-out-right {
            animation: slide-out-right 0.5s ease-out forwards;
          }
          /*
          .onboarding-highlight {
              box-shadow: 0 0 0 4px rgba(67, 56, 202, 0.5);
              border-radius: 0.5rem;
              transition: box-shadow 0.3s ease-in-out;
              animation: pulse-glow 2s infinite;
          }
          @keyframes pulse-glow {
              0% { box-shadow: 0 0 0 4px rgba(67, 56, 202, 0.5); }
              50% { box-shadow: 0 0 0 8px rgba(67, 56, 202, 0.2); }
              100% { box-shadow: 0 0 0 4px rgba(67, 56, 202, 0.5); }
          }
          */
        `}</style>
      </div>
    </ProtectedRoute>
  );
};

export default App;