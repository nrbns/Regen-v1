/**
 * useStagehand Hook
 * React hook for Stagehand-style scripting in components
 */
import { Action } from '../utils/stagehand-api';
interface UseStagehandOptions {
    context?: 'research' | 'trade' | 'agent' | 'browse';
    sessionId?: string;
}
export declare function useStagehand(options?: UseStagehandOptions): {
    stagehand: import("../utils/stagehand-api").StagehandAPI;
    execute: (actions: Action[]) => Promise<any[]>;
    click: (selector: any) => Promise<void>;
    type: (selector: any, text: string) => Promise<void>;
    wait: (selector: any, timeout?: number) => Promise<Element>;
    extract: (selector: any, attribute?: string) => Promise<string>;
    navigate: (url: string) => Promise<void>;
    getState: () => {
        url: string;
        title: string;
        context: string;
        sessionId: string;
    };
};
export {};
