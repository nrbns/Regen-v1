/**
 * Simple starter script for realtime server
 */

import('./index.js')
  .then(module => {
    module.startRealtimeServer().catch(error => {
      console.error('[Server] Fatal error:', error);
      process.exit(1);
    });
  })
  .catch(error => {
    console.error('[Server] Failed to import:', error);
    process.exit(1);
  });
