/**
 * Agent Worker Script
 * Isolated execution environment for agent tasks
 * No access to Electron APIs, Node.js fs, etc.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { parentPort, workerData } = require('worker_threads');

// Isolated execution environment
// No access to Electron APIs, Node.js fs, etc.

async function executeTask() {
  const { taskId, agentId, input } = workerData;

  try {
    // Simulate agent execution
    // In production, this would load the actual agent code

    // For now, we'll do a simple echo/process
    // TODO: Load actual agent execution logic here

    const result = {
      taskId,
      agentId,
      output: `Processed: ${JSON.stringify(input)}`,
      timestamp: Date.now(),
    };

    parentPort.postMessage({
      type: 'result',
      data: result,
    });
  } catch (error) {
    parentPort.postMessage({
      type: 'error',
      error: error.message || String(error),
    });
  }
}

// Execute with timeout
const timeout = setTimeout(() => {
  parentPort.postMessage({
    type: 'error',
    error: 'Task execution timeout',
  });
  process.exit(1);
}, 7000); // 7 seconds (slightly less than 8s timeout)

executeTask()
  .then(() => {
    clearTimeout(timeout);
    process.exit(0);
  })
  .catch(error => {
    clearTimeout(timeout);
    parentPort.postMessage({
      type: 'error',
      error: error.message || String(error),
    });
    process.exit(1);
  });
