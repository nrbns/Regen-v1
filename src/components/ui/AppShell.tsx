import React from 'react';

type Props = {
  children?: React.ReactNode;
};

export default function AppShell({ children }: Props) {
  return (
    <div id="app-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  );
}
