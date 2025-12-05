import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Enhanced Privacy Dashboard
 * Comprehensive privacy controls and monitoring with real stats, privacy score, and export
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Cookie, Fingerprint, Database, Trash2, Settings, AlertTriangle, CheckCircle2, BarChart3, TrendingUp, Download, FileText, Zap, } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
export function PrivacyDashboard() {
    const [stats, setStats] = useState(null);
    const [recentTrackers, setRecentTrackers] = useState([]);
    const [privacyMode, setPrivacyMode] = useState('normal');
    const [fingerprintingEnabled, setFingerprintingEnabled] = useState(false);
    const [cookieBlocking, setCookieBlocking] = useState('third-party');
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    useEffect(() => {
        const loadStats = async () => {
            try {
                setLoading(true);
                // Fetch real stats from IPC
                const privacyStats = await ipc.privacy.getStats().catch(() => null);
                if (privacyStats) {
                    setStats(privacyStats);
                    setFingerprintingEnabled(privacyStats.fingerprintingEnabled);
                }
                // Fetch tracker list
                const trackers = await ipc.privacy.getTrackers(20).catch(() => []);
                if (Array.isArray(trackers)) {
                    setRecentTrackers(trackers.map((t) => ({
                        domain: t.domain,
                        count: t.count || 1,
                        category: t.category || 'Unknown',
                        blocked: t.blocked !== false,
                        lastSeen: t.lastSeen || Date.now(),
                    })));
                }
            }
            catch (error) {
                console.error('[PrivacyDashboard] Failed to load stats:', error);
            }
            finally {
                setLoading(false);
            }
        };
        loadStats();
        // Refresh stats every 5 seconds
        const interval = setInterval(loadStats, 5000);
        return () => clearInterval(interval);
    }, []);
    const handleExportReport = async (format = 'json') => {
        try {
            setExporting(true);
            const report = await ipc.privacy.exportReport(format);
            // Create download
            const blob = format === 'json'
                ? new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
                : new Blob([convertToCSV(report)], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `privacy-report-${Date.now()}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        catch (error) {
            console.error('[PrivacyDashboard] Failed to export report:', error);
            alert('Failed to export privacy report');
        }
        finally {
            setExporting(false);
        }
    };
    const convertToCSV = (report) => {
        const lines = [];
        // Header
        lines.push('Privacy Report');
        lines.push(`Generated: ${new Date(report.timestamp).toISOString()}`);
        lines.push('');
        // Stats
        lines.push('Statistics');
        lines.push('Metric,Value');
        lines.push(`Privacy Score,${report.stats.privacyScore}`);
        lines.push(`Trackers Blocked,${report.stats.trackersBlocked}`);
        lines.push(`Ads Blocked,${report.stats.adsBlocked}`);
        lines.push(`Cookies Blocked,${report.stats.cookiesBlocked}`);
        lines.push(`HTTPS Upgrades,${report.stats.httpsUpgrades}`);
        lines.push(`Total Cookies,${report.stats.totalCookies}`);
        lines.push(`Total Origins,${report.stats.totalOrigins}`);
        lines.push('');
        // Trackers
        lines.push('Trackers');
        lines.push('Domain,Category,Count,Blocked,Last Seen');
        report.trackers.forEach((t) => {
            lines.push(`${t.domain},${t.category},${t.count},${t.blocked},${new Date(t.lastSeen).toISOString()}`);
        });
        lines.push('');
        // Origins
        lines.push('Origins');
        lines.push('Origin,Cookies,Last Accessed');
        report.origins.forEach((o) => {
            lines.push(`${o.origin},${o.cookies},${new Date(o.lastAccessed).toISOString()}`);
        });
        return lines.join('\n');
    };
    const getPrivacyScoreColor = (score) => {
        if (score >= 80)
            return 'text-green-400';
        if (score >= 60)
            return 'text-yellow-400';
        if (score >= 40)
            return 'text-orange-400';
        return 'text-red-400';
    };
    const getPrivacyScoreGrade = (score) => {
        if (score >= 90)
            return 'A+';
        if (score >= 80)
            return 'A';
        if (score >= 70)
            return 'B';
        if (score >= 60)
            return 'C';
        if (score >= 50)
            return 'D';
        return 'F';
    };
    const metrics = stats
        ? [
            {
                label: 'Trackers Blocked',
                value: stats.trackersBlocked.toLocaleString(),
                trend: 'up',
                icon: Shield,
            },
            {
                label: 'Ads Blocked',
                value: stats.adsBlocked.toLocaleString(),
                trend: 'up',
                icon: Zap,
            },
            {
                label: 'Cookies Blocked',
                value: stats.cookiesBlocked.toLocaleString(),
                trend: 'up',
                icon: Cookie,
            },
            {
                label: 'HTTPS Upgrades',
                value: stats.httpsUpgrades.toLocaleString(),
                trend: 'up',
                icon: Lock,
            },
        ]
        : [];
    const handleClearData = async (type) => {
        try {
            await ipc
                .invoke('privacy:purgeOrigin', { origin: type === 'all' ? '*' : type })
                .catch(() => { });
            alert(`${type} cleared successfully`);
            // Reload stats
            const privacyStats = await ipc.privacy.getStats().catch(() => null);
            if (privacyStats) {
                setStats(privacyStats);
            }
        }
        catch (error) {
            console.error('[PrivacyDashboard] Failed to clear data:', error);
            alert(`Failed to clear ${type}`);
        }
    };
    if (loading && !stats) {
        return (_jsx("div", { className: "flex h-full items-center justify-center", children: _jsx("div", { className: "text-gray-400", children: "Loading privacy stats..." }) }));
    }
    return (_jsxs("div", { className: "flex h-full flex-col overflow-y-auto bg-gray-900 text-white", children: [_jsxs("div", { className: "border-b border-gray-800 p-6", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "rounded-lg bg-purple-500/20 p-2", children: _jsx(Shield, { size: 24, className: "text-purple-400" }) }), _jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold", children: "Privacy Dashboard" }), _jsx("p", { className: "text-sm text-gray-400", children: "Monitor and control your privacy" })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("button", { onClick: () => handleExportReport('json'), disabled: exporting, className: "flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2 text-sm transition-colors hover:bg-gray-800 disabled:opacity-50", children: [_jsx(Download, { size: 16 }), exporting ? 'Exporting...' : 'Export JSON'] }), _jsxs("button", { onClick: () => handleExportReport('csv'), disabled: exporting, className: "flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2 text-sm transition-colors hover:bg-gray-800 disabled:opacity-50", children: [_jsx(FileText, { size: 16 }), exporting ? 'Exporting...' : 'Export CSV'] })] })] }), _jsx("div", { className: "flex gap-2", children: ['normal', 'private', 'ghost'].map(mode => (_jsx("button", { onClick: () => setPrivacyMode(mode), className: `rounded-lg px-4 py-2 text-sm font-medium transition-colors ${privacyMode === mode
                                ? 'border border-purple-500/40 bg-purple-500/20 text-purple-200'
                                : 'border border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-800'}`, children: mode.charAt(0).toUpperCase() + mode.slice(1) }, mode))) })] }), stats && (_jsxs("div", { className: "border-b border-gray-800 p-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h3", { className: "mb-2 text-lg font-semibold", children: "Privacy Score" }), _jsx("p", { className: "text-sm text-gray-400", children: "Your overall privacy protection level" })] }), _jsxs("div", { className: "text-right", children: [_jsx("div", { className: `text-5xl font-bold ${getPrivacyScoreColor(stats.privacyScore)}`, children: stats.privacyScore }), _jsxs("div", { className: "mt-1 text-sm text-gray-400", children: ["Grade: ", getPrivacyScoreGrade(stats.privacyScore)] })] })] }), _jsx("div", { className: "mt-4 h-3 overflow-hidden rounded-full bg-gray-800", children: _jsx(motion.div, { initial: { width: 0 }, animate: { width: `${stats.privacyScore}%` }, transition: { duration: 0.5 }, className: `h-full ${stats.privacyScore >= 80
                                ? 'bg-green-500'
                                : stats.privacyScore >= 60
                                    ? 'bg-yellow-500'
                                    : stats.privacyScore >= 40
                                        ? 'bg-orange-500'
                                        : 'bg-red-500'}` }) })] })), _jsx("div", { className: "grid grid-cols-2 gap-4 p-6 md:grid-cols-4", children: metrics.map((metric, index) => {
                    const Icon = metric.icon;
                    return (_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: index * 0.1 }, className: "rounded-lg border border-gray-700 bg-gray-800/50 p-4", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between", children: [_jsx(Icon, { size: 20, className: "text-gray-400" }), metric.trend && (_jsx(TrendingUp, { size: 16, className: `${metric.trend === 'up' ? 'text-green-400' : 'text-gray-400'}` }))] }), _jsx("div", { className: "mb-1 text-2xl font-bold text-white", children: metric.value }), _jsx("div", { className: "text-xs text-gray-400", children: metric.label })] }, metric.label));
                }) }), _jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { children: [_jsxs("h3", { className: "mb-4 flex items-center gap-2 text-lg font-semibold", children: [_jsx(Settings, { size: 18 }), "Privacy Settings"] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 p-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Fingerprint, { size: 20, className: "text-gray-400" }), _jsxs("div", { children: [_jsx("div", { className: "font-medium", children: "Fingerprinting Protection" }), _jsx("div", { className: "text-sm text-gray-400", children: "Block browser fingerprinting" })] })] }), _jsx("button", { onClick: () => setFingerprintingEnabled(!fingerprintingEnabled), className: `relative h-6 w-12 rounded-full transition-colors ${fingerprintingEnabled ? 'bg-green-500' : 'bg-gray-700'}`, children: _jsx("div", { className: `absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${fingerprintingEnabled ? 'translate-x-6' : 'translate-x-0'}` }) })] }), _jsxs("div", { className: "rounded-lg border border-gray-700 bg-gray-800/50 p-4", children: [_jsxs("div", { className: "mb-3 flex items-center gap-3", children: [_jsx(Cookie, { size: 20, className: "text-gray-400" }), _jsxs("div", { children: [_jsx("div", { className: "font-medium", children: "Cookie Blocking" }), _jsx("div", { className: "text-sm text-gray-400", children: "Control cookie behavior" })] })] }), _jsx("div", { className: "flex gap-2", children: ['all', 'third-party', 'none'].map(level => (_jsx("button", { onClick: () => setCookieBlocking(level), className: `rounded px-3 py-1.5 text-sm font-medium transition-colors ${cookieBlocking === level
                                                        ? 'border border-purple-500/40 bg-purple-500/20 text-purple-200'
                                                        : 'border border-gray-600 bg-gray-700/50 text-gray-400 hover:bg-gray-700'}`, children: level === 'all'
                                                        ? 'Block All'
                                                        : level === 'third-party'
                                                            ? 'Third-Party'
                                                            : 'Allow All' }, level))) })] })] })] }), _jsxs("div", { children: [_jsxs("h3", { className: "mb-4 flex items-center gap-2 text-lg font-semibold", children: [_jsx(Database, { size: 18 }), "Data Management"] }), _jsx("div", { className: "grid grid-cols-2 gap-3", children: ['cookies', 'cache', 'history', 'all'].map(type => (_jsxs("button", { onClick: () => handleClearData(type), className: "flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800/50 p-3 text-sm transition-colors hover:bg-gray-800", children: [_jsx(Trash2, { size: 16, className: "text-gray-400" }), _jsxs("span", { children: ["Clear ", type === 'all' ? 'All Data' : type] })] }, type))) })] }), _jsxs("div", { children: [_jsxs("h3", { className: "mb-4 flex items-center gap-2 text-lg font-semibold", children: [_jsx(BarChart3, { size: 18 }), "Recent Tracker Activity"] }), _jsx("div", { className: "space-y-2", children: recentTrackers.length === 0 ? (_jsxs("div", { className: "p-8 text-center text-gray-500", children: [_jsx(Shield, { size: 32, className: "mx-auto mb-2 opacity-50" }), _jsx("p", { children: "No recent tracker activity" })] })) : (recentTrackers.map((tracker, index) => (_jsxs(motion.div, { initial: { opacity: 0, x: -20 }, animate: { opacity: 1, x: 0 }, transition: { delay: index * 0.05 }, className: "flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 p-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [tracker.blocked ? (_jsx(CheckCircle2, { size: 16, className: "text-green-400" })) : (_jsx(AlertTriangle, { size: 16, className: "text-yellow-400" })), _jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium", children: tracker.domain }), _jsx("div", { className: "text-xs text-gray-400", children: tracker.category })] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "text-xs text-gray-500", children: [tracker.count, "x"] }), _jsx("div", { className: "text-xs text-gray-500", children: new Date(tracker.lastSeen).toLocaleTimeString() })] })] }, index)))) })] })] })] }));
}
