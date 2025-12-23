/**
 * LAG FIX #5: Sortable individual tab with drag handle
 * Integrates with dnd-kit for drag-and-drop reordering
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Tab } from '../../state/tabsStore';

interface SortableTabItemProps {
  tab: Tab;
  children: React.ReactNode;
}

export function SortableTabItem({ tab, children }: SortableTabItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tab.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
      title="Drag to reorder tabs"
    >
      {children}
    </div>
  );
}
