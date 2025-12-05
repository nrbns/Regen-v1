/**
 * PageExtractor Component
 * Extracts and displays page content for AI features
 */
interface PageExtractorProps {
    url: string;
    onExtract?: (content: ExtractedContent) => void;
    autoExtract?: boolean;
}
export interface ExtractedContent {
    url: string;
    title: string;
    content: string;
    excerpt: string;
    lang: string;
}
export declare function PageExtractor({ url, onExtract, autoExtract }: PageExtractorProps): import("react/jsx-runtime").JSX.Element;
export {};
