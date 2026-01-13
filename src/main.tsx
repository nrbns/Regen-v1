import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// Initialize real-time enforcement system
import { startWatchdog, restoreTasksOnReload } from './core/runtime/enforcement';
import { initializeNetworkMonitoring } from './core/runtime/networkMonitor';

// Initialize the React application
console.log('🚀 Starting Regen Application...');

// ENFORCEMENT: Start watchdog and restore tasks
restoreTasksOnReload();
startWatchdog();

// ENFORCEMENT: Initialize honest network monitoring (only tracks user-initiated calls)
initializeNetworkMonitoring();

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