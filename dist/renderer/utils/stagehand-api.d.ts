/**
 * Stagehand-style Scripting API
 * Developer-friendly automation API for all modes
 * Inspired by Stagehand: https://github.com/cloudflare/stagehand
 */
/**
 * Element selector types
 */
export type Selector = string | {
    text?: string;
    role?: string;
    label?: string;
    testId?: string;
};
/**
 * Action types
 */
export type Action = {
    type: 'click';
    selector: Selector;
} | {
    type: 'type';
    selector: Selector;
    text: string;
} | {
    type: 'wait';
    selector: Selector;
    timeout?: number;
} | {
    type: 'scroll';
    selector: Selector;
    direction?: 'up' | 'down' | 'left' | 'right';
} | {
    type: 'screenshot';
    selector?: Selector;
} | {
    type: 'extract';
    selector: Selector;
    attribute?: string;
} | {
    type: 'navigate';
    url: string;
} | {
    type: 'evaluate';
    script: string;
} | {
    type: 'fill';
    selector: Selector;
    value: string;
} | {
    type: 'select';
    selector: Selector;
    value: string;
};
/**
 * Stagehand-style automation API
 */
export declare class StagehandAPI {
    private context;
    private sessionId;
    constructor(context?: 'research' | 'trade' | 'agent' | 'browse', sessionId?: string);
    /**
     * Find element by selector
     */
    private findElement;
    /**
     * Wait for element to appear
     */
    wait(selector: Selector, timeout?: number): Promise<Element>;
    /**
     * Click element
     */
    click(selector: Selector): Promise<void>;
    /**
     * Type text into element
     */
    type(selector: Selector, text: string): Promise<void>;
    /**
     * Fill form field
     */
    fill(selector: Selector, value: string): Promise<void>;
    /**
     * Select option in dropdown
     */
    select(selector: Selector, value: string): Promise<void>;
    /**
     * Scroll to element
     */
    scroll(selector: Selector, _direction?: 'up' | 'down' | 'left' | 'right'): Promise<void>;
    /**
     * Extract text or attribute from element
     */
    extract(selector: Selector, attribute?: string): Promise<string>;
    /**
     * Take screenshot (returns data URL)
     */
    screenshot(selector?: Selector): Promise<string>;
    /**
     * Navigate to URL
     */
    navigate(url: string): Promise<void>;
    /**
     * Evaluate JavaScript in page context
     * SECURITY: This is inherently unsafe but required for browser automation.
     * Only use with trusted scripts from the automation system.
     */
    evaluate(script: string): Promise<any>;
    /**
     * Execute sequence of actions
     */
    sequence(actions: Action[]): Promise<any[]>;
    /**
     * Get current page state
     */
    getState(): {
        url: string;
        title: string;
        context: string;
        sessionId: string;
    };
}
/**
 * Create Stagehand API instance
 */
export declare function createStagehand(context?: 'research' | 'trade' | 'agent' | 'browse', sessionId?: string): StagehandAPI;
/**
 * Global Stagehand instance (for console access)
 */
declare global {
    interface Window {
        stagehand: StagehandAPI;
    }
}
