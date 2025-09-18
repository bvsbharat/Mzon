import React, { useState } from 'react';
import { ContentTemplate, ContentProject, View, NewsContentWorkflow, MediaType } from '../types';
import Icon from '../components/Icon';
import MediaTypeSelector from '../components/MediaTypeSelector';

interface ContentCreatorProps {
  onNavigate: (view: View) => void;
  addImageToLibrary: (imageUrl: string, name?: string) => void;
  addNotification: (message: string, type?: 'success' | 'error') => void;
  newsWorkflow?: NewsContentWorkflow;
  onMediaTypeSelected?: (mediaType: MediaType) => void;
  onWorkflowReset?: () => void;
}

const ContentCreator: React.FC<ContentCreatorProps> = ({
  onNavigate,
  addImageToLibrary,
  addNotification,
  newsWorkflow,
  onMediaTypeSelected,
  onWorkflowReset
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'templates' | 'projects'>('templates');
  const [projects, setProjects] = useState<ContentProject[]>([]);

  // Mock templates data
  const templates: ContentTemplate[] = [
    {
      id: '1',
      name: 'Instagram Post',
      description: 'Square format perfect for Instagram feed posts',
      platform: 'instagram',
      type: 'post',
      dimensions: { width: 1080, height: 1080 }
    },
    {
      id: '2',
      name: 'Instagram Story',
      description: 'Vertical format for Instagram stories',
      platform: 'instagram',
      type: 'story',
      dimensions: { width: 1080, height: 1920 }
    },
    {
      id: '3',
      name: 'Facebook Post',
      description: 'Horizontal format optimized for Facebook engagement',
      platform: 'facebook',
      type: 'post',
      dimensions: { width: 1200, height: 630 }
    },
    {
      id: '4',
      name: 'Twitter Header',
      description: 'Banner format for Twitter profile headers',
      platform: 'twitter',
      type: 'post',
      dimensions: { width: 1500, height: 500 }
    },
    {
      id: '5',
      name: 'LinkedIn Post',
      description: 'Professional format for LinkedIn content',
      platform: 'linkedin',
      type: 'post',
      dimensions: { width: 1200, height: 627 }
    },
    {
      id: '6',
      name: 'YouTube Thumbnail',
      description: 'Eye-catching thumbnails for YouTube videos',
      platform: 'youtube',
      type: 'post',
      dimensions: { width: 1280, height: 720 }
    }
  ];

  const platformColors = {
    instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
    facebook: 'bg-blue-600',
    twitter: 'bg-sky-500',
    linkedin: 'bg-blue-700',
    youtube: 'bg-red-600',
    tiktok: 'bg-black'
  };

  const platformIcons = {
    instagram: 'camera',
    facebook: 'user',
    twitter: 'message',
    linkedin: 'briefcase',
    youtube: 'play',
    tiktok: 'music'
  } as const;

  const handleCreateProject = (template: ContentTemplate) => {
    const newProject: ContentProject = {
      id: crypto.randomUUID(),
      name: `${template.name} Project`,
      description: `New ${template.platform} ${template.type} project`,
      template,
      content: {
        text: '',
        images: [],
        hashtags: []
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setProjects(prev => [newProject, ...prev]);
    addNotification(`Created new ${template.name} project`);
  };

  const handleUseTemplate = (template: ContentTemplate) => {
    setSelectedTemplate(template);
    // In a real implementation, this could navigate to a content editor
    addNotification(`Selected ${template.name} template. Integration with image tools coming soon!`);
  };

  const handleBackToNews = () => {
    if (onWorkflowReset) {
      onWorkflowReset();
    }
    onNavigate('newsHub');
  };

  // If we're in media type selection step, show the MediaTypeSelector
  if (newsWorkflow?.step === 'media_type_selection' && newsWorkflow.selectedNewsItem && onMediaTypeSelected) {
    return (
      <MediaTypeSelector
        selectedNewsItem={newsWorkflow.selectedNewsItem}
        onSelectMediaType={onMediaTypeSelected}
        onBack={handleBackToNews}
      />
    );
  }

  return (
    <div className="flex-grow flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {newsWorkflow?.selectedNewsItem && (
              <button
                onClick={handleBackToNews}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon icon="arrowLeft" className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Content Creator</h1>
              {newsWorkflow?.selectedNewsItem && (
                <p className="text-gray-600">Creating content from news article</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onNavigate('imageGenerator')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Icon icon="image" className="w-4 h-4" />
              Generate Images
            </button>
            <button
              onClick={() => onNavigate('library')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Icon icon="colorPalette" className="w-4 h-4" />
              Asset Library
            </button>
          </div>
        </div>

        {/* News Context Preview */}
        {newsWorkflow?.selectedNewsItem && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {newsWorkflow.selectedNewsItem.source.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">{newsWorkflow.selectedNewsItem.source}</span>
                  <span className="text-sm text-blue-600">Selected News Article</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{newsWorkflow.selectedNewsItem.title}</h3>
                <p className="text-gray-600 text-sm mb-2">{newsWorkflow.selectedNewsItem.description}</p>
                <div className="flex items-center gap-2">
                  {newsWorkflow.selectedNewsItem.hashtags.map((hashtag, index) => (
                    <span key={index} className="text-blue-600 text-xs">
                      {hashtag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Media Type</div>
                <div className="font-medium text-gray-900 capitalize">
                  {newsWorkflow.mediaType || 'Not selected'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'templates'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'projects'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Projects ({projects.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'templates' ? (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Choose a Template</h2>
              <p className="text-gray-600">Start with a pre-designed template optimized for different social media platforms.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${platformColors[template.platform]}`}>
                        <Icon icon={platformIcons[template.platform] || 'image'} className="w-5 h-5" />
                      </div>
                      <span className="text-sm text-gray-500 capitalize">
                        {template.platform}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {template.name}
                    </h3>

                    <p className="text-gray-600 mb-4">
                      {template.description}
                    </p>

                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span>Dimensions:</span>
                      <span className="font-mono">
                        {template.dimensions.width} × {template.dimensions.height}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUseTemplate(template)}
                        className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                      >
                        Use Template
                      </button>
                      <button
                        onClick={() => handleCreateProject(template)}
                        className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        <Icon icon="plus" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Your Projects</h2>
              <p className="text-gray-600">Manage your content creation projects and drafts.</p>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-16">
                <Icon icon="edit" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                <p className="text-gray-500 mb-6">Create your first content project to get started.</p>
                <button
                  onClick={() => setActiveTab('templates')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Browse Templates
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-8 h-8 rounded flex items-center justify-center text-white text-sm ${platformColors[project.template.platform]}`}>
                        <Icon icon={platformIcons[project.template.platform] || 'image'} className="w-4 h-4" />
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="font-medium text-gray-900 mb-2">{project.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{project.description}</p>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 capitalize">
                        {project.template.platform} {project.template.type}
                      </span>
                      <button className="text-indigo-600 hover:text-indigo-800 text-sm">
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentCreator;