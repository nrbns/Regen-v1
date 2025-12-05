/**
 * Browser Automation Bridge
 * Connects browser automation API with iframe tabs
 */
interface BrowserAutomationBridgeProps {
    tabId?: string;
    iframeId?: string;
    sessionId?: string;
}
export declare function BrowserAutomationBridge({ tabId, iframeId, sessionId }: BrowserAutomationBridgeProps): null;
export {};
