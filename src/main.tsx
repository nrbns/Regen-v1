import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// Initialize the React application
console.log('🚀 Starting Regen Application...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ Root element not found');
  throw new Error('Root element not found');
}

// Create React root and render the app
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log('✅ Regen Application started successfully');