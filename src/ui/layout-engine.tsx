/**
 * Layout Engine - Unified layout structure
 * Provides consistent sidebar, navigation, and main content areas
 */

import React, { createContext, useContext } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface LayoutContextValue {
  sidebarWidth: number;
  navHeight: number;
  rightPanelWidth: number;
}

const LayoutContext = createContext<LayoutContextValue>({
  sidebarWidth: 240,
  navHeight: 64,
  rightPanelWidth: 0,
});

export const useLayout = () => useContext(LayoutContext);

interface LayoutEngineProps {
  children: React.ReactNode;
  sidebarWidth?: number;
  navHeight?: number;
  rightPanelWidth?: number;
}

/**
 * Main Layout Engine - Provides consistent structure
 */
export function LayoutEngine({
  children,
  sidebarWidth = 240,
  navHeight = 64,
  rightPanelWidth = 0,
  ...props
}: LayoutEngineProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <LayoutContext.Provider value={{ sidebarWidth, navHeight, rightPanelWidth }}>
      <div
        className="flex h-full w-full flex-col overflow-hidden"
        data-testid="layout-engine-root"
        {...props}
      >
        {children}
      </div>
    </LayoutContext.Provider>
  );
}

interface LayoutHeaderProps extends React.HTMLAttributes<HTMLElement> {
  sticky?: boolean;
}

/**
 * Layout Header - Top navigation area
 */
export function LayoutHeader({ sticky = true, className, children, ...props }: LayoutHeaderProps) {
  const { navHeight } = useLayout();
  return (
    <header
      className={cn(
        'flex-shrink-0 border-b border-slate-700/50 bg-slate-900/95 backdrop-blur-xl',
        sticky && 'sticky top-0 z-40',
        className
      )}
      style={{ height: navHeight }}
      {...props}
    >
      {children}
    </header>
  );
}

interface LayoutBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  sidebar?: React.ReactNode;
  rightPanel?: React.ReactNode;
  sidebarCollapsed?: boolean;
  rightPanelCollapsed?: boolean;
}

/**
 * Layout Body - Main content area with optional sidebars
 */
export function LayoutBody({
  sidebar,
  rightPanel,
  sidebarCollapsed = false,
  rightPanelCollapsed = false,
  className,
  children,
  ...props
}: LayoutBodyProps) {
  const { sidebarWidth, rightPanelWidth } = useLayout();

  return (
    <div className={cn('flex flex-1 min-h-0 overflow-hidden', className)} {...props}>
      {/* Left Sidebar */}
      {sidebar && (
        <motion.aside
          initial={false}
          animate={{
            width: sidebarCollapsed ? 0 : sidebarWidth,
            opacity: sidebarCollapsed ? 0 : 1,
          }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="flex-shrink-0 border-r border-slate-700/50 bg-slate-900/60 overflow-hidden"
          style={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
        >
          <div className="h-full overflow-y-auto">{sidebar}</div>
        </motion.aside>
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-hidden bg-slate-950">{children}</main>

      {/* Right Panel */}
      {rightPanel && (
        <motion.aside
          initial={false}
          animate={{
            width: rightPanelCollapsed ? 0 : rightPanelWidth || 320,
            opacity: rightPanelCollapsed ? 0 : 1,
          }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="flex-shrink-0 border-l border-slate-700/50 bg-slate-900/60 overflow-hidden"
          style={{ width: rightPanelCollapsed ? 0 : rightPanelWidth || 320 }}
        >
          <div className="h-full overflow-y-auto">{rightPanel}</div>
        </motion.aside>
      )}
    </div>
  );
}

interface LayoutFooterProps extends React.HTMLAttributes<HTMLElement> {
  sticky?: boolean;
}

/**
 * Layout Footer - Bottom area
 */
export function LayoutFooter({ sticky = false, className, children, ...props }: LayoutFooterProps) {
  return (
    <footer
      className={cn(
        'flex-shrink-0 border-t border-slate-700/50 bg-slate-900/95 backdrop-blur-xl',
        sticky && 'sticky bottom-0 z-40',
        className
      )}
      {...props}
    >
      {children}
    </footer>
  );
}

/**
 * Layout Section - Content section with consistent spacing
 */
interface LayoutSectionProps extends React.HTMLAttributes<HTMLElement> {
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  padded?: boolean;
}

const sectionSpacing = {
  none: '',
  sm: 'py-3',
  md: 'py-6',
  lg: 'py-8',
  xl: 'py-12',
};

export function LayoutSection({
  spacing = 'md',
  padded = true,
  className,
  children,
  ...props
}: LayoutSectionProps) {
  return (
    <section
      className={cn(
        'w-full',
        sectionSpacing[spacing],
        padded && 'px-[var(--layout-page-padding)]',
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}

/**
 * Layout Grid - Responsive grid system
 */
interface LayoutGridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 6 | 12;
  gap?: 'sm' | 'md' | 'lg';
}

const gridCols = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
  12: 'grid-cols-12',
};

const gridGap = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};

export function LayoutGrid({
  cols = 3,
  gap = 'md',
  className,
  children,
  ...props
}: LayoutGridProps) {
  return (
    <div className={cn('grid', gridCols[cols], gridGap[gap], className)} {...props}>
      {children}
    </div>
  );
}
