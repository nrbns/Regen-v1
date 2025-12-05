/**
 * Stagehand Integration for Agent Console
 * Adds developer-friendly scripting API
 */
import { useEffect } from 'react';
import { useStagehand } from '../../hooks/useStagehand';
export function AgentStagehandIntegration() {
    const { stagehand, execute, click, type, extract, navigate } = useStagehand({
        context: 'agent',
    });
    useEffect(() => {
        // Expose Stagehand API to window for console access
        if (typeof window !== 'undefined') {
            window.agentStagehand = {
                stagehand,
                execute,
                click,
                type,
                extract,
                navigate,
                // Agent-specific helpers
                runTask: async (task) => {
                    await type('textarea[name="task"]', task);
                    await click('button[type="submit"]');
                },
                getLogs: async () => {
                    const logs = await extract('.agent-logs');
                    return logs;
                },
                cancel: async () => {
                    await click('button[data-action="cancel"]');
                },
            };
        }
        return () => {
            if (typeof window !== 'undefined') {
                delete window.agentStagehand;
            }
        };
    }, [stagehand, execute, click, type, extract, navigate]);
    return null; // This is a side-effect component
}
