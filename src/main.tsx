import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './styles/globals.css';
import App from './App';
import Root from './routes/Root';
import Home from './routes/Home';
import Settings from './routes/Settings';
import Workspace from './routes/Workspace';
import AgentConsole from './routes/AgentConsole';
import Runs from './routes/Runs';
import Replay from './routes/Replay';
import PlaybookForge from './routes/PlaybookForge';
import HistoryPage from './routes/History';
import DownloadsPage from './routes/Downloads';
import VideoPage from './routes/Video';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'settings', element: <Settings /> },
      { path: 'w/:id', element: <Workspace /> },
      { path: 'agent', element: <AgentConsole /> },
      { path: 'runs', element: <Runs /> },
      { path: 'replay/:id', element: <Replay /> },
      { path: 'playbooks', element: <PlaybookForge /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'downloads', element: <DownloadsPage /> },
      { path: 'video', element: <VideoPage /> },
    ]
  }
]);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);


