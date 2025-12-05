export type ConsentRisk = 'low' | 'medium' | 'high';
export type ConsentActionType = 'download' | 'form_submit' | 'login' | 'scrape' | 'export_data' | 'access_clipboard' | 'access_camera' | 'access_microphone' | 'access_filesystem' | 'ai_cloud';
export interface ConsentAction {
    type: ConsentActionType;
    description: string;
    target?: string;
    metadata?: Record<string, unknown>;
    risk: ConsentRisk;
}
export interface ConsentRecord {
    id: string;
    action: ConsentAction;
    timestamp: number;
    userId: string;
    signature: string;
    approved: boolean;
    revokedAt?: number;
}
