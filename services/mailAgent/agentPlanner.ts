/**
 * Agent Planner
 * Converts natural language intent into a DAG of tasks
 */

import type { AgentTask, AgentPlan } from './types';

export type TaskType = 'read_emails' | 'summarize' | 'draft_reply' | 'send_draft';

/**
 * Intent classifier
 * Maps user intent to task types and required resources
 */
export class IntentClassifier {
  /**
   * Classify user intent
   */
  classify(intent: string): {
    taskTypes: TaskType[];
    params: Record<string, any>;
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const lower = intent.toLowerCase();

    // Pattern: "read emails" -> read task
    if (lower.includes('read') && lower.includes('email')) {
      return {
        taskTypes: ['read_emails'],
        params: { maxEmails: 10, filter: 'unread' },
        riskLevel: 'low',
      };
    }

    // Pattern: "summarize" -> read + summarize
    if (lower.includes('summarize') || lower.includes('summary')) {
      return {
        taskTypes: ['read_emails', 'summarize'],
        params: { maxEmails: 5, filter: 'unread' },
        riskLevel: 'low',
      };
    }

    // Pattern: "draft reply" -> read + summarize + draft (no send)
    if (lower.includes('draft') && lower.includes('reply')) {
      return {
        taskTypes: ['read_emails', 'summarize', 'draft_reply'],
        params: { maxEmails: 1, filter: 'unread' },
        riskLevel: 'medium',
      };
    }

    // Pattern: "send email" or "reply and send" -> read + summarize + draft + send
    if (
      (lower.includes('send') && (lower.includes('email') || lower.includes('immediately'))) ||
      (lower.includes('reply') && lower.includes('send'))
    ) {
      return {
        taskTypes: ['read_emails', 'summarize', 'draft_reply', 'send_draft'],
        params: { maxEmails: 1, filter: 'unread', autoSend: false },
        riskLevel: 'high', // sending emails = high risk
      };
    }

    // Pattern: "reply to X with Y" (but without explicit send) -> medium risk
    if ((lower.includes('reply') || lower.includes('respond')) && lower.includes('with')) {
      return {
        taskTypes: ['read_emails', 'summarize', 'draft_reply'],
        params: { maxEmails: 1, filter: 'unread', autoSend: false },
        riskLevel: 'medium',
      };
    }

    // Default: just read
    return {
      taskTypes: ['read_emails'],
      params: { maxEmails: 10, filter: 'unread' },
      riskLevel: 'low',
    };
  }
}

/**
 * Agent Planner
 * Converts intent + context → DAG of tasks
 */
export class AgentPlanner {
  private classifier: IntentClassifier;

  constructor() {
    this.classifier = new IntentClassifier();
  }

  /**
   * Create a plan from user intent
   */
  createPlan(userId: string, intent: string): AgentPlan {
    const { taskTypes, params, riskLevel } = this.classifier.classify(intent);

    const tasks: AgentTask[] = [];
    let taskId = 1;

    for (const taskType of taskTypes) {
      tasks.push({
        id: `task-${taskId++}`,
        type: taskType,
        status: 'pending',
        input: this.buildTaskInput(taskType, params),
        createdAt: new Date(),
      });
    }

    const planId = `plan-${Date.now()}`;

    const plan: AgentPlan = {
      id: planId,
      intent,
      tasks,
      estimatedRiskLevel: riskLevel,
      requiresApproval: riskLevel !== 'low',
      createdAt: new Date(),
    };

    console.log(`[AgentPlanner] Created plan ${planId}: ${taskTypes.join(' -> ')}`);
    return plan;
  }

  /**
   * Build task input from task type and params
   */
  private buildTaskInput(taskType: TaskType, params: Record<string, any>): Record<string, any> {
    switch (taskType) {
      case 'read_emails':
        return {
          maxEmails: params.maxEmails || 10,
          filter: params.filter || 'unread',
        };

      case 'summarize':
        return {
          emailIds: [], // will be filled by executor from read_emails output
        };

      case 'draft_reply':
        return {
          threadId: '', // will be filled
          summaryId: '', // from summarize output
          autoSend: params.autoSend || false,
        };

      case 'send_draft':
        return {
          threadId: '', // will be filled
          draftId: '', // from draft_reply output
        };

      default:
        return {};
    }
  }
}

/**
 * DAG: Directed Acyclic Graph for task dependencies
 */
export class TaskDAG {
  /**
   * Determine task execution order based on task types
   */
  static getExecutionOrder(tasks: AgentTask[]): AgentTask[] {
    const order = ['read_emails', 'summarize', 'draft_reply', 'send_draft'];
    return tasks.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
  }
}
