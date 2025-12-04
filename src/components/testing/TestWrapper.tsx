/**
 * Test Wrapper Component
 * Provides all necessary providers for component testing
 */

import { ReactNode } from 'react';
import { ThemeProvider } from '../../ui/theme';
import { ErrorBoundary } from '../../core/errors/ErrorBoundary';

interface TestWrapperProps {
  children: ReactNode;
  theme?: 'light' | 'dark';
}

export function TestWrapper({ children, theme = 'dark' }: TestWrapperProps) {
  // ThemeProvider doesn't accept defaultTheme prop - theme is managed by themeStore
  return (
    <ErrorBoundary>
      <ThemeProvider>{children}</ThemeProvider>
    </ErrorBoundary>
  );
}
