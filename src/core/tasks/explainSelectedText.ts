/**
 * Explain Selected Text - ONE REAL ACTION
 * 
 * Rules:
 * - User selects text
 * - User clicks action
 * - Task is created
 * - Output streams
 * - User can cancel
 * - Task ends visibly
 */

import { createTask, executeTask, cancelTask } from '../execution/taskManager';
import { runAI } from '../ai/aiScheduler';

/**
 * Execute "explain selected text" action
 * This is the ONE real action that works end-to-end
 */
export async function explainSelectedText(selectedText: string): Promise<string> {
  // 1. Create task (mandatory)
  const task = createTask('explain-text', {
    selectedText: selectedText.substring(0, 100), // Limit for metadata
  });

  let result = '';

  try {
    // 2. Execute through task manager (enforced)
    await executeTask(task.id, async (taskParam, signal) => {
      // Check cancellation before starting
      if (signal.aborted) {
        throw new Error('Cancelled');
      }

      // 3. Run through AI scheduler (with cancel support)
      await runAI(async (aiSignal) => {
        // Combine signals - if either is aborted, stop
        if (signal.aborted || aiSignal.aborted) {
          throw new Error('Cancelled');
        }

        // Real explanation using CommandController
        // This uses the existing command infrastructure
        const { commandController } = await import("../../lib/command/CommandController");
        const { logTask, streamOutput } = await import('../execution/taskManager');
        
        const command = `Explain this text: "${selectedText.substring(0, 200)}${selectedText.length > 200 ? '...' : ''}"`;
        
        // Check cancellation before executing
        if (signal.aborted || aiSignal.aborted) {
          throw new Error('Cancelled');
        }
        
        // Log task progress
        logTask(taskParam.id, 'Requesting explanation...');
        
        // Execute through CommandController (already has AI integration)
        const commandResult = await commandController.handleCommand(command, {
          currentUrl: window.location.href,
          activeTab: undefined,
          selectedText: selectedText,
        });

        // Check cancellation after execution
        if (signal.aborted || aiSignal.aborted) {
          throw new Error('Cancelled');
        }

        if (commandResult.success && commandResult.message) {
          result = commandResult.message;
          logTask(taskParam.id, 'Explanation received');
          streamOutput(taskParam.id, result);
        } else {
          result = `Text: "${selectedText.substring(0, 100)}${selectedText.length > 100 ? '...' : ''}"\n\n[Explanation not available]`;
          logTask(taskParam.id, 'Explanation failed');
          streamOutput(taskParam.id, result);
        }

        // Check cancellation before completing
        if (signal.aborted || aiSignal.aborted) {
          throw new Error('Cancelled');
        }
      });
    });

    return result;
  } catch (error) {
    if (error instanceof Error && error.message === 'Cancelled') {
      cancelTask(task.id);
      throw error;
    }
    throw error;
  }
}
