/**
 * Agent Recommendations
 * AI suggestions based on learned preferences and research patterns
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Zap, BookOpen } from 'lucide-react';
import { agentMemory } from '../../core/agent/memory';
import type { MemoryItem } from '../../core/agent/memory';

interface Recommendation {
  title: string;
  description: string;
  type: 'research' | 'pattern' | 'follow_up' | 'optimization';
  confidence: number;
  relatedTopics: string[];
  previousRunCount: number;
  icon: typeof Sparkles;
}

export function AgentRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [_selectedPreference, setSelectedPreference] = useState<{
    title: string;
    confidence: number;
  } | null>(null);

  useEffect(() => {
    generateRecommendations();
  }, []);

  const generateRecommendations = () => {
    setLoading(true);
    try {
      const history = agentMemory.getTaskHistory();
      const allMemory = agentMemory.getPreferences();
      const facts = (allMemory as Record<string, unknown>) || {};

      const recs: Recommendation[] = [];

      // Pattern 1: Popular research topics from task history
      const topicFrequency = new Map<string, number>();
      history.forEach(entry => {
        if (
          entry.type === 'task_history' &&
          typeof entry.value === 'object' &&
          entry.value !== null
        ) {
          const val = entry.value as any;
          const goal = val.goal || entry.key;
          topicFrequency.set(goal, (topicFrequency.get(goal) || 0) + 1);
        }
      });

      topicFrequency.forEach((count, topic) => {
        if (count >= 2) {
          recs.push({
            title: `Deep Dive: ${topic}`,
            description: `You've researched this topic multiple times. Explore advanced aspects or related subtopics.`,
            type: 'follow_up',
            confidence: Math.min(0.95, 0.7 + count * 0.1),
            relatedTopics: extractRelatedTopics(topic, Object.values(facts)),
            previousRunCount: count,
            icon: BookOpen,
          });
        }
      });

      // Pattern 2: Optimization opportunities
      if (history.length >= 5) {
        const successRate = calculateSuccessRate(history);
        if (successRate > 0.7) {
          recs.push({
            title: 'Performance Optimization',
            description:
              'Your research tasks are highly successful. Consider enabling advanced parallel execution.',
            type: 'optimization',
            confidence: successRate,
            relatedTopics: ['parallel execution', 'batch research', 'concurrent analysis'],
            previousRunCount: history.length,
            icon: Zap,
          });
        }
      }

      // Pattern 3: Trending analysis
      const recentTrends = findTrendingPatterns(Object.values(facts));
      recentTrends.forEach(trend => {
        recs.push({
          title: `Trending: ${trend.name}`,
          description: trend.description,
          type: 'pattern',
          confidence: trend.confidence,
          relatedTopics: trend.topics,
          previousRunCount: trend.count,
          icon: TrendingUp,
        });
      });

      // Sort by confidence and limit to top 4
      recs.sort((a, b) => b.confidence - a.confidence);
      setRecommendations(recs.slice(0, 4));
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-slate-400">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
          <Sparkles size={16} />
        </motion.div>
        <span className="ml-2">Learning from your patterns...</span>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-sm text-slate-500">
        <Sparkles size={20} className="text-slate-600" />
        <span>Run more agent tasks to get personalized recommendations</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-300">
        <Sparkles size={12} />
        <span>Recommendations</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {recommendations.map((rec, idx) => {
          const Icon = rec.icon;
          return (
            <motion.button
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() =>
                setSelectedPreference({ title: rec.title, confidence: rec.confidence })
              }
              className="group relative flex flex-col gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-left transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 rounded-full bg-emerald-500/20 p-1.5 text-emerald-300">
                    <Icon size={12} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-semibold text-emerald-200">{rec.title}</h4>
                    <p className="mt-0.5 text-[11px] text-slate-400">{rec.description}</p>
                  </div>
                </div>
                <ConfidenceBadge confidence={rec.confidence} />
              </div>

              {rec.relatedTopics.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {rec.relatedTopics.slice(0, 2).map((topic, i) => (
                    <span
                      key={i}
                      className="inline-block rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200/70"
                    >
                      {topic}
                    </span>
                  ))}
                  {rec.relatedTopics.length > 2 && (
                    <span className="inline-block text-[10px] text-slate-500">
                      +{rec.relatedTopics.length - 2} more
                    </span>
                  )}
                </div>
              )}

              <div className="text-[10px] text-slate-500">
                Based on {rec.previousRunCount} successful run
                {rec.previousRunCount !== 1 ? 's' : ''}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  const color =
    confidence >= 0.8 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300';

  return <div className={`rounded px-2 py-0.5 font-mono text-[10px] ${color}`}>{percentage}%</div>;
}

function calculateSuccessRate(history: MemoryItem[]): number {
  if (history.length === 0) return 0;
  const successful = history.filter(h => {
    if (typeof h.value === 'object' && h.value !== null) {
      return (h.value as any).status === 'success' || (h.value as any).steps > 0;
    }
    return false;
  }).length;
  return successful / history.length;
}

function extractRelatedTopics(topic: string, facts: unknown[]): string[] {
  const topicKeywords = topic.toLowerCase().split(' ');
  const related = new Set<string>();

  facts.forEach(fact => {
    if (typeof fact === 'string') {
      const factLower = fact.toLowerCase();
      topicKeywords.forEach(keyword => {
        if (factLower.includes(keyword) && !factLower.startsWith(topic) && related.size < 3) {
          const extracted = factLower.split(/[:\s,]+/)[0];
          if (extracted.length > 2) related.add(extracted);
        }
      });
    }
  });

  return Array.from(related);
}

function findTrendingPatterns(
  facts: unknown[]
): Array<{
  name: string;
  description: string;
  confidence: number;
  topics: string[];
  count: number;
}> {
  const trends: Array<{
    name: string;
    description: string;
    confidence: number;
    topics: string[];
    count: number;
  }> = [];

  // Find high-confidence patterns
  const highConfidenceFacts = facts.filter(
    f => typeof f === 'object' && f !== null && (f as any).confidence >= 0.7
  );

  if (highConfidenceFacts.length >= 3) {
    trends.push({
      name: 'Multi-Source Research',
      description: 'You frequently cross-reference multiple sources. Enable source aggregation.',
      confidence: 0.85,
      topics: ['aggregation', 'comparison', 'synthesis'],
      count: highConfidenceFacts.length,
    });
  }

  // Detect domain specialization
  const domainPattern = facts.filter(f => {
    if (typeof f === 'string') {
      return f.includes('tech') || f.includes('business') || f.includes('science');
    }
    return false;
  });

  if (domainPattern.length >= 2) {
    const firstMatch = domainPattern[0] as string;
    const domain = firstMatch.includes('tech')
      ? 'Technology'
      : firstMatch.includes('business')
        ? 'Business'
        : 'Science';

    trends.push({
      name: `${domain} Specialist`,
      description: `Your research focuses on ${domain.toLowerCase()}. Pre-tune for domain expertise.`,
      confidence: 0.8,
      topics: [domain.toLowerCase(), 'expertise', 'specialization'],
      count: domainPattern.length,
    });
  }

  return trends;
}
