import { useState, useEffect } from 'react';
import { OllamaModel } from './types';
import { ollamaService } from './services/ollama';
import ModelManager from './components/ModelManager';
import ChatInterface from './components/ChatInterface';
import ScreenCapture from './components/ScreenCapture';
import AudioTranscription from './components/AudioTranscription';
import MeetingAgent from './components/MeetingAgent';
import { 
  Cpu, MessageSquare, Monitor, Mic, Users, 
  Activity, Wifi, WifiOff, ChevronRight, Layout 
} from 'lucide-react';

type Tab = 'dashboard' | 'chat' | 'screen' | 'transcription' | 'meeting';

export default function App() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [statusMessage, setStatusMessage] = useState('Initializing...');

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    const available = await ollamaService.isAvailable();
    setIsConnected(available);
    setStatusMessage(available ? 'Connected to Ollama' : 'Ollama not reachable');
    if (available) {
      const fetchedModels = await ollamaService.getModels();
      setModels(fetchedModels);
    }
  };

  const tabs: { id: Tab; label: string; icon: any; color: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Layout, color: 'text-indigo-400' },
    { id: 'chat', label: 'AI Chat', icon: MessageSquare, color: 'text-purple-400' },
    { id: 'screen', label: 'Screen', icon: Monitor, color: 'text-cyan-400' },
    { id: 'transcription', label: 'Transcribe', icon: Mic, color: 'text-green-400' },
    { id: 'meeting', label: 'Meeting', icon: Users, color: 'text-orange-400' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10">
        {/* Top Bar */}
        <header className="border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-white" />
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-950 ${
                    isConnected ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                </div>
                <div>
                  <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    Computer Assistant
                  </h1>
                  <p className="text-xs text-gray-500 -mt-0.5">AI-Powered Desktop Companion</p>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  {isConnected ? (
                    <Wifi className="w-4 h-4 text-green-400" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-gray-400">{statusMessage}</span>
                </div>
                <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-gray-800/50 rounded-lg">
                  <Activity className="w-3 h-3 text-indigo-400" />
                  <span className="text-xs text-gray-400">{models.length} models</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav className="border-b border-gray-800/50 bg-gray-950/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1 py-2 overflow-x-auto">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                      isActive 
                        ? 'bg-gray-800 text-white shadow-lg shadow-gray-900/50' 
                        : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? tab.color : ''}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'dashboard' && (
            <DashboardView 
              models={models} 
              isConnected={isConnected}
              onModelsLoaded={setModels}
              onNavigate={setActiveTab}
            />
          )}
          {activeTab === 'chat' && (
            <ChatInterface models={models} />
          )}
          {activeTab === 'screen' && (
            <ScreenCapture />
          )}
          {activeTab === 'transcription' && (
            <AudioTranscription 
              whisperModel={models.find(m => m.name.includes('whisper'))?.name || 'karanchopda333/whisper:latest'} 
            />
          )}
          {activeTab === 'meeting' && (
            <MeetingAgent models={models} />
          )}
        </main>
      </div>
    </div>
  );
}

function DashboardView({ 
  models, 
  isConnected, 
  onModelsLoaded, 
  onNavigate 
}: { 
  models: OllamaModel[]; 
  isConnected: boolean;
  onModelsLoaded: (models: OllamaModel[]) => void;
  onNavigate: (tab: Tab) => void;
}) {
  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Welcome to Computer Assistant</h2>
        <p className="text-gray-400 text-sm max-w-2xl">
          Your AI-powered desktop companion that can see your screen, transcribe audio, 
          and answer questions using multiple specialized AI models. All processing happens 
          locally through Ollama.
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          <button
            onClick={() => onNavigate('chat')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-lg text-sm text-indigo-300 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Start Chat
            <ChevronRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => onNavigate('screen')}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-sm text-cyan-300 transition-colors"
          >
            <Monitor className="w-4 h-4" />
            Share Screen
            <ChevronRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => onNavigate('meeting')}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-lg text-sm text-orange-300 transition-colors"
          >
            <Users className="w-4 h-4" />
            Meeting Agent
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Model Manager */}
      <ModelManager onModelsLoaded={onModelsLoaded} />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Models Available"
          value={models.length.toString()}
          subtitle="Ollama models detected"
          icon={<Cpu className="w-5 h-5 text-indigo-400" />}
          color="indigo"
        />
        <StatCard
          title="Connection"
          value={isConnected ? 'Active' : 'Offline'}
          subtitle={isConnected ? 'localhost:11434' : 'Start Ollama service'}
          icon={isConnected ? <Wifi className="w-5 h-5 text-green-400" /> : <WifiOff className="w-5 h-5 text-red-400" />}
          color={isConnected ? 'green' : 'red'}
        />
        <StatCard
          title="Total Size"
          value={`${(models.reduce((acc, m) => acc + m.size, 0) / (1024 * 1024 * 1024)).toFixed(1)} GB`}
          subtitle="Combined model storage"
          icon={<Activity className="w-5 h-5 text-purple-400" />}
          color="purple"
        />
        <StatCard
          title="Pipeline"
          value="4-Stage"
          subtitle="Transcribe → Classify → Route → Answer"
          icon={<Users className="w-5 h-5 text-orange-400" />}
          color="orange"
        />
      </div>

      {/* Architecture Overview */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">System Architecture</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <PipelineStep
            step={1}
            title="Transcription"
            model="whisper"
            description="Audio → Text conversion"
            color="green"
          />
          <PipelineStep
            step={2}
            title="Classification"
            model="gemma2:9b"
            description="Intent detection & routing"
            color="amber"
          />
          <PipelineStep
            step={3}
            title="Reasoning"
            model="llama3"
            description="Contextual answers & summaries"
            color="purple"
          />
          <PipelineStep
            step={4}
            title="Coding"
            model="qwen3-coder:30b"
            description="Code generation & debugging"
            color="blue"
          />
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
          <span>Async inference</span>
          <span>•</span>
          <span>Model availability checks</span>
          <span>•</span>
          <span>Request cancellation</span>
          <span>•</span>
          <span>Configurable routing</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, color }: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    indigo: 'bg-indigo-500/10 border-indigo-500/20',
    green: 'bg-green-500/10 border-green-500/20',
    red: 'bg-red-500/10 border-red-500/20',
    purple: 'bg-purple-500/10 border-purple-500/20',
    orange: 'bg-orange-500/10 border-orange-500/20',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color] || colorClasses.indigo}`}>
      <div className="flex items-center justify-between mb-2">
        {icon}
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
    </div>
  );
}

function PipelineStep({ step, title, model, description, color }: {
  step: number;
  title: string;
  model: string;
  description: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    green: 'border-green-500/30 bg-green-500/5',
    amber: 'border-amber-500/30 bg-amber-500/5',
    purple: 'border-purple-500/30 bg-purple-500/5',
    blue: 'border-blue-500/30 bg-blue-500/5',
  };
  const textColor: Record<string, string> = {
    green: 'text-green-400',
    amber: 'text-amber-400',
    purple: 'text-purple-400',
    blue: 'text-blue-400',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-bold ${textColor[color]}`}>#{step}</span>
        <span className="text-sm font-medium text-white">{title}</span>
      </div>
      <p className={`text-xs font-mono ${textColor[color]} mb-1`}>{model}</p>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}
