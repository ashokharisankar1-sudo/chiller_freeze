import { useState, useEffect, useRef } from 'react';
import { screenOCRService } from '../services/screenOCR';
import { knowledgeBaseService, KnowledgeEntry } from '../services/knowledgeBase';
import { ollamaService } from '../services/ollama';
import { evaluationService } from '../services/evaluation';
import { 
  Monitor, Play, Pause, Loader2, BookOpen, AlertCircle, 
  CheckCircle, Zap, X, Copy, ExternalLink, Maximize2, 
  Minimize2, RefreshCw
} from 'lucide-react';

export default function TeachingAssistant() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [screenText, setScreenText] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [errors, setErrors] = useState<Array<{ type: string; message: string; line?: number }>>([]);
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntry[]>([]);
  const [aiAnswer, setAiAnswer] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [quickQuestion, setQuickQuestion] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [monitorInterval, setMonitorInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [scanCount, setScanCount] = useState(0);

  // Start/stop monitoring
  const startMonitoring = async () => {
    try {
      await screenOCRService.initialize();
      setIsMonitoring(true);
      
      // Initial scan
      await performScan();
      
      // Set up periodic scanning
      const interval = setInterval(performScan, 5000); // Scan every 5 seconds
      setMonitorInterval(interval);
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      alert('Failed to start screen monitoring. Please ensure screen sharing permission is granted.');
    }
  };

  const stopMonitoring = () => {
    if (monitorInterval) {
      clearInterval(monitorInterval);
      setMonitorInterval(null);
    }
    setIsMonitoring(false);
  };

  // Perform screen scan
  const performScan = async () => {
    if (!isMonitoring && scanCount > 0) return;
    
    setIsProcessing(true);
    try {
      // Capture and OCR screen
      const text = await screenOCRService.captureAndRecognize();
      setScreenText(text);
      setLastScan(new Date());
      setScanCount(prev => prev + 1);

      // Extract keywords
      const extractedKeywords = screenOCRService.extractKeywords(text);
      setKeywords(extractedKeywords);

      // Detect errors
      const detectedErrors = screenOCRService.detectErrors(text);
      setErrors(detectedErrors);

      // Search knowledge base
      const entries = knowledgeBaseService.searchByKeywords(extractedKeywords);
      setKnowledgeEntries(entries);

      // If errors detected, get AI help
      if (detectedErrors.length > 0) {
        await getErrorHelp(detectedErrors[0]);
      }
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Get AI help for errors
  const getErrorHelp = async (error: { type: string; message: string; line?: number }) => {
    const solutions = knowledgeBaseService.getErrorSolutions(error.type);
    const context = `
Error detected on screen:
Type: ${error.type}
Message: ${error.message}
${error.line ? `Line: ${error.line}` : ''}

Screen context:
${screenText.substring(0, 500)}

Provide a clear, concise solution for this error. Include:
1. What caused the error
2. How to fix it
3. Code example if applicable
`;

    try {
      const response = await ollamaService.chatWithFallback(
        [
          { role: 'system', content: 'You are a programming teacher assistant. Help debug errors clearly and concisely.' },
          { role: 'user', content: context }
        ],
        'llama3:latest',
        (chunk) => {
          setAiAnswer(prev => prev + chunk);
        },
        undefined,
        { retryCount: 2 }
      );
    } catch (error) {
      console.error('AI help failed:', error);
      setAiAnswer(`Error solutions:\n${solutions.join('\n')}`);
    }
  };

  // Ask quick question
  const askQuestion = async () => {
    if (!quickQuestion.trim()) return;

    setCurrentQuestion(quickQuestion);
    setAiAnswer('');
    setIsProcessing(true);

    const context = `
Question: ${quickQuestion}

Current screen context:
${screenText.substring(0, 300)}

Keywords detected: ${keywords.join(', ')}

Provide a comprehensive answer that a teacher can use to explain to students. Include:
1. Clear explanation
2. Code examples if relevant
3. Common pitfalls
4. Best practices
`;

    try {
      await ollamaService.chatWithFallback(
        [
          { role: 'system', content: 'You are an expert programming teacher. Provide clear, comprehensive answers suitable for teaching students.' },
          { role: 'user', content: context }
        ],
        'llama3:latest',
        (chunk) => {
          setAiAnswer(prev => prev + chunk);
        },
        undefined,
        { retryCount: 2 }
      );
    } catch (error) {
      setAiAnswer('Failed to get answer. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (monitorInterval) {
        clearInterval(monitorInterval);
      }
      screenOCRService.terminate();
    };
  }, [monitorInterval]);

  return (
    <div className={`bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl overflow-hidden transition-all ${
      isExpanded ? 'fixed inset-4 z-50' : ''
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <Monitor className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Teaching Assistant</h2>
            <p className="text-xs text-gray-400">
              {isMonitoring ? `Monitoring • ${scanCount} scans` : 'Screen reader for live teaching'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          {isMonitoring ? (
            <button
              onClick={stopMonitoring}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-sm text-red-400 transition-colors"
            >
              <Pause className="w-4 h-4" />
              Stop
            </button>
          ) : (
            <button
              onClick={startMonitoring}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-sm text-cyan-400 transition-colors"
            >
              <Play className="w-4 h-4" />
              Start
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Status Bar */}
        {lastScan && (
          <div className="flex items-center justify-between text-xs text-gray-500 px-2">
            <span>Last scan: {lastScan.toLocaleTimeString()}</span>
            <button
              onClick={performScan}
              disabled={isProcessing}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isProcessing ? 'animate-spin' : ''}`} />
              Scan Now
            </button>
          </div>
        )}

        {/* Keywords Detected */}
        {keywords.length > 0 && (
          <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <h3 className="text-sm font-medium text-white">Keywords Detected</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-xs text-yellow-300"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Errors Detected */}
        {errors.length > 0 && (
          <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-medium text-white">Errors Detected</h3>
            </div>
            <div className="space-y-2">
              {errors.map((error, idx) => (
                <div key={idx} className="bg-gray-900/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-red-400 font-mono">{error.type}</span>
                    {error.line && (
                      <span className="text-xs text-gray-500">Line {error.line}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-300">{error.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Knowledge Base Results */}
        {knowledgeEntries.length > 0 && (
          <div className="space-y-3">
            {knowledgeEntries.map((entry, idx) => (
              <div key={idx} className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-medium text-white">{entry.topic}</h3>
                  </div>
                  <button
                    onClick={() => copyToClipboard(entry.quickStart)}
                    className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                    title="Copy quick start"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                
                <p className="text-xs text-gray-400 mb-3">{entry.description}</p>

                {/* Quick Start */}
                <div className="mb-3">
                  <h4 className="text-xs font-medium text-gray-300 mb-1">Quick Start</h4>
                  <pre className="bg-gray-900/50 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto">
                    <code>{entry.quickStart}</code>
                  </pre>
                </div>

                {/* Common Commands */}
                <div className="mb-3">
                  <h4 className="text-xs font-medium text-gray-300 mb-1">Common Commands</h4>
                  <ul className="space-y-1">
                    {entry.commonCommands.slice(0, 4).map((cmd, i) => (
                      <li key={i} className="text-xs text-gray-400 font-mono bg-gray-900/30 px-2 py-1 rounded">
                        {cmd}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Troubleshooting */}
                <div className="mb-3">
                  <h4 className="text-xs font-medium text-gray-300 mb-1">Troubleshooting</h4>
                  <ul className="space-y-1">
                    {entry.troubleshooting.slice(0, 3).map((tip, i) => (
                      <li key={i} className="text-xs text-gray-400 flex items-start gap-1">
                        <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Resources */}
                <div>
                  <h4 className="text-xs font-medium text-gray-300 mb-1">Resources</h4>
                  <div className="flex flex-wrap gap-2">
                    {entry.resources.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Docs
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Question */}
        <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
          <h3 className="text-sm font-medium text-white mb-3">Quick Question for Students</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={quickQuestion}
              onChange={(e) => setQuickQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && askQuestion()}
              placeholder="e.g., What is the difference between let and const?"
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              disabled={isProcessing}
            />
            <button
              onClick={askQuestion}
              disabled={!quickQuestion.trim() || isProcessing}
              className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-50 border border-cyan-500/30 rounded-lg text-sm text-cyan-400 transition-colors"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ask'}
            </button>
          </div>
        </div>

        {/* AI Answer */}
        {aiAnswer && (
          <div className="bg-indigo-500/5 rounded-xl p-4 border border-indigo-500/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-medium text-white">
                  {currentQuestion ? `Answer: ${currentQuestion}` : 'Error Solution'}
                </h3>
              </div>
              <button
                onClick={() => copyToClipboard(aiAnswer)}
                className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                title="Copy answer"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 text-sm text-gray-300 whitespace-pre-wrap">
              {aiAnswer}
              {isProcessing && <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-0.5" />}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isMonitoring && !aiAnswer && knowledgeEntries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Monitor className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-sm mb-2">Click "Start" to begin screen monitoring</p>
            <p className="text-xs text-center max-w-md">
              The assistant will read your screen, detect keywords and errors, 
              and provide relevant information for your teaching session.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
