import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, PanelRight, Columns, Lock, Zap, Palette, Cloud, Code, } from 'lucide-react';
import { useAppStore } from '../../../state/appStore';
import { EnhancedRegenSidebar } from '../../../components/regen/EnhancedRegenSidebar';
import { SplitView } from '../../../components/split-view/SplitView';
import { RegenVault } from '../../../components/vault/RegenVault';
import { ThemeEngine } from '../../../components/themes/ThemeEngine';
import { AIDeveloperConsole } from '../../../components/dev-console/AIDeveloperConsole';
import { LightningMode } from '../../../core/lightning/LightningMode';
import { toast } from '../../../utils/toast';
import { useTokens } from '../../useTokens';
export function FeaturesMenu() {
    const tokens = useTokens();
    const [open, setOpen] = useState(false);
    const [activeFeature, setActiveFeature] = useState(null);
    const { regenSidebarOpen, setRegenSidebarOpen } = useAppStore();
    const triggerRef = useRef(null);
    const panelRef = useRef(null);
    const closeMenu = useCallback(() => {
        setOpen(false);
        triggerRef.current?.focus();
    }, []);
    useEffect(() => {
        if (!open)
            return;
        function handlePointer(event) {
            const target = event.target;
            if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
                closeMenu();
            }
        }
        window.addEventListener('pointerdown', handlePointer);
        return () => window.removeEventListener('pointerdown', handlePointer);
    }, [closeMenu, open]);
    useEffect(() => {
        if (!open)
            return;
        function handleKey(event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeMenu();
            }
        }
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [closeMenu, open]);
    const features = [
        { id: 'sidebar', icon: PanelRight, label: 'Regen Sidebar', color: 'purple' },
        { id: 'split', icon: Columns, label: 'Split View', color: 'blue' },
        { id: 'vault', icon: Lock, label: 'Regen Vault', color: 'green' },
        { id: 'lightning', icon: Zap, label: 'Lightning Mode', color: 'yellow' },
        { id: 'theme', icon: Palette, label: 'Theme Engine', color: 'pink' },
        { id: 'sync', icon: Cloud, label: 'Sync Cloud', color: 'cyan' },
        { id: 'dev', icon: Code, label: 'Dev Console', color: 'orange' },
    ];
    const handleFeatureClick = (featureId) => {
        if (featureId === 'sidebar') {
            setRegenSidebarOpen(true);
            closeMenu();
        }
        else if (featureId === 'lightning') {
            if (LightningMode.isEnabled()) {
                LightningMode.disable();
                toast.success('Lightning Mode disabled');
            }
            else {
                LightningMode.enable();
                toast.success('Lightning Mode enabled - faster browsing!');
            }
            closeMenu();
        }
        else if (featureId === 'sync') {
            toast.info('Sync feature - configure your sync endpoint');
            closeMenu();
        }
        else {
            setActiveFeature(featureId);
            closeMenu();
        }
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "relative", children: [_jsx("button", { ref: triggerRef, type: "button", "aria-label": "Features menu", "aria-haspopup": "menu", "aria-expanded": open, className: "rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary-500)]", onClick: e => {
                            e.stopPropagation();
                            if (e.nativeEvent?.stopImmediatePropagation) {
                                e.nativeEvent.stopImmediatePropagation();
                            }
                            setOpen(value => !value);
                        }, onMouseDown: e => {
                            e.stopPropagation();
                            if (e.nativeEvent?.stopImmediatePropagation) {
                                e.nativeEvent.stopImmediatePropagation();
                            }
                        }, children: _jsx(Sparkles, { className: "h-5 w-5", "aria-hidden": true }) }), open && (_jsxs("div", { ref: panelRef, role: "menu", "aria-label": "Features", className: "absolute right-0 z-50 mt-3 w-64 rounded-2xl border border-purple-500/50 bg-[var(--surface-panel)] shadow-2xl", children: [_jsx("div", { className: "flex items-center justify-between border-b border-[var(--surface-border)] px-4 py-3", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Sparkles, { className: "w-4 h-4 text-purple-400" }), _jsx("p", { className: "text-sm font-semibold text-[var(--text-primary)]", children: "Features" })] }) }), _jsx("div", { className: "space-y-1 px-2 py-2", style: { fontSize: tokens.fontSize.sm }, children: features.map(feature => {
                                    const Icon = feature.icon;
                                    const colorClass = {
                                        purple: 'text-purple-400',
                                        blue: 'text-blue-400',
                                        green: 'text-green-400',
                                        yellow: 'text-yellow-400',
                                        pink: 'text-pink-400',
                                        cyan: 'text-cyan-400',
                                        orange: 'text-orange-400',
                                    }[feature.color] || 'text-gray-400';
                                    return (_jsxs("button", { type: "button", onClick: e => {
                                            e.stopPropagation();
                                            if (e.nativeEvent?.stopImmediatePropagation) {
                                                e.nativeEvent.stopImmediatePropagation();
                                            }
                                            handleFeatureClick(feature.id);
                                        }, onMouseDown: e => {
                                            e.stopPropagation();
                                            if (e.nativeEvent?.stopImmediatePropagation) {
                                                e.nativeEvent.stopImmediatePropagation();
                                            }
                                        }, className: "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]", style: { zIndex: 10011, isolation: 'isolate' }, children: [_jsx(Icon, { className: `h-5 w-5 ${colorClass}` }), _jsx("span", { children: feature.label })] }, feature.id));
                                }) })] }))] }), activeFeature === 'split' && (_jsxs("div", { className: "fixed inset-0 z-[100] bg-gray-900", children: [_jsx(SplitView, {}), _jsx("button", { onClick: () => setActiveFeature(null), className: "absolute top-4 right-4 z-[101] p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700", children: "\u00D7" })] })), activeFeature === 'vault' && (_jsxs("div", { className: "fixed inset-0 z-[100] bg-gray-900", children: [_jsx(RegenVault, {}), _jsx("button", { onClick: () => setActiveFeature(null), className: "absolute top-4 right-4 z-[101] p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700", children: "\u00D7" })] })), activeFeature === 'theme' && (_jsx("div", { className: "fixed inset-0 z-[100] bg-gray-900 overflow-y-auto", children: _jsxs("div", { className: "max-w-4xl mx-auto p-8", children: [_jsx(ThemeEngine, {}), _jsx("button", { onClick: () => setActiveFeature(null), className: "mt-4 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700", children: "Close" })] }) })), activeFeature === 'dev' && (_jsxs("div", { className: "fixed inset-0 z-[100] bg-gray-900", children: [_jsx(AIDeveloperConsole, {}), _jsx("button", { onClick: () => setActiveFeature(null), className: "absolute top-4 right-4 z-[101] p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700", children: "\u00D7" })] })), regenSidebarOpen && (_jsx("div", { className: "fixed right-0 top-0 bottom-0 w-96 z-[90]", children: _jsx(EnhancedRegenSidebar, {}) }))] }));
}
