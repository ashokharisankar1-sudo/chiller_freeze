import { OllamaModel } from '../types';

const OLLAMA_BASE_URL = 'http://localhost:11434';

// Fallback model chain - if primary fails, try next
const FALLBACK_CHAIN = [
  'llama3:latest',
  'gemma2:9b',
  'qwen3-coder:30b',
];

export interface ChatOptions {
  temperature?: number;
  num_predict?: number;
  top_p?: number;
  retryCount?: number;
  timeout?: number;
  fallbackModels?: string[];
}

export class OllamaService {
  private abortControllers: Map<string, AbortController> = new Map();
  private availableModels: Set<string> = new Set();
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private isHealthy: boolean = false;

  constructor() {
    this.startHealthCheck();
  }

  // ==================== CONNECTION & HEALTH ====================
  
  private startHealthCheck() {
    this.checkHealth();
    this.healthCheckInterval = setInterval(() => this.checkHealth(), 15000);
  }

  private async checkHealth() {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      this.isHealthy = response.ok;
      if (response.ok) {
        const data = await response.json();
        this.availableModels = new Set(
          (data.models || []).map((m: any) => m.name)
        );
      }
    } catch {
      this.isHealthy = false;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  getHealthStatus(): boolean {
    return this.isHealthy;
  }

  // ==================== MODEL DISCOVERY ====================

  async getModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error('Failed to fetch models');
      const data = await response.json();
      const models = data.models || [];
      this.availableModels = new Set(models.map((m: any) => m.name));
      return models;
    } catch (error) {
      console.error('Error fetching models:', error);
      return [];
    }
  }

  async isModelAvailable(modelName: string): Promise<boolean> {
    if (this.availableModels.has(modelName)) return true;
    const models = await this.getModels();
    return models.some(m => m.name === modelName || m.name === `${modelName}:latest`);
  }

  getAvailableModelsList(): string[] {
    return Array.from(this.availableModels);
  }

  // ==================== CHAT WITH GUARANTEED ANSWERS ====================

  /**
   * Chat with automatic retry and fallback model chain.
   * Guarantees an answer by trying multiple models if the primary fails.
   */
  async chatWithFallback(
    messages: { role: string; content: string }[],
    primaryModel: string,
    onChunk: (chunk: string) => void,
    onStatusUpdate?: (status: string) => void,
    options?: ChatOptions
  ): Promise<{ response: string; model: string; retries: number }> {
    const maxRetries = options?.retryCount ?? 2;
    const fallbackModels = options?.fallbackModels ?? FALLBACK_CHAIN.filter(m => m !== primaryModel);
    const modelsToTry = [primaryModel, ...fallbackModels];

    let lastError: Error | null = null;

    for (let i = 0; i < modelsToTry.length; i++) {
      const model = modelsToTry[i];

      // Check if model is available
      const available = await this.isModelAvailable(model);
      if (!available) {
        onStatusUpdate?.(`Model ${model} not available, trying next...`);
        continue;
      }

      // Try with retries
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            onStatusUpdate?.(`Retrying ${model} (attempt ${attempt + 1}/${maxRetries + 1})...`);
            await this.delay(1000 * attempt); // Exponential backoff
          } else if (i > 0) {
            onStatusUpdate?.(`Switching to fallback model: ${model}`);
          }

          const requestId = `chat_${Date.now()}_${i}_${attempt}`;
          const response = await this.chat(model, messages, onChunk, requestId, options);
          return { response, model, retries: i * (maxRetries + 1) + attempt };
        } catch (error: any) {
          lastError = error;
          if (error.message === 'Request cancelled') {
            throw error; // Don't retry cancelled requests
          }
          console.warn(`Model ${model} attempt ${attempt + 1} failed:`, error.message);
        }
      }
    }

    // If all models fail, return a helpful error message
    const errorMsg = lastError?.message || 'All models failed';
    const fallbackResponse = `I apologize, but I encountered an issue: ${errorMsg}. Please ensure Ollama is running (ollama serve) and at least one model is available.`;
    onChunk(fallbackResponse);
    return { response: fallbackResponse, model: 'error', retries: modelsToTry.length };
  }

  /**
   * Standard streaming chat with a specific model
   */
  async chat(
    model: string,
    messages: { role: string; content: string }[],
    onChunk: (chunk: string) => void,
    requestId?: string,
    options?: ChatOptions
  ): Promise<string> {
    const id = requestId || `req_${Date.now()}`;
    
    // Cancel any existing request with same ID
    this.cancelRequest(id);

    const controller = new AbortController();
    this.abortControllers.set(id, controller);

    const timeout = options?.timeout ?? 120000;

    // Set up timeout
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          options: {
            temperature: options?.temperature ?? 0.7,
            num_predict: options?.num_predict ?? 2048,
            top_p: options?.top_p ?? 0.9,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama error (${response.status}): ${errorText.substring(0, 200)}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullResponse = '';
      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.message?.content) {
              fullResponse += json.message.content;
              onChunk(json.message.content);
              chunkCount++;
            }
            if (json.done) {
              // Stream complete
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }

      if (fullResponse.length === 0) {
        throw new Error('Empty response from model');
      }

      clearTimeout(timeoutId);
      this.abortControllers.delete(id);
      return fullResponse;
    } catch (error: any) {
      clearTimeout(timeoutId);
      this.abortControllers.delete(id);
      if (error.name === 'AbortError') {
        throw new Error('Request cancelled');
      }
      throw error;
    }
  }

  /**
   * Non-streaming chat for quick responses (classification, etc.)
   */
  async chatSync(
    model: string,
    messages: { role: string; content: string }[],
    options?: ChatOptions
  ): Promise<string> {
    const timeout = options?.timeout ?? 30000;
    
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.1,
          num_predict: options?.num_predict ?? 100,
          top_p: options?.top_p ?? 0.9,
        },
      }),
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.message?.content || '';
    
    if (!content) {
      throw new Error('Empty response');
    }
    
    return content;
  }

  /**
   * ChatSync with fallback - guarantees a response
   */
  async chatSyncWithFallback(
    messages: { role: string; content: string }[],
    primaryModel: string,
    options?: ChatOptions
  ): Promise<{ response: string; model: string }> {
    const fallbackModels = options?.fallbackModels ?? FALLBACK_CHAIN.filter(m => m !== primaryModel);
    const modelsToTry = [primaryModel, ...fallbackModels];

    for (const model of modelsToTry) {
      try {
        const available = await this.isModelAvailable(model);
        if (!available) continue;
        
        const response = await this.chatSync(model, messages, options);
        return { response, model };
      } catch (error) {
        console.warn(`chatSync failed for ${model}:`, error);
        continue;
      }
    }

    throw new Error('All models failed for sync request');
  }

  // ==================== TRANSCRIPTION ====================

  async transcribeAudio(
    model: string,
    audioBase64: string,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    const id = `transcribe_${Date.now()}`;
    const controller = new AbortController();
    this.abortControllers.set(id, controller);

    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: 'Transcribe the following audio accurately.',
          images: [audioBase64],
          stream: true,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        throw new Error(`Transcription error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.response) {
              fullText += json.response;
              onChunk(json.response);
            }
          } catch {
            // Skip malformed lines
          }
        }
      }

      this.abortControllers.delete(id);
      return fullText;
    } catch (error: any) {
      this.abortControllers.delete(id);
      if (error.name === 'AbortError') throw new Error('Transcription cancelled');
      throw error;
    }
  }

  // ==================== REQUEST MANAGEMENT ====================

  cancelRequest(requestId: string): void {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }

  cancelAll(): void {
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
  }

  // ==================== TESTING ====================

  async testModel(modelName: string): Promise<{ success: boolean; latency: number; error?: string }> {
    const start = performance.now();
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: 'Respond with exactly: OK',
          stream: false,
          options: { num_predict: 5, temperature: 0 },
        }),
        signal: AbortSignal.timeout(30000),
      });

      const latency = performance.now() - start;

      if (!response.ok) {
        return { success: false, latency, error: `HTTP ${response.status}` };
      }

      const data = await response.json();
      if (!data.response) {
        return { success: false, latency, error: 'Empty response' };
      }

      return { success: true, latency };
    } catch (error: any) {
      const latency = performance.now() - start;
      return { success: false, latency, error: error.message };
    }
  }

  // ==================== UTILITIES ====================

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.cancelAll();
  }
}

export const ollamaService = new OllamaService();
