/**
 * Responsive Sidebar Component
 * Mobile-friendly sidebar with collapsible behavior, touch gestures, and backdrop
 */

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useMobileDetection } from '../../mobile';
import { cn } from '../../lib/utils';

export interface ResponsiveSidebarProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  position?: 'left' | 'right';
  width?: string;
  className?: string;
}

export function ResponsiveSidebar({
  open,
  onClose,
  children,
  position = 'left',
  width = '320px',
  className,
}: ResponsiveSidebarProps) {
  const { isMobile, isTablet } = useMobileDetection();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [_isDragging, _setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const _startXRef = useRef(0);

  // Close on escape key
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  // Close on backdrop click (mobile)
  useEffect(() => {
    if (!open || !isMobile) return;

    const handleBackdropClick = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleBackdropClick);
    return () => document.removeEventListener('mousedown', handleBackdropClick);
  }, [open, isMobile, onClose]);

  // Touch swipe to close (mobile)
  useEffect(() => {
    if (!open || !isMobile || !sidebarRef.current) return;

    const sidebar = sidebarRef.current;
    let startX = 0;
    let startY = 0;
    let isSwipe = false;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isSwipe = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwipe) {
        const deltaX = Math.abs(e.touches[0].clientX - startX);
        const deltaY = Math.abs(e.touches[0].clientY - startY);
        isSwipe = deltaX > deltaY && deltaX > 10; // Horizontal swipe
      }

      if (isSwipe && position === 'left' && e.touches[0].clientX < startX) {
        // Swiping left to close
        const offset = startX - e.touches[0].clientX;
        setDragOffset(Math.min(offset, 320));
      } else if (isSwipe && position === 'right' && e.touches[0].clientX > startX) {
        // Swiping right to close
        const offset = e.touches[0].clientX - startX;
        setDragOffset(Math.min(offset, 320));
      }
    };

    const handleTouchEnd = () => {
      if (isSwipe && dragOffset > 100) {
        // Close if swiped more than 100px
        onClose();
      }
      setDragOffset(0);
      isSwipe = false;
    };

    sidebar.addEventListener('touchstart', handleTouchStart);
    sidebar.addEventListener('touchmove', handleTouchMove);
    sidebar.addEventListener('touchend', handleTouchEnd);

    return () => {
      sidebar.removeEventListener('touchstart', handleTouchStart);
      sidebar.removeEventListener('touchmove', handleTouchMove);
      sidebar.removeEventListener('touchend', handleTouchEnd);
    };
  }, [open, isMobile, position, dragOffset, onClose]);

  // Prevent body scroll when sidebar is open (mobile)
  useEffect(() => {
    if (!open || !isMobile) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [open, isMobile]);

  // Calculate responsive width
  const responsiveWidth = isMobile ? '80vw' : isTablet ? '60vw' : width;
  const maxWidth = isMobile ? '320px' : isTablet ? '400px' : 'none';

  // Sidebar transform based on position and drag
  const transform =
    position === 'left'
      ? `translateX(${open ? 0 : '-100%'} ${dragOffset > 0 ? `- ${dragOffset}px` : ''})`
      : `translateX(${open ? 0 : '100%'} ${dragOffset > 0 ? `+ ${dragOffset}px` : ''})`;

  if (!open && !isMobile) {
    return null; // Don't render on desktop when closed
  }

  return (
    <>
      {/* Backdrop (mobile only) */}
      {open && isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity"
          style={{
            opacity: open ? 1 : 0,
            pointerEvents: open ? 'auto' : 'none',
          }}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={cn(
          'fixed top-0 z-50 h-full border-r border-slate-800 bg-slate-900 transition-transform duration-300 ease-in-out',
          position === 'left' ? 'left-0' : 'right-0',
          className
        )}
        style={{
          width: responsiveWidth,
          maxWidth,
          transform,
        }}
      >
        {/* Close button (mobile) */}
        {isMobile && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        )}

        {/* Sidebar content */}
        <div className="h-full overflow-y-auto">{children}</div>
      </div>
    </>
  );
}
