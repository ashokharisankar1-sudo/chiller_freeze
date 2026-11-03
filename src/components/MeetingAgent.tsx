import { useState, useRef } from 'react';
import { OllamaModel, MeetingAgentConfig, ChatMessage } from '../types';
import { ollamaService } from '../services/ollama';
import { evaluationService, EvaluationResult } from '../services/evaluation';
import EvaluationPanel from './EvaluationPanel';
import { 
  Users, Settings, Play, Loader2, 
  Code, Brain, MessageSquare, Mic, RotateCcw 
} from 'lucide-react';

interface Props {
  models: OllamaModel[];
}

export default function MeetingAgent({ models }: Props) {
  const [config, setConfig] = useState<MeetingAgentConfig>({
    transcriptionModel: models.find(m => m.name.includes('whisper'))?.name || models[0]?.name || '',
    classificationModel: models.find(m => m.name.includes('gemma2'))?.name || models[0]?.name || '',
    answerModel: models.find(m => m.name.includes('llama3'))?.name || models[0]?.name || '',
    codingModel: models.find(m => m.name.includes('qwen3'))?.name || models[0]?.name || '',
  });
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentAction, setCurrentAction] = useState<string>('');
  const [output, setOutput] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [evaluations, setEvaluations] = useState<Map<string, EvaluationResult>>(new Map());
  const [showEval, setShowEval] = useState(true);
  const processingRef = useRef(false);

  const getModelForRole = (role: keyof MeetingAgentConfig) => {
    return config[role] || 'No model assigned';
  };

  const processInput = async () => {
    if (!inputText.trim() || processingRef.current) return;
    
    processingRef.current = true;
    const text = inputText;
    setInputText('');
    setIsRunning(true);

    // Step 1: Classification (gemma2) with fallback
    setCurrentAction('Classifying input...');
    addOutput('system', `🔍 Classifying: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`);
    
    try {
      const { response: classification, model: classModel } = await ollamaService.chatSyncWithFallback(
        [{
          role: 'system',
          content: 'You are a meeting assistant classifier. Classify the input as exactly one of: QUESTION, ACTION_ITEM, CODE_REQUEST, INFORMATION, or GREETING. Reply with ONLY the classification word, nothing else.'
        }, {
          role: 'user',
          content: text
        }],
        config.classificationModel,
        { temperature: 0.1, num_predict: 20 }
      );

      addOutput('system', `📋 Classification: ${classification.trim()} (by ${classModel})`);

      // Step 2: Route to appropriate model with fallback
      const classificationLower = classification.toLowerCase();
      let targetModel: string;
      let systemPrompt: string;
      
      if (classificationLower.includes('code')) {
        setCurrentAction('Processing code request...');
        addOutput('system', '💻 Routing to coding assistant...');
        targetModel = config.codingModel;
        systemPrompt = 'You are an expert coding assistant. Help with code generation, debugging, and development tasks. Provide complete, working code with explanations.';
      } else if (classificationLower.includes('question') || classificationLower.includes('action')) {
        setCurrentAction('Generating answer...');
        addOutput('system', '🧠 Routing to reasoning engine...');
        targetModel = config.answerModel;
        systemPrompt = 'You are a meeting assistant. Provide clear, concise answers and identify action items. Be thorough and helpful.';
      } else {
        setCurrentAction('Processing...');
        targetModel = config.answerModel;
        systemPrompt = 'You are a helpful meeting assistant. Respond appropriately and thoroughly.';
      }

      // Stream response with fallback
      const msgId = `msg_${Date.now()}`;
      setOutput(prev => [...prev, {
        id: msgId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        model: targetModel,
        isStreaming: true,
      }]);

      const startTime = performance.now();
      let fullResponse = '';

      const result = await ollamaService.chatWithFallback(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        targetModel,
        (chunk) => {
          fullResponse += chunk;
          setOutput(prev => prev.map(m => 
            m.id === msgId ? { ...m, content: m.content + chunk } : m
          ));
        },
        (status) => setCurrentAction(status),
        { retryCount: 2, timeout: 120000 }
      );

      // Update model if fallback was used
      if (result.model !== targetModel) {
        setOutput(prev => prev.map(m => 
          m.id === msgId ? { ...m, model: result.model } : m
        ));
      }

      const latency = performance.now() - startTime;

      // Mark as complete
      setOutput(prev => prev.map(m => 
        m.id === msgId ? { ...m, isStreaming: false } : m
      ));

      // Evaluate the response
      setCurrentAction('Evaluating response with Hugging Face metrics...');
      try {
        const evalResult = await evaluationService.evaluate(
          text,
          fullResponse,
          undefined,
          latency
        );
        setEvaluations(prev => new Map(prev).set(msgId, evalResult));
      } catch (evalError) {
        console.warn('Evaluation failed:', evalError);
      }

      addOutput('system', `✅ Response evaluated • Model: ${result.model} • Latency: ${latency.toFixed(0)}ms`);

    } catch (error: any) {
      addOutput('assistant', `❌ Error: ${error.message}. Ensure Ollama is running with: ollama serve`);
    } finally {
      setIsRunning(false);
      setCurrentAction('');
      processingRef.current = false;
    }
  };

  const addOutput = (role: 'system' | 'assistant' | 'user', content: string) => {
    setOutput(prev => [...prev, {
      id: `msg_${Date.now()}_${Math.random()}`,
      role: role === 'system' ? 'user' : role,
      content,
      timestamp: new Date(),
    }]);
  };

  const clearOutput = () => {
    setOutput([]);
    setEvaluations(new Map());
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Users className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Meeting Agent</h2>
              <p className="text-xs text-gray-400">Multi-model pipeline with HF evaluation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEval(!showEval)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                showEval ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-gray-800 text-gray-400'
              }`}
            >
              Evaluation
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={clearOutput}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Model Routing Settings */}
        {showSettings && (
          <div className="mb-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700/30 space-y-3">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Model Routing Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ModelSelect
                label="Transcription"
                icon={<Mic className="w-3 h-3 text-green-400" />}
                value={config.transcriptionModel}
                onChange={(v) => setConfig(prev => ({ ...prev, transcriptionModel: v }))}
                models={models}
              />
              <ModelSelect
                label="Classification"
                icon={<MessageSquare className="w-3 h-3 text-amber-400" />}
                value={config.classificationModel}
                onChange={(v) => setConfig(prev => ({ ...prev, classificationModel: v }))}
                models={models}
              />
              <ModelSelect
                label="Answering"
                icon={<Brain className="w-3 h-3 text-purple-400" />}
                value={config.answerModel}
                onChange={(v) => setConfig(prev => ({ ...prev, answerModel: v }))}
                models={models}
              />
              <ModelSelect
                label="Coding"
                icon={<Code className="w-3 h-3 text-blue-400" />}
                value={config.codingModel}
                onChange={(v) => setConfig(prev => ({ ...prev, codingModel: v }))}
                models={models}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Fallback chain: If primary model fails, automatically tries other available models.
            </p>
          </div>
        )}

        {/* Pipeline Visualization */}
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 rounded-md border border-green-500/20">
            <Mic className="w-3 h-3 text-green-400" />
            <span className="text-green-300">{getModelForRole('transcriptionModel').split(':')[0]}</span>
          </div>
          <span className="text-gray-600">→</span>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 rounded-md border border-amber-500/20">
            <MessageSquare className="w-3 h-3 text-amber-400" />
            <span className="text-amber-300">{getModelForRole('classificationModel').split(':')[0]}</span>
          </div>
          <span className="text-gray-600">→</span>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-500/10 rounded-md border border-purple-500/20">
            <Brain className="w-3 h-3 text-purple-400" />
            <span className="text-purple-300">{getModelForRole('answerModel').split(':')[0]}</span>
          </div>
          <span className="text-gray-600">→</span>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 rounded-md border border-blue-500/20">
            <Code className="w-3 h-3 text-blue-400" />
            <span className="text-blue-300">{getModelForRole('codingModel').split(':')[0]}</span>
          </div>
          <span className="text-gray-600">→</span>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/10 rounded-md border border-indigo-500/20">
            <span className="text-indigo-300">HF Evaluate</span>
          </div>
        </div>

        {/* Input */}
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && processInput()}
            placeholder="Type meeting input, question, or code request..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
            disabled={isRunning}
          />
          <button
            onClick={processInput}
            disabled={!inputText.trim() || isRunning}
            className="px-4 py-2.5 bg-orange-500/20 hover:bg-orange-500/30 disabled:opacity-50 border border-orange-500/30 rounded-lg text-sm text-orange-400 transition-colors flex items-center gap-2"
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Process
          </button>
        </div>

        {/* Current Action */}
        {currentAction && (
          <div className="mb-4 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center gap-2 text-sm text-orange-300">
            <Loader2 className="w-4 h-4 animate-spin" />
            {currentAction}
          </div>
        )}

        {/* Output */}
        <div className="bg-gray-800/30 rounded-xl p-4 min-h-[200px] max-h-[400px] overflow-y-auto space-y-3 border border-gray-700/30">
          {output.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <Users className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm">Meeting agent ready</p>
              <p className="text-xs mt-1">All responses evaluated with BLEU, ROUGE, Semantic Similarity</p>
            </div>
          ) : (
            output.map(msg => (
              <div key={msg.id}>
                <div className={`text-sm ${
                  msg.role === 'user' ? 'text-gray-400 italic' : 
                  msg.role === 'assistant' ? 'text-white' : 'text-gray-300'
                }`}>
                  {msg.model && (
                    <span className="text-xs text-gray-600 mr-2">[{msg.model}]</span>
                  )}
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                  {msg.isStreaming && <span className="inline-block w-2 h-3 bg-gray-400 animate-pulse ml-0.5" />}
                </div>
                
                {/* Evaluation for this message */}
                {showEval && msg.role === 'assistant' && !msg.isStreaming && evaluations.has(msg.id) && (
                  <div className="mt-2">
                    <EvaluationPanel 
                      result={evaluations.get(msg.id)!} 
                      modelName={msg.model}
                      compact
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Latest Full Evaluation */}
      {showEval && (() => {
        const lastEvalEntry = [...evaluations.entries()].pop();
        if (!lastEvalEntry) return null;
        const [msgId, evalResult] = lastEvalEntry;
        const msg = output.find(m => m.id === msgId);
        return (
          <EvaluationPanel 
            result={evalResult} 
            modelName={msg?.model}
          />
        );
      })()}
    </div>
  );
}

function ModelSelect({ label, icon, value, onChange, models }: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  models: OllamaModel[];
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <label className="text-xs text-gray-500 w-24">{label}:</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-orange-500"
      >
        {models.map(m => (
          <option key={m.name} value={m.name}>{m.name}</option>
        ))}
      </select>
    </div>
  );
}
