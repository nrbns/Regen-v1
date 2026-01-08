/**
 * Regen Sidebar Component
 * The AI brain of Regen - chat + voice interface
 */

import { useState, useEffect, useRef } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Sparkles,
  Loader2,
  X,
  Search,
  TrendingUp,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useTabsStore } from '../../state/tabsStore';
import { ipc } from '../../lib/ipc-typed';
import { toast } from '../../utils/toast';
import { HandsFreeMode } from './HandsFreeMode';
import { getRegenSocket } from '../../lib/realtime/regen-socket';

export type RegenMode = 'research' | 'trade';

interface RegenMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  done?: boolean; // For streaming messages
  commands?: Array<{ type: string; payload: Record<string, unknown> }>;
}

// RegenCommand type is now handled by RegenSocket client

export function RegenSidebar() {
  // Regen Sidebar implementation deferred to src/_deferred/regen/RegenSidebar.tsx
  return null;
}

export default RegenSidebar;
