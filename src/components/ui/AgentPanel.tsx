import React from 'react';

export type AgentInfo = {
  id: string;
  name: string;
  state: string;
  runtime?: string;
  memory?: string;
};

type Props = {
  agents?: AgentInfo[];
  onStop?: (id: string) => void;
};

export default function AgentPanel({ agents = [], onStop }: Props) {
  return (
    <div id="agent-panel" style={{ padding: 8, fontSize: 13 }}>
      <div style={{ marginBottom: 8, fontWeight: 600 }}>Agents</div>
      <div style={{ display: 'grid', gap: 6 }}>
        {agents.length === 0 && <div style={{ color: '#777' }}>No agents</div>}
        {agents.map(a => (
          <div
            key={a.id}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 500 }}>{a.name}</div>
              <div style={{ fontSize: 11, color: '#999' }}>
                {a.state} · {a.runtime || '-'} · {a.memory || '-'}
              </div>
            </div>
            <div>
              <button
                onClick={() => onStop?.(a.id)}
                style={{ padding: '6px 8px', fontSize: 12 }}
                aria-label={`stop-${a.id}`}
              >
                Stop
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
