/**
 * Pros/Cons Comparison Table Component
 * Displays structured pros and cons in a side-by-side comparison table
 */
interface ProsConsItem {
    text: string;
    source: string;
    sourceUrl: string;
    sourceIndex: number;
    confidence: number;
}
interface ProsConsTableProps {
    pros: ProsConsItem[];
    cons: ProsConsItem[];
    sources?: Array<{
        url: string;
        title: string;
    }>;
}
export declare function ProsConsTable({ pros, cons }: ProsConsTableProps): import("react/jsx-runtime").JSX.Element | null;
export {};
