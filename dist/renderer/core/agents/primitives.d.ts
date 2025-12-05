/**
 * Agent Primitives - Low-level DOM manipulation and page interaction
 * Provides safe, permission-gated primitives for agent automation
 */
export interface DOMSelector {
    type: 'id' | 'class' | 'tag' | 'selector' | 'text' | 'xpath';
    value: string;
}
export interface ClickOptions {
    timeout?: number;
    waitForNavigation?: boolean;
    offset?: {
        x: number;
        y: number;
    };
}
export interface FillOptions {
    clear?: boolean;
    selectAll?: boolean;
    timeout?: number;
}
export interface ScreenshotOptions {
    format?: 'png' | 'jpeg';
    quality?: number;
    fullPage?: boolean;
    clip?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
export interface ScrollOptions {
    behavior?: 'smooth' | 'instant' | 'auto';
    block?: 'start' | 'center' | 'end' | 'nearest';
}
export interface ElementInfo {
    tagName: string;
    id?: string;
    className?: string;
    text?: string;
    value?: string;
    attributes: Record<string, string>;
    boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    visible: boolean;
    clickable: boolean;
}
export interface PageInfo {
    url: string;
    title: string;
    viewport: {
        width: number;
        height: number;
    };
    readyState: DocumentReadyState;
}
/**
 * Read element information
 */
export declare function readElement(selector: DOMSelector, document?: Document): Promise<ElementInfo | null>;
/**
 * Click on an element
 */
export declare function clickElement(selector: DOMSelector, options?: ClickOptions, document?: Document): Promise<boolean>;
/**
 * Fill an input field
 */
export declare function fillInput(selector: DOMSelector, value: string, options?: FillOptions, document?: Document): Promise<boolean>;
/**
 * Read text from an element
 */
export declare function readText(selector: DOMSelector, document?: Document): Promise<string | null>;
/**
 * Read all text from the page
 */
export declare function readPageText(document?: Document): string;
/**
 * Take a screenshot (requires Electron context or Canvas API)
 */
export declare function takeScreenshot(_options?: ScreenshotOptions, _document?: Document): Promise<string | null>;
/**
 * Scroll the page
 */
export declare function scrollPage(direction: 'up' | 'down' | 'left' | 'right' | 'top' | 'bottom', amount?: number, options?: ScrollOptions): Promise<void>;
/**
 * Wait for page to be ready
 */
export declare function waitForPageReady(document?: Document, timeout?: number): Promise<boolean>;
/**
 * Get page information
 */
export declare function getPageInfo(document?: Document): PageInfo;
/**
 * Wait for URL to change (navigation detection)
 */
export declare function waitForNavigation(currentUrl: string, timeout?: number): Promise<boolean>;
/**
 * Extract structured data from page (uses pageExtractor)
 */
export declare function extractStructuredData(document?: Document): Promise<any>;
/**
 * Save to memory (uses SuperMemory tracker)
 */
export declare function saveToMemory(url: string, title: string, content?: string, metadata?: Record<string, any>): Promise<string | null>;
