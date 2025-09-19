export interface MockupProps {
  videoUrl?: string;
  title: string;
  platform: string;
  duration: string;
  aspectRatio: string;
  hasAudio: boolean;
  estimatedEngagement: number;
  onDownload: () => void;
  onSaveImage?: () => void;
}

export interface MockupUser {
  username: string;
  displayName: string;
  profilePic: string;
  verified?: boolean;
}

export interface MockupEngagement {
  likes: string;
  comments: string;
  shares: string;
  views?: string;
}