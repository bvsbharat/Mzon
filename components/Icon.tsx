


import React from 'react';

export type IconName =
  | 'arrowLeft'
  | 'arrowLeftRight'
  | 'arrowPath'
  | 'bolt'
  | 'brush'
  | 'camera'
  | 'check'
  | 'checkCircle'
  | 'chevronsLeft'
  | 'chevronsRight'
  | 'chevronsUpDown'
  | 'clock'
  | 'colorPalette'
  | 'compass'
  | 'crop'
  | 'download'
  | 'edit'
  | 'eraser'
  | 'expand'
  | 'facebook'
  | 'gear'
  | 'grid'
  | 'image'
  | 'layers'
  | 'lightbulb'
  | 'magicWand'
  | 'menu'
  | 'microphone'
  | 'newspaper'
  | 'partyPopper'
  | 'photo'
  | 'play'
  | 'plus'
  | 'redo'
  | 'refreshCw'
  | 'rocket'
  | 'rotateCcw'
  | 'rss'
  | 'save'
  | 'search'
  | 'smartphone'
  | 'sparkles'
  | 'star'
  | 'tag'
  | 'threads'
  | 'tiktok'
  | 'tv'
  | 'twitter'
  | 'trash'
  | 'undo'
  | 'upload'
  | 'uploadCloud'
  | 'userCircle'
  | 'users'
  | 'x'
  | 'xCircle'
  | 'zoomIn'
  | 'zoomOut';

const ICON_MAP: Record<IconName, React.ReactNode> = {
  arrowLeft: <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75" />,
  arrowLeftRight: (
    <>
      <polyline points="17 11 21 7 17 3" />
      <line x1="21" y1="7" x2="9" y2="7" />
      <polyline points="7 21 3 17 7 13" />
      <line x1="15" y1="17" x2="3" y2="17" />
    </>
  ),
  arrowPath: (
    <>
      <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
      <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
    </>
  ),
  bolt: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />,
  brush: <path d="M17.66 4L19 5.34l-12.02 12.02-2.62.34.34-2.62L17.66 4zM16 5.34L18.66 8" />,
  camera: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008v-.008z" />
    </>
  ),
  check: <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />,
  checkCircle: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  chevronsLeft: <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5L7.5 12l3.75 7.5m3.75-7.5L11.25 12l3.75 7.5" />,
  chevronsRight: <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 4.5L16.5 12l-3.75 7.5m-3.75-7.5L12.75 12l-3.75 7.5" />,
  chevronsUpDown: <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  ),
  colorPalette: <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z" />,
  compass: <><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" /></>,
  crop: <><path d="M6.13 1L6 16a2 2 0 0 0 2 2h15" /><path d="M1 6.13L16 6a2 2 0 0 1 2 2v15" /></>,
  download: <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />,
  edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>,
  eraser: <path d="M7.5 21H3a1 1 0 0 1-1-1v-5.5a1 1 0 0 1 .3-.7l9-9a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4l-9 9a1 1 0 0 1-.7.3zM15 8l3 3"/>,
  expand: <path d="M15 3h6v6M9 21H3v-6M3 9V3h6M21 15v6h-6" />,
  facebook: (
    <>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m15.5-6.5l-4.24 4.24M7.76 16.24l-4.24 4.24m0-8.48l4.24 4.24m8.48-4.24l4.24-4.24" />
    </>
  ),
  grid: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 8.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 018.25 20.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6A2.25 2.25 0 0115.75 3.75h2.25A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM13.5 15.75A2.25 2.25 0 0115.75 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />,
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <circle cx="8.5" cy="8.5" r="1.5"></circle>
      <polyline points="21 15 16 10 5 21"></polyline>
    </>
  ),
  layers: <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />,
  lightbulb: (
    <>
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1.3-1.3 2.5-3.1 2.5-5.5A6 6 0 0 0 6.5 8c0 2.4 1.2 4.2 2.5 5.5.8.8 1.3 1.5 1.5 2.5"/>
      <path d="M9 18h6"/>
      <path d="M10 22h4"/>
    </>
  ),
  magicWand: <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.553L16.5 21.75l-.398-1.197a3.375 3.375 0 00-2.455-2.455L12.75 18l1.197-.398a3.375 3.375 0 002.455-2.455L16.5 14.25l.398 1.197a3.375 3.375 0 002.455 2.455L20.25 18l-1.197.398a3.375 3.375 0 00-2.455 2.455z" />,
  menu: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />,
  microphone: <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 016 0v8.25a3 3 0 01-3 3z" />,
  newspaper: <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5M5.25 3h13.5A2.25 2.25 0 0121 5.25v13.5A2.25 2.25 0 0118.75 21H5.25A2.25 2.25 0 013 18.75V5.25A2.25 2.25 0 015.25 3zM16.5 7.5h-9v9h9v-9z" />,
  partyPopper: <><path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 18.5c-2.3.0-4.2-1.9-4.2-4.2 0-1.5.8-2.8 2-3.5"/><path d="m14.4 14.4 3.6-3.6c.8-.8.8-2 0-2.8l-1.6-1.6c-.8-.8-2-.8-2.8 0L10 10"/><path d="m13.5 11.5 4 4"/><path d="m14 6 3 3"/><path d="m6 8 3 3"/><path d="M18 2c.5 2 2 2.5 4 2.5"/><path d="M18 22c.5-2 2-2.5 4-2.5"/><path d="M2 6c2-.5 2.5-2 2.5-4"/><path d="M2 18c2 .5 2.5 2 2.5 4"/></>,
  photo: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />,
  play: <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />,
  plus: <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />,
  redo: <path d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />,
  refreshCw: (
    <>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </>
  ),
  rocket: <><path d="M4.5 16.5c-1.5 1.5-3 1.5-4.5 0s-1.5-3 0-4.5L12 0l12 12-4.5 4.5c-1.5 1.5-3 1.5-4.5 0s-1.5-3 0-4.5L12 9l-3 3-4.5 4.5z"/><path d="M12.5 5.5l-3 3"/><path d="M15 17h.01"/><path d="M18 14h.01"/></>,
  rotateCcw: (
    <>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </>
  ),
  rss: (
    <>
      <path d="M4 11a9 9 0 019 9" />
      <path d="M4 4a16 16 0 0116 16" />
      <circle cx="5" cy="19" r="1" />
    </>
  ),
  save: (
    <>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </>
  ),
  search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
  smartphone: <><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></>,
  sparkles: <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.553L16.5 21.75l-.398-1.197a3.375 3.375 0 00-2.455-2.455L12.75 18l1.197-.398a3.375 3.375 0 002.455-2.455L16.5 14.25l.398 1.197a3.375 3.375 0 002.455 2.455L20.25 18l-1.197.398a3.375 3.375 0 00-2.455 2.455z" />,
  star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
  tag: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></>,
  threads: (
    <>
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 16c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z" />
      <path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4" />
    </>
  ),
  tiktok: (
    <>
      <path d="M9 12a4 4 0 1 0 4 4V8a5 5 0 0 0 5-5" />
      <path d="M9 16v-4" />
    </>
  ),
  trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
  tv: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </>
  ),
  twitter: (
    <>
      <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
    </>
  ),
  undo: <path d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />,
  upload: <path strokeLinecap="round" strokeLinejoin="round" d="M15 11.25l-3-3m0 0l-3 3m3-3v7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  uploadCloud: <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />,
  userCircle: <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />,
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  x: <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />,
  xCircle: <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  zoomIn: <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />,
  zoomOut: <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />,
};

interface IconProps extends React.SVGProps<SVGSVGElement> {
  icon: IconName;
}

const Icon: React.FC<IconProps> = ({ icon, ...props }) => {
  const filledIcons: IconName[] = ['sparkles', 'bolt'];
  const isFilled = filledIcons.includes(icon);

  const commonProps = {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    // Fix: Changed "true" to boolean `true` to satisfy React's `Booleanish` type for SVG props.
    "aria-hidden": true,
    ...props,
  };

  if (isFilled) {
    return (
      <svg {...commonProps} fill="currentColor" stroke="currentColor" strokeWidth={0.5}>
        {ICON_MAP[icon]}
      </svg>
    );
  }
  
  return (
    <svg 
      {...commonProps} 
      fill="none" 
      stroke="currentColor" 
      strokeWidth={1.5} 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      {ICON_MAP[icon]}
    </svg>
  );
};

export default Icon;
