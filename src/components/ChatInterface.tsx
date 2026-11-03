import { useState, useRef, useEffect } from 'react';
import { ChatMessage, OllamaModel } from '../types';
import { ollamaService } from '../services/ollama';
import { evaluationService, EvaluationResult } from '../services/evaluation';
import EvaluationPanel from './EvaluationPanel';
import { Send, Square, Trash2, Monitor, Camera, Loader2, Settings2, Award } from 'lucide-react';

interface Props {
  models: OllamaModel[];
  defaultModel?: string;
}

export default function ChatInterface({ models, defaultModel }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(defaultModel || 'llama3:latest');
  const [isStreaming, setIsStreaming] = useState(false);
  const [screenContext, setScreenContext] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [evaluations, setEvaluations] = useState<Map<string, EvaluationResult>>(new Map());
  const [showEval, setShowEval] = useState(true);
  const [hfApiKey, setHfApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentRequestId = useRef<string>('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (defaultModel) setSelectedModel(defaultModel);
  }, [defaultModel]);

  useEffect(() => {
    if (hfApiKey) {
      evaluationService.setApiKey(hfApiKey);
    }
  }, [hfApiKey]);

  const captureScreen = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true,
        audio: false 
      });
      
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setScreenContext(imageData);
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.error('Screen capture failed:', err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    const assistantMessage: ChatMessage = {
      id: `msg_${Date.now() + 1}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
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
      { role: 'system', content: 'You are a helpful AI assistant. Provide clear, accurate, and complete answers. If the user shares screen context, describe what you see and answer their questions about it.' },
      ...messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: questionText },
    ];

    if (screenContext) {
      chatMessages.push({
        role: 'user',
        content: '[Screen context captured - describe what you see and answer based on it]',
      });
    }

    const startTime = performance.now();
    let fullResponse = '';

    try {
      // Use chatWithFallback for guaranteed answers
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
      setStatusMessage(`Answered by ${result.model}${result.retries > 0 ? ` (after ${result.retries} retries)` : ''}`);

      // Update model display if fallback was used
      if (result.model !== selectedModel) {
        setMessages(prev => prev.map(m => 
          m.id === assistantMessage.id ? { ...m, model: result.model } : m
        ));
      }

      // Run evaluation
      setStatusMessage('Evaluating response quality...');
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
        ? 'Request cancelled by user.' 
        : `Error: ${error.message}. Make sure Ollama is running (ollama serve).`;
      
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
      setScreenContext(null);
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const cancelStream = () => {
    if (currentRequestId.current) {
      ollamaService.cancelRequest(currentRequestId.current);
      setIsStreaming(false);
      setMessages(prev => prev.map(m => 
        m.isStreaming ? { ...m, isStreaming: false } : m
      ));
    }
  };

  const clearChat = () => {
    ollamaService.cancelAll();
    setMessages([]);
    setScreenContext(null);
    setEvaluations(new Map());
    setIsStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="space-y-4">
      {/* Settings Bar */}
      <div className="flex items-center justify-between bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-3">
        <div className="flex items-center gap-3">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
          >
            {models.map(m => (
              <option key={m.name} value={m.name}>{m.name}</option>
            ))}
          </select>
          <button
            onClick={captureScreen}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
            title="Capture screen"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Screen</span>
          </button>
          <button
            onClick={() => setShowEval(!showEval)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              showEval ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" />
            <span className="hidden sm:inline">Eval</span>
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {statusMessage && (
            <span className="text-xs text-gray-500 hidden sm:inline">{statusMessage}</span>
          )}
          <button
            onClick={clearChat}
            className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* HF API Key Settings */}
      {showSettings && (
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Hugging Face Evaluation Settings</h3>
          <p className="text-xs text-gray-500 mb-3">
            Add your HF API key for semantic similarity evaluation using sentence-transformers.
            Get a free key at <a href="https://huggingface.co/settings/tokens" target="_blank" className="text-indigo-400 hover:underline">huggingface.co/settings/tokens</a>
          </p>
          <input
            type="password"
            value={hfApiKey}
            onChange={(e) => setHfApiKey(e.target.value)}
            placeholder="hf_xxxxxxxxxxxxxxxxxxxx"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
          <p className="text-xs text-gray-600 mt-2">
            Without API key: Uses local bag-of-words similarity. With API key: Uses sentence-transformers for semantic evaluation.
          </p>
        </div>
      )}

      {/* Screen Context Indicator */}
      {screenContext && (
        <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center gap-2 text-sm text-indigo-300">
          <Camera className="w-4 h-4" />
          Screen context captured
          <button onClick={() => setScreenContext(null)} className="ml-auto text-indigo-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Chat Container */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl flex flex-col" style={{ height: '500px' }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Monitor className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Start a conversation</p>
              <p className="text-xs mt-1">Responses are automatically evaluated using Hugging Face metrics</p>
              <div className="flex items-center gap-3 mt-4 text-xs text-gray-600">
                <span>BLEU</span>•<span>ROUGE</span>•<span>Semantic</span>•<span>Quality</span>
              </div>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id}>
              <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-800 text-gray-200 border border-gray-700/50'
                }`}>
                  {msg.role === 'assistant' && msg.model && (
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <span>{msg.model}</span>
                      {evaluations.has(msg.id) && (
                        <span className="text-indigo-400">• evaluated</span>
                      )}
                    </div>
                  )}
                  <div className="text-sm whitespace-pre-wrap">
                    {msg.content || (msg.isStreaming ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-gray-500 text-xs">Generating response...</span>
                      </div>
                    ) : '')}
                    {msg.isStreaming && msg.content && (
                      <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-0.5" />
                    )}
                  </div>
                </div>
              </div>
              
              {/* Evaluation for this message */}
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
        <div className="p-4 border-t border-gray-700/50">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything... (auto-evaluated with HF metrics)"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-indigo-500 max-h-32"
              rows={1}
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

      {/* Latest Evaluation (Full) */}
      {showEval && messages.length > 0 && (() => {
        const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant' && !m.isStreaming);
        if (!lastAssistantMsg || !evaluations.has(lastAssistantMsg.id)) return null;
        return (
          <EvaluationPanel 
            result={evaluations.get(lastAssistantMsg.id)!} 
            modelName={lastAssistantMsg.model}
          />
        );
      })()}
    </div>
  );
}
