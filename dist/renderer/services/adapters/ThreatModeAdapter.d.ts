/**
 * Threat Mode Adapter
 *
 * Provides unified interface for:
 * - analyzeUrl(url)
 * - checkIp(ip)
 * - combineScore(results)
 */
export interface UrlAnalysis {
    url: string;
    riskScore: number;
    isMalicious: boolean;
    detections: number;
    totalScans: number;
    categories?: string[];
    redirects?: string[];
    resources?: Array<{
        url: string;
        type: string;
    }>;
}
export interface IpAnalysis {
    ip: string;
    isAbusive: boolean;
    abuseConfidence: number;
    country?: string;
    isp?: string;
    isProxy?: boolean;
    isVpn?: boolean;
    isTor?: boolean;
    reports?: number;
}
export interface ThreatScore {
    overall: number;
    urlScore?: number;
    ipScore?: number;
    factors: string[];
}
export declare class ThreatModeAdapter {
    private client;
    /**
     * Analyze a URL for threats
     */
    analyzeUrl(url: string): Promise<UrlAnalysis>;
    /**
     * Check an IP address
     */
    checkIp(ip: string): Promise<IpAnalysis>;
    /**
     * Combine multiple threat analysis results into a single score
     */
    combineScore(urlAnalysis?: UrlAnalysis, ipAnalysis?: IpAnalysis): ThreatScore;
}
export declare function getThreatAdapter(): ThreatModeAdapter;
