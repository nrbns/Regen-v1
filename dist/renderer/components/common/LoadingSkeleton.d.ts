/**
 * LoadingSkeleton - Reusable skeleton loader for AI operations
 * Provides visual feedback during async operations
 */
interface SkeletonProps {
    variant?: 'text' | 'card' | 'list' | 'table' | 'custom';
    lines?: number;
    className?: string;
    children?: React.ReactNode;
}
export declare function LoadingSkeleton({ variant, lines, className, children, }: SkeletonProps): import("react/jsx-runtime").JSX.Element | null;
/**
 * AIThinkingSkeleton - Specialized skeleton for AI operations
 */
export declare function AIThinkingSkeleton({ message }: {
    message?: string;
}): import("react/jsx-runtime").JSX.Element;
export {};
