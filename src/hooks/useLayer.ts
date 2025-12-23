/**
 * React hook for accessing execution layer system
 */

import { useEffect, useState } from 'react';
import { layerManager, type ExecutionLayer } from '../core/layers/layerManager';

/**
 * Hook to get current execution layer
 */
export function useLayer(): ExecutionLayer {
  const [layer, setLayer] = useState<ExecutionLayer>(layerManager.getCurrentLayer());

  useEffect(() => {
    const updateLayer = () => {
      setLayer(layerManager.getCurrentLayer());
    };

    // Listen to layer changes for all layers
    const unsubscribes = (['L0', 'L1', 'L2', 'L3'] as ExecutionLayer[]).map(l =>
      layerManager.onLayerChange(l, updateLayer)
    );

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);

  return layer;
}

/**
 * Hook to check if a feature is allowed in current layer
 */
export function useFeatureAllowed(feature: string): boolean {
  const [allowed, setAllowed] = useState(layerManager.isFeatureAllowed(feature));
  const layer = useLayer();

  useEffect(() => {
    setAllowed(layerManager.isFeatureAllowed(feature));
  }, [layer, feature]);

  return allowed;
}
