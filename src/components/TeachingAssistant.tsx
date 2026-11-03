import { useState, useEffect, useRef } from 'react';
import { screenOCRService } from '../services/screenOCR';
import { ollamaService } from '../services/ollama';
import { 
  Monitor, Play, Pause, Loader2, BookOpen, AlertCircle, 
  CheckCircle, Zap, X, Copy, Maximize2, Minimize2, 
  RefreshCw, Lightbulb, Target, ListChecks, MessageCircle
} from 'lucide-react';

interface TopicCoverage {
  topic: string;
  subtopics: string[];
  covered: string[];
  missing: string[];
}

interface ScenarioExample {
  scenario: string;
  explanation: string;
  code?: string;
  curiosityHook: string;
}

export default function TeachingAssistant() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [screenText, setScreenText] = useState('');
  const [currentTopic, setCurrentTopic] = useState('');
  const [topicCoverage, setTopicCoverage] = useState<TopicCoverage | null>(null);
  const [scenarioExamples, setScenarioExamples] = useState<ScenarioExample[]>([]);
  const [comprehensiveInfo, setComprehensiveInfo] = useState('');
  const [gapAlerts, setGapAlerts] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [teacherNotes, setTeacherNotes] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [monitorInterval, setMonitorInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'scenarios' | 'gaps' | 'notes'>('overview');

  // Start/stop monitoring
  const startMonitoring = async () => {
    try {
      await screenOCRService.initialize();
      setIsMonitoring(true);
      await performScan();
      const interval = setInterval(performScan, 5000);
      setMonitorInterval(interval);
    } catch (error) {
      console.error('Failed to start monitoring:', error);
    }
  };

  const stopMonitoring = () => {
    if (monitorInterval) {
      clearInterval(monitorInterval);
      setMonitorInterval(null);
    }
    setIsMonitoring(false);
  };

  // Perform screen scan and analyze
  const performScan = async () => {
    if (!isMonitoring && scanCount > 0) return;
    
    setIsProcessing(true);
    try {
      const text = await screenOCRService.captureAndRecognize();
      setScreenText(text);
      setLastScan(new Date());
      setScanCount(prev => prev + 1);

      // Detect current topic
      await detectCurrentTopic(text);
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Detect what topic is being taught
  const detectCurrentTopic = async (text: string) => {
    const keywords = screenOCRService.extractKeywords(text);
    
    const prompt = `
Analyze this screen content and identify the MAIN TOPIC being taught:

Screen text:
${text.substring(0, 1000)}

Keywords detected: ${keywords.join(', ')}

Respond in this exact JSON format:
{
  "topic": "main topic name",
  "context": "what aspect is being covered",
  "subtopics_visible": ["list of subtopics visible on screen"]
}
`;

    try {
      const { response } = await ollamaService.chatSyncWithFallback(
        [
          { role: 'system', content: 'You are a teaching assistant. Identify the main topic being taught. Respond ONLY with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        'llama3:latest',
        { temperature: 0.1, num_predict: 200 }
      );

      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setCurrentTopic(parsed.topic);
        
        // Get comprehensive coverage for this topic
        await getComprehensiveCoverage(parsed.topic, parsed.subtopics_visible || []);
      }
    } catch (error) {
      console.error('Topic detection failed:', error);
    }
  };

  // Get comprehensive topic coverage
  const getComprehensiveCoverage = async (topic: string, visibleSubtopics: string[]) => {
    const prompt = `
You are helping a teacher explain "${topic}" to 1-2 students using scenario-based teaching.

The teacher is currently showing these subtopics on screen:
${visibleSubtopics.join(', ')}

Provide:

1. COMPLETE TOPIC COVERAGE:
List ALL important subtopics that should be covered when teaching "${topic}".
Include fundamentals, intermediate concepts, and advanced topics.

2. SCENARIO-BASED EXAMPLES (3 examples):
For each example, provide:
- A real-world scenario where this is used
- Why it matters (curiosity hook)
- Simple code/example
- What students should understand

3. GAP ANALYSIS:
Compare what's visible on screen vs what should be covered.
List any IMPORTANT topics that are MISSING from the current teaching.

4. COMPREHENSIVE EXPLANATION:
Provide a complete, thorough explanation of "${topic}" that covers:
- What it is
- Why it's important
- When to use it
- How it works
- Common pitfalls
- Best practices

Respond in this exact JSON format:
{
  "all_subtopics": ["list of all subtopics to cover"],
  "scenarios": [
    {
      "scenario": "real-world use case",
      "explanation": "why this matters",
      "code": "example code",
      "curiosity_hook": "interesting fact to make students curious"
    }
  ],
  "missing_topics": ["topics not visible on screen but should be covered"],
  "comprehensive_explanation": "full detailed explanation"
}
`;

    try {
      const { response } = await ollamaService.chatSyncWithFallback(
        [
          { role: 'system', content: 'You are an expert teacher. Provide comprehensive, scenario-based teaching material. Respond ONLY with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        'llama3:latest',
        { temperature: 0.3, num_predict: 2000 }
      );

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        setTopicCoverage({
          topic,
          subtopics: parsed.all_subtopics || [],
          covered: visibleSubtopics,
          missing: parsed.missing_topics || []
        });

        setScenarioExamples(parsed.scenarios || []);
        setGapAlerts(parsed.missing_topics || []);
        setComprehensiveInfo(parsed.comprehensive_explanation || '');
      }
    } catch (error) {
      console.error('Coverage analysis failed:', error);
    }
  };

  // Get additional explanation for a specific subtopic
  const getSubtopicExplanation = async (subtopic: string) => {
    setIsProcessing(true);
    
    const prompt = `
Explain "${subtopic}" in the context of "${currentTopic}" for 1-2 students.

Provide:
1. What it is (simple explanation)
2. Why it matters (real-world importance)
3. Scenario-based example (when would you use this?)
4. Code/example if applicable
5. Common mistakes to avoid
6. Best practices

Make it engaging and curiosity-driven. Use "Did you know?" or "Here's the interesting part" to hook students.

Be COMPLETE - don't leave anything half-explained.
`;

    try {
      let fullResponse = '';
      await ollamaService.chatWithFallback(
        [
          { role: 'system', content: 'You are an expert teacher making concepts interesting and complete.' },
          { role: 'user', content: prompt }
        ],
        'llama3:latest',
        (chunk) => {
          fullResponse += chunk;
          setTeacherNotes(fullResponse);
        },
        undefined,
        { retryCount: 2 }
      );
    } catch (error) {
      console.error('Explanation failed:', error);
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
              {currentTopic ? `Teaching: ${currentTopic}` : 'Screen reader for scenario-based teaching'}
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

      {/* Tabs */}
      <div className="flex border-b border-gray-700/50">
        {[
          { id: 'overview', label: 'Overview', icon: BookOpen },
          { id: 'scenarios', label: 'Scenarios', icon: Lightbulb },
          { id: 'gaps', label: 'Gap Analysis', icon: AlertCircle },
          { id: 'notes', label: 'Detailed Notes', icon: MessageCircle }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'gaps' && gapAlerts.length > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                  {gapAlerts.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-4 max-h-[calc(100vh-250px)] overflow-y-auto">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Current Topic */}
            {currentTopic && (
              <div className="bg-cyan-500/5 rounded-xl p-4 border border-cyan-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-semibold text-white">Current Topic: {currentTopic}</h3>
                </div>
                <p className="text-sm text-gray-400">
                  Teaching this topic comprehensively with scenario-based examples
                </p>
              </div>
            )}

            {/* Topic Coverage */}
            {topicCoverage && (
              <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                <div className="flex items-center gap-2 mb-3">
                  <ListChecks className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-medium text-white">Complete Topic Coverage</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-2">All Subtopics to Cover:</p>
                    <div className="space-y-1">
                      {topicCoverage.subtopics.map((subtopic, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <CheckCircle className={`w-3 h-3 ${
                            topicCoverage.covered.includes(subtopic) ? 'text-green-400' : 'text-gray-600'
                          }`} />
                          <span className={`text-xs ${
                            topicCoverage.covered.includes(subtopic) ? 'text-green-300' : 'text-gray-400'
                          }`}>
                            {subtopic}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Currently Visible:</p>
                    <div className="space-y-1">
                      {topicCoverage.covered.map((subtopic, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                          <span className="text-xs text-green-300">{subtopic}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Comprehensive Explanation */}
            {comprehensiveInfo && (
              <div className="bg-indigo-500/5 rounded-xl p-4 border border-indigo-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-sm font-medium text-white">Comprehensive Explanation</h3>
                  </div>
                  <button
                    onClick={() => copyToClipboard(comprehensiveInfo)}
                    className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {comprehensiveInfo}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scenarios Tab */}
        {activeTab === 'scenarios' && (
          <div className="space-y-4">
            {scenarioExamples.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Scenario examples will appear here</p>
                <p className="text-xs mt-1">Start monitoring to generate real-world scenarios</p>
              </div>
            ) : (
              scenarioExamples.map((scenario, idx) => (
                <div key={idx} className="bg-yellow-500/5 rounded-xl p-4 border border-yellow-500/20">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-yellow-500/20 rounded-lg">
                      <Lightbulb className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-white mb-1">
                        Scenario {idx + 1}: {scenario.scenario}
                      </h3>
                      <p className="text-xs text-gray-400">{scenario.explanation}</p>
                    </div>
                  </div>

                  {/* Curiosity Hook */}
                  <div className="bg-yellow-500/10 rounded-lg p-3 mb-3">
                    <p className="text-xs text-yellow-300 flex items-start gap-2">
                      <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span><strong>Curiosity Hook:</strong> {scenario.curiosityHook}</span>
                    </p>
                  </div>

                  {/* Code Example */}
                  {scenario.code && (
                    <div className="bg-gray-900/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500">Example Code:</span>
                        <button
                          onClick={() => copyToClipboard(scenario.code!)}
                          className="p-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <pre className="text-xs text-gray-300 overflow-x-auto">
                        <code>{scenario.code}</code>
                      </pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Gap Analysis Tab */}
        {activeTab === 'gaps' && (
          <div className="space-y-4">
            {gapAlerts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20 text-green-400" />
                <p className="text-sm text-green-400">Great! No gaps detected</p>
                <p className="text-xs mt-1">You're covering all important topics</p>
              </div>
            ) : (
              <>
                <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <h3 className="text-sm font-medium text-white">
                      Missing Topics ({gapAlerts.length})
                    </h3>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    These important topics should be covered but aren't visible on screen:
                  </p>
                  <div className="space-y-2">
                    {gapAlerts.map((gap, idx) => (
                      <div key={idx} className="bg-gray-900/50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                            <span className="text-sm text-gray-300">{gap}</span>
                          </div>
                          <button
                            onClick={() => getSubtopicExplanation(gap)}
                            disabled={isProcessing}
                            className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded text-xs text-cyan-400 transition-colors disabled:opacity-50"
                          >
                            {isProcessing ? 'Loading...' : 'Explain'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {teacherNotes && (
                  <div className="bg-indigo-500/5 rounded-xl p-4 border border-indigo-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-white">Detailed Explanation</h3>
                      <button
                        onClick={() => copyToClipboard(teacherNotes)}
                        className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {teacherNotes}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            {comprehensiveInfo ? (
              <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-white">Complete Teaching Notes</h3>
                  <button
                    onClick={() => copyToClipboard(comprehensiveInfo)}
                    className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {comprehensiveInfo}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Detailed notes will appear here</p>
                <p className="text-xs mt-1">Start monitoring to generate comprehensive notes</p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isMonitoring && !currentTopic && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Monitor className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-sm mb-2">Click "Start" to begin teaching assistant</p>
            <p className="text-xs text-center max-w-md">
              The assistant will read your screen, detect what you're teaching, 
              provide complete coverage with scenario-based examples, and alert you 
              to any missing topics.
            </p>
          </div>
        )}
      </div>

      {/* Status Bar */}
      {lastScan && (
        <div className="border-t border-gray-700/50 px-4 py-2 flex items-center justify-between text-xs text-gray-500">
          <span>Last scan: {lastScan.toLocaleTimeString()}</span>
          <div className="flex items-center gap-3">
            <span>Scans: {scanCount}</span>
            <button
              onClick={performScan}
              disabled={isProcessing}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isProcessing ? 'animate-spin' : ''}`} />
              Scan Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
