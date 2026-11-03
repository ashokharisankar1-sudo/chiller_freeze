import { useState, useEffect, useCallback } from 'react';
import { OllamaModel } from '../types';
import { ollamaService } from '../services/ollama';
import { 
  Cpu, CheckCircle, XCircle, Loader2, RefreshCw, 
  Zap, Code, Brain, MessageSquare, Mic 
} from 'lucide-react';

const MODEL_ROLES: Record<string, { role: string; icon: any; color: string }> = {
  'qwen3-coder': { role: 'Coding Assistant', icon: Code, color: 'text-blue-400' },
  'llama3': { role: 'Reasoning & Answers', icon: Brain, color: 'text-purple-400' },
  'whisper': { role: 'Audio Transcription', icon: Mic, color: 'text-green-400' },
  'gemma2': { role: 'Classification', icon: MessageSquare, color: 'text-amber-400' },
};

interface ModelTestResult {
  success: boolean;
  latency: number;
  error?: string;
}

export default function ModelManager({ onModelsLoaded }: { onModelsLoaded?: (models: OllamaModel[]) => void }) {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [testResults, setTestResults] = useState<Record<string, ModelTestResult>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    const available = await ollamaService.isAvailable();
    setIsConnected(available);
    
    if (available) {
      const fetchedModels = await ollamaService.getModels();
      setModels(fetchedModels);
      onModelsLoaded?.(fetchedModels);
    }
    setLoading(false);
  }, [onModelsLoaded]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const testModel = async (modelName: string) => {
    setTesting(prev => ({ ...prev, [modelName]: true }));
    const result = await ollamaService.testModel(modelName);
    setTestResults(prev => ({ ...prev, [modelName]: result }));
    setTesting(prev => ({ ...prev, [modelName]: false }));
  };

  const testAllModels = async () => {
    for (const model of models) {
      await testModel(model.name);
    }
  };

  const getModelRole = (name: string) => {
    for (const [key, value] of Object.entries(MODEL_ROLES)) {
      if (name.includes(key)) return value;
    }
    return { role: 'General', icon: Cpu, color: 'text-gray-400' };
  };

  const formatSize = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <Cpu className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Model Manager</h2>
            <p className="text-sm text-gray-400">Ollama Model Discovery & Testing</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={testAllModels}
            disabled={loading || models.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            Test All
          </button>
          <button
            onClick={fetchModels}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <div className={`mb-4 px-4 py-2 rounded-lg flex items-center gap-2 text-sm ${
        isConnected === null ? 'bg-gray-800 text-gray-400' :
        isConnected ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
        'bg-red-500/10 text-red-400 border border-red-500/20'
      }`}>
        {isConnected === null ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isConnected ? (
          <CheckCircle className="w-4 h-4" />
        ) : (
          <XCircle className="w-4 h-4" />
        )}
        {isConnected === null ? 'Checking Ollama connection...' :
         isConnected ? 'Connected to Ollama (localhost:11434) — Fallback chain active' :
         'Ollama not available — Run: ollama serve'}
      </div>

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {models.map(model => {
          const role = getModelRole(model.name);
          const Icon = role.icon;
          const testResult = testResults[model.name];
          const isTesting = testing[model.name];

          return (
            <div
              key={model.name}
              className="bg-gray-800/50 border border-gray-700/30 rounded-xl p-4 hover:border-gray-600/50 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${role.color}`} />
                  <span className="text-sm font-medium text-white truncate max-w-[180px]">
                    {model.name}
                  </span>
                </div>
                <span className="text-xs text-gray-500">{formatSize(model.size)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full ${role.color} bg-gray-800`}>
                  {role.role}
                </span>
                <button
                  onClick={() => testModel(model.name)}
                  disabled={isTesting}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  {isTesting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : testResult ? (
                    testResult.success ? (
                      <CheckCircle className="w-3 h-3 text-green-400" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-400" />
                    )
                  ) : (
                    <Zap className="w-3 h-3" />
                  )}
                  {isTesting ? 'Testing...' : 
                   testResult ? `${testResult.latency.toFixed(0)}ms` : 'Test'}
                </button>
              </div>

              {testResult?.error && (
                <p className="text-xs text-red-400 mt-1 truncate">{testResult.error}</p>
              )}
              {testResult?.success && (
                <p className="text-xs text-green-400 mt-1">✓ Ready for inference</p>
              )}
            </div>
          );
        })}
      </div>

      {models.length === 0 && isConnected && (
        <p className="text-center text-gray-500 py-4">No models found. Pull models with: ollama pull &lt;model&gt;</p>
      )}

      {/* Fallback Chain Info */}
      {models.length > 0 && (
        <div className="mt-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/20">
          <p className="text-xs text-gray-400">
            <span className="text-indigo-400 font-medium">Fallback Chain:</span>{' '}
            If the primary model fails, requests automatically retry with fallback models.
            This ensures you always get an answer.
          </p>
        </div>
      )}
    </div>
  );
}
