/**
 * n8n Workflow Marketplace
 * Browse, share, and install workflows
 */

import React from 'react'
import { isV1ModeEnabled } from '../../config/mvpFeatureFlags'

export interface Workflow {
  id: string;
  name: string;
  description: string;
  author: string;
  category: 'automation' | 'research' | 'trade' | 'productivity' | 'integration';
  language?: string;
  tags: string[];
  downloads: number;
  rating: number;
  workflowUrl?: string;
  workflowId?: string;
  createdAt: number;
  updatedAt: number;
}

const SAMPLE_WORKFLOWS: Workflow[] = [
  {
    id: '1',
    name: 'Research to Trade Alert',
    description: 'Automatically sends trading alerts when research finds market opportunities',
    author: 'RegenBrowser',
    category: 'automation',
    language: 'auto',
    tags: ['research', 'trade', 'alerts'],
    downloads: 1250,
    rating: 4.8,
    workflowId: 'research-trade-alert',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 3600000,
  },
  {
    id: '2',
    name: 'Multilingual Research Summary',
    description: 'Summarizes research in any language and sends to email/Slack',
    author: 'Community',
    category: 'research',
    language: 'auto',
    tags: ['research', 'multilingual', 'summary'],
    downloads: 890,
    rating: 4.6,
    workflowId: 'multilingual-research',
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 7200000,
  },
  {
    id: '3',
    name: 'Nifty Monitor Loop',
    description: 'Monitors Nifty index every 30s and alerts on significant changes',
    author: 'RegenBrowser',
    category: 'trade',
    language: 'hi',
    tags: ['nifty', 'monitoring', 'alerts'],
    downloads: 2100,
    rating: 4.9,
    workflowId: 'nifty-monitor',
    createdAt: Date.now() - 259200000,
    updatedAt: Date.now() - 1800000,
  },
];

export interface WorkflowMarketplaceProps { open: boolean; onClose: () => void }

export function WorkflowMarketplace({ open, onClose }: WorkflowMarketplaceProps) {
  if (isV1ModeEnabled()) return null
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="relative bg-[#0f1720] border border-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 text-sm text-slate-300">
        <h2 className="text-lg font-semibold">Workflow Marketplace (deferred)</h2>
        <p className="mt-2 text-xs text-slate-400">Marketplace and community workflows are disabled in v1. See ROADMAP.md for experimental integrations.</p>
        <div className="mt-4 flex justify-end">
          <button className="px-3 py-1 rounded bg-slate-700 text-white" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
