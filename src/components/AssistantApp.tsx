import { useState, useEffect, useRef } from 'react';
import { OllamaModel } from '../types';
import { ollamaService } from '../services/ollama';
import { evaluationService, EvaluationResult } from '../services/evaluation';
import EvaluationPanel from './EvaluationPanel';
import { ArrowLeft, Send, Square, Loader2, Settings, Award, Monitor, Camera } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export default function AssistantApp({ onBack }: Props) {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('llama3:latest');
  const [messages, setMessages] = useState<Array<{ id: string; role: string; content: string; model?: string; isStreaming?: boolean }>>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [evaluations, setEvaluations] = useState<Map<string, EvaluationResult>>(new Map());
  const [showEval, setShowEval] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [hfApiKey, setHfApiKey] = useState('');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentRequestId = useRef<string>('');

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    if (hfApiKey) {
      evaluationService.setApiKey(hfApiKey);
    }
  }, [hfApiKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Detect screen sharing
  useEffect(() => {
    const checkScreenShare = async () => {
      try {
        const streams = await navigator.mediaDevices.enumerateDevices();
        const hasDisplay = streams.some(d => d.kind === 'videoinput' && d.label.toLowerCase().includes('screen'));
        setIsScreenSharing(hasDisplay);
      } catch {
        // Ignore
      }
    };

    const interval = setInterval(checkScreenShare, 2000);
    checkScreenShare();
    return () => clearInterval(interval);
  }, []);

  const loadModels = async () => {
    const available = await ollamaService.isAvailable();
    if (available) {
      const fetchedModels = await ollamaService.getModels();
      setModels(fetchedModels);
      if (fetchedModels.length > 0) {
        setSelectedModel(fetchedModels[0].name);
      }
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input,
    };

    const assistantMessage = {
      id: `msg_${Date.now() + 1}`,
      role: 'assistant',
      content: '',
      model: selectedModel,
      isStreaming: true,
    };

    const questionText = input;
    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInput('');
    setIsStreaming(true);
    setStatusMessage('Sending to Ollama...');
    currentRequestId.current = `chat_${Date.now()}`;

    const chatMessages = [
      { role: 'system', content: 'You are a helpful AI assistant for content creators. Provide clear, accurate, and complete answers.' },
      ...messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: questionText },
    ];

    const startTime = performance.now();
    let fullResponse = '';

    try {
      const result = await ollamaService.chatWithFallback(
        chatMessages,
        selectedModel,
        (chunk) => {
          fullResponse += chunk;
          setMessages(prev => prev.map(m => 
            m.id === assistantMessage.id 
              ? { ...m, content: m.content + chunk }
              : m
          ));
        },
        (status) => {
          setStatusMessage(status);
        },
        { retryCount: 2, timeout: 120000 }
      );

      const latency = performance.now() - startTime;
      setStatusMessage(`Answered by ${result.model}`);

      if (result.model !== selectedModel) {
        setMessages(prev => prev.map(m => 
          m.id === assistantMessage.id ? { ...m, model: result.model } : m
        ));
      }

      // Evaluate
      setStatusMessage('Evaluating response...');
      try {
        const evalResult = await evaluationService.evaluate(
          questionText,
          fullResponse,
          undefined,
          latency
        );
        setEvaluations(prev => new Map(prev).set(assistantMessage.id, evalResult));
      } catch (evalError) {
        console.warn('Evaluation failed:', evalError);
      }

    } catch (error: any) {
      const errorMsg = error.message === 'Request cancelled' 
        ? 'Request cancelled.' 
        : `Error: ${error.message}. Ensure Ollama is running.`;
      
      setMessages(prev => prev.map(m => 
        m.id === assistantMessage.id 
          ? { ...m, content: errorMsg, isStreaming: false }
          : m
      ));
    } finally {
      setMessages(prev => prev.map(m => 
        m.id === assistantMessage.id ? { ...m, isStreaming: false } : m
      ));
      setIsStreaming(false);
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const cancelStream = () => {
    if (currentRequestId.current) {
      ollamaService.cancelRequest(currentRequestId.current);
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // If screen sharing, show privacy notice
  if (isScreenSharing) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <Monitor className="w-16 h-16 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Screen Sharing Detected</h2>
          <p className="text-gray-400 text-sm">Assistant content is hidden during screen share</p>
          <button
            onClick={onBack}
            className="mt-6 px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
          >
            Back to Launcher
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900/80 backdrop-blur-xl border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Creator Assistant</h1>
            <p className="text-xs text-gray-500">{models.length} models available</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusMessage && (
            <span className="text-xs text-gray-500 hidden sm:inline">{statusMessage}</span>
          )}
          <button
            onClick={() => setShowEval(!showEval)}
            className={`p-2 rounded-lg transition-colors ${
              showEval ? 'bg-indigo-500/20 text-indigo-400' : 'hover:bg-gray-800 text-gray-400'
            }`}
          >
            <Award className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-gray-900 border-b border-gray-800 p-4 space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              {models.map(m => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Hugging Face API Key (optional)</label>
            <input
              type="password"
              value={hfApiKey}
              onChange={(e) => setHfApiKey(e.target.value)}
              placeholder="hf_xxxxxxxxxxxx"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
            />
            <p className="text-xs text-gray-600 mt-1">For semantic evaluation using sentence-transformers</p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <p className="text-sm">Start a conversation</p>
            <p className="text-xs mt-1 text-gray-600">Responses are evaluated with HF metrics</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id}>
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-800 text-gray-200 border border-gray-700'
              }`}>
                {msg.role === 'assistant' && msg.model && (
                  <div className="text-xs text-gray-500 mb-1">{msg.model}</div>
                )}
                <div className="text-sm whitespace-pre-wrap">
                  {msg.content || (msg.isStreaming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : '')}
                  {msg.isStreaming && msg.content && (
                    <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-0.5" />
                  )}
                </div>
              </div>
            </div>
            
            {/* Evaluation */}
            {showEval && msg.role === 'assistant' && !msg.isStreaming && evaluations.has(msg.id) && (
              <div className="mt-2 ml-2">
                <EvaluationPanel 
                  result={evaluations.get(msg.id)!} 
                  modelName={msg.model}
                  compact
                />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-gray-900 border-t border-gray-800 p-4">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-indigo-500 max-h-32"
            rows={1}
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button
              onClick={cancelStream}
              className="p-3 bg-red-500/20 hover:bg-red-500/30 rounded-xl text-red-400 transition-colors"
            >
              <Square className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 rounded-xl text-white transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
