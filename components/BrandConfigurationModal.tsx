import React, { useState, useEffect } from 'react';
import { BrandConfiguration } from '../types';
import Icon from './Icon';

interface BrandConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (brandConfig: BrandConfiguration) => void;
  initialConfig?: BrandConfiguration;
}

const BrandConfigurationModal: React.FC<BrandConfigurationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialConfig
}) => {
  const [config, setConfig] = useState<BrandConfiguration>({
    brandName: '',
    brandVoice: 'professional',
    brandDescription: '',
    targetAudience: '',
    keyMessages: [''],
    industry: '',
    companySize: 'startup',
    contentStyle: 'informative',
    hashtagPreferences: [''],
    avoidWords: ['']
  });

  const [isLoading, setSaving] = useState(false);

  useEffect(() => {
    if (initialConfig) {
      setConfig({
        ...initialConfig,
        keyMessages: initialConfig.keyMessages.length ? initialConfig.keyMessages : [''],
        hashtagPreferences: initialConfig.hashtagPreferences.length ? initialConfig.hashtagPreferences : [''],
        avoidWords: initialConfig.avoidWords.length ? initialConfig.avoidWords : ['']
      });
    }
  }, [initialConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Clean up arrays by removing empty strings
      const cleanedConfig: BrandConfiguration = {
        ...config,
        keyMessages: config.keyMessages.filter(msg => msg.trim() !== ''),
        hashtagPreferences: config.hashtagPreferences.filter(tag => tag.trim() !== ''),
        avoidWords: config.avoidWords.filter(word => word.trim() !== '')
      };

      await onSave(cleanedConfig);
      onClose();
    } catch (error) {
      console.error('Error saving brand configuration:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleArrayChange = (
    field: 'keyMessages' | 'hashtagPreferences' | 'avoidWords',
    index: number,
    value: string
  ) => {
    setConfig(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field: 'keyMessages' | 'hashtagPreferences' | 'avoidWords') => {
    setConfig(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (
    field: 'keyMessages' | 'hashtagPreferences' | 'avoidWords',
    index: number
  ) => {
    setConfig(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Brand Configuration</h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure your brand voice and messaging for consistent content generation
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon icon="x" className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-6">
            {/* Basic Brand Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Name *
                </label>
                <input
                  type="text"
                  value={config.brandName}
                  onChange={(e) => setConfig(prev => ({ ...prev, brandName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your brand or company name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry
                </label>
                <input
                  type="text"
                  value={config.industry}
                  onChange={(e) => setConfig(prev => ({ ...prev, industry: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Technology, Healthcare, Finance"
                />
              </div>
            </div>

            {/* Brand Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand Description *
              </label>
              <textarea
                value={config.brandDescription}
                onChange={(e) => setConfig(prev => ({ ...prev, brandDescription: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe what your brand does, your mission, and what makes you unique"
                required
              />
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Audience *
              </label>
              <textarea
                value={config.targetAudience}
                onChange={(e) => setConfig(prev => ({ ...prev, targetAudience: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe your ideal customer demographics, interests, and pain points"
                required
              />
            </div>

            {/* Voice and Style */}
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Voice
                </label>
                <select
                  value={config.brandVoice}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    brandVoice: e.target.value as BrandConfiguration['brandVoice']
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="friendly">Friendly</option>
                  <option value="authoritative">Authoritative</option>
                  <option value="playful">Playful</option>
                  <option value="formal">Formal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Size
                </label>
                <select
                  value={config.companySize}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    companySize: e.target.value as BrandConfiguration['companySize']
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="startup">Startup</option>
                  <option value="small">Small Business</option>
                  <option value="medium">Medium Business</option>
                  <option value="large">Large Company</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content Style
                </label>
                <select
                  value={config.contentStyle}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    contentStyle: e.target.value as BrandConfiguration['contentStyle']
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="informative">Informative</option>
                  <option value="entertaining">Entertaining</option>
                  <option value="inspiring">Inspiring</option>
                  <option value="educational">Educational</option>
                  <option value="promotional">Promotional</option>
                </select>
              </div>
            </div>

            {/* Key Messages */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Key Messages
                <span className="text-gray-500 text-xs ml-1">(Main talking points for your brand)</span>
              </label>
              <div className="space-y-2">
                {config.keyMessages.map((message, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => handleArrayChange('keyMessages', index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Key message ${index + 1}`}
                    />
                    {config.keyMessages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem('keyMessages', index)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Icon icon="trash" className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('keyMessages')}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <Icon icon="plus" className="w-4 h-4" />
                  Add Key Message
                </button>
              </div>
            </div>

            {/* Hashtag Preferences */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Hashtags
                <span className="text-gray-500 text-xs ml-1">(Without the # symbol)</span>
              </label>
              <div className="space-y-2">
                {config.hashtagPreferences.map((hashtag, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">#</span>
                      <input
                        type="text"
                        value={hashtag}
                        onChange={(e) => handleArrayChange('hashtagPreferences', index, e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={`hashtag${index + 1}`}
                      />
                    </div>
                    {config.hashtagPreferences.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem('hashtagPreferences', index)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Icon icon="trash" className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('hashtagPreferences')}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <Icon icon="plus" className="w-4 h-4" />
                  Add Hashtag
                </button>
              </div>
            </div>

            {/* Words to Avoid */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Words to Avoid
                <span className="text-gray-500 text-xs ml-1">(Terms that don't align with your brand)</span>
              </label>
              <div className="space-y-2">
                {config.avoidWords.map((word, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={word}
                      onChange={(e) => handleArrayChange('avoidWords', index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Word to avoid ${index + 1}`}
                    />
                    {config.avoidWords.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem('avoidWords', index)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Icon icon="trash" className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('avoidWords')}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <Icon icon="plus" className="w-4 h-4" />
                  Add Word to Avoid
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <p className="text-sm text-gray-600">
              * Required fields
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !config.brandName || !config.brandDescription || !config.targetAudience}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  isLoading || !config.brandName || !config.brandDescription || !config.targetAudience
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Icon icon="checkCircle" className="w-4 h-4" />
                    Save Configuration
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BrandConfigurationModal;