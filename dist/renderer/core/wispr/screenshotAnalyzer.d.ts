/**
 * WISPR Screenshot Analyzer
 * Captures screenshots and analyzes them with GPT-4 Vision
 */
/**
 * Capture screenshot of current page or selected element
 */
export declare function captureScreenshot(element?: HTMLElement): Promise<string | null>;
/**
 * Analyze screenshot with GPT-4 Vision
 */
export declare function analyzeScreenshot(screenshotDataUrl: string, query?: string): Promise<string | null>;
/**
 * Full screenshot capture and analysis workflow
 */
export declare function captureAndAnalyze(query?: string): Promise<string | null>;
