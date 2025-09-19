import React, { useState, useMemo } from 'react';
import { CalendarEvent, ScheduledContent } from '../types';
import Icon from './Icon';

interface ContentCalendarProps {
  events: CalendarEvent[];
  loading: boolean;
  onDateSelect: (date: string) => void;
}

const ContentCalendar: React.FC<ContentCalendarProps> = ({ events, loading, onDateSelect }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Get the first day of the month and number of days
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const getEventsForDate = (date: Date): CalendarEvent | undefined => {
    const dateStr = date.toISOString().split('T')[0];
    return events.find(event => event.date === dateStr);
  };

  const formatDateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const calendarDays = useMemo(() => {
    const days = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [startDate]);

  const handleDateClick = (date: Date) => {
    const dateStr = formatDateString(date);
    setSelectedDate(dateStr);
    onDateSelect(dateStr);
  };

  const getPlatformColor = (platform: string): string => {
    switch (platform) {
      case 'twitter': return '#1DA1F2';
      case 'linkedin': return '#0077B5';
      case 'instagram': return '#E4405F';
      case 'facebook': return '#1877F2';
      default: return '#6B7280';
    }
  };

  const selectedEvent = selectedDate ? events.find(e => e.date === selectedDate) : null;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Calendar View */}
      <div className="flex-1 p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icon icon="chevronLeft" className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icon icon="chevronRight" className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-4 text-center text-sm font-medium text-gray-500 bg-gray-50">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((date, index) => {
              const eventsForDay = getEventsForDate(date);
              const isSelected = selectedDate === formatDateString(date);

              return (
                <div
                  key={index}
                  className={`min-h-[100px] border-r border-b border-gray-100 p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-blue-50 border-blue-200' : ''
                  } ${!isCurrentMonth(date) ? 'bg-gray-50' : ''}`}
                  onClick={() => handleDateClick(date)}
                >
                  {/* Date Number */}
                  <div className={`text-sm mb-2 ${
                    isToday(date)
                      ? 'w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-medium'
                      : isCurrentMonth(date)
                        ? 'text-gray-900 font-medium'
                        : 'text-gray-400'
                  }`}>
                    {date.getDate()}
                  </div>

                  {/* Events */}
                  {eventsForDay && (
                    <div className="space-y-1">
                      {eventsForDay.scheduled_content.slice(0, 3).map((content, contentIndex) => (
                        <div
                          key={contentIndex}
                          className="text-xs px-2 py-1 rounded-full text-white truncate"
                          style={{ backgroundColor: getPlatformColor(content.platform) }}
                          title={content.content_text}
                        >
                          {content.platform} • {new Date(content.scheduled_time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      ))}
                      {eventsForDay.scheduled_content.length > 3 && (
                        <div className="text-xs text-gray-500 px-2">
                          +{eventsForDay.scheduled_content.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sidebar with Selected Day Details */}
      {selectedEvent && (
        <div className="w-80 border-l border-gray-200 p-6 bg-gray-50 overflow-y-auto">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {new Date(selectedEvent.date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </h3>
            <p className="text-sm text-gray-500">
              {selectedEvent.total_posts} scheduled post{selectedEvent.total_posts !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="space-y-3">
            {selectedEvent.scheduled_content.map((content, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-start gap-3">
                  {/* Platform Icon */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                    style={{ backgroundColor: getPlatformColor(content.platform) }}
                  >
                    {content.platform[0].toUpperCase()}
                  </div>

                  <div className="flex-1">
                    {/* Platform and Time */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium capitalize">
                        {content.platform}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(content.scheduled_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    {/* Content */}
                    <p className="text-sm text-gray-700 mb-2">
                      {content.content_text.length > 100
                        ? `${content.content_text.substring(0, 100)}...`
                        : content.content_text
                      }
                    </p>

                    {/* Hashtags */}
                    {content.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {content.hashtags.slice(0, 3).map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {content.hashtags.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{content.hashtags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Status */}
                    <div className="mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        content.status === 'scheduled'
                          ? 'bg-blue-100 text-blue-800'
                          : content.status === 'posted'
                            ? 'bg-green-100 text-green-800'
                            : content.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                      }`}>
                        {content.status.charAt(0).toUpperCase() + content.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State Sidebar */}
      {selectedDate && !selectedEvent && (
        <div className="w-80 border-l border-gray-200 p-6 bg-gray-50">
          <div className="text-center">
            <Icon icon="calendar" className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Posts Scheduled</h3>
            <p className="text-sm text-gray-500 mb-4">
              No posts are scheduled for {new Date(selectedDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentCalendar;