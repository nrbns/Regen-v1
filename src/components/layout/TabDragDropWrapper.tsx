/**
 * LAG FIX #5: Tab drag-reorder with dnd-kit
 * Allows users to drag and reorder tabs for power-user workflows
 */

import { useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useEffect, useState } from 'react';
import { eventBus, EVENTS } from '../../core/state/eventBus';

// TypeScript: declare window property for devtools
declare global {
  interface Window {
    __ZUSTAND_DEVTOOLS__?: {
      tabsStore?: {
        getState: () => { tabs: any[] };
      };
    };
  }
}

/**
 * Wrapper component that adds drag-and-drop capability to tab strip
 * Uses dnd-kit for accessible, performant drag-drop
 */
export function TabDragDropWrapper({ children }: TabDragDropWrapperProps) {
  // Local tab state, updated via event bus
  const [tabs, setTabs] = useState<any[]>([]);
  // setAllTabs function to update tabs (should emit event for persistence)
  const setAllTabs = (newTabs: any[]) => {
    setTabs(newTabs);
    eventBus.emit('tab:reordered', newTabs);
  };

  useEffect(() => {
    // Initial fetch: try to get from Zustand (for now, fallback to empty)
    if (window?.__ZUSTAND_DEVTOOLS__?.tabsStore) {
      setTabs(window.__ZUSTAND_DEVTOOLS__.tabsStore.getState().tabs || []);
    }

    // Listen for all tab events that could change the tab list
    const offOpened = eventBus.on(EVENTS.TAB_OPENED, () => {
      if (window?.__ZUSTAND_DEVTOOLS__?.tabsStore) {
        setTabs(window.__ZUSTAND_DEVTOOLS__.tabsStore.getState().tabs || []);
      }
    });
    const offClosed = eventBus.on(EVENTS.TAB_CLOSED, () => {
      if (window?.__ZUSTAND_DEVTOOLS__?.tabsStore) {
        setTabs(window.__ZUSTAND_DEVTOOLS__.tabsStore.getState().tabs || []);
      }
    });
    const offUpdated = eventBus.on('tab:updated', () => {
      if (window?.__ZUSTAND_DEVTOOLS__?.tabsStore) {
        setTabs(window.__ZUSTAND_DEVTOOLS__.tabsStore.getState().tabs || []);
      }
    });
    const offActivated = eventBus.on(EVENTS.TAB_ACTIVATED, () => {
      if (window?.__ZUSTAND_DEVTOOLS__?.tabsStore) {
        setTabs(window.__ZUSTAND_DEVTOOLS__.tabsStore.getState().tabs || []);
      }
    });

    return () => {
      offOpened();
      offClosed();
      offUpdated();
      offActivated();
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      distance: 8, // 8px distance before drag starts
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const tabIds = useMemo(() => tabs.map(tab => tab.id), [tabs]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) {
        return;
      }
      const oldIndex = tabIds.indexOf(active.id as string);
      const newIndex = tabIds.indexOf(over.id as string);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove([...tabs], oldIndex, newIndex);
        setAllTabs(newOrder);
      }
    },
    [tabIds, tabs]
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tabIds} strategy={horizontalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}
