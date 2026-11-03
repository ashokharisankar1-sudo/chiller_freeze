import { useState, useEffect } from 'react';
import Launcher from './components/Launcher';
import AssistantApp from './components/AssistantApp';

type AppMode = 'launcher' | 'silent' | 'on' | 'off';

export default function App() {
  const [mode, setMode] = useState<AppMode>('launcher');
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  useEffect(() => {
    // Detect screen sharing
    const checkScreenShare = async () => {
      try {
        const streams = await navigator.mediaDevices.enumerateDevices();
        const hasDisplay = streams.some(d => d.kind === 'videoinput' && d.label.includes('screen'));
        setIsScreenSharing(hasDisplay);
      } catch {
        // Ignore
      }
    };

    const interval = setInterval(checkScreenShare, 2000);
    checkScreenShare();

    return () => clearInterval(interval);
  }, []);

  // Hide everything when screen sharing and in silent mode
  if (isScreenSharing && mode === 'silent') {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <div className="text-gray-800 text-xs">●</div>
      </div>
    );
  }

  // Off mode - completely hidden
  if (mode === 'off') {
    return (
      <div className="w-screen h-screen bg-black">
        <div className="fixed bottom-4 right-4">
          <button
            onClick={() => setMode('launcher')}
            className="w-8 h-8 bg-gray-900 hover:bg-gray-800 rounded-full flex items-center justify-center opacity-20 hover:opacity-100 transition-opacity"
            title="Show launcher"
          >
            <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
          </button>
        </div>
      </div>
    );
  }

  // Silent mode - minimal floating indicator
  if (mode === 'silent') {
    return (
      <div className="w-screen h-screen bg-transparent pointer-events-none">
        <div className="fixed bottom-4 right-4 pointer-events-auto">
          <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded-full px-3 py-2 flex items-center gap-2 shadow-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-400">Silent</span>
            <button
              onClick={() => setMode('launcher')}
              className="ml-2 text-gray-500 hover:text-white text-xs"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Launcher
  if (mode === 'launcher') {
    return <Launcher onModeSelect={setMode} />;
  }

  // On mode - full assistant
  if (mode === 'on') {
    return <AssistantApp onBack={() => setMode('launcher')} />;
  }

  return null;
}
