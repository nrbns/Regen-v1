import React from 'react';

type Props = {
  ram?: string;
  cpu?: string;
  battery?: string;
  redix?: string;
  lastRepair?: string;
};

export default function SystemBar({ ram = '-', cpu = '-', battery = '-', redix = '-', lastRepair = '-' }: Props) {
  return (
    <div id="system-bar" style={{ padding: 8, fontSize: 12, borderTop: '1px solid #222' }}>
      <span style={{ marginRight: 12 }}>RAM: {ram}</span>
      <span style={{ marginRight: 12 }}>CPU: {cpu}</span>
      <span style={{ marginRight: 12 }}>Battery: {battery}</span>
      <span style={{ marginRight: 12 }}>Redix: {redix}</span>
      <span style={{ marginLeft: 12 }}>Repair: {lastRepair}</span>
    </div>
  );
}
