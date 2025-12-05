import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * PDF Viewer Component - PR 007
 * Integrates pdfjs-dist for viewing PDFs in tabs
 */
import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker&url';
// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
export function PDFViewer({ url, onLoad, onError }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pageNum, setPageNum] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [scale, setScale] = useState(1.5);
    useEffect(() => {
        let pdfDoc = null;
        const loadPDF = async () => {
            try {
                setLoading(true);
                setError(null);
                // Load PDF document
                const loadingTask = pdfjsLib.getDocument(url);
                pdfDoc = await loadingTask.promise;
                setNumPages(pdfDoc.numPages);
                setPageNum(1);
                onLoad?.();
            }
            catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load PDF';
                setError(errorMessage);
                onError?.(err instanceof Error ? err : new Error(errorMessage));
            }
            finally {
                setLoading(false);
            }
        };
        loadPDF();
        return () => {
            // Cleanup
            if (pdfDoc) {
                pdfDoc.destroy();
            }
        };
    }, [url, onLoad, onError]);
    useEffect(() => {
        if (!canvasRef.current || !numPages || pageNum < 1 || pageNum > numPages) {
            return;
        }
        const renderPage = async () => {
            try {
                const loadingTask = pdfjsLib.getDocument(url);
                const pdfDoc = await loadingTask.promise;
                const page = await pdfDoc.getPage(pageNum);
                const canvas = canvasRef.current;
                if (!canvas)
                    return;
                const context = canvas.getContext('2d');
                if (!context)
                    return;
                const viewport = page.getViewport({ scale });
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                };
                await page.render(renderContext).promise;
            }
            catch (err) {
                console.error('[PDFViewer] Error rendering page:', err);
            }
        };
        renderPage();
    }, [url, pageNum, numPages, scale]);
    if (loading) {
        return (_jsx("div", { className: "flex h-full w-full items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-400" }), _jsx("p", { className: "text-gray-400", children: "Loading PDF..." })] }) }));
    }
    if (error) {
        return (_jsx("div", { className: "flex h-full w-full items-center justify-center", children: _jsxs("div", { className: "text-center text-red-400", children: [_jsx("p", { className: "mb-2", children: "Failed to load PDF" }), _jsx("p", { className: "text-sm text-gray-500", children: error })] }) }));
    }
    return (_jsxs("div", { ref: containerRef, className: "h-full w-full overflow-auto bg-gray-900", children: [_jsxs("div", { className: "sticky top-0 z-10 flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-2", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("button", { onClick: () => setPageNum(Math.max(1, pageNum - 1)), disabled: pageNum <= 1, className: "rounded bg-gray-700 px-3 py-1 hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50", children: "Previous" }), _jsxs("span", { className: "text-sm text-gray-300", children: ["Page ", pageNum, " of ", numPages] }), _jsx("button", { onClick: () => setPageNum(Math.min(numPages, pageNum + 1)), disabled: pageNum >= numPages, className: "rounded bg-gray-700 px-3 py-1 hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50", children: "Next" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => setScale(Math.max(0.5, scale - 0.25)), className: "rounded bg-gray-700 px-3 py-1 hover:bg-gray-600", children: "-" }), _jsxs("span", { className: "text-sm text-gray-300", children: [Math.round(scale * 100), "%"] }), _jsx("button", { onClick: () => setScale(Math.min(3, scale + 0.25)), className: "rounded bg-gray-700 px-3 py-1 hover:bg-gray-600", children: "+" })] })] }), _jsx("div", { className: "flex justify-center p-4", children: _jsx("canvas", { ref: canvasRef, className: "shadow-lg" }) })] }));
}
