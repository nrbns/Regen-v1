import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Features Hub - Central access point for all v1 features
 */
import { useState } from 'react';
import { Sparkles, PanelRight, Columns, Lock, Zap, Palette, Cloud, Code, X } from 'lucide-react';
import { useAppStore } from '../../state/appStore';
import { EnhancedRegenSidebar } from '../regen/EnhancedRegenSidebar';
import { SplitView } from '../split-view/SplitView';
import { RegenVault } from '../vault/RegenVault';
import { ThemeEngine } from '../themes/ThemeEngine';
import { AIDeveloperConsole } from '../dev-console/AIDeveloperConsole';
import { LightningMode } from '../../core/lightning/LightningMode';
import { toast } from '../../utils/toast';
export function FeaturesHub() {
    const [activeFeature, setActiveFeature] = useState(null);
    const { regenSidebarOpen, setRegenSidebarOpen } = useAppStore();
    const features = [
        { id: 'sidebar', icon: PanelRight, label: 'Regen Sidebar', color: 'purple' },
        { id: 'split', icon: Columns, label: 'Split View', color: 'blue' },
        { id: 'vault', icon: Lock, label: 'Regen Vault', color: 'green' },
        { id: 'lightning', icon: Zap, label: 'Lightning Mode', color: 'yellow' },
        { id: 'theme', icon: Palette, label: 'Theme Engine', color: 'pink' },
        { id: 'sync', icon: Cloud, label: 'Sync Cloud', color: 'cyan' },
        { id: 'dev', icon: Code, label: 'Dev Console', color: 'orange' },
    ];
    return (_jsxs(_Fragment, { children: [!activeFeature && (_jsxs("div", { className: "fixed top-20 right-6 md:top-[72px] md:right-8 z-50 bg-gray-900 border border-purple-500/50 rounded-2xl p-4 shadow-2xl max-w-xs", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs("h3", { className: "text-sm font-semibold text-white flex items-center gap-2", children: [_jsx(Sparkles, { className: "w-4 h-4 text-purple-400" }), "Features"] }), _jsx("button", { onClick: () => setActiveFeature(null), className: "text-gray-400 hover:text-white", children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsx("div", { className: "space-y-2", children: features.map(feature => {
                            const Icon = feature.icon;
                            return (_jsxs("button", { onClick: () => {
                                    if (feature.id === 'sidebar') {
                                        setRegenSidebarOpen(true);
                                    }
                                    else {
                                        setActiveFeature(feature.id);
                                    }
                                }, className: "w-full flex items-center gap-3 p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors", children: [_jsx(Icon, { className: `w-5 h-5 text-${feature.color}-400` }), _jsx("span", { className: "text-sm text-white", children: feature.label })] }, feature.id));
                        }) })] })), activeFeature === 'split' && (_jsxs("div", { className: "fixed inset-0 z-[100] bg-gray-900", children: [_jsx(SplitView, {}), _jsx("button", { onClick: () => setActiveFeature(null), className: "absolute top-4 right-4 z-[101] p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700", children: _jsx(X, { className: "w-5 h-5" }) })] })), activeFeature === 'vault' && (_jsxs("div", { className: "fixed inset-0 z-[100] bg-gray-900", children: [_jsx(RegenVault, {}), _jsx("button", { onClick: () => setActiveFeature(null), className: "absolute top-4 right-4 z-[101] p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700", children: _jsx(X, { className: "w-5 h-5" }) })] })), activeFeature === 'theme' && (_jsx("div", { className: "fixed inset-0 z-[100] bg-gray-900 overflow-y-auto", children: _jsxs("div", { className: "max-w-4xl mx-auto p-8", children: [_jsx(ThemeEngine, {}), _jsx("button", { onClick: () => setActiveFeature(null), className: "mt-4 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700", children: "Close" })] }) })), activeFeature === 'dev' && (_jsxs("div", { className: "fixed inset-0 z-[100] bg-gray-900", children: [_jsx(AIDeveloperConsole, {}), _jsx("button", { onClick: () => setActiveFeature(null), className: "absolute top-4 right-4 z-[101] p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700", children: _jsx(X, { className: "w-5 h-5" }) })] })), activeFeature === 'lightning' && (_jsxs("div", { className: "fixed bottom-4 right-4 z-50 bg-gray-900 border border-yellow-500/50 rounded-lg p-4 shadow-2xl", children: [_jsxs("div", { className: "flex items-center gap-3 mb-3", children: [_jsx(Zap, { className: "w-5 h-5 text-yellow-400" }), _jsx("h3", { className: "text-sm font-semibold text-white", children: "Lightning Mode" })] }), _jsxs("button", { onClick: () => {
                            if (LightningMode.isEnabled()) {
                                LightningMode.disable();
                                toast.success('Lightning Mode disabled');
                            }
                            else {
                                LightningMode.enable();
                                toast.success('Lightning Mode enabled - faster browsing!');
                            }
                            setActiveFeature(null);
                        }, className: `w-full px-4 py-2 rounded-lg font-semibold ${LightningMode.isEnabled()
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-yellow-600 hover:bg-yellow-700 text-white'}`, children: [LightningMode.isEnabled() ? 'Disable' : 'Enable', " Lightning Mode"] })] })), activeFeature === 'sync' && (_jsxs("div", { className: "fixed bottom-4 right-4 z-50 bg-gray-900 border border-cyan-500/50 rounded-lg p-4 shadow-2xl max-w-sm", children: [_jsxs("div", { className: "flex items-center gap-3 mb-3", children: [_jsx(Cloud, { className: "w-5 h-5 text-cyan-400" }), _jsx("h3", { className: "text-sm font-semibold text-white", children: "Sync Cloud" })] }), _jsx("p", { className: "text-xs text-gray-400 mb-3", children: "Sync bookmarks, history, and settings across devices" }), _jsx("input", { type: "text", placeholder: "User ID", className: "w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm mb-2" }), _jsx("input", { type: "password", placeholder: "Sync Token", className: "w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm mb-3" }), _jsx("button", { onClick: () => {
                            toast.info('Sync feature - configure your sync endpoint');
                            setActiveFeature(null);
                        }, className: "w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold", children: "Enable Sync" })] })), regenSidebarOpen && (_jsx("div", { className: "fixed right-0 top-0 bottom-0 w-96 z-[90]", children: _jsx(EnhancedRegenSidebar, {}) }))] }));
}
