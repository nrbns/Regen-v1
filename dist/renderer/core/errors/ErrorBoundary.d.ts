/**
 * Enhanced Error Boundary - Tier 2
 * Global error boundary with retry logic, toast reporting, and structured logging
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
export interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    componentName?: string;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    retryable?: boolean;
    level?: 'component' | 'page' | 'global';
}
interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    retryCount: number;
    copyStatus: 'idle' | 'success' | 'error';
}
export declare class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    private retryTimeoutId;
    constructor(props: ErrorBoundaryProps);
    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState>;
    componentDidCatch(error: Error, errorInfo: ErrorInfo): void;
    private handleRetry;
    private handleReload;
    private handleCopyError;
    componentWillUnmount(): void;
    render(): string | number | boolean | import("react/jsx-runtime").JSX.Element | Iterable<React.ReactNode> | null | undefined;
}
/**
 * Global Error Boundary - Wrap app root
 */
export declare function GlobalErrorBoundary({ children }: {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export {};
