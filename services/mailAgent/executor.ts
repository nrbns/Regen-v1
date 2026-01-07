/**
 * Agent Executor
 * Orchestrates task execution, approval collection, error handling, and audit logging
 * Integrates RAG for context-aware summaries
 */

import type { AgentPlan, AgentTask, EmailThread, EmailSummary, DraftReply } from './types';
import { GmailConnector } from './gmailConnector';
import { MailSummarizer } from './mailSummarizer';
import { DraftReplyGenerator } from './draftReplyGenerator';
import { AuditLogger } from './auditLog';
import { emailRAGService } from '../rag/emailRAG';
import { LLMClient } from '../llmClient';

/**
 * Execution context: intermediate results shared across task execution
 */
export interface ExecutionContext {
  planId: string;
  userId: string;
  threads: EmailThread[];
  summaries: EmailSummary[];
  drafts: DraftReply[];
  results: Record<string, any>;
  errors: Record<string, Error>;
}

/**
 * Approval request sent to user via Action Card
 */
export interface ApprovalRequest {
  taskId: string;
  taskType: string;
  preview: Record<string, any>;
  requiresApproval: boolean;
  approved: boolean;
  approvedAt?: Date;
}

/**
 * Agent Executor
 * Runs the plan step by step
 */
export class AgentExecutor {
  private gmailConnector: GmailConnector;
  private mailSummarizer: MailSummarizer;
  private draftGenerator: DraftReplyGenerator;
  private auditLogger: AuditLogger;

  constructor() {
    this.gmailConnector = new GmailConnector(
      process.env.GMAIL_CLIENT_ID || '',
      process.env.GMAIL_CLIENT_SECRET || '',
      process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/auth/callback'
    );
    const llmClient = new LLMClient();
    this.mailSummarizer = new MailSummarizer({
      complete: async (text: string) => llmClient.complete(text),
    });
    this.draftGenerator = new DraftReplyGenerator();
    this.auditLogger = new AuditLogger();
  }

  /**
   * Execute a plan
   * Runs tasks in order, with approval gates for high-risk tasks
   */
  async execute(
    userId: string,
    plan: AgentPlan,
    approvalHandler: (req: ApprovalRequest) => Promise<boolean>
  ): Promise<ExecutionContext> {
    const context: ExecutionContext = {
      planId: plan.id,
      userId,
      threads: [],
      summaries: [],
      drafts: [],
      results: {},
      errors: {},
    };

    console.log(`[Executor] Starting plan ${plan.id} for user ${userId}`);

    // Sort tasks by execution order
    const sortedTasks = this.sortTasksByDependency(plan.tasks);

    for (const task of sortedTasks) {
      try {
        console.log(`[Executor] Running task ${task.id}: ${task.type}`);

        // Execute the task
        await this.executeTask(task, context, userId);

        // Update task status
        task.status = 'completed';
        task.completedAt = new Date();

        // Check if approval is needed
        if (this.isHighRiskTask(task)) {
          const approved = await approvalHandler({
            taskId: task.id,
            taskType: task.type,
            preview: this.buildPreview(task, context),
            requiresApproval: true,
            approved: false,
          });

          if (!approved) {
            console.log(`[Executor] Task ${task.id} rejected by user`);
            task.status = 'rejected';

            // Log rejection
            await this.auditLogger.log({
              planId: plan.id,
              userId,
              action: `rejected_${task.type}`,
              taskId: task.id,
              status: 'rejected',
              timestamp: new Date(),
            });

            break; // Stop execution
          }
        }

        // Log successful task
        await this.auditLogger.log({
          planId: plan.id,
          userId,
          action: `executed_${task.type}`,
          taskId: task.id,
          status: 'completed',
          timestamp: new Date(),
          result: this.getSummaryResult(task, context),
        });
      } catch (error) {
        console.error(`[Executor] Task ${task.id} failed:`, error);
        task.status = 'failed';
        task.error = error instanceof Error ? error.message : String(error);
        context.errors[task.id] = error as Error;

        // Log failure
        await this.auditLogger.log({
          planId: plan.id,
          userId,
          action: `failed_${task.type}`,
          taskId: task.id,
          status: 'failed',
          timestamp: new Date(),
          error: error instanceof Error ? error.message : String(error),
        });

        // Decide: stop or continue on non-critical errors
        if (this.isCriticalError(task.type, error)) {
          break;
        }
      }
    }

    console.log(`[Executor] Plan ${plan.id} execution completed`);
    return context;
  }

  /**
   * Execute a single task
   */
  private async executeTask(
    task: AgentTask,
    context: ExecutionContext,
    userId: string
  ): Promise<void> {
    switch (task.type) {
      case 'read_emails':
        context.threads = await this.executeReadEmails(task, userId);
        context.results['threads'] = context.threads;
        break;

      case 'summarize':
        context.summaries = await this.executeSummarize(task, context, userId);
        context.results['summaries'] = context.summaries;
        break;

      case 'draft_reply':
        context.drafts = await this.executeDraftReply(task, context, userId);
        context.results['drafts'] = context.drafts;
        break;

      case 'send_draft':
        await this.executeSendDraft(task, context, userId);
        context.results['sent'] = true;
        break;

      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  /**
   * Task: Read emails
   */
  private async executeReadEmails(task: AgentTask, _userId: string): Promise<EmailThread[]> {
    const { maxEmails, filter } = task.input;
    console.log(`[Executor] Reading ${maxEmails} ${filter} emails`);

    // Use real Gmail API
    const threads = await this.gmailConnector.getUnreadThreads(_userId, maxEmails || 10);
    console.log(`[Executor] Read ${threads.length} threads from Gmail`);
    return threads;
  }

  /**
   * Task: Summarize emails
   */
  private async executeSummarize(
    task: AgentTask,
    context: ExecutionContext,
    userId: string
  ): Promise<EmailSummary[]> {
    console.log(`[Executor] Summarizing ${context.threads.length} threads with RAG context`);

    const summaries: EmailSummary[] = [];

    for (const thread of context.threads) {
      let summary: EmailSummary;

      try {
        // Try RAG-enhanced summarization (context-aware)
        summary = await this.mailSummarizer.summarizeWithContext(userId, thread);
        console.log(`[Executor] Generated context-aware summary for ${thread.id}`);

        // Index thread for future RAG searches
        await emailRAGService.indexEmailThread(userId, thread);
      } catch (error) {
        console.warn(`[Executor] RAG summarization failed, using basic summary: ${error}`);
        // Fallback to basic summarization
        summary = await this.mailSummarizer.summarize(thread);
      }

      summaries.push(summary);
    }

    console.log(`[Executor] Created ${summaries.length} summaries`);
    return summaries;
  }

  /**
   * Task: Draft reply
   */
  private async executeDraftReply(
    task: AgentTask,
    context: ExecutionContext,
    userId: string
  ): Promise<DraftReply[]> {
    console.log(`[Executor] Drafting ${context.summaries.length} replies`);

    const drafts: DraftReply[] = [];

    for (const summary of context.summaries) {
      // Find the corresponding thread by comparing index
      const thread = context.threads[context.summaries.indexOf(summary)];
      if (!thread) continue;

      const draft = await this.draftGenerator.generateDraft(thread, summary, userId);
      drafts.push(draft);
    }

    console.log(`[Executor] Created ${drafts.length} drafts`);
    return drafts;
  }

  /**
   * Task: Send draft
   */
  private async executeSendDraft(
    task: AgentTask,
    context: ExecutionContext,
    _userId: string
  ): Promise<void> {
    console.log(`[Executor] Sending ${context.drafts.length} drafts`);

    for (const draft of context.drafts) {
      const threadId = draft.threadId;
      // Use real Gmail API to send reply
      const success = await this.gmailConnector.sendReply(
        _userId,
        threadId,
        draft.body,
        draft.subject
      );
      if (success) {
        console.log(`[Executor] Sent draft for thread ${threadId}`);
      } else {
        console.error(`[Executor] Failed to send draft for thread ${threadId}`);
      }
    }
  }

  /**
   * Helper: Sort tasks by dependency
   */
  private sortTasksByDependency(tasks: AgentTask[]): AgentTask[] {
    const order = ['read_emails', 'summarize', 'draft_reply', 'send_draft'];
    return [...tasks].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
  }

  /**
   * Helper: Check if task is high-risk
   */
  private isHighRiskTask(task: AgentTask): boolean {
    return ['send_draft'].includes(task.type);
  }

  /**
   * Helper: Build preview for approval request
   */
  private buildPreview(task: AgentTask, context: ExecutionContext): Record<string, any> {
    switch (task.type) {
      case 'send_draft':
        return {
          draftCount: context.drafts.length,
          recipients: context.drafts.flatMap(d => d.to),
          subjects: context.drafts.map(d => d.subject),
        };

      case 'draft_reply':
        return {
          draftCount: context.drafts.length,
          preview: context.drafts.slice(0, 2),
        };

      default:
        return {};
    }
  }

  /**
   * Helper: Get summary result for audit log
   */
  private getSummaryResult(task: AgentTask, context: ExecutionContext): Record<string, any> {
    switch (task.type) {
      case 'read_emails':
        return { threadCount: context.threads.length };

      case 'summarize':
        return { summaryCount: context.summaries.length };

      case 'draft_reply':
        return { draftCount: context.drafts.length };

      case 'send_draft':
        return { sentCount: context.drafts.length };

      default:
        return {};
    }
  }

  /**
   * Helper: Determine if error is critical
   */
  private isCriticalError(taskType: string, error: any): boolean {
    // Auth errors are critical
    if (error?.message?.includes('auth') || error?.message?.includes('unauthorized')) {
      return true;
    }

    // Read errors are critical (can't proceed without data)
    if (taskType === 'read_emails') {
      return true;
    }

    // Non-critical: summarization partial failures, draft generation issues
    return false;
  }
}

/**
 * Executor Factory
 */
export class ExecutorFactory {
  static create(): AgentExecutor {
    return new AgentExecutor();
  }
}
