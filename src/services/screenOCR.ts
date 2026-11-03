import Tesseract from 'tesseract.js';

export class ScreenOCRService {
  private worker: Tesseract.Worker | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.worker = await Tesseract.createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${(m.progress * 100).toFixed(0)}%`);
          }
        }
      });
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize OCR:', error);
      throw error;
    }
  }

  async recognizeFromCanvas(canvas: HTMLCanvasElement): Promise<string> {
    if (!this.worker) {
      await this.initialize();
    }

    try {
      const { data: { text } } = await this.worker!.recognize(canvas);
      return text;
    } catch (error) {
      console.error('OCR recognition failed:', error);
      throw error;
    }
  }

  async recognizeFromImage(imageData: string): Promise<string> {
    if (!this.worker) {
      await this.initialize();
    }

    try {
      const { data: { text } } = await this.worker!.recognize(imageData);
      return text;
    } catch (error) {
      console.error('OCR recognition failed:', error);
      throw error;
    }
  }

  async captureAndRecognize(): Promise<string> {
    try {
      // Request screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor'
        } as any,
        audio: false
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      // Wait for video to be ready
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create canvas and capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Stop the stream
      stream.getTracks().forEach(track => track.stop());

      // Recognize text
      const text = await this.recognizeFromCanvas(canvas);
      return text;
    } catch (error) {
      console.error('Screen capture and OCR failed:', error);
      throw error;
    }
  }

  extractKeywords(text: string): string[] {
    // Remove common words and extract meaningful keywords
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these',
      'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which',
      'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both',
      'few', 'more', 'other', 'some', 'such', 'no', 'not', 'only', 'own',
      'same', 'so', 'than', 'too', 'very', 'just', 'because', 'as', 'until',
      'while', 'about', 'between', 'through', 'during', 'before', 'after',
      'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under', 'again',
      'further', 'then', 'once', 'here', 'there', 'if', 'import', 'from',
      'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for',
      'while', 'do', 'switch', 'case', 'break', 'continue', 'class', 'extends',
      'new', 'this', 'super', 'try', 'catch', 'finally', 'throw', 'async',
      'await', 'export', 'default', 'true', 'false', 'null', 'undefined'
    ]);

    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    // Count frequency
    const frequency = new Map<string, number>();
    words.forEach(word => {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    });

    // Return top keywords sorted by frequency
    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  detectErrors(text: string): { type: string; message: string; line?: number }[] {
    const errors: { type: string; message: string; line?: number }[] = [];

    // Common error patterns
    const errorPatterns = [
      { pattern: /error[:\s]+(.+)/i, type: 'error' },
      { pattern: /failed[:\s]+(.+)/i, type: 'error' },
      { pattern: /exception[:\s]+(.+)/i, type: 'exception' },
      { pattern: /cannot find module ['"](.+)['"]/i, type: 'module_error' },
      { pattern: /syntax error[:\s]+(.+)/i, type: 'syntax_error' },
      { pattern: /type error[:\s]+(.+)/i, type: 'type_error' },
      { pattern: /reference error[:\s]+(.+)/i, type: 'reference_error' },
      { pattern: /undefined is not/i, type: 'undefined_error' },
      { pattern: /null is not/i, type: 'null_error' },
      { pattern: /compilation failed/i, type: 'compilation_error' },
      { pattern: /build failed/i, type: 'build_error' },
      { pattern: /test failed/i, type: 'test_error' },
    ];

    errorPatterns.forEach(({ pattern, type }) => {
      const match = text.match(pattern);
      if (match) {
        errors.push({
          type,
          message: match[1] || match[0],
          line: undefined
        });
      }
    });

    // Extract line numbers if present
    const lineMatch = text.match(/line\s+(\d+)/i);
    if (lineMatch && errors.length > 0) {
      errors[0].line = parseInt(lineMatch[1]);
    }

    return errors;
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }
}

export const screenOCRService = new ScreenOCRService();
