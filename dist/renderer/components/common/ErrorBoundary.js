import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../ui';
export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('[ErrorBoundary] Caught error:', error, errorInfo);
        this.props.onError?.(error, errorInfo);
    }
    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };
    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (_jsxs("div", { className: "flex flex-col items-center justify-center min-h-[400px] p-8 text-center", children: [_jsx(AlertCircle, { className: "w-16 h-16 text-red-500 mb-4" }), _jsx("h2", { className: "text-xl font-semibold text-[var(--text-primary)] mb-2", children: "Something went wrong" }), _jsx("p", { className: "text-sm text-[var(--text-muted)] mb-6 max-w-md", children: this.state.error?.message ||
                            'An unexpected error occurred. Please try refreshing the page.' }), _jsxs("div", { className: "flex gap-3", children: [_jsx(Button, { tone: "primary", icon: _jsx(RefreshCw, { size: 16 }), onClick: this.handleReset, children: "Try again" }), _jsx(Button, { tone: "secondary", onClick: () => window.location.reload(), children: "Reload page" })] }), process.env.NODE_ENV === 'development' && this.state.error && (_jsxs("details", { className: "mt-6 text-left max-w-2xl w-full", children: [_jsx("summary", { className: "text-xs text-[var(--text-muted)] cursor-pointer mb-2", children: "Error details (development only)" }), _jsx("pre", { className: "text-xs bg-[var(--surface-elevated)] p-4 rounded-lg overflow-auto max-h-64", children: this.state.error.stack })] }))] }));
        }
        return this.props.children;
    }
}
