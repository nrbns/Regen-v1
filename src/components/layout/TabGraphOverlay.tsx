import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, RefreshCw, Share2, Wand2 } from 'lucide-react';
import { useTabGraphStore, TabGraphNode } from '../../state/tabGraphStore';
import { useWorkflowWeaverStore } from '../../state/workflowWeaverStore';
import { formatDistanceToNow } from 'date-fns';

const EDGE_COLORS: Record<string, string> = {
  domain: '#60a5fa',
  container: '#34d399',
  mode: '#a855f7',
  timeline: '#f97316',
};

const CANVAS_SIZE = { width: 680, height: 520 };
const NODE_RADIUS = 28;

const getPosition = (index: number, total: number) => {
  if (total === 0) {
    return { x: CANVAS_SIZE.width / 2, y: CANVAS_SIZE.height / 2 };
  }
  const angle = (2 * Math.PI * index) / total;
  const radius = Math.min(CANVAS_SIZE.width, CANVAS_SIZE.height) / 2 - 70;
  const cx = CANVAS_SIZE.width / 2 + radius * Math.cos(angle);
  const cy = CANVAS_SIZE.height / 2 + radius * Math.sin(angle);
  return { x: cx, y: cy };
};

export function TabGraphOverlay() {
  const { visible, data, loading, error, close, refresh, focusedTabId, setFocusedTab } = useTabGraphStore((state) => ({
    visible: state.visible,
    data: state.data,
    loading: state.loading,
    error: state.error,
    close: state.close,
    refresh: state.refresh,
    focusedTabId: state.focusedTabId,
    setFocusedTab: state.setFocusedTab,
  }));
  const {
    plan,
    loading: planLoading,
    error: planError,
    fetch: fetchPlan,
  } = useWorkflowWeaverStore((state) => ({
    plan: state.plan,
    loading: state.loading,
    error: state.error,
    fetch: state.fetch,
  }));
  const [hovered, setHovered] = useState<TabGraphNode | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (!data && !loading) {
      void refresh();
    }
    const interval = setInterval(() => {
      void refresh();
    }, 15000);
    return () => clearInterval(interval);
  }, [visible, data, loading, refresh]);

  useEffect(() => {
    if (!visible) return;
    void fetchPlan({ maxSteps: 5, force: true });
    const interval = setInterval(() => {
      void fetchPlan({ maxSteps: 5 });
    }, 20000);
    return () => clearInterval(interval);
  }, [visible, fetchPlan]);

  const graph = useMemo(() => {
    if (!data) {
      return null;
    }
    const positions = data.nodes.map((node, index) => ({
      node,
      ...getPosition(index, data.nodes.length),
    }));
    const nodeLookup = new Map(positions.map((item) => [item.node.id, item]));
    const edges = data.edges
      .map((edge) => {
        const source = nodeLookup.get(edge.source);
        const target = nodeLookup.get(edge.target);
        if (!source || !target) {
          return null;
        }
        return { edge, source, target };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
    return { positions, edges };
  }, [data]);

  useEffect(() => {
    if (!graph || !focusedTabId) {
      return;
    }
    const target = graph.positions.find((item) => item.node.id === focusedTabId);
    if (target) {
      setHovered(target.node);
    }
  }, [graph, focusedTabId]);

  const handleClose = () => {
    setHovered(null);
    setFocusedTab(null);
    close();
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="relative w-[820px] max-w-[92vw] rounded-3xl border border-slate-700/70 bg-slate-950/95 shadow-2xl shadow-black/50"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800/60 px-6 py-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm text-emerald-300">
              <Share2 size={16} />
              Dynamic Tab Graph
            </div>
            <div className="text-lg font-semibold text-gray-100">Browse DNA Overlay</div>
            <div className="text-xs text-gray-400">
              {data?.summary.totalTabs ?? 0} tabs · {data?.summary.domains ?? 0} domains · {data?.summary.containers ?? 0}{' '}
              containers
              {data?.updatedAt && (
                <span className="ml-2 text-gray-500">
                  Updated{' '}
                  {formatDistanceToNow(new Date(data.updatedAt), {
                    addSuffix: true,
                  })}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void refresh();
                void fetchPlan({ maxSteps: 5, force: true });
              }}
              disabled={loading}
              className="rounded-xl border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-slate-900/90 transition-colors disabled:cursor-wait disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Refresh
              </div>
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full border border-slate-700/60 bg-slate-900/70 p-2 text-gray-300 hover:bg-slate-900/90 transition-colors"
              aria-label="Close tab graph overlay"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-6 pb-6">
          {error && (
            <div className="mb-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-100">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_220px]">
            <div className="relative flex items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4">
              <svg
                width={CANVAS_SIZE.width}
                height={CANVAS_SIZE.height}
                className="text-gray-500"
              >
                {graph?.edges.map(({ edge, source, target }) => {
                  const primaryReason = edge.reasons[0] ?? 'domain';
                  const stroke = EDGE_COLORS[primaryReason] ?? '#94a3b8';
                  const strokeWidth = 1 + Math.min(edge.weight, 4);
                  return (
                    <line
                      key={edge.id}
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={stroke}
                      strokeOpacity={0.4}
                      strokeWidth={strokeWidth}
                    />
                  );
                })}

                {graph?.positions.map(({ node, x, y }) => {
                  const isFocused = focusedTabId === node.id;
                  return (
                    <g key={node.id} transform={`translate(${x}, ${y})`}>
                      {isFocused && (
                        <motion.circle
                          r={NODE_RADIUS + 14}
                          className="fill-transparent stroke-purple-400/70"
                          strokeWidth={1.5}
                          animate={{ scale: [1, 1.08, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      )}
                      <motion.circle
                        r={NODE_RADIUS}
                        className={`stroke-2 ${isFocused ? 'stroke-purple-400' : node.active ? 'stroke-emerald-400' : 'stroke-slate-700/70'}`}
                        fill={isFocused ? '#a855f73d' : node.active ? '#10b98133' : '#1f293733'}
                        whileHover={{ scale: 1.05 }}
                        onMouseEnter={() => setHovered(node)}
                        onMouseLeave={() => setHovered(null)}
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="pointer-events-none select-none text-[10px] font-medium fill-gray-200"
                      >
                        {node.mode === 'ghost' ? '👻' : node.mode === 'private' ? '🛡️' : '🗂️'}
                      </text>
                      <text
                        y={NODE_RADIUS + 14}
                        textAnchor="middle"
                        className="pointer-events-none select-none text-[10px] fill-gray-300"
                      >
                        {node.title.slice(0, 24)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-3 text-xs text-gray-300">
                <div className="mb-2 font-semibold text-sm text-gray-100">Legend</div>
                <div className="flex flex-col gap-2">
                  {Object.entries(EDGE_COLORS).map(([reason, color]) => (
                    <div key={reason} className="flex items-center gap-2">
                      <span className="inline-flex h-2.5 w-8 rounded-full" style={{ background: color, opacity: 0.5 }} />
                      <span className="capitalize text-gray-300">{reason} affinity</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-hidden rounded-xl border border-slate-800/60 bg-slate-900/60 p-3 text-xs text-gray-300">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold text-sm text-gray-100">Tab Details</span>
                  {hovered && (
                    <a
                      href={hovered.url}
                      className="text-[11px] text-blue-300 hover:text-blue-200"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open
                    </a>
                  )}
                </div>
                {hovered ? (
                  <div className="space-y-1 text-[11px] leading-snug text-gray-300">
                    <div className="font-medium text-gray-100">{hovered.title}</div>
                    <div className="text-gray-400 break-all">{hovered.url}</div>
                    <div>Domain: <span className="text-gray-200">{hovered.domain}</span></div>
                    {hovered.containerName && (
                      <div>
                        Container: <span className="text-gray-200">{hovered.containerName}</span>
                      </div>
                    )}
                    {hovered.mode && <div>Mode: <span className="text-gray-200">{hovered.mode}</span></div>}
                    {typeof hovered.lastActiveAt === 'number' && (
                      <div>
                        Last active{' '}
                        {formatDistanceToNow(new Date(hovered.lastActiveAt), {
                          addSuffix: true,
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[11px] text-gray-500">Hover a node to inspect metadata.</div>
                )}
              </div>

              <div className="overflow-hidden rounded-xl border border-purple-500/30 bg-purple-500/5 p-3 text-xs text-gray-200">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-purple-200">
                    <Wand2 size={14} /> Neural Workflow Weaver
                  </div>
                  <button
                    type="button"
                    onClick={() => void fetchPlan({ maxSteps: 5, force: true })}
                    className="rounded-lg border border-purple-400/40 bg-purple-500/10 px-2 py-1 text-[11px] text-purple-100 hover:bg-purple-500/20 transition-colors"
                    disabled={planLoading}
                  >
                    {planLoading ? 'Generating…' : 'Regenerate'}
                  </button>
                </div>
                {planError && (
                  <div className="mb-2 rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-100">
                    {planError}
                  </div>
                )}
                {planLoading && !plan && (
                  <div className="text-[11px] text-purple-200/70">Analyzing your open tabs…</div>
                )}
                {!planLoading && plan && (
                  <div className="space-y-2">
                    <div className="text-[11px] text-purple-100/80">{plan.summary}</div>
                    <div className="space-y-2">
                      {plan.steps.length === 0 ? (
                        <div className="text-[11px] text-purple-200/70">Open a few research tabs to generate a workflow.</div>
                      ) : (
                        plan.steps.map((step, index) => (
                          <div key={step.id} className="rounded-lg border border-purple-400/30 bg-purple-500/10 p-2 text-[11px] text-purple-100/90">
                            <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-purple-200/80">
                              <span>Step {index + 1}</span>
                              {typeof step.confidence === 'number' && (
                                <span>{Math.round(step.confidence * 100)}% confidence</span>
                              )}
                            </div>
                            <div className="mt-1 text-[12px] font-semibold text-purple-50">{step.title}</div>
                            <div className="mt-1 text-[11px] text-purple-100/80">{step.description}</div>
                            {step.recommendedActions?.length > 0 && (
                              <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[11px] text-purple-100/70">
                                {step.recommendedActions.map((action, actionIdx) => (
                                  <li key={`${step.id}-action-${actionIdx}`}>{action}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
