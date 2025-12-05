/**
 * useStagehand Hook
 * React hook for Stagehand-style scripting in components
 */
import { useMemo, useCallback } from 'react';
import { createStagehand } from '../utils/stagehand-api';
export function useStagehand(options = {}) {
    const { context = 'browse', sessionId } = options;
    const stagehand = useMemo(() => {
        return createStagehand(context, sessionId);
    }, [context, sessionId]);
    /**
     * Execute action sequence
     */
    const execute = useCallback(async (actions) => {
        return await stagehand.sequence(actions);
    }, [stagehand]);
    /**
     * Quick actions
     */
    const click = useCallback(async (selector) => {
        await stagehand.click(selector);
    }, [stagehand]);
    const type = useCallback(async (selector, text) => {
        await stagehand.type(selector, text);
    }, [stagehand]);
    const wait = useCallback(async (selector, timeout) => {
        return await stagehand.wait(selector, timeout);
    }, [stagehand]);
    const extract = useCallback(async (selector, attribute) => {
        return await stagehand.extract(selector, attribute);
    }, [stagehand]);
    const navigate = useCallback(async (url) => {
        await stagehand.navigate(url);
    }, [stagehand]);
    return {
        stagehand,
        execute,
        click,
        type,
        wait,
        extract,
        navigate,
        getState: () => stagehand.getState(),
    };
}
