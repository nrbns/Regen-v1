/**
 * Stagehand-style Scripting API
 * Developer-friendly automation API for all modes
 * Inspired by Stagehand: https://github.com/cloudflare/stagehand
 */
/**
 * Stagehand-style automation API
 */
export class StagehandAPI {
    context = 'browse';
    sessionId;
    constructor(context = 'browse', sessionId) {
        this.context = context;
        this.sessionId = sessionId || `stagehand-${Date.now()}`;
    }
    /**
     * Find element by selector
     */
    async findElement(selector) {
        if (typeof selector === 'string') {
            // CSS selector
            return document.querySelector(selector);
        }
        // Smart selector
        if (selector.text) {
            // Find by text content
            const elements = Array.from(document.querySelectorAll('*'));
            return elements.find(el => el.textContent?.includes(selector.text)) || null;
        }
        if (selector.role) {
            return document.querySelector(`[role="${selector.role}"]`) || null;
        }
        if (selector.label) {
            const label = document.querySelector(`label[for="${selector.label}"]`);
            if (label) {
                const id = label.getAttribute('for');
                return id ? document.getElementById(id) : null;
            }
        }
        if (selector.testId) {
            return document.querySelector(`[data-testid="${selector.testId}"]`) || null;
        }
        return null;
    }
    /**
     * Wait for element to appear
     */
    async wait(selector, timeout = 5000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const element = await this.findElement(selector);
            if (element) {
                return element;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        throw new Error(`Element not found: ${JSON.stringify(selector)}`);
    }
    /**
     * Click element
     */
    async click(selector) {
        const element = await this.wait(selector);
        if (element instanceof HTMLElement) {
            element.click();
        }
        else {
            throw new Error('Element is not clickable');
        }
    }
    /**
     * Type text into element
     */
    async type(selector, text) {
        const element = await this.wait(selector);
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            element.focus();
            element.value = text;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }
        else {
            throw new Error('Element is not an input or textarea');
        }
    }
    /**
     * Fill form field
     */
    async fill(selector, value) {
        await this.type(selector, value);
    }
    /**
     * Select option in dropdown
     */
    async select(selector, value) {
        const element = await this.wait(selector);
        if (element instanceof HTMLSelectElement) {
            element.value = value;
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }
        else {
            throw new Error('Element is not a select');
        }
    }
    /**
     * Scroll to element
     */
    async scroll(selector, _direction = 'down') {
        const element = await this.wait(selector);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    /**
     * Extract text or attribute from element
     */
    async extract(selector, attribute) {
        const element = await this.wait(selector);
        if (attribute) {
            return element.getAttribute(attribute) || '';
        }
        return element.textContent || '';
    }
    /**
     * Take screenshot (returns data URL)
     */
    async screenshot(selector) {
        // Use html2canvas or similar for screenshot
        const _target = selector ? await this.wait(selector) : document.body;
        // Simplified - in production, use html2canvas
        return new Promise((resolve) => {
            // Placeholder - implement with html2canvas
            resolve('data:image/png;base64,placeholder');
        });
    }
    /**
     * Navigate to URL
     */
    async navigate(url) {
        window.location.href = url;
        await this.wait({ text: 'loading' }, 1000).catch(() => { });
    }
    /**
     * Evaluate JavaScript in page context
     */
    async evaluate(script) {
        return new Function(script)();
    }
    /**
     * Execute sequence of actions
     */
    async sequence(actions) {
        const results = [];
        for (const action of actions) {
            let result;
            switch (action.type) {
                case 'click':
                    await this.click(action.selector);
                    break;
                case 'type':
                    await this.type(action.selector, action.text);
                    break;
                case 'wait':
                    await this.wait(action.selector, action.timeout);
                    break;
                case 'scroll':
                    await this.scroll(action.selector, action.direction);
                    break;
                case 'screenshot':
                    result = await this.screenshot(action.selector);
                    break;
                case 'extract':
                    result = await this.extract(action.selector, action.attribute);
                    break;
                case 'navigate':
                    await this.navigate(action.url);
                    break;
                case 'evaluate':
                    result = await this.evaluate(action.script);
                    break;
                case 'fill':
                    await this.fill(action.selector, action.value);
                    break;
                case 'select':
                    await this.select(action.selector, action.value);
                    break;
            }
            results.push(result);
        }
        return results;
    }
    /**
     * Get current page state
     */
    getState() {
        return {
            url: window.location.href,
            title: document.title,
            context: this.context,
            sessionId: this.sessionId,
        };
    }
}
/**
 * Create Stagehand API instance
 */
export function createStagehand(context = 'browse', sessionId) {
    return new StagehandAPI(context, sessionId);
}
// Auto-create global instance
if (typeof window !== 'undefined') {
    window.stagehand = createStagehand('browse');
}
