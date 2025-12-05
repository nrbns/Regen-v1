import type { ConsentActionType } from '../../types/consent';
export declare const CONSENT_ACTION_LABELS: Record<ConsentActionType, string>;
export declare const CONSENT_ACTION_OPTIONS: Array<{
    value: ConsentActionType | 'all';
    label: string;
}>;
export declare const CONSENT_STATUS_OPTIONS: Array<{
    value: 'all' | 'pending' | 'approved' | 'revoked';
    label: string;
}>;
