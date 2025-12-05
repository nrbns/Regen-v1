/**
 * Test Wrapper Component
 * Provides all necessary providers for component testing
 */
import { ReactNode } from 'react';
interface TestWrapperProps {
    children: ReactNode;
    theme?: 'light' | 'dark';
}
export declare function TestWrapper({ children, theme: _theme }: TestWrapperProps): import("react/jsx-runtime").JSX.Element;
export {};
