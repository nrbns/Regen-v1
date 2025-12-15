/**
 * Mail Agent Service Module
 * Exports all mail agent utilities and services
 */

export { AgentExecutor, ExecutorFactory } from './executor';
export { default as MailAgentHandler } from './api';
export { AgentPlanner } from './agentPlanner';
export { MailSummarizer } from './mailSummarizer';
export { DraftReplyGenerator } from './draftReplyGenerator';
export { GmailConnector } from './gmailConnector';
export { AuditLogger } from './auditLog';

export type {
  EmailThread,
  EmailSummary,
  DraftReply,
  GmailThread,
  GmailMessage,
  GmailToken,
  EmailMessage,
} from './types';

export type { ExecutionContext, ApprovalRequest } from './executor';
export type { AgentTask, AgentPlan } from './types';
