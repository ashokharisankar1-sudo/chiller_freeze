import { useState, useRef, useEffect } from 'react';
import { ChatMessage, OllamaModel } from '../types';
import { ollamaService } from '../services/ollama';
import { Send, Square, Trash2, Monitor, Camera, Loader2 } from 'lucide-react';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  const captureScreen = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true,
        audio: false 
      });
      
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      
      // Wait a bit for the video to be ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setScreenContext(imageData);
      
      // Stop all tracks
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

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInput('');
    setIsStreaming(true);
    currentRequestId.current = `chat_${Date.now()}`;

    const chatMessages = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: input },
    ];

    // Add screen context if available
    if (screenContext) {
      chatMessages.push({
        role: 'user',
        content: '[Screen context captured - describe what you see in the screenshot and answer the user\'s question based on it]',
      });
    }

    try {
      await ollamaService.chat(
        selectedModel,
        chatMessages,
        (chunk) => {
          setMessages(prev => prev.map(m => 
            m.id === assistantMessage.id 
              ? { ...m, content: m.content + chunk }
              : m
          ));
        },
        currentRequestId.current
      );
    } catch (error: any) {
      setMessages(prev => prev.map(m => 
        m.id === assistantMessage.id 
          ? { ...m, content: m.content || `Error: ${error.message}`, isStreaming: false }
          : m
      ));
    } finally {
      setMessages(prev => prev.map(m => 
        m.id === assistantMessage.id ? { ...m, isStreaming: false } : m
      ));
      setIsStreaming(false);
      setScreenContext(null);
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
    setIsStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl flex flex-col h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Monitor className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">AI Chat</h2>
            <p className="text-xs text-gray-400">Interactive assistant with screen context</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
            title="Capture screen"
          >
            <Camera className="w-4 h-4" />
          </button>
          <button
            onClick={clearChat}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Screen Context Indicator */}
      {screenContext && (
        <div className="mx-4 mt-3 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center gap-2 text-sm text-indigo-300">
          <Camera className="w-4 h-4" />
          Screen context captured - will be included with next message
          <button onClick={() => setScreenContext(null)} className="ml-auto text-indigo-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Monitor className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Start a conversation or capture your screen for context</p>
            <p className="text-xs mt-1">Press Enter to send, Shift+Enter for new line</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-800 text-gray-200 border border-gray-700/50'
            }`}>
              {msg.role === 'assistant' && msg.model && (
                <div className="text-xs text-gray-500 mb-1">{msg.model}</div>
              )}
              <div className="text-sm whitespace-pre-wrap">
                {msg.content || (msg.isStreaming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : '')}
                {msg.isStreaming && <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-0.5" />}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700/50">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your screen, code, or anything..."
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
  );
}
