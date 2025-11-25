/**
 * n8n Workflow Marketplace
 * Browse, share, and install workflows
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Download, Share2, Star, Workflow, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { handoffToN8n } from '../../core/agents/handoff';

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

interface WorkflowMarketplaceProps {
  open: boolean;
  onClose: () => void;
}

export function WorkflowMarketplace({ open, onClose }: WorkflowMarketplaceProps) {
  const [workflows] = useState<Workflow[]>(SAMPLE_WORKFLOWS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch =
      !searchQuery ||
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || workflow.category === selectedCategory;
    const matchesLanguage =
      selectedLanguage === 'all' || workflow.language === selectedLanguage || !workflow.language;

    return matchesSearch && matchesCategory && matchesLanguage;
  });

  const handleInstall = async (workflow: Workflow) => {
    setLoading(true);
    try {
      if (workflow.workflowId) {
        // Use handoffToN8n to trigger workflow (now supports loops)
        const result = await handoffToN8n(
          {
            type: 'install-workflow',
            data: {
              workflowId: workflow.workflowId,
              workflowUrl: workflow.workflowUrl || 'http://localhost:5678',
            },
            sourceMode: 'marketplace',
            targetMode: 'n8n',
          },
          workflow.language || 'auto'
        );

        if (result.success) {
          toast.success(`Installed workflow: ${workflow.name}`);
        } else {
          toast.error(result.error || 'Failed to install workflow');
        }
      } else {
        toast.error('Workflow ID not available');
      }
    } catch (error: any) {
      toast.error(`Installation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'automation', label: 'Automation' },
    { value: 'research', label: 'Research' },
    { value: 'trade', label: 'Trade' },
    { value: 'productivity', label: 'Productivity' },
    { value: 'integration', label: 'Integration' },
  ];

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-[#1A1D28] border border-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <Workflow size={24} className="text-blue-400" />
              <div>
                <h2 className="text-xl font-semibold text-gray-100">Workflow Marketplace</h2>
                <p className="text-sm text-gray-400">Browse and install n8n workflows</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800/60 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search and Filters */}
          <div className="p-4 border-b border-gray-800 space-y-3">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search workflows..."
                className="w-full pl-10 pr-4 py-2 bg-gray-900/60 border border-gray-700/50 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 bg-gray-900/60 border border-gray-700/50 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <select
                value={selectedLanguage}
                onChange={e => setSelectedLanguage(e.target.value)}
                className="px-3 py-1.5 bg-gray-900/60 border border-gray-700/50 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="all">All Languages</option>
                <option value="auto">Auto-detect</option>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="ta">Tamil</option>
                <option value="bn">Bengali</option>
              </select>
            </div>
          </div>

          {/* Workflows List */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredWorkflows.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p>No workflows found.</p>
                <p className="text-sm mt-2">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredWorkflows.map(workflow => (
                  <motion.div
                    key={workflow.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-900/60 rounded-lg p-4 border border-gray-800/50 hover:border-gray-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-100 mb-1">{workflow.name}</h3>
                        <p className="text-sm text-gray-400 line-clamp-2">{workflow.description}</p>
                      </div>
                      <div className="flex items-center gap-1 text-yellow-400 ml-2">
                        <Star size={14} className="fill-current" />
                        <span className="text-xs">{workflow.rating}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded">
                        {workflow.category}
                      </span>
                      {workflow.language && (
                        <span className="text-xs px-2 py-0.5 bg-green-900/30 text-green-400 rounded">
                          {workflow.language}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">{workflow.downloads} downloads</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleInstall(workflow)}
                        disabled={loading}
                        className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Download size={14} />
                        Install
                      </button>
                      <button
                        onClick={() => {
                          // Share workflow - open GitHub repo or copy link
                          const shareUrl = `https://github.com/regenbrowser/workflows/tree/main/${workflow.workflowId || workflow.id}`;
                          if (navigator.share) {
                            navigator
                              .share({
                                title: `Share ${workflow.name}`,
                                text: workflow.description,
                                url: shareUrl,
                              })
                              .catch(() => {
                                // Fallback to copy
                                navigator.clipboard.writeText(shareUrl);
                                toast.success('Workflow link copied to clipboard!');
                              });
                          } else {
                            // Copy to clipboard
                            navigator.clipboard.writeText(shareUrl);
                            toast.success('Workflow link copied to clipboard!');
                          }
                        }}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                        title="Share workflow (Earn affiliates)"
                      >
                        <Share2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-800 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-xs text-gray-400">
                Workflows run on your local n8n instance. Install n8n to use workflows.
              </p>
              <p className="text-xs text-gray-500">
                Share n8n workflows – Earn affiliates{' '}
                <a
                  href="https://github.com/regenbrowser/workflows"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  GitHub repo
                </a>
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
