import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/globals.css';

console.log('=== MINIMAL MAIN.TSX LOADING ===');

const rootElement = document.getElementById('root');
console.log('Root element:', rootElement);

if (!rootElement) {
  throw new Error('Root element not found!');
}

function App() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#1A1D28',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      fontFamily: 'system-ui'
    }}>
      <div>
        <h1>βœ… React is working!</h1>
        <p>Omnibrowser MVP is loading...</p>
      </div>
    </div>
  );
}

try {
  console.log('Creating React root...');
  const root = ReactDOM.createRoot(rootElement);
  
  console.log('Rendering App...');
  root.render(<App />);
  
  console.log('βœ… Mount successful!');
} catch (error) {
  console.error('❌ Mount failed:', error);
  alert('Mount error: ' + (error as Error).message);
}
