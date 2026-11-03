import { useState, useRef, useEffect, useCallback } from 'react';
import { TranscriptionSegment } from '../types';
import { ollamaService } from '../services/ollama';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface Props {
  whisperModel: string;
  onTranscription?: (text: string) => void;
}

export default function AudioTranscription({ whisperModel, onTranscription }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [segments, setSegments] = useState<TranscriptionSegment[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);

  const updateAudioLevel = useCallback(() => {
    if (analyserRef.current) {
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setAudioLevel(avg / 255);
      animFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        } 
      });
      streamRef.current = stream;

      // Set up audio analysis
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      animFrameRef.current = requestAnimationFrame(updateAudioLevel);

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          // Convert to base64 for Ollama
          const arrayBuffer = await event.data.arrayBuffer();
          const base64 = arrayBufferToBase64(arrayBuffer);
          
          try {
            await ollamaService.transcribeAudio(
              whisperModel,
              base64,
              (chunk) => {
                setTranscription(prev => prev + chunk);
              }
            );
          } catch (err: any) {
            setError(`Transcription error: ${err.message}`);
          }
        }
      };

      mediaRecorder.start(3000); // Collect data every 3 seconds
      setIsRecording(true);
    } catch (err: any) {
      setError(`Microphone access denied: ${err.message}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    cancelAnimationFrame(animFrameRef.current);
    setIsRecording(false);
    setAudioLevel(0);

    // Save segment
    if (transcription.trim()) {
      const segment: TranscriptionSegment = {
        id: `seg_${Date.now()}`,
        text: transcription.trim(),
        timestamp: new Date(),
      };
      setSegments(prev => [...prev, segment]);
      onTranscription?.(transcription.trim());
      setTranscription('');
    }
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <Mic className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Live Transcription</h2>
            <p className="text-xs text-gray-400">Using {whisperModel}</p>
          </div>
        </div>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            isRecording 
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30' 
              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
          }`}
        >
          {isRecording ? (
            <>
              <MicOff className="w-4 h-4" />
              Stop
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              Record
            </>
          )}
        </button>
      </div>

      {/* Audio Level Indicator */}
      {isRecording && (
        <div className="mb-4 flex items-center gap-2">
          <div className="flex items-center gap-1">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="w-1 rounded-full transition-all duration-75"
                style={{
                  height: `${Math.max(4, audioLevel * 40 * (Math.sin(i * 0.5) * 0.5 + 0.5))}px`,
                  backgroundColor: audioLevel > 0.5 ? '#ef4444' : audioLevel > 0.3 ? '#f59e0b' : '#22c55e',
                }}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500 ml-2">Recording...</span>
        </div>
      )}

      {/* Live Transcription */}
      <div className="bg-gray-800/50 rounded-xl p-4 min-h-[80px] border border-gray-700/30">
        {transcription ? (
          <p className="text-sm text-white whitespace-pre-wrap">{transcription}</p>
        ) : isRecording ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Listening...</span>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Click Record to start transcription</p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Segments */}
      {segments.length > 0 && (
        <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
          <p className="text-xs text-gray-500 font-medium">Previous segments:</p>
          {segments.map(seg => (
            <div key={seg.id} className="text-xs text-gray-400 bg-gray-800/30 rounded-lg px-3 py-2">
              <span className="text-gray-600">
                {seg.timestamp.toLocaleTimeString()}
              </span>
              {' — '}
              {seg.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
