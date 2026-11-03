import { Power, Volume2, VolumeX } from 'lucide-react';

interface Props {
  onModeSelect: (mode: 'silent' | 'on' | 'off' | 'teaching') => void;
}

export default function Launcher({ onModeSelect }: Props) {
  return (
    <div className="w-screen h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
      <div className="text-center space-y-12">
        {/* Logo */}
        <div className="space-y-4">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Creator Assistant</h1>
          <p className="text-gray-500 text-sm">AI-powered companion for content creators</p>
        </div>

        {/* Mode Buttons */}
        <div className="space-y-4 w-80">
          {/* Silent Mode */}
          <button
            onClick={() => onModeSelect('silent')}
            className="w-full group relative overflow-hidden bg-gray-900/50 hover:bg-gray-800/50 border border-gray-800 hover:border-green-500/50 rounded-2xl p-6 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 group-hover:bg-green-500/20 rounded-xl transition-colors">
                <VolumeX className="w-6 h-6 text-green-400" />
              </div>
              <div className="text-left flex-1">
                <h3 className="text-lg font-semibold text-white">Silent Mode</h3>
                <p className="text-sm text-gray-500">Background monitoring, no traces</p>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
          </button>

          {/* On Mode */}
          <button
            onClick={() => onModeSelect('on')}
            className="w-full group relative overflow-hidden bg-gray-900/50 hover:bg-gray-800/50 border border-gray-800 hover:border-indigo-500/50 rounded-2xl p-6 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500/10 group-hover:bg-indigo-500/20 rounded-xl transition-colors">
                <Power className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="text-left flex-1">
                <h3 className="text-lg font-semibold text-white">On</h3>
                <p className="text-sm text-gray-500">Full assistant interface</p>
              </div>
              <div className="w-2 h-2 bg-indigo-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
          </button>

          {/* Teaching Mode */}
          <button
            onClick={() => onModeSelect('teaching')}
            className="w-full group relative overflow-hidden bg-gray-900/50 hover:bg-gray-800/50 border border-gray-800 hover:border-cyan-500/50 rounded-2xl p-6 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-500/10 group-hover:bg-cyan-500/20 rounded-xl transition-colors">
                <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="text-left flex-1">
                <h3 className="text-lg font-semibold text-white">Teaching Mode</h3>
                <p className="text-sm text-gray-500">Screen reader + live Q&A assistant</p>
              </div>
              <div className="w-2 h-2 bg-cyan-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
          </button>

          {/* Off Mode */}
          <button
            onClick={() => onModeSelect('off')}
            className="w-full group relative overflow-hidden bg-gray-900/50 hover:bg-gray-800/50 border border-gray-800 hover:border-gray-600 rounded-2xl p-6 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-500/10 group-hover:bg-gray-500/20 rounded-xl transition-colors">
                <Volume2 className="w-6 h-6 text-gray-500" />
              </div>
              <div className="text-left flex-1">
                <h3 className="text-lg font-semibold text-white">Off</h3>
                <p className="text-sm text-gray-500">Completely hidden</p>
              </div>
              <div className="w-2 h-2 bg-gray-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="text-xs text-gray-600">
          <p>Install as app for best experience</p>
        </div>
      </div>
    </div>
  );
}
