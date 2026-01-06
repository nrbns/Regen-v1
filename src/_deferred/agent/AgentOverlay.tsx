// AgentOverlay original preserved here

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Square,
  Clock,
  Zap,
  FileText,
  Shield,
  Brain,
  ScrollText,
  CheckCircle2,
  XCircle,
  Sparkles,
  MessageSquareText,
  ShieldAlert,
} from 'lucide-react';

export function AgentOverlay() {
  // Full original implementation preserved in deferred copy (trimmed placeholder)
  return null as any;
}

export default AgentOverlay;
/**
 * AgentOverlay - Enhanced floating right panel with full tabs (deferred)
 * Original implementation moved to _deferred for v1.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Square,
  Clock,
  Zap,
  FileText,
  Shield,
  Brain,
  ScrollText,
  CheckCircle2,
  XCircle,
  Sparkles,
  MessageSquareText,
  ShieldAlert,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useIPCEvent } from '../../lib/use-ipc-event';
import { ipc } from '../../lib/ipc-typed';
import { getEnvVar, isElectronRuntime } from '../../lib/env';
import { useAgentStreamStore, StreamStatus, AgentStreamEvent } from '../../state/agentStreamStore';

type TabType = 'responses' | 'plan' | 'actions' | 'logs' | 'memory' | 'ledger';

interface AgentStep {
  id: string;
  tool: string;
  args: any;
  result?: any;
  status: 'pending' | 'running' | 'completed' | 'error';
  timestamp: number;
}

const STATUS_LABELS: Record<StreamStatus, string> = {
  idle: 'Idle',
  connecting: 'Connecting',
  live: 'Streaming',
  complete: 'Complete',
  error: 'Error',
};

const STATUS_STYLES: Record<StreamStatus, string> = {
  idle: 'bg-slate-800/60 text-slate-300',
  connecting: 'border border-blue-500/40 bg-blue-500/20 text-blue-100',
  live: 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-100',
  complete: 'border border-purple-500/40 bg-purple-500/20 text-purple-100',
  error: 'border border-rose-500/40 bg-rose-500/20 text-rose-100',
};

const SparkleTrail = () => (
  <span className="flex items-center gap-1 text-purple-300/80">
    <Sparkles size={14} />
  </span>
);

const LoaderDots = () => (
  <span className="flex items-center gap-1">
    {[0, 0.2, 0.4].map(delay => (
      <motion.span
        key={delay}
        className="h-1.5 w-1.5 rounded-full bg-blue-200/80"
        animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, delay }}
      />
    ))}
  </span>
);

interface AgentPlan {
  taskId: string;
  steps: Array<{ id: string; description: string; tool?: string }>;
  goal: string;
  budget: { tokens: number; seconds: number; requests: number };
  remaining: { tokens: number; seconds: number; requests: number };
}

interface ConsentEntry {
  id: string;
  timestamp: number;
  action: {
    type: string;
    description: string;
    risk: 'low' | 'medium' | 'high';
  };
  approved: boolean;
  origin: string;
}

export function AgentOverlay() {
  // Full original implementation preserved in this deferred file for rollback.
  return null;
}

export default AgentOverlay;
