import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Enhanced Error Boundary - Tier 2
 * Global error boundary with retry logic, toast reporting, and structured logging
 */
import { Component } from 'react';
import { AlertTriangle, RefreshCw, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from '../../utils/toast';
import { log } from '../../utils/logger';
import { getUserFriendlyError } from '../../utils/userFriendlyErrors';
import { recordCrash } from '../../services/errorRecovery';
import { telemetryMetrics } from '../../services/telemetryMetrics';
import { getRecoveryAction, executeRecoveryAction } from './errorRecovery';
const MAX_RETRIES = 3;
export class ErrorBoundary extends Component {
    retryTimeoutId = null;
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            retryCount: 0,
            copyStatus: 'idle',
        };
    }
    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error,
        };
    }
    componentDidCatch(error, errorInfo) {
        const { componentName, level = 'component', onError } = this.props;
        // Structured logging
        log.error(`ErrorBoundary [${level}]${componentName ? ` in ${componentName}` : ''}:`, error.message, errorInfo.componentStack);
        // STABILITY FIX: Record crash and attempt recovery
        recordCrash(error, { componentName, level, componentStack: errorInfo.componentStack });
        // TELEMETRY FIX: Track error
        telemetryMetrics.trackError(error.message, { componentName, level });
        // Store error info
        this.setState({
            error,
            errorInfo,
        });
        // Phase 1, Day 3: Enhanced error recovery with suggestions
        const friendlyMessage = getUserFriendlyError(error);
        const recoveryAction = getRecoveryAction(error, componentName);
        if (recoveryAction) {
            toast.error(`${componentName || 'Component'} error: ${friendlyMessage}. ${recoveryAction.message}`, { duration: 6000 });
        }
        else {
            toast.error(`${componentName || 'Component'} error: ${friendlyMessage}. ${this.props.retryable ? 'Retrying...' : 'Check console for details.'}`);
        }
        // Call custom error handler
        if (onError) {
            onError(error, errorInfo);
        }
        // Send to error tracking service (Sentry)
        if (typeof window !== 'undefined' && window.Sentry) {
            try {
                window.Sentry.captureException(error, {
                    contexts: {
                        react: {
                            componentStack: errorInfo.componentStack,
                        },
                    },
                    tags: {
                        component: componentName || 'unknown',
                        level: level || 'component',
                    },
                });
            }
            catch (sentryError) {
                // Silently fail if Sentry is not available
                console.warn('Failed to send error to Sentry:', sentryError);
            }
        }
    }
    handleRetry = async () => {
        const { retryCount } = this.state;
        const { retryable = true } = this.props;
        const { error } = this.state;
        if (!retryable || retryCount >= MAX_RETRIES) {
            toast.warning('Maximum retry attempts reached. Please reload the app.');
            return;
        }
        // Phase 1, Day 3: Enhanced retry with recovery actions
        if (error) {
            const recoveryAction = getRecoveryAction(error, this.props.componentName);
            if (recoveryAction && recoveryAction.action !== 'retry') {
                const shouldRetry = await executeRecoveryAction(recoveryAction, error);
                if (!shouldRetry) {
                    // Recovery action was executed but doesn't require retry
                    return;
                }
            }
        }
        log.info(`Retrying after error (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        this.setState(prev => ({
            hasError: false,
            error: null,
            errorInfo: null,
            retryCount: prev.retryCount + 1,
        }));
        toast.info(`Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
    };
    handleReload = () => {
        window.location.reload();
    };
    handleCopyError = async () => {
        const { error, errorInfo } = this.state;
        if (!error)
            return;
        const errorReport = `
Error Report
============
Component: ${this.props.componentName || 'Unknown'}
Time: ${new Date().toISOString()}
Retry Count: ${this.state.retryCount}

Error Message:
${error.message}

Stack Trace:
${error.stack || 'No stack trace available'}

Component Stack:
${errorInfo?.componentStack || 'No component stack available'}
    `.trim();
        try {
            await navigator.clipboard.writeText(errorReport);
            this.setState({ copyStatus: 'success' });
            toast.success('Error details copied to clipboard');
            setTimeout(() => this.setState({ copyStatus: 'idle' }), 2000);
        }
        catch (err) {
            this.setState({ copyStatus: 'error' });
            toast.error('Failed to copy error details');
            log.error('Failed to copy error details', err);
        }
    };
    componentWillUnmount() {
        if (this.retryTimeoutId) {
            clearTimeout(this.retryTimeoutId);
        }
    }
    render() {
        if (this.state.hasError) {
            const { fallback, componentName, retryable = true } = this.props;
            const { error, retryCount } = this.state;
            if (fallback) {
                return fallback;
            }
            const canRetry = retryable && retryCount < MAX_RETRIES;
            return (_jsx("div", { className: "flex min-h-screen w-full items-center justify-center bg-slate-950 px-6 py-12 text-gray-100", children: _jsxs("div", { className: "w-full max-w-xl space-y-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "rounded-full bg-red-500/20 p-2 text-red-200", children: _jsx(AlertTriangle, { className: "h-5 w-5" }) }), _jsxs("div", { className: "flex-1", children: [_jsxs("h1", { className: "text-lg font-semibold text-red-200", children: ["Something went wrong", componentName ? ` in ${componentName}` : ''] }), error && (_jsx("p", { className: "mt-2 text-sm text-red-100/80 font-mono", children: getUserFriendlyError(error) })), _jsx("p", { className: "mt-2 text-sm text-gray-400", children: canRetry
                                                ? 'The app will attempt to recover automatically. You can also retry manually or reload.'
                                                : 'Please reload the app to continue. Error details have been logged.' })] })] }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [error && (() => {
                                    const recoveryAction = getRecoveryAction(error, componentName);
                                    if (recoveryAction && recoveryAction.action !== 'retry') {
                                        return (_jsxs("button", { onClick: async () => {
                                                await executeRecoveryAction(recoveryAction, error);
                                            }, className: "flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 hover:border-emerald-500/70 transition-colors", children: [_jsx(RefreshCw, { size: 16 }), recoveryAction.label] }));
                                    }
                                    return null;
                                })(), canRetry && (_jsxs("button", { onClick: this.handleRetry, className: "flex items-center gap-2 rounded-lg border border-blue-500/50 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-100 hover:border-blue-500/70 transition-colors", children: [_jsx(RefreshCw, { size: 16 }), "Retry (", retryCount + 1, "/", MAX_RETRIES, ")"] })), _jsx("button", { onClick: this.handleReload, className: "rounded-lg border border-blue-500/50 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-100 hover:border-blue-500/70 transition-colors", children: "Reload App" }), _jsx("button", { onClick: this.handleCopyError, className: `flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${this.state.copyStatus === 'success'
                                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-100'
                                        : this.state.copyStatus === 'error'
                                            ? 'border-red-500/50 bg-red-500/10 text-red-100'
                                            : 'border-slate-700/50 bg-slate-800/50 text-gray-300 hover:border-slate-600/50'}`, children: this.state.copyStatus === 'success' ? (_jsxs(_Fragment, { children: [_jsx(CheckCircle2, { size: 16 }), "Copied"] })) : (_jsxs(_Fragment, { children: [_jsx(Copy, { size: 16 }), "Copy Error"] })) })] }), retryCount >= MAX_RETRIES && (_jsxs("div", { className: "rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100", children: [_jsx("p", { className: "font-medium", children: "Maximum retries reached" }), _jsx("p", { className: "mt-1 text-xs text-amber-200/80", children: "Please reload the app. If the error persists, check the console for details." })] }))] }) }));
        }
        return this.props.children;
    }
}
/**
 * Global Error Boundary - Wrap app root
 */
export function GlobalErrorBoundary({ children }) {
    return (_jsx(ErrorBoundary, { level: "global", componentName: "App", retryable: true, children: children }));
}
