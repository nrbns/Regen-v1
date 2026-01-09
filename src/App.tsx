import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ThemeProvider } from './contexts/ThemeContext';
import { initializeApp } from './lib/initialize-app';

// Lazy load route components for better performance
const Home = React.lazy(() => import('./routes/Home'));
const Browse = React.lazy(() => import('./routes/Browse'));
const AgentConsole = React.lazy(() => import('./routes/AgentConsole'));
const TaskRunner = React.lazy(() => import('./routes/TaskRunner'));
const AISearch = React.lazy(() => import('./routes/AISearch'));
const DocumentEditor = React.lazy(() => import('./routes/DocumentEditor'));
const Downloads = React.lazy(() => import('./routes/Downloads'));
const History = React.lazy(() => import('./routes/History'));
const OfflineDocuments = React.lazy(() => import('./routes/OfflineDocuments'));
const PlaybookForge = React.lazy(() => import('./routes/PlaybookForge'));
const Replay = React.lazy(() => import('./routes/Replay'));
const Runs = React.lazy(() => import('./routes/Runs'));
const Settings = React.lazy(() => import('./routes/Settings'));
const Video = React.lazy(() => import('./routes/Video'));
const Watchers = React.lazy(() => import('./routes/Watchers'));
const Workspace = React.lazy(() => import('./routes/Workspace'));

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="h-screen w-screen bg-slate-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p>Loading Regen...</p>
      </div>
    </div>
  );
}

// Main App component with routing
function AppContent() {
  return (
    <BrowserRouter>
      <AppShell>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/agent-console" element={<AgentConsole />} />
            <Route path="/task-runner" element={<TaskRunner />} />
            <Route path="/ai-search" element={<AISearch />} />
            <Route path="/document-editor" element={<DocumentEditor />} />
            <Route path="/downloads" element={<Downloads />} />
            <Route path="/history" element={<History />} />
            <Route path="/offline-documents" element={<OfflineDocuments />} />
            <Route path="/playbook-forge" element={<PlaybookForge />} />
            <Route path="/replay" element={<Replay />} />
            <Route path="/runs" element={<Runs />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/video" element={<Video />} />
            <Route path="/watchers" element={<Watchers />} />
            <Route path="/workspace" element={<Workspace />} />
            {/* Catch all route - redirect to home */}
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </AppShell>
    </BrowserRouter>
  );
}

// Root App component with initialization
export default function App() {
  React.useEffect(() => {
    // Initialize the app when component mounts
    initializeApp().then((status) => {
      console.log('App initialization complete:', status);
    }).catch((error) => {
      console.error('App initialization failed:', error);
    });
  }, []);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="regen:theme">
      <AppContent />
    </ThemeProvider>
  );
}
