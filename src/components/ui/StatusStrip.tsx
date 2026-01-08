import React from 'react';

type Props = {
  mode?: string;
  agent?: string;
  health?: string;
};

export default function StatusStrip({
  mode = 'Unknown',
  agent = 'N/A',
  health = 'Unknown',
}: Props) {
  return (
    <div id="status-strip" style={{ padding: 6, fontSize: 12, borderBottom: '1px solid #222' }}>
      <span style={{ marginRight: 12 }}>MODE: {mode}</span>
      <span style={{ marginRight: 12 }}>AGENT: {agent}</span>
      <span style={{ marginRight: 12 }}>HEALTH: {health}</span>
    </div>
  );
}
