/**
 * External APIs Configuration
 * Defines available external APIs for different modes
 */
export type OmniMode = 'research' | 'trade' | 'threat' | 'image';
export type AuthType = 'apiKey' | 'oauth' | 'none';
export interface ExternalAPI {
    id: string;
    name: string;
    description: string;
    mode: OmniMode | OmniMode[];
    authType: AuthType;
    baseUrl?: string;
    docsUrl?: string;
    authEnvKey?: string;
    rateLimitPerMin?: number;
}
export declare const EXTERNAL_APIS: ExternalAPI[];
export interface DefaultEnabledApis {
    research: string[];
    trade: string[];
    threat: string[];
    image: string[];
}
export declare function getDefaultEnabledApis(): DefaultEnabledApis;
export declare function getApiById(apiId: string): ExternalAPI | undefined;
export declare function getApisForMode(mode: OmniMode): ExternalAPI[];
