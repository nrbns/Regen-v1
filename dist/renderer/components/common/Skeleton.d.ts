/**
 * Skeleton - Loading placeholder with pulse animation
 * Used for better perceived performance during data loading
 */
interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'rectangular' | 'circular';
    width?: string | number;
    height?: string | number;
    lines?: number;
    animated?: boolean;
}
export declare function Skeleton({ className, variant, width, height, lines, animated, }: SkeletonProps): import("react/jsx-runtime").JSX.Element;
/**
 * CardSkeleton - Pre-built skeleton for card layouts
 */
export declare function CardSkeleton({ className, count }: {
    className?: string;
    count?: number;
}): import("react/jsx-runtime").JSX.Element;
/**
 * ListSkeleton - Pre-built skeleton for list items
 */
export declare function ListSkeleton({ count, className }: {
    count?: number;
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
export {};
