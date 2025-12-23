# Execution Layer System

This directory contains the implementation of the 4-tier execution layer architecture.

## Files

- **layerManager.ts** - Main layer manager that coordinates layer activation/deactivation
- **agentService.ts** - L2 agent service lifecycle (spawn/kill Node.js process)
- **l1Intelligence.ts** - L1 browser intelligence features (on-demand loading)

## Usage

### Switching Modes

```typescript
import { layerManager } from '../core/layers/layerManager';

// Activate Research mode (triggers L2 activation)
await layerManager.switchToMode('Research');

// Exit Research mode (deactivates L2 if no other L2 modes active)
await layerManager.exitMode('Research');
```

### React Hooks

```typescript
import { useLayer, useFeatureAllowed } from '../../hooks/useLayer';

function MyComponent() {
  const layer = useLayer(); // Current layer: 'L0' | 'L1' | 'L2' | 'L3'
  const canUseSocket = useFeatureAllowed('socket-io');

  if (canUseSocket) {
    // Use Socket.IO
  }
}
```

### Feature Gating

```typescript
// Check if feature is allowed in current layer
if (layerManager.isFeatureAllowed('socket-io')) {
  // Feature is allowed
}

// Register a custom feature with layer requirements
layerManager.registerFeature('my-feature', ['L2', 'L3']);
```

## Layer Activation Flow

1. User switches to Research/Trade mode
2. `layerManager.switchToMode()` is called
3. Layer manager activates required layer (e.g., L2)
4. L2 activation:
   - Spawns agent service process
   - Connects Socket.IO
   - Initializes LangChain agents
5. Component mounts and uses L2 features

## Layer Deactivation Flow

1. User exits Research/Trade mode
2. `layerManager.exitMode()` is called
3. If no other modes require the layer:
   - L2 deactivation:
     - Kills agent service process
     - Disconnects Socket.IO
     - Cleans up resources
4. Returns to L0 (Browse mode)
