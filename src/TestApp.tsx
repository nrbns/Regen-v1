import React from 'react';

export function TestApp() {
  return (
    <div style={{ padding: '20px', background: '#0f172a', color: 'white', minHeight: '100vh' }}>
      <h1>🧪 Regen Test App</h1>
      <p>If you can see this, React is working!</p>
      <div style={{ marginTop: '20px' }}>
        <button
          style={{
            padding: '10px 20px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
          onClick={() => alert('Button works!')}
        >
          Test Button
        </button>
      </div>
    </div>
  );
}
