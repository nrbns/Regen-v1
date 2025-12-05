/**
 * Threat Mode Adapter
 *
 * Provides unified interface for:
 * - analyzeUrl(url)
 * - checkIp(ip)
 * - combineScore(results)
 */
import { getApiClient } from '../externalApiClient';
import { useExternalApisStore } from '../../state/externalApisStore';
export class ThreatModeAdapter {
    client = getApiClient();
    /**
     * Analyze a URL for threats
     */
    async analyzeUrl(url) {
        const enabledApis = useExternalApisStore.getState().getEnabledApisForMode('threat');
        // Try VirusTotal
        const virustotal = enabledApis.find(a => a.id === 'virustotal');
        if (virustotal) {
            try {
                // First, submit URL for scanning
                await this.client.request('virustotal', '/url/scan', {
                    method: 'POST',
                    body: { url },
                });
                // Wait a bit, then get report
                await new Promise(resolve => setTimeout(resolve, 2000));
                const reportResponse = await this.client.request('virustotal', `/url/report?resource=${encodeURIComponent(url)}`);
                const detections = reportResponse.data.positives;
                const total = reportResponse.data.total;
                const riskScore = total > 0 ? Math.round((detections / total) * 100) : 0;
                return {
                    url,
                    riskScore,
                    isMalicious: detections > 0,
                    detections,
                    totalScans: total,
                };
            }
            catch (error) {
                console.warn('[ThreatAdapter] VirusTotal failed:', error);
            }
        }
        // Try URLScan.io
        const urlscan = enabledApis.find(a => a.id === 'urlscan');
        if (urlscan) {
            try {
                const submitResponse = await this.client.request('urlscan', '/scan/', {
                    method: 'POST',
                    body: { url, public: 'on' },
                });
                // Wait for scan to complete
                await new Promise(resolve => setTimeout(resolve, 5000));
                const resultResponse = await this.client.request('urlscan', `/result/${submitResponse.data.uuid}`);
                return {
                    url: resultResponse.data.task.url,
                    riskScore: 0, // URLScan doesn't provide a risk score directly
                    isMalicious: false,
                    detections: 0,
                    totalScans: 0,
                    redirects: resultResponse.data.page.redirects,
                    resources: resultResponse.data.page.resources?.map(r => ({
                        url: r.request.request.url,
                        type: 'unknown',
                    })),
                };
            }
            catch (error) {
                console.warn('[ThreatAdapter] URLScan failed:', error);
            }
        }
        throw new Error(`Unable to analyze URL "${url}" from any enabled API`);
    }
    /**
     * Check an IP address
     */
    async checkIp(ip) {
        const enabledApis = useExternalApisStore.getState().getEnabledApisForMode('threat');
        // Try AbuseIPDB
        const abuseipdb = enabledApis.find(a => a.id === 'abuseipdb');
        if (abuseipdb) {
            try {
                const response = await this.client.request('abuseipdb', `/check?ipAddress=${ip}&maxAgeInDays=90&verbose`);
                const data = response.data.data;
                return {
                    ip: data.ipAddress,
                    isAbusive: data.abuseConfidencePercentage > 0,
                    abuseConfidence: data.abuseConfidencePercentage,
                    country: data.countryCode,
                    isp: data.isp,
                    reports: data.totalReports,
                };
            }
            catch (error) {
                console.warn('[ThreatAdapter] AbuseIPDB failed:', error);
            }
        }
        // Try IPQualityScore
        const ipquality = enabledApis.find(a => a.id === 'ipqualityscore');
        if (ipquality) {
            try {
                const response = await this.client.request('ipqualityscore', `/ip/${ip}?strictness=1&allow_public_access_points=true`);
                return {
                    ip,
                    isAbusive: response.data.fraud_score > 75,
                    abuseConfidence: response.data.fraud_score,
                    country: response.data.country_code,
                    isp: response.data.ISP,
                    isProxy: response.data.proxy,
                    isVpn: response.data.vpn,
                    isTor: response.data.tor,
                };
            }
            catch (error) {
                console.warn('[ThreatAdapter] IPQualityScore failed:', error);
            }
        }
        // Fallback to ipinfo.io (no key required, basic info)
        const ipinfo = enabledApis.find(a => a.id === 'ipinfo');
        if (ipinfo) {
            try {
                const response = await this.client.request('ipinfo', `/${ip}/json`);
                return {
                    ip: response.data.ip,
                    isAbusive: false,
                    abuseConfidence: 0,
                    country: response.data.country,
                    isp: response.data.org,
                };
            }
            catch (error) {
                console.warn('[ThreatAdapter] ipinfo failed:', error);
            }
        }
        throw new Error(`Unable to check IP "${ip}" from any enabled API`);
    }
    /**
     * Combine multiple threat analysis results into a single score
     */
    combineScore(urlAnalysis, ipAnalysis) {
        const factors = [];
        let overall = 0;
        let urlScore = 0;
        let ipScore = 0;
        if (urlAnalysis) {
            urlScore = urlAnalysis.riskScore;
            overall += urlScore * 0.6; // URL analysis is 60% of score
            if (urlAnalysis.isMalicious) {
                factors.push('URL flagged as malicious');
            }
            if (urlAnalysis.detections > 0) {
                factors.push(`${urlAnalysis.detections} security engines detected threats`);
            }
        }
        if (ipAnalysis) {
            ipScore = ipAnalysis.abuseConfidence;
            overall += ipScore * 0.4; // IP analysis is 40% of score
            if (ipAnalysis.isAbusive) {
                factors.push('IP has abuse reports');
            }
            if (ipAnalysis.isProxy || ipAnalysis.isVpn) {
                factors.push('IP is proxy/VPN');
            }
            if (ipAnalysis.isTor) {
                factors.push('IP is Tor exit node');
            }
        }
        return {
            overall: Math.min(100, Math.round(overall)),
            urlScore: urlAnalysis ? urlScore : undefined,
            ipScore: ipAnalysis ? ipScore : undefined,
            factors,
        };
    }
}
/**
 * Get singleton ThreatModeAdapter instance
 */
let threatAdapterInstance = null;
export function getThreatAdapter() {
    if (!threatAdapterInstance) {
        threatAdapterInstance = new ThreatModeAdapter();
    }
    return threatAdapterInstance;
}
