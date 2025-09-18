
import React, { useRef, useEffect, useState } from 'react';
import Spinner from './Spinner';
import Icon from './Icon';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mediaStream: MediaStream;
    
    const startCamera = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Prefer the rear camera on mobile devices
        const constraints = {
          video: { 
            facingMode: 'environment' 
          }
        };
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Could not access the camera. Please check your browser permissions and try again.");
      } finally {
        setIsLoading(false);
      }
    };

    startCamera();

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const timestamp = new Date().toISOString();
            const file = new File([blob], `capture-${timestamp}.png`, { type: 'image/png' });
            onCapture(file);
          }
        }, 'image/png', 0.95);
      }
    }
  };

  return (
    <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-lg z-50 flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="relative w-full max-w-4xl bg-black rounded-lg overflow-hidden shadow-2xl animate-slide-up">
        <div className="aspect-w-4 aspect-h-3">
          {isLoading && (
            <div className="w-full h-full flex flex-col items-center justify-center text-white p-8 text-center">
              <Spinner />
              <p className="mt-4 text-slate-300">Starting camera...</p>
            </div>
          )}
          {error && (
            <div className="w-full h-full flex flex-col items-center justify-center text-white p-8 text-center">
              <p className="text-lg font-semibold text-red-400">Camera Error</p>
              <p className="mt-2 text-slate-300">{error}</p>
            </div>
          )}
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            className={`w-full h-full object-cover ${isLoading || error ? 'hidden' : 'block'}`}
          ></video>
        </div>
        <canvas ref={canvasRef} className="hidden"></canvas>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
          aria-label="Close camera"
        >
          <Icon icon="x" className="w-6 h-6" />
        </button>
      </div>

      <div className="mt-8 flex items-center justify-center w-full">
        <button
          onClick={handleCapture}
          disabled={!stream || !!error || isLoading}
          className="w-20 h-20 p-1 bg-white/30 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-transform transform hover:scale-105 active:scale-95 ring-4 ring-white/20"
          aria-label="Take Photo"
        >
          <div className="w-full h-full bg-white rounded-full shadow-lg"></div>
        </button>
      </div>
       <style>{`
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slide-up {
            from { transform: translateY(20px) scale(0.98); opacity: 0; }
            to { transform: translateY(0) scale(1); opacity: 1; }
          }
          .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
          .animate-slide-up { animation: slide-up 0.25s ease-out forwards; }
          .aspect-w-4 { position: relative; padding-bottom: 75%; }
          .aspect-w-4 > * { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
        `}</style>
    </div>
  );
};

export default CameraCapture;
