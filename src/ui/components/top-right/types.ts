export type NotificationType = 'info' | 'warning' | 'alert' | 'message';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  url?: string;
  timestamp: string;
  read: boolean;
  meta?: Record<string, unknown>;
}

export interface NotificationResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

export type Presence = 'online' | 'away' | 'busy' | 'offline';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  presence?: Presence;
  orgs?: Array<{ id: string; name: string }>;
  activeOrgId?: string;
  syncStatus?: 'ready' | 'syncing' | 'error';
}
