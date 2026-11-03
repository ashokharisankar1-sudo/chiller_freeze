import { useState, useRef } from 'react';
import { OllamaModel, MeetingAgentConfig, ChatMessage } from '../types';
import { ollamaService } from '../services/ollama';
import { 
  Users, Settings, Play, Loader2, 
  Code, Brain, MessageSquare, Mic 
} from 'lucide-react';

interface Props {
  models: OllamaModel[];
}

export default function MeetingAgent({ models }: Props) {
  const [config, setConfig] = useState<MeetingAgentConfig>({
    transcriptionModel: models.find(m => m.name.includes('whisper'))?.name || '',
    classificationModel: models.find(m => m.name.includes('gemma2'))?.name || '',
    answerModel: models.find(m => m.name.includes('llama3'))?.name || '',
    codingModel: models.find(m => m.name.includes('qwen3'))?.name || '',
  });
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentAction, setCurrentAction] = useState<string>('');
  const [output, setOutput] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
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

    // Step 1: Classification (gemma2)
    setCurrentAction('Classifying input...');
    addOutput('system', `🔍 Classifying: "${text.substring(0, 50)}..."`);
    
    try {
      const classification = await ollamaService.chatSync(
        config.classificationModel,
        [{
          role: 'system',
          content: 'You are a meeting assistant classifier. Classify the input as one of: QUESTION, ACTION_ITEM, CODE_REQUEST, INFORMATION, or GREETING. Reply with just the classification.'
        }, {
          role: 'user',
          content: text
        }],
        { temperature: 0.1, num_predict: 20 }
      );

      addOutput('system', `📋 Classification: ${classification.trim()}`);

      // Step 2: Route to appropriate model
      const classificationLower = classification.toLowerCase();
      
      if (classificationLower.includes('code')) {
        setCurrentAction('Processing code request...');
        addOutput('system', '💻 Routing to coding assistant...');
        
        await streamResponse(config.codingModel, [
          { role: 'system', content: 'You are a coding assistant. Help with code generation, debugging, and development tasks.' },
          { role: 'user', content: text }
        ]);
      } else if (classificationLower.includes('question') || classificationLower.includes('action')) {
        setCurrentAction('Generating answer...');
        addOutput('system', '🧠 Routing to reasoning engine...');
        
        await streamResponse(config.answerModel, [
          { role: 'system', content: 'You are a meeting assistant. Provide clear, concise answers and identify action items.' },
          { role: 'user', content: text }
        ]);
      } else {
        setCurrentAction('Processing...');
        await streamResponse(config.answerModel, [
          { role: 'system', content: 'You are a helpful meeting assistant. Respond appropriately.' },
          { role: 'user', content: text }
        ]);
      }
    } catch (error: any) {
      addOutput('assistant', `Error: ${error.message}`);
    } finally {
      setIsRunning(false);
      setCurrentAction('');
      processingRef.current = false;
    }
  };

  const streamResponse = async (model: string, messages: { role: string; content: string }[]) => {
    const msgId = `msg_${Date.now()}`;
    setOutput(prev => [...prev, {
      id: msgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      model,
      isStreaming: true,
    }]);

    try {
      await ollamaService.chat(
        model,
        messages,
        (chunk) => {
          setOutput(prev => prev.map(m => 
            m.id === msgId ? { ...m, content: m.content + chunk } : m
          ));
        },
        `meeting_${Date.now()}`
      );
    } catch (error: any) {
      setOutput(prev => prev.map(m => 
        m.id === msgId ? { ...m, content: `Error: ${error.message}`, isStreaming: false } : m
      ));
      return;
    }

    setOutput(prev => prev.map(m => 
      m.id === msgId ? { ...m, isStreaming: false } : m
    ));
  };

  const addOutput = (role: 'system' | 'assistant' | 'user', content: string) => {
    setOutput(prev => [...prev, {
      id: `msg_${Date.now()}_${Math.random()}`,
      role: role === 'system' ? 'user' : role,
      content,
      timestamp: new Date(),
    }]);
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <Users className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Meeting Agent</h2>
            <p className="text-xs text-gray-400">Multi-model intelligent routing</p>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
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
              filter="whisper"
            />
            <ModelSelect
              label="Classification"
              icon={<MessageSquare className="w-3 h-3 text-amber-400" />}
              value={config.classificationModel}
              onChange={(v) => setConfig(prev => ({ ...prev, classificationModel: v }))}
              models={models}
              filter="gemma2"
            />
            <ModelSelect
              label="Answering"
              icon={<Brain className="w-3 h-3 text-purple-400" />}
              value={config.answerModel}
              onChange={(v) => setConfig(prev => ({ ...prev, answerModel: v }))}
              models={models}
              filter="llama3"
            />
            <ModelSelect
              label="Coding"
              icon={<Code className="w-3 h-3 text-blue-400" />}
              value={config.codingModel}
              onChange={(v) => setConfig(prev => ({ ...prev, codingModel: v }))}
              models={models}
              filter="qwen3"
            />
          </div>
        </div>
      )}

      {/* Current Pipeline Status */}
      <div className="mb-4 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <Mic className="w-3 h-3 text-green-400" />
          <span className="text-gray-400">{getModelForRole('transcriptionModel')}</span>
        </div>
        <span className="text-gray-600">→</span>
        <div className="flex items-center gap-1.5">
          <MessageSquare className="w-3 h-3 text-amber-400" />
          <span className="text-gray-400">{getModelForRole('classificationModel')}</span>
        </div>
        <span className="text-gray-600">→</span>
        <div className="flex items-center gap-1.5">
          <Brain className="w-3 h-3 text-purple-400" />
          <span className="text-gray-400">{getModelForRole('answerModel')}</span>
        </div>
        <span className="text-gray-600">→</span>
        <div className="flex items-center gap-1.5">
          <Code className="w-3 h-3 text-blue-400" />
          <span className="text-gray-400">{getModelForRole('codingModel')}</span>
        </div>
      </div>

      {/* Input */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && processInput()}
          placeholder="Type meeting input or question..."
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
            <p className="text-xs mt-1">Type input to process through the model pipeline</p>
          </div>
        ) : (
          output.map(msg => (
            <div key={msg.id} className={`text-sm ${
              msg.role === 'user' ? 'text-gray-400 italic' : 
              msg.role === 'assistant' ? 'text-white' : 'text-gray-300'
            }`}>
              {msg.model && (
                <span className="text-xs text-gray-600 mr-2">[{msg.model}]</span>
              )}
              <span className="whitespace-pre-wrap">{msg.content}</span>
              {msg.isStreaming && <span className="inline-block w-2 h-3 bg-gray-400 animate-pulse ml-0.5" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ModelSelect({ label, icon, value, onChange, models, filter }: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  models: OllamaModel[];
  filter?: string;
}) {
  const filteredModels = filter 
    ? models.filter(m => m.name.includes(filter))
    : models;

  return (
    <div className="flex items-center gap-2">
      {icon}
      <label className="text-xs text-gray-500 w-24">{label}:</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-orange-500"
      >
        {filteredModels.length > 0 ? (
          filteredModels.map(m => (
            <option key={m.name} value={m.name}>{m.name}</option>
          ))
        ) : (
          models.map(m => (
            <option key={m.name} value={m.name}>{m.name}</option>
          ))
        )}
      </select>
    </div>
  );
}
