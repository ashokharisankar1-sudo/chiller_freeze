import { EvaluationResult } from '../services/evaluation';
import { 
  Award, TrendingUp, Clock, Zap, BarChart3, 
  CheckCircle2, AlertCircle, ChevronDown, ChevronUp 
} from 'lucide-react';
import { useState } from 'react';

interface Props {
  result: EvaluationResult;
  modelName?: string;
  compact?: boolean;
}

export default function EvaluationPanel({ result, modelName, compact = false }: Props) {
  const [expanded, setExpanded] = useState(!compact);

  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-emerald-400';
    if (score >= 0.4) return 'text-yellow-400';
    if (score >= 0.2) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number): string => {
    if (score >= 0.8) return 'bg-green-500/10 border-green-500/20';
    if (score >= 0.6) return 'bg-emerald-500/10 border-emerald-500/20';
    if (score >= 0.4) return 'bg-yellow-500/10 border-yellow-500/20';
    if (score >= 0.2) return 'bg-orange-500/10 border-orange-500/20';
    return 'bg-red-500/10 border-red-500/20';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Fair';
    if (score >= 0.2) return 'Poor';
    return 'Very Poor';
  };

  const getBarColor = (score: number): string => {
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.6) return 'bg-emerald-500';
    if (score >= 0.4) return 'bg-yellow-500';
    if (score >= 0.2) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (compact) {
    return (
      <div className={`rounded-lg border p-2 ${getScoreBg(result.overallScore)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className={`w-3 h-3 ${getScoreColor(result.overallScore)}`} />
            <span className={`text-xs font-medium ${getScoreColor(result.overallScore)}`}>
              {(result.overallScore * 100).toFixed(0)}%
            </span>
          </div>
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-gray-500 hover:text-gray-300"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
        {expanded && (
          <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
            <span className="text-gray-500">BLEU: {(result.bleu * 100).toFixed(0)}%</span>
            <span className="text-gray-500">ROUGE-L: {(result.rougeL * 100).toFixed(0)}%</span>
            <span className="text-gray-500">Semantic: {(result.semanticSimilarity * 100).toFixed(0)}%</span>
            <span className="text-gray-500">Relevance: {(result.relevanceScore * 100).toFixed(0)}%</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-4 ${getScoreBg(result.overallScore)}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${
            result.overallScore >= 0.6 ? 'bg-green-500/20' : 
            result.overallScore >= 0.4 ? 'bg-yellow-500/20' : 'bg-red-500/20'
          }`}>
            {result.overallScore >= 0.6 ? (
              <CheckCircle2 className={`w-4 h-4 ${getScoreColor(result.overallScore)}`} />
            ) : (
              <AlertCircle className={`w-4 h-4 ${getScoreColor(result.overallScore)}`} />
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">Evaluation Results</h3>
            {modelName && (
              <p className="text-xs text-gray-500">Model: {modelName}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${getScoreColor(result.overallScore)}`}>
            {(result.overallScore * 100).toFixed(0)}
          </div>
          <div className={`text-xs ${getScoreColor(result.overallScore)}`}>
            {getScoreLabel(result.overallScore)}
          </div>
        </div>
      </div>

      {/* Overall Score Bar */}
      <div className="mb-4">
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${getBarColor(result.overallScore)}`}
            style={{ width: `${result.overallScore * 100}%` }}
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <MetricCard
          label="BLEU"
          value={result.bleu}
          description="N-gram precision"
          color={getScoreColor(result.bleu)}
          barColor={getBarColor(result.bleu)}
        />
        <MetricCard
          label="ROUGE-1"
          value={result.rouge1}
          description="Unigram recall"
          color={getScoreColor(result.rouge1)}
          barColor={getBarColor(result.rouge1)}
        />
        <MetricCard
          label="ROUGE-L"
          value={result.rougeL}
          description="Longest common subseq"
          color={getScoreColor(result.rougeL)}
          barColor={getBarColor(result.rougeL)}
        />
        <MetricCard
          label="Semantic"
          value={result.semanticSimilarity}
          description="HF embedding similarity"
          color={getScoreColor(result.semanticSimilarity)}
          barColor={getBarColor(result.semanticSimilarity)}
        />
      </div>

      {/* Quality Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <QualityMetric
          label="Relevance"
          value={result.relevanceScore}
          icon={<TrendingUp className="w-3 h-3" />}
          color={getScoreColor(result.relevanceScore)}
        />
        <QualityMetric
          label="Coherence"
          value={result.coherenceScore}
          icon={<BarChart3 className="w-3 h-3" />}
          color={getScoreColor(result.coherenceScore)}
        />
        <QualityMetric
          label="Completeness"
          value={result.completenessScore}
          icon={<Zap className="w-3 h-3" />}
          color={getScoreColor(result.completenessScore)}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 pt-3 border-t border-gray-700/30">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>{result.latency.toFixed(0)}ms eval</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Zap className="w-3 h-3" />
          <span>~{result.tokenCount} tokens</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Award className="w-3 h-3" />
          <span>Hugging Face Evaluate</span>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, description, color, barColor }: {
  label: string;
  value: number;
  description: string;
  color: string;
  barColor: string;
}) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400">{label}</span>
        <span className={`text-sm font-bold ${color}`}>
          {(value * 100).toFixed(0)}%
        </span>
      </div>
      <div className="h-1 bg-gray-700 rounded-full overflow-hidden mb-1">
        <div 
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${value * 100}%` }}
        />
      </div>
      <p className="text-[10px] text-gray-600">{description}</p>
    </div>
  );
}

function QualityMetric({ label, value, icon, color }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 bg-gray-800/30 rounded-lg p-2">
      <div className={`${color}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className={`text-sm font-bold ${color}`}>{(value * 100).toFixed(0)}%</p>
      </div>
    </div>
  );
}
