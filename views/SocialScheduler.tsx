import React, { useState, useEffect } from 'react';
import { View, ScheduledContent, SocialPlatformConfig, CalendarEvent } from '../types';
import { socialSchedulingService } from '../services/socialSchedulingService';
import Icon from '../components/Icon';
import ScheduleModal from '../components/ScheduleModal';
import ContentCalendar from '../components/ContentCalendar';
import ScheduledContentList from '../components/ScheduledContentList';

interface SocialSchedulerProps {
  onNavigate: (view: View) => void;
  addNotification: (message: string, type?: 'success' | 'error') => void;
}

const PLATFORM_CONFIGS: SocialPlatformConfig[] = [
  {
    platform: 'twitter',
    maxLength: 280,
    supportsImages: true,
    supportsHashtags: true,
    hashtagLimit: 5,
    icon: 'twitter',
    color: '#1DA1F2'
  },
  {
    platform: 'linkedin',
    maxLength: 3000,
    supportsImages: true,
    supportsHashtags: true,
    hashtagLimit: 3,
    icon: 'linkedin',
    color: '#0077B5'
  },
  {
    platform: 'instagram',
    maxLength: 2200,
    supportsImages: true,
    supportsHashtags: true,
    hashtagLimit: 30,
    icon: 'instagram',
    color: '#E4405F'
  },
  {
    platform: 'facebook',
    maxLength: 63206,
    supportsImages: true,
    supportsHashtags: true,
    hashtagLimit: 10,
    icon: 'facebook',
    color: '#1877F2'
  }
];

const SocialScheduler: React.FC<SocialSchedulerProps> = ({ onNavigate, addNotification }) => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'scheduled' | 'analytics' | 'generate'>('scheduled');
  const [scheduledContent, setScheduledContent] = useState<ScheduledContent[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('scheduled');
  const [dbConnected, setDbConnected] = useState(false);
  const [generatingContent, setGeneratingContent] = useState(false);

  useEffect(() => {
    loadData();
    checkDatabaseStatus();
  }, []);

  useEffect(() => {
    loadScheduledContent();
  }, [selectedPlatform, selectedStatus]);

  const checkDatabaseStatus = async () => {
    try {
      const status = await socialSchedulingService.getDatabaseStatus();
      setDbConnected(status.connected);
    } catch (error) {
      console.error('Failed to check database status:', error);
      setDbConnected(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadScheduledContent(),
        loadCalendarEvents()
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
      addNotification('Failed to load scheduling data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadScheduledContent = async () => {
    try {
      const platform = selectedPlatform === 'all' ? undefined : selectedPlatform;
      const content = await socialSchedulingService.getScheduledContent(platform, selectedStatus);
      setScheduledContent(content);
    } catch (error) {
      console.error('Failed to load scheduled content:', error);
    }
  };

  const loadCalendarEvents = async () => {
    try {
      // Get all scheduled content and group by date
      const allContent = await socialSchedulingService.getScheduledContent(undefined, 'scheduled', 100);
      const eventMap = new Map<string, ScheduledContent[]>();

      allContent.forEach(content => {
        const date = new Date(content.scheduled_time).toISOString().split('T')[0];
        if (!eventMap.has(date)) {
          eventMap.set(date, []);
        }
        eventMap.get(date)!.push(content);
      });

      const events: CalendarEvent[] = Array.from(eventMap.entries()).map(([date, content]) => ({
        id: date,
        date,
        scheduled_content: content,
        total_posts: content.length
      }));

      setCalendarEvents(events);
    } catch (error) {
      console.error('Failed to load calendar events:', error);
    }
  };

  const handleScheduleContent = async (contentData: any) => {
    try {
      const result = await socialSchedulingService.scheduleContent(contentData);
      addNotification(`Content scheduled successfully for ${contentData.platform}`, 'success');
      setShowScheduleModal(false);
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Failed to schedule content:', error);
      addNotification('Failed to schedule content', 'error');
    }
  };

  const handleUpdateStatus = async (contentId: string, status: 'posted' | 'failed' | 'cancelled') => {
    try {
      await socialSchedulingService.updateContentStatus(contentId, status);
      addNotification(`Content status updated to ${status}`, 'success');
      await loadScheduledContent();
    } catch (error) {
      console.error('Failed to update content status:', error);
      addNotification('Failed to update content status', 'error');
    }
  };

  const handleGenerateFromNews = async () => {
    setGeneratingContent(true);
    try {
      const generated = await socialSchedulingService.generateContentFromNews({
        category: 'technology',
        platform: 'twitter',
        limit: 5
      });

      addNotification(`Generated ${generated.length} posts from news articles`, 'success');
      await loadData();
    } catch (error) {
      console.error('Failed to generate content from news:', error);
      addNotification('Failed to generate content from news', 'error');
    } finally {
      setGeneratingContent(false);
    }
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'calendar': return 'calendar';
      case 'scheduled': return 'clock';
      case 'analytics': return 'barChart3';
      case 'generate': return 'zap';
      default: return 'clock';
    }
  };

  if (!dbConnected && !loading) {
    return (
      <div className="flex-grow flex flex-col bg-white">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <Icon icon="database" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Database Connection Required</h3>
            <p className="text-gray-500 mb-4">
              TimescaleDB connection is required for social media scheduling. Please check your backend configuration.
            </p>
            <button
              onClick={checkDatabaseStatus}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Icon icon="calendar" className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Social Media Scheduler</h1>
              <p className="text-sm text-gray-500">Manage and schedule your social media content</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {dbConnected && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                TimescaleDB Connected
              </div>
            )}

            <button
              onClick={() => setShowScheduleModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Icon icon="plus" className="w-4 h-4" />
              Schedule Post
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white">
        <nav className="flex space-x-8 px-6">
          {[
            { key: 'scheduled', label: 'Scheduled Posts' },
            { key: 'calendar', label: 'Calendar View' },
            { key: 'generate', label: 'Generate Content' },
            { key: 'analytics', label: 'Analytics' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon icon={getTabIcon(tab.key)} className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'scheduled' && (
          <div className="h-full flex flex-col">
            {/* Filters */}
            <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
              <div className="flex gap-4">
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Platforms</option>
                  {PLATFORM_CONFIGS.map(config => (
                    <option key={config.platform} value={config.platform}>
                      {config.platform.charAt(0).toUpperCase() + config.platform.slice(1)}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="posted">Posted</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <ScheduledContentList
              content={scheduledContent}
              loading={loading}
              onUpdateStatus={handleUpdateStatus}
              onEdit={(content) => {
                // TODO: Implement edit functionality
                console.log('Edit content:', content);
              }}
              platformConfigs={PLATFORM_CONFIGS}
            />
          </div>
        )}

        {activeTab === 'calendar' && (
          <ContentCalendar
            events={calendarEvents}
            loading={loading}
            onDateSelect={(date) => {
              // Filter scheduled content by date and switch to scheduled tab
              console.log('Date selected:', date);
            }}
          />
        )}

        {activeTab === 'generate' && (
          <div className="p-6">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <Icon icon="zap" className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Content Generation</h3>
                <p className="text-gray-600">
                  Generate social media content from your cached news articles using AI
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Quick Generate from News</h4>
                <p className="text-gray-600 mb-6">
                  Automatically create social media posts from the latest cached news articles in your database.
                </p>

                <button
                  onClick={handleGenerateFromNews}
                  disabled={generatingContent}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {generatingContent ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Generating Content...
                    </>
                  ) : (
                    <>
                      <Icon icon="zap" className="w-4 h-4" />
                      Generate Posts from News
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Icon icon="barChart3" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Dashboard</h3>
              <p className="text-gray-500">Analytics and performance metrics coming soon...</p>
            </div>
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          onSchedule={handleScheduleContent}
          platformConfigs={PLATFORM_CONFIGS}
        />
      )}
    </div>
  );
};

export default SocialScheduler;