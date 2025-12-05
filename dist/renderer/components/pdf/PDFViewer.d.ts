/**
 * PDF Viewer Component - PR 007
 * Integrates pdfjs-dist for viewing PDFs in tabs
 */
interface PDFViewerProps {
    url: string;
    onLoad?: () => void;
    onError?: (error: Error) => void;
}
export declare function PDFViewer({ url, onLoad, onError }: PDFViewerProps): import("react/jsx-runtime").JSX.Element;
export {};
