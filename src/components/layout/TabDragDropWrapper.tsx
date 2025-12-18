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
import { useTabsStore } from '../../state/tabsStore';

interface TabDragDropWrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that adds drag-and-drop capability to tab strip
 * Uses dnd-kit for accessible, performant drag-drop
 */
export function TabDragDropWrapper({ children }: TabDragDropWrapperProps) {
  const { tabs, setAll } = useTabsStore();

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
        setAll(newOrder);
      }
    },
    [tabIds, tabs, setAll]
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tabIds} strategy={horizontalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}
