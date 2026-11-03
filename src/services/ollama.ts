import { OllamaModelsResponse, OllamaModel, ChatMessage } from '../types';

const OLLAMA_BASE_URL = 'http://localhost:11434';

export class OllamaService {
  private abortControllers: Map<string, AbortController> = new Map();

  // Check if Ollama is running
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

  // Discover all installed models
  async getModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error('Failed to fetch models');
      const data: OllamaModelsResponse = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error fetching models:', error);
      return [];
    }
  }

  // Check if a specific model is available
  async isModelAvailable(modelName: string): Promise<boolean> {
    const models = await this.getModels();
    return models.some(m => m.name === modelName || m.name === `${modelName}:latest`);
  }

  // Send a chat message with streaming
  async chat(
    model: string,
    messages: { role: string; content: string }[],
    onChunk: (chunk: string) => void,
    requestId?: string,
    options?: { temperature?: number; num_predict?: number }
  ): Promise<string> {
    const id = requestId || `req_${Date.now()}`;
    
    // Cancel any existing request with same ID
    this.cancelRequest(id);

    const controller = new AbortController();
    this.abortControllers.set(id, controller);

    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          options: options || {},
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama error: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullResponse = '';

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
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }

      this.abortControllers.delete(id);
      return fullResponse;
    } catch (error: any) {
      this.abortControllers.delete(id);
      if (error.name === 'AbortError') {
        throw new Error('Request cancelled');
      }
      throw error;
    }
  }

  // Non-streaming chat for quick responses
  async chatSync(
    model: string,
    messages: { role: string; content: string }[],
    options?: { temperature?: number; num_predict?: number }
  ): Promise<string> {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: options || {},
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = await response.json();
    return data.message?.content || '';
  }

  // Transcribe audio using Whisper model via Ollama
  async transcribeAudio(
    model: string,
    audioBase64: string,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    // Whisper via Ollama uses the generate endpoint with audio format
    const id = `transcribe_${Date.now()}`;
    const controller = new AbortController();
    this.abortControllers.set(id, controller);

    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: 'Transcribe the following audio.',
          images: [audioBase64],
          stream: true,
        }),
        signal: controller.signal,
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

  // Cancel a specific request
  cancelRequest(requestId: string): void {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }

  // Cancel all requests
  cancelAll(): void {
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
  }

  // Test model independently
  async testModel(modelName: string): Promise<{ success: boolean; latency: number; error?: string }> {
    const start = performance.now();
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: 'Say "OK"',
          stream: false,
          options: { num_predict: 5 },
        }),
        signal: AbortSignal.timeout(30000),
      });

      const latency = performance.now() - start;

      if (!response.ok) {
        return { success: false, latency, error: `HTTP ${response.status}` };
      }

      return { success: true, latency };
    } catch (error: any) {
      const latency = performance.now() - start;
      return { success: false, latency, error: error.message };
    }
  }
}

export const ollamaService = new OllamaService();
