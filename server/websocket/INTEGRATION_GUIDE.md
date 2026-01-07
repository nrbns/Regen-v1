/\*\*

- Orchestrator WebSocket Server Setup
- Instructions for integrating WebSocket into your server
  \*/

// INTEGRATION GUIDE
// =================
//
// The orchestrator WebSocket server has been created in:
// - server/websocket/orchestrator.ts
//
// To integrate it into your existing server:
//
// 1. Import the WebSocket server in your main server file:
//
// import { initOrchestratorWebSocket } from './websocket/orchestrator';
//
// 2. Initialize AFTER creating your HTTP server:
//
// const server = http.createServer(app);
// const orchestratorWS = initOrchestratorWebSocket(server);
//
// 3. The WebSocket server will be available at: ws://localhost:PORT/ws/orchestrator
//
// 4. Example integration in realtime-server.js:
//
// const express = require('express');
// const http = require('http');
// const { initOrchestratorWebSocket } = require('./websocket/orchestrator');
//
// const app = express();
// const server = http.createServer(app);
//  
// // Initialize orchestrator WebSocket
// const orchestratorWS = initOrchestratorWebSocket(server);
//  
// server.listen(PORT, () => {
// console.log(`Server running on port ${PORT}`);
// console.log('Orchestrator WebSocket ready');
// });
//
// 5. The WebSocket server is already integrated with the orchestrator API routes
// and will automatically send updates when:
// - Plans are created
// - Tasks start/complete/fail
// - Plans complete/fail
//
// 6. Clients connect using the useOrchestratorWebSocket hook:
//
// const ws = useOrchestratorWebSocket();
// ws.subscribeToPlan(planId);
//
// That's it! The WebSocket system is fully implemented and ready to use.

export {};
