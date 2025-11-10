import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownCircle, ArrowUpCircle, BadgeCheck, Download, Globe2, Loader2, Share2, Users } from 'lucide-react';
import { useExtensionNexusStore } from '../../state/extensionNexusStore';
import type { NexusPluginEntry } from '../../types/extensionNexus';

interface PublishFormState {
  pluginId: string;
  name: string;
  version: string;
  description: string;
  author: string;
  sourcePeer: string;
  carbonScore?: number;
  tags: string;
}

const DEFAULT_FORM: PublishFormState = {
  pluginId: '',
  name: '',
  version: '0.1.0',
  description: '',
  author: '',
  sourcePeer: '',
  carbonScore: undefined,
  tags: '',
};

function peerLabel(peer: string): string {
  if (!peer) return 'Unknown node';
  if (peer.startsWith('ob://')) return peer.replace('ob://', '');
  return peer;
}

function confidenceTone(carbon?: number): string {
  if (carbon === undefined) return 'text-gray-400 bg-gray-800/70 border-gray-700/40';
  if (carbon < 45) return 'text-emerald-300 bg-emerald-500/10 border-emerald-500/40';
  if (carbon < 65) return 'text-amber-300 bg-amber-500/10 border-amber-500/40';
  return 'text-red-300 bg-red-500/10 border-red-500/40';
}

function formatTags(tags?: string[]): string {
  if (!tags || tags.length === 0) return 'untagged';
  return tags.map((tag) => `#${tag}`).join(' ');
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function PluginCard({ plugin, onToggleTrust }: { plugin: NexusPluginEntry; onToggleTrust: (id: string, trusted: boolean) => void }) {
  return (
    <motion.div
      layout
      className="rounded-xl border border-slate-800/60 bg-slate-900/70 p-4 shadow-lg shadow-black/40 hover:bg-slate-900/80 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-200">{plugin.name}</h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full border border-slate-700/50 text-gray-400">
              v{plugin.version}
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-400 leading-relaxed line-clamp-3">{plugin.description}</p>
        </div>
        <button
          onClick={() => onToggleTrust(plugin.pluginId, !plugin.trusted)}
          className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] transition-colors ${
            plugin.trusted
              ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
              : 'border-gray-700/60 bg-gray-800/60 text-gray-300 hover:bg-gray-800/80'
          }`}
        >
          <BadgeCheck size={12} />
          {plugin.trusted ? 'Trusted' : 'Trust Node'}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1"><Users size={12} className="text-gray-600" />{peerLabel(plugin.sourcePeer)}</span>
        <span className="inline-flex items-center gap-1"><Download size={12} className="text-gray-600" />{plugin.downloads} pulls</span>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${confidenceTone(plugin.carbonScore)}`}>
          <Globe2 size={12} />
          {plugin.carbonScore !== undefined ? `${plugin.carbonScore.toFixed(0)} gCO₂e` : 'carbon unknown'}
        </span>
        <span className="inline-flex items-center gap-1 text-gray-500">{timeAgo(plugin.publishedAt)}</span>
      </div>
      <div className="mt-3 text-[11px] text-gray-500 uppercase tracking-wide">{formatTags(plugin.tags)}</div>
    </motion.div>
  );
}

export function ExtensionNexusPanel() {
  const { plugins, loading, peers, error, lastSyncedAt, fetch, publish, toggleTrust } = useExtensionNexusStore();
  const [showPublish, setShowPublish] = useState(false);
  const [form, setForm] = useState<PublishFormState>(DEFAULT_FORM);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (plugins.length === 0 && !loading) {
      void fetch();
    }
  }, [fetch, plugins.length, loading]);

  const sortedPlugins = useMemo(() => [...plugins].sort((a, b) => b.trusted === a.trusted ? b.publishedAt - a.publishedAt : Number(b.trusted) - Number(a.trusted)), [plugins]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.pluginId.trim() || !form.name.trim()) return;
    setBusy(true);
    try {
      await publish({
        pluginId: form.pluginId.trim(),
        name: form.name.trim(),
        version: form.version.trim(),
        description: form.description.trim(),
        author: form.author.trim(),
        sourcePeer: form.sourcePeer.trim() || 'ob://local',
        carbonScore: form.carbonScore,
        tags: form.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
      setForm(DEFAULT_FORM);
      setShowPublish(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <Share2 size={16} className="text-purple-400" />
            Decentralized Extension Nexus
          </h2>
          <p className="text-[11px] text-gray-500 mt-1">
            P2P plugin sharing with trust scoring and carbon-aware provenance.
          </p>
        </div>
        <button
          onClick={() => setShowPublish((value) => !value)}
          className="flex items-center gap-1 rounded-lg border border-purple-500/50 bg-purple-600/10 px-3 py-1.5 text-xs text-purple-200 hover:bg-purple-600/20"
        >
          <ArrowUpCircle size={14} />
          Share Plugin
        </button>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1 rounded-lg border border-gray-700/60 bg-gray-800/60 px-2 py-1">
          <Users size={12} className="text-gray-500" />
          {peers.length} federated peers
        </span>
        {lastSyncedAt && (
          <span className="inline-flex items-center gap-1 text-gray-500">
            <ArrowDownCircle size={12} className="text-gray-600" />
            Synced {timeAgo(lastSyncedAt)}
          </span>
        )}
        {loading && (
          <span className="inline-flex items-center gap-1 text-purple-300">
            <Loader2 size={12} className="animate-spin" />
            Syncing mesh
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          {error}
        </div>
      )}

      <AnimatePresence>{showPublish && (
        <motion.form
          layout
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          onSubmit={handleSubmit}
          className="space-y-3 rounded-xl border border-purple-500/40 bg-purple-500/5 p-4"
        >
          <div className="grid grid-cols-1 gap-3">
            <label className="flex flex-col gap-1 text-xs text-gray-400">
              Plugin Identifier
              <input
                type="text"
                value={form.pluginId}
                onChange={(e) => setForm((prev) => ({ ...prev, pluginId: e.target.value }))}
                className="rounded-lg border border-purple-500/30 bg-gray-950 px-3 py-2 text-gray-200 focus:border-purple-400 focus:outline-none"
                placeholder="com.omni.ai.intelligence"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-400">
              Friendly name
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="rounded-lg border border-purple-500/30 bg-gray-950 px-3 py-2 text-gray-200 focus:border-purple-400 focus:outline-none"
                placeholder="Omni Intelligence Toolkit"
                required
              />
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs text-gray-400">
                Version
                <input
                  type="text"
                  value={form.version}
                  onChange={(e) => setForm((prev) => ({ ...prev, version: e.target.value }))}
                  className="rounded-lg border border-purple-500/30 bg-gray-950 px-3 py-2 text-gray-200 focus:border-purple-400 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-400">
                Source peer / node handle
                <input
                  type="text"
                  value={form.sourcePeer}
                  onChange={(e) => setForm((prev) => ({ ...prev, sourcePeer: e.target.value }))}
                  className="rounded-lg border border-purple-500/30 bg-gray-950 px-3 py-2 text-gray-200 focus:border-purple-400 focus:outline-none"
                  placeholder="ob://atlanta-hub"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs text-gray-400">
              Description
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="rounded-lg border border-purple-500/30 bg-gray-950 px-3 py-2 text-gray-200 focus:border-purple-400 focus:outline-none"
                placeholder="Describe the capability, privacy considerations, and ethics pledges."
                rows={3}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-400">
              Author / Collective
              <input
                type="text"
                value={form.author}
                onChange={(e) => setForm((prev) => ({ ...prev, author: e.target.value }))}
                className="rounded-lg border border-purple-500/30 bg-gray-950 px-3 py-2 text-gray-200 focus:border-purple-400 focus:outline-none"
                placeholder="Atlas Collective"
                required
              />
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs text-gray-400">
                Carbon intensity snapshot (gCO₂e)
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.carbonScore ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((prev) => ({ ...prev, carbonScore: value === '' ? undefined : Number(value) }));
                  }}
                  className="rounded-lg border border-purple-500/30 bg-gray-950 px-3 py-2 text-gray-200 focus:border-purple-400 focus:outline-none"
                  placeholder="48"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-400">
                Tags (comma separated)
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
                  className="rounded-lg border border-purple-500/30 bg-gray-950 px-3 py-2 text-gray-200 focus:border-purple-400 focus:outline-none"
                  placeholder="productivity, research, discovery"
                />
              </label>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowPublish(false);
                setForm(DEFAULT_FORM);
              }}
              className="rounded-lg border border-gray-700/60 bg-gray-800/60 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800/80"
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg border border-purple-500/60 bg-purple-600/20 px-3 py-1.5 text-xs text-purple-100 hover:bg-purple-600/30 disabled:opacity-60"
              disabled={busy}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
              Publish to mesh
            </button>
          </div>
        </motion.form>
      )}</AnimatePresence>

      <div className="space-y-3">
        {sortedPlugins.length === 0 && !loading ? (
          <div className="rounded-xl border border-dashed border-gray-700/60 bg-gray-900/50 px-6 py-12 text-center text-xs text-gray-500">
            No peer plugins in the mesh yet. Publish one to seed the nexus.
          </div>
        ) : (
          <AnimatePresence>
            {sortedPlugins.map((plugin) => (
              <PluginCard key={plugin.pluginId} plugin={plugin} onToggleTrust={toggleTrust} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
