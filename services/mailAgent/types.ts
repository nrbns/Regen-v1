/**
 * Mail Agent Types
 * Core data structures for email operations
 */

export interface GmailThread {
  id: string;
  historyId: string;
  snippet: string;
  messages: GmailMessage[];
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  internalDate: string;
  headers: GmailHeader[];
  from?: string;
  to?: string;
  payload?: {
    partId: string;
    mimeType: string;
    filename: string;
    headers: GmailHeader[];
    body?: {
      size: number;
      data?: string;
    };
    parts?: Array<{
      partId: string;
      mimeType: string;
      filename: string;
      headers: GmailHeader[];
      body?: {
        size: number;
        data?: string;
      };
    }>;
  };
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface EmailThread {
  id: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  fullText: string;
  isUnread: boolean;
  messages?: GmailMessage[];
}

export interface EmailSummary {
  subject: string;
  from: string;
  keyPoints: string[];
  actionItems: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  suggestedReplySnippet: string;
  isUrgent: boolean;
  summary?: string;
}

export interface DraftReply {
  threadId: string;
  to: string;
  subject: string;
  body: string;
  confidence: number; // 0-1, confidence in suggested reply
}

export interface AgentTask {
  id: string;
  type: 'read_emails' | 'summarize' | 'draft_reply' | 'send_draft';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rejected';
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface AgentPlan {
  id: string;
  intent: string;
  tasks: AgentTask[];
  estimatedRiskLevel: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
  createdAt: Date;
}

export interface AuditLogEntry {
  id?: string;
  planId: string;
  userId: string;
  action: string;
  taskId?: string;
  status: 'pending' | 'completed' | 'failed' | 'rejected';
  timestamp: Date;
  result?: Record<string, any>;
  error?: string;
}

export interface AgentPlan {
  id: string;
  intent: string;
  tasks: AgentTask[];
  estimatedRiskLevel: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
  createdAt: Date;
}

export interface ActionCard {
  planId: string;
  intent: string;
  summary: string;
  tasks: Array<{
    type: string;
    description: string;
  }>;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedTime: string;
}

export interface AuditLog {
  id: string;
  planId: string;
  action: string;
  resource: string;
  result: 'success' | 'failure' | 'pending_approval';
  details: Record<string, any>;
  timestamp: Date;
  userId: string;
  userApproved: boolean;
}

export interface MailAgentConfig {
  googleClientId: string;
  googleClientSecret: string;
  googleRedirectUri: string;
  llmProvider: 'openai' | 'anthropic' | 'ollama';
  llmModel: string;
  maxEmailsPerBatch: number;
  cacheTtlSeconds: number;
}

export interface GmailToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
}

export interface AgentSession {
  userId: string;
  planId: string;
  gmailToken: GmailToken;
  currentTask: AgentTask | null;
  tasks: AgentTask[];
  auditLogs: AuditLog[];
  createdAt: Date;
  updatedAt: Date;
}
