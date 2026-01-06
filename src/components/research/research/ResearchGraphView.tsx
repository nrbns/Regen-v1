import { useMemo, useRef, useState } from 'react';

type GraphNode = {
  key: string;
  type?: string;
  title?: string;
  meta?: Record<string, any>;
  created_at?: number;
};

type GraphEdge = {
  src: string;
  dst: string;
  rel?: string;
  weight?: number;
  created_at?: number;
};

export type ResearchGraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

type PositionedNode = GraphNode & {
  position: { x: number; y: number };
};

type PositionedEdge = GraphEdge & {
  source: { x: number; y: number } | undefined;
  target: { x: number; y: number } | undefined;
};

const WIDTH = 960;
const HEIGHT = 420;

const COLORS: Record<string, string> = {
  'research-query': '#60a5fa',
  'research-source': '#a855f7',
  'research-evidence': '#facc15',
};

function allowedType(type?: string) {
  return type === 'research-query' || type === 'research-source' || type === 'research-evidence';
}

function buildLayout(graphData: ResearchGraphData | null, queryKey: string | null) {
  if (!graphData || !queryKey) {
    return null;
  }
  const { nodes, edges } = graphData;
  if (!Array.isArray(nodes) || nodes.length === 0) return null;
  const nodeMap = new Map<string, GraphNode>();
  nodes.forEach((node) => {
    if (node?.key) {
      nodeMap.set(node.key, node);
    }
  });
  const queryNode = nodeMap.get(queryKey);
  if (!queryNode) return null;

  const filteredEdges = edges.filter((edge) => {
    const sourceNode = nodeMap.get(edge.src);
    const targetNode = nodeMap.get(edge.dst);
    return allowedType(sourceNode?.type) && allowedType(targetNode?.type);
  });

  const includeKeys = new Set<string>([queryKey]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of filteredEdges) {
      if (includeKeys.has(edge.src) && !includeKeys.has(edge.dst)) {
        includeKeys.add(edge.dst);
        changed = true;
      } else if (includeKeys.has(edge.dst) && !includeKeys.has(edge.src)) {
        includeKeys.add(edge.src);
        changed = true;
      }
    }
  }

  const subsetNodes = Array.from(includeKeys)
    .map((key) => nodeMap.get(key))
    .filter((node): node is GraphNode => Boolean(node));

  if (subsetNodes.length <= 1) {
    return null;
  }

  const subsetEdges = filteredEdges.filter((edge) => includeKeys.has(edge.src) && includeKeys.has(edge.dst));

  const positions = new Map<string, { x: number; y: number; angle?: number }>();
  const center = { x: WIDTH / 2, y: HEIGHT / 2 };
  positions.set(queryKey, { ...center });

  const sourceNodes = subsetNodes.filter((node) => node.type === 'research-source');
  const evidenceNodes = subsetNodes.filter((node) => node.type === 'research-evidence');

  const radius = Math.min(WIDTH, HEIGHT) * 0.35;
  const angleStep = sourceNodes.length > 0 ? (Math.PI * 2) / sourceNodes.length : 0;
  const baseAngle = -Math.PI / 2;

  sourceNodes.forEach((node, index) => {
    const angle = baseAngle + angleStep * index;
    const x = center.x + radius * Math.cos(angle);
    const y = center.y + radius * Math.sin(angle);
    positions.set(node.key, { x, y, angle });
  });

  const childrenBySource = new Map<string, string[]>();
  subsetEdges.forEach((edge) => {
    const src = nodeMap.get(edge.src);
    const dst = nodeMap.get(edge.dst);
    if (!src || !dst) return;
    if (src.type === 'research-source' && dst.type === 'research-evidence') {
      const entries = childrenBySource.get(src.key) ?? [];
      if (!entries.includes(dst.key)) {
        entries.push(dst.key);
        childrenBySource.set(src.key, entries);
      }
    } else if (src.type === 'research-evidence' && dst.type === 'research-source') {
      const entries = childrenBySource.get(dst.key) ?? [];
      if (!entries.includes(src.key)) {
        entries.push(src.key);
        childrenBySource.set(dst.key, entries);
      }
    }
  });

  evidenceNodes.forEach((node) => {
    const parentEdge =
      subsetEdges.find(
        (edge) =>
          edge.dst === node.key && nodeMap.get(edge.src)?.type === 'research-source',
      ) ||
      subsetEdges.find(
        (edge) =>
          edge.src === node.key && nodeMap.get(edge.dst)?.type === 'research-source',
      );

    const parentKey =
      parentEdge && nodeMap.get(parentEdge.src)?.type === 'research-source'
        ? parentEdge.src
        : parentEdge && nodeMap.get(parentEdge.dst)?.type === 'research-source'
        ? parentEdge.dst
        : null;

    if (!parentKey || !positions.has(parentKey)) {
      const jitterRadius = radius * 0.2;
      positions.set(node.key, {
        x: center.x + (Math.random() - 0.5) * jitterRadius,
        y: center.y + (Math.random() - 0.5) * jitterRadius,
      });
      return;
    }

    const parentPosition = positions.get(parentKey)!;
    const siblings = childrenBySource.get(parentKey) ?? [];
    const index = siblings.indexOf(node.key);
    const spread = Math.max(0.4, Math.min(1.2, siblings.length * 0.18));
    const baseDirection =
      parentPosition.angle !== undefined
        ? parentPosition.angle
        : Math.atan2(parentPosition.y - center.y, parentPosition.x - center.x);
    const offset = (index - (siblings.length - 1) / 2) * spread;
    const childRadius = Math.min(140, radius * 0.6);
    const angle = baseDirection + offset;

    positions.set(node.key, {
      x: parentPosition.x + childRadius * Math.cos(angle),
      y: parentPosition.y + childRadius * Math.sin(angle),
    });
  });

  const laidOutNodes: PositionedNode[] = subsetNodes.map((node) => ({
    ...node,
    position: positions.get(node.key) ?? { ...center },
  }));

  const laidOutEdges: PositionedEdge[] = subsetEdges.map((edge) => ({
    ...edge,
    source: positions.get(edge.src),
    target: positions.get(edge.dst),
  }));

  return {
    nodes: laidOutNodes,
    edges: laidOutEdges,
  };
}

type ResearchGraphViewProps = {
  query: string;
  queryKey: string | null;
  graphData: ResearchGraphData | null;
  activeSourceId: string | null;
  onSelectSource(sourceKey: string): void;
  onOpenSource(url: string): void;
};

export function ResearchGraphView({
  query,
  queryKey,
  graphData,
  activeSourceId,
  onSelectSource,
  onOpenSource,
}: ResearchGraphViewProps) {
  const layout = useMemo(() => buildLayout(graphData, queryKey), [graphData, queryKey]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<{
    node: PositionedNode;
    x: number;
    y: number;
  } | null>(null);

  if (!layout || layout.nodes.length <= 1) {
    return (
      <div className="flex h-[320px] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-black/10 text-center">
        <p className="text-sm text-gray-400">
          Run a research query to generate a live evidence graph.
        </p>
        <p className="text-xs text-gray-500">
          The graph links your question to vetted sources and their key evidence.
        </p>
      </div>
    );
  }

  const nodeMap = new Map(layout.nodes.map((node) => [node.key, node]));

  const handleNodeActivate = (node: PositionedNode) => {
    if (node.type === 'research-source') {
      const url = node.meta?.url || node.meta?.fragmentUrl;
      if (url) {
        onOpenSource(url);
      }
      onSelectSource(node.key);
    } else if (node.type === 'research-evidence') {
      const sourceKey = node.meta?.sourceKey;
      if (sourceKey) {
        onSelectSource(sourceKey);
      }
      const fragmentUrl = node.meta?.fragmentUrl || node.meta?.url;
      if (fragmentUrl) {
        onOpenSource(fragmentUrl);
      }
    }
  };

  const getNodeRadius = (node: GraphNode) => {
    switch (node.type) {
      case 'research-query':
        return 42;
      case 'research-source':
        return node.key === activeSourceId ? 26 : 22;
      case 'research-evidence':
        return 16;
      default:
        return 18;
    }
  };

  const getNodeColor = (node: GraphNode) => {
    if (node.type === 'research-source' && node.key === activeSourceId) {
      return '#34d399';
    }
    return COLORS[node.type ?? ''] ?? '#818cf8';
  };

  const getEdgeStyle = (edge: PositionedEdge) => {
    const sourceType = nodeMap.get(edge.src)?.type;
    const targetType = nodeMap.get(edge.dst)?.type;

    if (
      sourceType === 'research-source' &&
      targetType === 'research-source'
    ) {
      return {
        stroke: '#f97316',
        strokeWidth: 1.6,
        strokeDasharray: '4 4',
        opacity: 0.7,
      };
    }

    if (
      sourceType === 'research-source' &&
      targetType === 'research-evidence'
    ) {
      return {
        stroke: '#a855f7',
        strokeWidth: 1.4,
        opacity: 0.55,
      };
    }

    return {
      stroke: '#60a5fa',
      strokeWidth: Math.max(1.2, Math.min(2.6, (edge.weight ?? 40) / 50)),
      opacity: 0.65,
    };
  };

  return (
    <div
      ref={containerRef}
      className="relative h-[360px] w-full overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#05060c] via-[#0b0e18] to-[#11162a] shadow-inner shadow-black/30"
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-full w-full"
        role="presentation"
      >
        <defs>
          <radialGradient id="queryGlow" r="65%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
          </radialGradient>
        </defs>
        {layout.edges.map((edge) => {
          if (!edge.source || !edge.target) return null;
          const style = getEdgeStyle(edge);
          return (
            <g key={`${edge.src}-${edge.dst}-${edge.rel ?? 'edge'}`}>
              <line
                x1={edge.source.x}
                y1={edge.source.y}
                x2={edge.target.x}
                y2={edge.target.y}
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
                strokeDasharray={style.strokeDasharray}
                opacity={style.opacity}
              />
            </g>
          );
        })}

        {layout.nodes.map((node) => {
          const position = node.position;
          const radius = getNodeRadius(node);
          const color = getNodeColor(node);

          return (
            <g
              key={node.key}
              transform={`translate(${position.x}, ${position.y})`}
              tabIndex={node.type === 'research-query' ? -1 : 0}
              role={node.type === 'research-query' ? 'group' : 'button'}
              aria-label={
                node.type === 'research-source'
                  ? `Source: ${node.title ?? node.meta?.domain ?? 'unknown'}`
                  : node.type === 'research-evidence'
                  ? `Evidence: ${node.title ?? 'excerpt'}`
                  : `Query node for ${query}`
              }
              onFocus={(event) => {
                if (node.type === 'research-source' || node.type === 'research-evidence') {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    const x = position.x * (event.currentTarget.ownerSVGElement?.clientWidth ?? 1) / WIDTH;
                    const y = position.y * (event.currentTarget.ownerSVGElement?.clientHeight ?? 1) / HEIGHT;
                    setHover({ node, x, y });
                  }
                }
              }}
              onBlur={() => setHover(null)}
              onMouseEnter={(_event) => {
                const rect = containerRef.current?.getBoundingClientRect();
                if (!rect) return;
                const scaleX = rect.width / WIDTH;
                const scaleY = rect.height / HEIGHT;
                setHover({
                  node,
                  x: position.x * scaleX,
                  y: position.y * scaleY,
                });
              }}
              onMouseLeave={() => setHover(null)}
              onClick={() => handleNodeActivate(node)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleNodeActivate(node);
                }
              }}
            >
              {node.type === 'research-query' && (
                <circle r={radius * 1.8} fill="url(#queryGlow)" opacity={0.4} />
              )}
              <circle
                r={radius}
                fill={color}
                opacity={node.type === 'research-query' ? 0.85 : 0.75}
                stroke={node.type === 'research-source' && node.key === activeSourceId ? '#34d399' : '#0f172a'}
                strokeWidth={node.type === 'research-source' && node.key === activeSourceId ? 3 : 1.5}
              />
              <text
                x={0}
                y={radius + 16}
                textAnchor="middle"
                className="select-none"
                fill="#cbd5f5"
                fontSize={12}
              >
                {node.type === 'research-query'
                  ? 'Question'
                  : node.type === 'research-source'
                  ? node.meta?.domain ?? 'Source'
                  : 'Evidence'}
              </text>
            </g>
          );
        })}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 w-[240px] max-w-[80vw] rounded-xl border border-white/10 bg-black/80 px-3 py-2 text-xs text-gray-200 shadow-lg backdrop-blur"
          style={{
            left: Math.min(
              Math.max(hover.x + 12, 8),
              (containerRef.current?.clientWidth ?? 0) - 220,
            ),
            top: Math.min(
              Math.max(hover.y + 12, 8),
              (containerRef.current?.clientHeight ?? 0) - 120,
            ),
          }}
        >
          <div className="text-[11px] uppercase tracking-wide text-gray-400">
            {hover.node.type === 'research-query'
              ? 'Question'
              : hover.node.type === 'research-source'
              ? 'Source'
              : 'Evidence'}
          </div>
          <div className="mt-1 font-medium text-gray-100">
            {hover.node.title || hover.node.meta?.domain || 'Untitled'}
          </div>
          {hover.node.type === 'research-source' && hover.node.meta?.url && (
            <div className="mt-1 truncate text-[11px] text-blue-200">
              {hover.node.meta.url}
            </div>
          )}
          {hover.node.meta?.snippet && (
            <div className="mt-2 line-clamp-3 text-[11px] text-gray-400">
              {hover.node.meta.snippet}
            </div>
          )}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 right-3 flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[10px] uppercase tracking-wide text-gray-400">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-[#60a5fa]/80" />
          Question
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-[#a855f7]/80" />
          Sources
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-[#facc15]/80" />
          Evidence
        </span>
      </div>
    </div>
  );
}


