import { useState, useRef, useEffect, useCallback } from 'react';
import { Monitor, Maximize2, X, Camera } from 'lucide-react';

interface Props {
  onCapture?: (imageData: string) => void;
}

export default function ScreenCapture({ onCapture }: Props) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' } as any,
        audio: false,
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setIsCapturing(true);

      // Auto-capture frames every 5 seconds
      intervalRef.current = setInterval(() => {
        captureFrame();
      }, 5000);

      // Capture initial frame
      setTimeout(captureFrame, 1000);

      // Handle stream ending (user stops sharing)
      stream.getVideoTracks()[0].onended = () => {
        stopCapture();
      };
    } catch (err) {
      console.error('Screen capture error:', err);
    }
  };

  const captureFrame = useCallback(() => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1920;
    canvas.height = videoRef.current.videoHeight || 1080;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.7);
    setLastCapture(imageData);
    onCapture?.(imageData);
  }, [onCapture]);

  const stopCapture = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  };

  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, []);

  return (
    <div className={`bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl overflow-hidden ${
      isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <Monitor className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Screen Monitor</h2>
            <p className="text-xs text-gray-400">
              {isCapturing ? 'Live screen capture active' : 'Share your screen for AI context'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isCapturing ? (
            <button
              onClick={startCapture}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-sm text-cyan-400 transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
              Share Screen
            </button>
          ) : (
            <>
              <button
                onClick={captureFrame}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                title="Capture frame"
              >
                <Camera className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={stopCapture}
                className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Video Preview */}
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain"
        />
        {!isCapturing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
            <Monitor className="w-16 h-16 mb-3 opacity-20" />
            <p className="text-sm">Click "Share Screen" to start</p>
          </div>
        )}
        {isCapturing && (
          <div className="absolute top-3 left-3 flex items-center gap-2 px-2 py-1 bg-red-500/80 rounded-full">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-xs text-white font-medium">LIVE</span>
          </div>
        )}
      </div>

      {/* Last Capture Thumbnail */}
      {lastCapture && (
        <div className="p-3 border-t border-gray-700/50">
          <div className="flex items-center gap-3">
            <img 
              src={lastCapture} 
              alt="Last capture" 
              className="w-24 h-14 object-cover rounded-lg border border-gray-700"
            />
            <div className="text-xs text-gray-400">
              <p>Last frame captured</p>
              <p className="text-gray-600">Auto-captures every 5s</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
