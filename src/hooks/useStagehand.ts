/**
 * useStagehand Hook
 * React hook for Stagehand-style scripting in components
 */

import { useMemo, useCallback } from 'react';
import { createStagehand, Action } from '../utils/stagehand-api';

interface UseStagehandOptions {
  context?: 'research' | 'trade' | 'agent' | 'browse';
  sessionId?: string;
}

export function useStagehand(options: UseStagehandOptions = {}) {
  const { context = 'browse', sessionId } = options;

  const stagehand = useMemo(() => {
    return createStagehand(context, sessionId);
  }, [context, sessionId]);

  /**
   * Execute action sequence
   */
  const execute = useCallback(
    async (actions: Action[]) => {
      return await stagehand.sequence(actions);
    },
    [stagehand]
  );

  /**
   * Quick actions
   */
  const click = useCallback(
    async (selector: any) => {
      await stagehand.click(selector);
    },
    [stagehand]
  );

  const type = useCallback(
    async (selector: any, text: string) => {
      await stagehand.type(selector, text);
    },
    [stagehand]
  );

  const wait = useCallback(
    async (selector: any, timeout?: number) => {
      return await stagehand.wait(selector, timeout);
    },
    [stagehand]
  );

  const extract = useCallback(
    async (selector: any, attribute?: string) => {
      return await stagehand.extract(selector, attribute);
    },
    [stagehand]
  );

  const navigate = useCallback(
    async (url: string) => {
      await stagehand.navigate(url);
    },
    [stagehand]
  );

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
