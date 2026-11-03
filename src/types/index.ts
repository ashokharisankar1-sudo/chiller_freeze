export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details?: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaModelsResponse {
  models: OllamaModel[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
  isStreaming?: boolean;
}

export interface ModelConfig {
  name: string;
  role: string;
  description: string;
  color: string;
  icon: string;
}

export interface MeetingAgentConfig {
  transcriptionModel: string;
  classificationModel: string;
  answerModel: string;
  codingModel: string;
}

export interface TranscriptionSegment {
  id: string;
  text: string;
  timestamp: Date;
  speaker?: string;
}

export interface ScreenCaptureState {
  isActive: boolean;
  stream: MediaStream | null;
  lastFrame: string | null;
}

export type ModelRole = 'coding' | 'reasoning' | 'classification' | 'transcription';

export interface EvaluationMetrics {
  bleu: number;
  rouge1: number;
  rouge2: number;
  rougeL: number;
  semanticSimilarity: number;
  relevanceScore: number;
  coherenceScore: number;
  completenessScore: number;
  overallScore: number;
}
