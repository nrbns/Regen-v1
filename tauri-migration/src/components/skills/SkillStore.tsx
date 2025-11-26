/**
 * Skill Store Component
 * Main UI for browsing, installing, and managing skills
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Download,
  Star,
  Sparkles,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  Copy,
  Play,
} from 'lucide-react';
import { skillRegistry } from '../../core/skills/registry';
import { skillLoader } from '../../core/skills/loader';
import type { SkillMetadata, SkillCategory, SkillReview } from '../../core/skills/types';
import toast from 'react-hot-toast';

export function SkillStore() {
  const [skills, setSkills] = useState<SkillMetadata[]>([]);
  const [filteredSkills, setFilteredSkills] = useState<SkillMetadata[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<SkillMetadata | null>(null);
  const [reviews, setReviews] = useState<SkillReview[]>([]);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [clonePrompt, setClonePrompt] = useState('');

  const categories: SkillCategory[] = [
    'automation',
    'research',
    'trade',
    'productivity',
    'creative',
    'utility',
    'custom',
  ];

  useEffect(() => {
    loadSkills();
  }, []);

  useEffect(() => {
    filterSkills();
  }, [skills, selectedCategory, searchQuery]);

  const loadSkills = async () => {
    setLoading(true);
    try {
      const fetched = await skillRegistry.fetchSkillsFromRegistry();
      setSkills(fetched);
      setFilteredSkills(fetched);
    } catch (error) {
      console.error('[SkillStore] Failed to load skills:', error);
      toast.error('Failed to load skills');
    } finally {
      setLoading(false);
    }
  };

  const filterSkills = () => {
    let filtered = [...skills];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(skill => skill.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        skill =>
          skill.name.toLowerCase().includes(query) ||
          skill.description.toLowerCase().includes(query) ||
          skill.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredSkills(filtered);
  };

  const handleInstall = async (skill: SkillMetadata) => {
    if (skillRegistry.isInstalled(skill.id)) {
      toast.success('Skill already installed');
      return;
    }

    try {
      const success = await skillRegistry.installSkill(skill.id);
      if (success) {
        toast.success(`Installed ${skill.name}`);
        await skillLoader.loadSkill(skill.id);
      } else {
        toast.error('Failed to install skill');
      }
    } catch (error) {
      console.error('[SkillStore] Install failed:', error);
      toast.error('Installation failed');
    }
  };

  const handleUninstall = async (skill: SkillMetadata) => {
    try {
      const success = skillRegistry.uninstallSkill(skill.id);
      if (success) {
        toast.success(`Uninstalled ${skill.name}`);
        skillLoader.unloadSkill(skill.id);
      }
    } catch (error) {
      console.error('[SkillStore] Uninstall failed:', error);
      toast.error('Uninstall failed');
    }
  };

  const handleViewDetails = async (skill: SkillMetadata) => {
    setSelectedSkill(skill);
    const skillReviews = await skillRegistry.getSkillReviews(skill.id);
    setReviews(skillReviews);
  };

  const handleCloneSkill = async () => {
    if (!clonePrompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    try {
      toast.loading('Cloning skill...');
      const skillId = await skillRegistry.cloneSkillFromPrompt(clonePrompt, 'Custom Tool');
      if (skillId) {
        toast.success('Skill cloned successfully!');
        setShowCloneDialog(false);
        setClonePrompt('');
        await loadSkills();
      } else {
        toast.error('Failed to clone skill');
      }
    } catch (error) {
      console.error('[SkillStore] Clone failed:', error);
      toast.error('Clone failed');
    }
  };

  const handleTestSkill = async (skill: SkillMetadata) => {
    try {
      toast.loading('Testing skill...');
      const result = await skillLoader.executeSkill(skill.id, { test: true });
      if (result.success) {
        toast.success('Skill executed successfully!');
      } else {
        toast.error(result.error || 'Skill execution failed');
      }
    } catch (error) {
      console.error('[SkillStore] Test failed:', error);
      toast.error('Test failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Sparkles className="w-12 h-12 animate-pulse text-blue-400 mx-auto mb-4" />
          <p className="text-slate-400">Loading Skill Store...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-400" />
              Skill Store
            </h1>
            <p className="text-slate-400">Discover and install AI skills to enhance RegenBrowser</p>
          </div>
          <button
            onClick={() => setShowCloneDialog(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-2"
          >
            <Copy size={16} />
            Clone Any AI Tool
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search skills..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-sm font-medium capitalize transition ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Skills Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredSkills.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400">No skills found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSkills.map(skill => (
              <SkillCard
                key={skill.id}
                skill={skill}
                isInstalled={skillRegistry.isInstalled(skill.id)}
                onInstall={() => handleInstall(skill)}
                onUninstall={() => handleUninstall(skill)}
                onViewDetails={() => handleViewDetails(skill)}
                onTest={() => handleTestSkill(skill)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Skill Details Modal */}
      <AnimatePresence>
        {selectedSkill && (
          <SkillDetailsModal
            skill={selectedSkill}
            reviews={reviews}
            isInstalled={skillRegistry.isInstalled(selectedSkill.id)}
            onClose={() => setSelectedSkill(null)}
            onInstall={() => {
              handleInstall(selectedSkill);
              setSelectedSkill(null);
            }}
            onUninstall={() => {
              handleUninstall(selectedSkill);
              setSelectedSkill(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Clone Dialog */}
      <AnimatePresence>
        {showCloneDialog && (
          <CloneSkillDialog
            prompt={clonePrompt}
            onPromptChange={setClonePrompt}
            onClone={handleCloneSkill}
            onClose={() => {
              setShowCloneDialog(false);
              setClonePrompt('');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SkillCard({
  skill,
  isInstalled,
  onInstall,
  onUninstall,
  onViewDetails,
  onTest,
}: {
  skill: SkillMetadata;
  isInstalled: boolean;
  onInstall: () => void;
  onUninstall: () => void;
  onViewDetails: () => void;
  onTest: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-blue-500/50 transition-all cursor-pointer"
      onClick={onViewDetails}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-white mb-1">{skill.name}</h3>
          <p className="text-sm text-slate-400 line-clamp-2">{skill.description}</p>
        </div>
        {isInstalled && <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0 ml-2" />}
      </div>

      <div className="flex items-center gap-4 mb-3 text-xs text-slate-500">
        {skill.rating && (
          <div className="flex items-center gap-1">
            <Star size={14} className="fill-yellow-400 text-yellow-400" />
            <span>{skill.rating.toFixed(1)}</span>
            {skill.reviewCount && <span>({skill.reviewCount})</span>}
          </div>
        )}
        {skill.downloadCount && (
          <div className="flex items-center gap-1">
            <Download size={14} />
            <span>{skill.downloadCount.toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {skill.tags.slice(0, 3).map(tag => (
          <span key={tag} className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        {isInstalled ? (
          <>
            <button
              onClick={e => {
                e.stopPropagation();
                onTest();
              }}
              className="flex-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium text-white flex items-center justify-center gap-2"
            >
              <Play size={14} />
              Test
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                onUninstall();
              }}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-red-600/20 text-sm font-medium text-red-400"
            >
              Remove
            </button>
          </>
        ) : (
          <button
            onClick={e => {
              e.stopPropagation();
              onInstall();
            }}
            className="flex-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium text-white flex items-center justify-center gap-2"
          >
            <Download size={14} />
            Install
          </button>
        )}
      </div>
    </motion.div>
  );
}

function SkillDetailsModal({
  skill,
  reviews,
  isInstalled,
  onClose,
  onInstall,
  onUninstall,
}: {
  skill: SkillMetadata;
  reviews: SkillReview[];
  isInstalled: boolean;
  onClose: () => void;
  onInstall: () => void;
  onUninstall: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-slate-900 rounded-2xl border border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{skill.name}</h2>
              <p className="text-slate-400">{skill.description}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400">
              <XCircle size={20} />
            </button>
          </div>

          <div className="flex items-center gap-4 mb-6 text-sm text-slate-400">
            <div className="flex items-center gap-1">
              <User size={16} />
              <span>{skill.author}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={16} />
              <span>Updated {new Date(skill.updatedAt).toLocaleDateString()}</span>
            </div>
            {skill.rating && (
              <div className="flex items-center gap-1">
                <Star size={16} className="fill-yellow-400 text-yellow-400" />
                <span>{skill.rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">Reviews</h3>
            {reviews.length === 0 ? (
              <p className="text-slate-400">No reviews yet</p>
            ) : (
              <div className="space-y-3">
                {reviews.slice(0, 5).map(review => (
                  <div key={review.id} className="p-3 rounded-lg bg-slate-800/50">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star
                            key={i}
                            size={14}
                            className={
                              i <= review.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-slate-600'
                            }
                          />
                        ))}
                      </div>
                      <span className="text-xs text-slate-400">
                        {review.userName || 'Anonymous'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">{review.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {isInstalled ? (
              <button
                onClick={onUninstall}
                className="flex-1 px-4 py-3 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium"
              >
                Uninstall
              </button>
            ) : (
              <button
                onClick={onInstall}
                className="flex-1 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                Install
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CloneSkillDialog({
  prompt,
  onPromptChange,
  onClone,
  onClose,
}: {
  prompt: string;
  onPromptChange: (value: string) => void;
  onClone: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-slate-900 rounded-2xl border border-slate-800 w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-white mb-2">Clone Any AI Tool</h2>
        <p className="text-slate-400 mb-4">
          Describe the AI tool you want to clone (e.g., "Perplexity research assistant with
          streaming answers")
        </p>
        <textarea
          value={prompt}
          onChange={e => onPromptChange(e.target.value)}
          placeholder="Describe the AI tool or feature..."
          className="w-full h-32 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
          >
            Cancel
          </button>
          <button
            onClick={onClone}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            Clone
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
