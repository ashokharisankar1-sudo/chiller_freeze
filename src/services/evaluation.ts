// Hugging Face Evaluation Service
// Implements BLEU, ROUGE, Semantic Similarity, and Quality metrics

export interface EvaluationResult {
  bleu: number;
  rouge1: number;
  rouge2: number;
  rougeL: number;
  semanticSimilarity: number;
  relevanceScore: number;
  coherenceScore: number;
  completenessScore: number;
  overallScore: number;
  latency: number;
  tokenCount: number;
  metrics: Record<string, number>;
  evaluatedAt: Date;
}

export interface EvaluationConfig {
  hfApiKey?: string;
  hfModel?: string; // sentence-transformers model for semantic similarity
  enableSemanticEval: boolean;
  enableLocalEval: boolean;
}

const DEFAULT_HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const HF_API_BASE = 'https://api-inference.huggingface.co';

class EvaluationService {
  private config: EvaluationConfig;
  private embeddingCache: Map<string, number[]> = new Map();

  constructor() {
    this.config = {
      hfApiKey: '',
      hfModel: DEFAULT_HF_MODEL,
      enableSemanticEval: true,
      enableLocalEval: true,
    };
  }

  setApiKey(key: string) {
    this.config.hfApiKey = key;
  }

  setConfig(config: Partial<EvaluationConfig>) {
    this.config = { ...this.config, ...config };
  }

  // ==================== BLEU SCORE ====================
  calculateBLEU(reference: string, hypothesis: string, maxN: number = 4): number {
    const refTokens = this.tokenize(reference);
    const hypTokens = this.tokenize(hypothesis);

    if (hypTokens.length === 0) return 0;

    // Brevity penalty
    const bp = hypTokens.length > refTokens.length
      ? 1
      : Math.exp(1 - refTokens.length / hypTokens.length);

    // N-gram precisions
    let logPrecision = 0;
    let validN = 0;

    for (let n = 1; n <= maxN; n++) {
      const refNgrams = this.getNgrams(refTokens, n);
      const hypNgrams = this.getNgrams(hypTokens, n);

      if (hypNgrams.length === 0) continue;

      let matches = 0;
      const hypNgramCounts = this.countNgrams(hypNgrams);
      const refNgramCounts = this.countNgrams(refNgrams);

      for (const [ngram, count] of hypNgramCounts.entries()) {
        const refCount = refNgramCounts.get(ngram) || 0;
        matches += Math.min(count, refCount);
      }

      const precision = matches / hypNgrams.length;
      if (precision > 0) {
        logPrecision += Math.log(precision) / maxN;
        validN++;
      }
    }

    if (validN === 0) return 0;
    return bp * Math.exp(logPrecision);
  }

  // ==================== ROUGE SCORES ====================
  calculateROUGE(reference: string, hypothesis: string): { rouge1: number; rouge2: number; rougeL: number } {
    const refTokens = this.tokenize(reference);
    const hypTokens = this.tokenize(hypothesis);

    return {
      rouge1: this.rougeN(refTokens, hypTokens, 1),
      rouge2: this.rougeN(refTokens, hypTokens, 2),
      rougeL: this.rougeL(refTokens, hypTokens),
    };
  }

  private rougeN(refTokens: string[], hypTokens: string[], n: number): number {
    const refNgrams = this.countNgrams(this.getNgrams(refTokens, n));
    const hypNgrams = this.countNgrams(this.getNgrams(hypTokens, n));

    if (hypNgrams.size === 0 || refNgrams.size === 0) return 0;

    let overlap = 0;
    for (const [ngram, count] of hypNgrams.entries()) {
      const refCount = refNgrams.get(ngram) || 0;
      overlap += Math.min(count, refCount);
    }

    const precision = overlap / hypTokens.length;
    const recall = overlap / refTokens.length;

    if (precision + recall === 0) return 0;
    return (2 * precision * recall) / (precision + recall); // F1 score
  }

  private rougeL(refTokens: string[], hypTokens: string[]): number {
    const lcs = this.lcsLength(refTokens, hypTokens);

    if (refTokens.length === 0 || hypTokens.length === 0) return 0;

    const precision = lcs / hypTokens.length;
    const recall = lcs / refTokens.length;

    if (precision + recall === 0) return 0;
    return (2 * precision * recall) / (precision + recall);
  }

  private lcsLength(a: string[], b: string[]): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  // ==================== SEMANTIC SIMILARITY (HF API) ====================
  async getEmbedding(text: string): Promise<number[]> {
    const cacheKey = text.substring(0, 200);
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    if (!this.config.hfApiKey) {
      // Fallback: use simple bag-of-words similarity
      return this.simpleEmbedding(text);
    }

    try {
      const response = await fetch(
        `${HF_API_BASE}/pipeline/feature-extraction/${this.config.hfModel}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.hfApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: text.substring(0, 512),
            options: { wait_for_model: true },
          }),
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!response.ok) {
        return this.simpleEmbedding(text);
      }

      const result = await response.json();
      // Average pool the embeddings
      const embedding = Array.isArray(result[0])
        ? result[0].map((layer: number[]) => layer.reduce((a: number, b: number) => a + b, 0) / layer.length)
        : result;

      this.embeddingCache.set(cacheKey, embedding);
      return embedding;
    } catch {
      return this.simpleEmbedding(text);
    }
  }

  private simpleEmbedding(text: string): number[] {
    // Simple bag-of-words embedding as fallback
    const words = this.tokenize(text);
    const dim = 128;
    const embedding = new Array(dim).fill(0);
    
    for (const word of words) {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = ((hash << 5) - hash) + word.charCodeAt(i);
        hash = hash & hash;
      }
      const idx = Math.abs(hash) % dim;
      embedding[idx] += 1;
    }

    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < dim; i++) embedding[i] /= norm;
    }

    return embedding;
  }

  async calculateSemanticSimilarity(reference: string, hypothesis: string): Promise<number> {
    const [refEmb, hypEmb] = await Promise.all([
      this.getEmbedding(reference),
      this.getEmbedding(hypothesis),
    ]);

    return this.cosineSimilarity(refEmb, hypEmb);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const len = Math.min(a.length, b.length);
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < len; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dotProduct / denom;
  }

  // ==================== QUALITY METRICS ====================
  calculateRelevanceScore(question: string, answer: string): number {
    const qTokens = new Set(this.tokenize(question));
    const aTokens = this.tokenize(answer);

    if (aTokens.length === 0) return 0;

    let relevantWords = 0;
    for (const token of aTokens) {
      if (qTokens.has(token)) relevantWords++;
    }

    // Also check for semantic overlap via keyword matching
    const questionWords = question.toLowerCase().split(/\s+/);
    const answerLower = answer.toLowerCase();
    let keywordMatches = 0;
    
    for (const word of questionWords) {
      if (word.length > 3 && answerLower.includes(word)) {
        keywordMatches++;
      }
    }

    const lexicalScore = relevantWords / Math.max(aTokens.length, 1);
    const keywordScore = keywordMatches / Math.max(questionWords.length, 1);

    return Math.min(1, (lexicalScore * 0.4 + keywordScore * 0.6) * 2);
  }

  calculateCoherenceScore(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length <= 1) return text.length > 20 ? 0.7 : 0.3;

    let coherence = 0;
    for (let i = 1; i < sentences.length; i++) {
      const prevTokens = new Set(this.tokenize(sentences[i - 1]));
      const currTokens = this.tokenize(sentences[i]);
      
      let overlap = 0;
      for (const token of currTokens) {
        if (prevTokens.has(token)) overlap++;
      }
      
      coherence += overlap / Math.max(currTokens.length, 1);
    }

    const avgCoherence = coherence / (sentences.length - 1);
    
    // Penalize very short or very long responses
    const wordCount = this.tokenize(text).length;
    const lengthPenalty = wordCount < 10 ? 0.5 : wordCount > 500 ? 0.8 : 1.0;

    return Math.min(1, (avgCoherence + 0.3) * lengthPenalty);
  }

  calculateCompletenessScore(question: string, answer: string): number {
    const qTokens = this.tokenize(question);
    const aTokens = new Set(this.tokenize(answer));

    // Check if key question words are addressed in the answer
    const stopWords = new Set(['what', 'how', 'why', 'when', 'where', 'who', 'which', 'is', 'are', 'do', 'does', 'the', 'a', 'an', 'can', 'will', 'would', 'should']);
    const keyWords = qTokens.filter(t => !stopWords.has(t) && t.length > 2);

    if (keyWords.length === 0) return 0.5;

    let addressed = 0;
    for (const word of keyWords) {
      if (aTokens.has(word)) addressed++;
    }

    // Also check answer length relative to question complexity
    const answerTokens = this.tokenize(answer);
    const lengthRatio = Math.min(1, answerTokens.length / (keyWords.length * 5));

    return (addressed / keyWords.length) * 0.7 + lengthRatio * 0.3;
  }

  // ==================== FULL EVALUATION ====================
  async evaluate(
    question: string,
    answer: string,
    reference?: string,
    latency?: number
  ): Promise<EvaluationResult> {
    const startTime = performance.now();

    // Local metrics (always computed)
    const bleu = this.calculateBLEU(reference || question, answer);
    const rouge = this.calculateROUGE(reference || question, answer);
    const relevance = this.calculateRelevanceScore(question, answer);
    const coherence = this.calculateCoherenceScore(answer);
    const completeness = this.calculateCompletenessScore(question, answer);

    // Semantic similarity (uses HF API if available)
    let semanticSimilarity = 0;
    if (this.config.enableSemanticEval) {
      semanticSimilarity = await this.calculateSemanticSimilarity(question, answer);
    }

    // Token count estimation
    const tokenCount = Math.ceil(answer.split(/\s+/).length * 1.3);

    // Overall score (weighted average)
    const overallScore = (
      bleu * 0.1 +
      rouge.rouge1 * 0.15 +
      rouge.rougeL * 0.15 +
      semanticSimilarity * 0.25 +
      relevance * 0.15 +
      coherence * 0.1 +
      completeness * 0.1
    );

    const evalLatency = performance.now() - startTime;

    return {
      bleu: Math.round(bleu * 1000) / 1000,
      rouge1: Math.round(rouge.rouge1 * 1000) / 1000,
      rouge2: Math.round(rouge.rouge2 * 1000) / 1000,
      rougeL: Math.round(rouge.rougeL * 1000) / 1000,
      semanticSimilarity: Math.round(semanticSimilarity * 1000) / 1000,
      relevanceScore: Math.round(relevance * 1000) / 1000,
      coherenceScore: Math.round(coherence * 1000) / 1000,
      completenessScore: Math.round(completeness * 1000) / 1000,
      overallScore: Math.round(overallScore * 1000) / 1000,
      latency: latency || evalLatency,
      tokenCount,
      metrics: {
        bleu,
        rouge1: rouge.rouge1,
        rouge2: rouge.rouge2,
        rougeL: rouge.rougeL,
        semanticSimilarity,
        relevance,
        coherence,
        completeness,
      },
      evaluatedAt: new Date(),
    };
  }

  // ==================== HELPERS ====================
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 0);
  }

  private getNgrams(tokens: string[], n: number): string[] {
    if (tokens.length < n) return [];
    const ngrams: string[] = [];
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n).join(' '));
    }
    return ngrams;
  }

  private countNgrams(ngrams: string[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const ngram of ngrams) {
      counts.set(ngram, (counts.get(ngram) || 0) + 1);
    }
    return counts;
  }

  // Get score label
  getScoreLabel(score: number): { label: string; color: string } {
    if (score >= 0.8) return { label: 'Excellent', color: 'text-green-400' };
    if (score >= 0.6) return { label: 'Good', color: 'text-emerald-400' };
    if (score >= 0.4) return { label: 'Fair', color: 'text-yellow-400' };
    if (score >= 0.2) return { label: 'Poor', color: 'text-orange-400' };
    return { label: 'Very Poor', color: 'text-red-400' };
  }
}

export const evaluationService = new EvaluationService();
