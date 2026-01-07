import { useEffect, useMemo } from 'react';
import ReactFlow, { Background, Controls, useNodesState, type Edge, type Node, type NodeProps } from 'reactflow';
import 'reactflow/dist/style.css';
import { ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { ConsentRecord, ConsentRisk } from '../../types/consent';
import { CONSENT_ACTION_LABELS } from './consentLabels';
import type { MouseEvent } from 'react';

interface ConsentFlowGraphProps {
  records: ConsentRecord[];
  onApprove: (consentId: string) => Promise<void> | void;
  onRevoke: (consentId: string) => Promise<void> | void;
  loading?: boolean;
}

type ConsentNodeStatus = 'pending' | 'approved' | 'revoked';

type ConsentNodeData = {
  record: ConsentRecord;
  label: string;
  description: string;
  status: ConsentNodeStatus;
  risk: ConsentRisk;
};

const LANE_X: Record<ConsentNodeStatus, number> = {
  pending: 0,
  approved: 260,
  revoked: 520,
};

const NODE_Y_START = 80;
const NODE_Y_GAP = 130;
const APPROVE_THRESHOLD = (LANE_X.approved + LANE_X.pending) / 2; // midway between pending & approved panes
const REVOKE_THRESHOLD = (LANE_X.revoked + LANE_X.approved) / 2;

const statusClasses: Record<ConsentNodeStatus, string> = {
  pending: 'border-slate-700/60 bg-slate-900/80 text-gray-200',
  approved: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100',
  revoked: 'border-red-500/40 bg-red-500/10 text-red-100',
};

function renderRiskIcon(risk: ConsentRisk) {
  if (risk === 'high') return <AlertTriangle size={14} className="text-red-300" />;
  if (risk === 'medium') return <ShieldAlert size={14} className="text-amber-300" />;
  return <ShieldCheck size={14} className="text-emerald-300" />;
}

const ConsentNode = ({ data }: NodeProps<ConsentNodeData>) => {
  const { label, description, status, risk } = data;
  return (
    <div
      className={`w-56 rounded-2xl border px-4 py-3 shadow-lg shadow-black/30 transition-colors duration-200 ${statusClasses[status]}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold leading-tight line-clamp-1">{label}</span>
        {renderRiskIcon(risk)}
      </div>
      <div className="mt-2 text-[11px] leading-snug text-gray-300/80 line-clamp-3">
        {description || 'No additional context provided.'}
      </div>
      {status === 'pending' && (
        <div className="mt-3 rounded-lg border border-dashed border-amber-400/60 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-100">
          Drag into <span className="font-semibold">Approve</span> or <span className="font-semibold">Reject</span> lanes
        </div>
      )}
      {status === 'approved' && (
        <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-100">
          Approved and logged in ledger
        </div>
      )}
      {status === 'revoked' && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] text-red-100">
          Revoked – access blocked
        </div>
      )}
    </div>
  );
};

const nodeTypes = { consent: ConsentNode };

function resolveStatus(record: ConsentRecord): ConsentNodeStatus {
  if (record.revokedAt) return 'revoked';
  if (record.approved) return 'approved';
  return 'pending';
}

function buildNodes(records: ConsentRecord[]): Node<ConsentNodeData>[] {
  const grouped: Record<ConsentNodeStatus, ConsentRecord[]> = {
    pending: [],
    approved: [],
    revoked: [],
  };
  records.forEach((record) => {
    const status = resolveStatus(record);
    grouped[status].push(record);
  });

  return (['pending', 'approved', 'revoked'] as ConsentNodeStatus[]).flatMap((status) => {
    const items = grouped[status];
    return items.slice(0, 6).map((record, index) => ({
      id: record.id,
      type: 'consent',
      position: { x: LANE_X[status], y: NODE_Y_START + index * NODE_Y_GAP },
      data: {
        record,
        label: CONSENT_ACTION_LABELS[record.action.type] ?? record.action.type,
        description: record.action.description ?? '—',
        status,
        risk: record.action.risk,
      },
      draggable: status === 'pending',
    }) as Node<ConsentNodeData>);
  });
}

export function ConsentFlowGraph({ records, onApprove, onRevoke, loading }: ConsentFlowGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<ConsentNodeData>([]);
  const edges = useMemo<Edge[]>(() => [], []);

  useEffect(() => {
    setNodes(buildNodes(records));
  }, [records, setNodes]);

  const moveNodeToLane = (nodeId: string, status: ConsentNodeStatus, y: number) => {
    setNodes((current) =>
      current.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              position: { x: LANE_X[status], y },
              data: { ...node.data, status },
              draggable: status === 'pending',
            }
          : node,
      ),
    );
  };

  const handleNodeDragStop = async (_event: MouseEvent, node: Node<ConsentNodeData>) => {
    const record = node.data?.record;
    if (!record || loading) {
      moveNodeToLane(node.id, 'pending', node.position.y);
      return;
    }

    const { x, y } = node.position;

    if (x >= REVOKE_THRESHOLD) {
      moveNodeToLane(node.id, 'revoked', y);
      try {
        await onRevoke(record.id);
      } catch (error) {
        console.warn('[ConsentFlowGraph] revoke failed', error);
        moveNodeToLane(node.id, 'pending', y);
      }
      return;
    }

    if (x >= APPROVE_THRESHOLD) {
      moveNodeToLane(node.id, 'approved', y);
      try {
        await onApprove(record.id);
      } catch (error) {
        console.warn('[ConsentFlowGraph] approve failed', error);
        moveNodeToLane(node.id, 'pending', y);
      }
      return;
    }

    moveNodeToLane(node.id, 'pending', y);
  };

  return (
    <div className="relative h-[360px] w-full overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-950/40">
      <div className="pointer-events-none absolute inset-0 grid grid-cols-3">
        <div className="flex flex-col items-center justify-start gap-2 pt-4">
          <span className="rounded-full border border-slate-700/60 bg-slate-900/70 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-gray-400">
            Pending
          </span>
          <span className="text-[9px] text-gray-500">Review requested actions</span>
        </div>
        <div className="flex flex-col items-center justify-start gap-2 pt-4">
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-emerald-200">
            Approve
          </span>
          <span className="text-[9px] text-emerald-200/80">Drop here to grant consent</span>
        </div>
        <div className="flex flex-col items-center justify-start gap-2 pt-4">
          <span className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-red-200">
            Reject
          </span>
          <span className="text-[9px] text-red-200/80">Drop here to revoke or deny</span>
        </div>
      </div>
      {records.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-500">
          No consent requests yet — drag-to-approve suggestions will appear here.
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.85}
        maxZoom={1.4}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnDoubleClick={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        panOnDrag={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
        className="h-full w-full"
      >
        <Background gap={24} color="rgba(148, 163, 184, 0.15)" />
        <Controls position="bottom-right" showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
