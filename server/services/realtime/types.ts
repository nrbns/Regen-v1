/**
 * Real-Time Event Types
 * Shared between backend and frontend
 */

export interface BaseEvent {
  id: string;
  clientId: string;
  sessionId: string;
  timestamp: number;
  version: 1;
}

export interface RegenMessageEvent extends BaseEvent {
  type: 'message';
  role: 'assistant' | 'user';
  mode: 'research' | 'trade' | 'browser' | 'automation' | 'handsFree';
  language: string; // "en" | "ta" | "hi" | ...
  text: string; // chunk or full
  done?: boolean; // mark last chunk
}

export interface RegenStatusEvent extends BaseEvent {
  type: 'status';
  phase: 'planning' | 'searching' | 'scraping' | 'calling_workflow' | 'executing_command' | 'idle';
  detail?: string;
}

export interface RegenCommandEvent extends BaseEvent {
  type: 'command';
  command:
    | { kind: 'OPEN_TAB'; url: string; background?: boolean }
    | { kind: 'SCROLL'; tabId: string; amount: number }
    | { kind: 'CLICK_ELEMENT'; tabId: string; elementId: string; selector?: string }
    | { kind: 'GO_BACK'; tabId: string }
    | { kind: 'GO_FORWARD'; tabId: string }
    | { kind: 'SWITCH_TAB'; tabId: string }
    | { kind: 'CLOSE_TAB'; tabId: string }
    | { kind: 'SPEAK'; text: string; language: string }
    | { kind: 'STOP_SPEAKING' }
    | { kind: 'TYPE_INTO_ELEMENT'; tabId: string; selector: string; text: string };
}

export interface RegenNotificationEvent extends BaseEvent {
  type: 'notification';
  level: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
}

export interface RegenErrorEvent extends BaseEvent {
  type: 'error';
  code: string;
  message: string;
  recoverable?: boolean;
}

export type RegenSocketEvent =
  | RegenMessageEvent
  | RegenStatusEvent
  | RegenCommandEvent
  | RegenNotificationEvent
  | RegenErrorEvent;
