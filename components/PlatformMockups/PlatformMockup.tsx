import React from 'react';
import InstagramMockup from './InstagramMockup';
import YouTubeMockup from './YouTubeMockup';
import TikTokMockup from './TikTokMockup';
import FacebookMockup from './FacebookMockup';
import TwitterMockup from './TwitterMockup';
import LinkedInMockup from './LinkedInMockup';

interface PlatformMockupProps {
  platform: string;
  videoUrl?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  title?: string;
  duration?: string;
  aspectRatio?: string;
  hasAudio?: boolean;
  estimatedEngagement?: number;
  onDownload: () => void;
  onSaveImage?: () => void;
}

const PlatformMockup: React.FC<PlatformMockupProps> = ({
  platform,
  videoUrl,
  imageUrl,
  thumbnailUrl,
  title,
  duration,
  aspectRatio,
  hasAudio,
  estimatedEngagement,
  onDownload,
  onSaveImage
}) => {
  const mockupProps = {
    videoUrl,
    imageUrl,
    thumbnailUrl,
    title,
    platform,
    duration,
    aspectRatio,
    hasAudio,
    estimatedEngagement,
    onDownload,
    onSaveImage
  };

  // Render the appropriate mockup based on platform
  switch (platform.toLowerCase()) {
    case 'instagram':
      return <InstagramMockup {...mockupProps} />;

    case 'youtube':
      return <YouTubeMockup {...mockupProps} />;

    case 'tiktok':
      return <TikTokMockup {...mockupProps} />;

    case 'facebook':
      return <FacebookMockup {...mockupProps} />;

    case 'twitter':
    case 'x':
      return <TwitterMockup {...mockupProps} />;

    case 'linkedin':
      return <LinkedInMockup {...mockupProps} />;

    default:
      // Fallback to Instagram for unknown platforms
      return <InstagramMockup {...mockupProps} />;
  }
};

export default PlatformMockup;