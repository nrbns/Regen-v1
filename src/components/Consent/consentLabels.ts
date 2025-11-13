import type { ConsentActionType } from '../../types/consent';

export const CONSENT_ACTION_LABELS: Record<ConsentActionType, string> = {
  download: 'Download file',
  form_submit: 'Submit form',
  login: 'Login',
  scrape: 'Scrape content',
  export_data: 'Export data',
  access_clipboard: 'Access clipboard',
  access_camera: 'Access camera',
  access_microphone: 'Access microphone',
  access_filesystem: 'Filesystem access',
  ai_cloud: 'Use cloud AI provider',
};

export const CONSENT_ACTION_OPTIONS: Array<{ value: ConsentActionType | 'all'; label: string }> = [
  { value: 'all', label: 'All actions' },
  { value: 'download', label: CONSENT_ACTION_LABELS.download },
  { value: 'form_submit', label: CONSENT_ACTION_LABELS.form_submit },
  { value: 'login', label: CONSENT_ACTION_LABELS.login },
  { value: 'scrape', label: CONSENT_ACTION_LABELS.scrape },
  { value: 'export_data', label: CONSENT_ACTION_LABELS.export_data },
  { value: 'access_clipboard', label: CONSENT_ACTION_LABELS.access_clipboard },
  { value: 'access_camera', label: CONSENT_ACTION_LABELS.access_camera },
  { value: 'access_microphone', label: CONSENT_ACTION_LABELS.access_microphone },
  { value: 'access_filesystem', label: CONSENT_ACTION_LABELS.access_filesystem },
  { value: 'ai_cloud', label: CONSENT_ACTION_LABELS.ai_cloud },
];

export const CONSENT_STATUS_OPTIONS: Array<{ value: 'all' | 'pending' | 'approved' | 'revoked'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'revoked', label: 'Revoked' },
];
