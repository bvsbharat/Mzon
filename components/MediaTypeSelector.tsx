import React from 'react';
import { MediaType, NewsItem } from '../types';
import Icon from './Icon';

interface MediaTypeSelectorProps {
  selectedNewsItem: NewsItem;
  onSelectMediaType: (mediaType: MediaType) => void;
  onBack: () => void;
}

const MediaTypeSelector: React.FC<MediaTypeSelectorProps> = ({
  selectedNewsItem,
  onSelectMediaType,
  onBack
}) => {
  const mediaTypes = [
    {
      type: 'image' as MediaType,
      icon: 'image',
      title: 'Image Creation',
      description: 'Generate professional images and graphics based on the news article',
      features: [
        'AI-powered image generation',
        'Social media optimized formats',
        'Brand consistent visuals',
        'Multiple style options'
      ],
      color: 'from-blue-500 to-cyan-500'
    },
    {
      type: 'video' as MediaType,
      icon: 'smartphone',
      title: 'Video Creation',
      description: 'Create engaging video content with the news as foundation',
      features: [
        'Text-to-video generation',
        'News summary videos',
        'Platform-specific formats',
        'Auto-generated captions'
      ],
      color: 'from-purple-500 to-pink-500'
    },
    {
      type: 'mixed' as MediaType,
      icon: 'layers',
      title: 'Mixed Media',
      description: 'Combine images, video, and text for comprehensive content',
      features: [
        'Carousel posts',
        'Image + video combinations',
        'Interactive stories',
        'Multi-platform packages'
      ],
      color: 'from-green-500 to-teal-500'
    }
  ];

  return (
    <div className="flex-grow flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon icon="arrowLeft" className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Choose Content Type</h1>
            <p className="text-gray-600">Select how you'd like to create content from this news article</p>
          </div>
        </div>

        {/* Selected Article Preview */}
        <div className="bg-gray-50 rounded-lg p-4 border">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {selectedNewsItem.source.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900">{selectedNewsItem.source}</span>
                {selectedNewsItem.isPremium && (
                  <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                    Premium
                  </div>
                )}
                {selectedNewsItem.isFresh && (
                  <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                    Fresh
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{selectedNewsItem.title}</h3>
              <p className="text-gray-600 text-sm line-clamp-2">{selectedNewsItem.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Media Type Options */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {mediaTypes.map((mediaType) => (
            <div
              key={mediaType.type}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer"
              onClick={() => onSelectMediaType(mediaType.type)}
            >
              <div className={`h-32 bg-gradient-to-br ${mediaType.color} p-6 flex items-center justify-center`}>
                <Icon icon={mediaType.icon as any} className="w-12 h-12 text-white" />
              </div>

              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                  {mediaType.title}
                </h3>

                <p className="text-gray-600 mb-4">
                  {mediaType.description}
                </p>

                <div className="space-y-2 mb-6">
                  {mediaType.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Icon icon="checkCircle" className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>

                <button className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors group-hover:bg-indigo-700">
                  Select {mediaType.title}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Help Text */}
        <div className="mt-8 text-center text-gray-500 max-w-2xl mx-auto">
          <p className="mb-2">
            Your selected content type will determine which tools and options are available for creating
            content based on "<strong>{selectedNewsItem.title}</strong>".
          </p>
          <p>
            You can always change your selection or create multiple types of content from the same article.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MediaTypeSelector;