import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * PrivacySwitch - Toggle between Normal/Private/Ghost modes
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, Network } from 'lucide-react';
import { useProfileStore } from '../state/profileStore';
import { useTabsStore } from '../state/tabsStore';
import { detectTorBrowser } from '../core/tor-detector';
import { getGhostMode, isGhostModeEnabled } from '../core/ghost-mode';
export function PrivacySwitch() {
    const [mode, setMode] = useState('Normal');
    const [torDetected, setTorDetected] = useState(false);
    const [ghostModeActive, setGhostModeActive] = useState(false);
    const policy = useProfileStore(state => state.policies[state.activeProfileId]);
    // Detect Tor Browser on mount
    useEffect(() => {
        const torDetection = detectTorBrowser();
        setTorDetected(torDetection.isTorBrowser);
        // Auto-enable Ghost Mode if Tor is detected
        if (torDetection.isTorBrowser && torDetection.confidence !== 'low') {
            const ghostMode = getGhostMode();
            if (!ghostMode.isEnabled()) {
                ghostMode.enable();
                setMode('Ghost');
                setGhostModeActive(true);
            }
        }
        // Check if Ghost Mode is already enabled
        setGhostModeActive(isGhostModeEnabled());
    }, []);
    const privateDisabled = policy ? !policy.allowPrivateWindows : false;
    const ghostDisabled = policy ? !policy.allowGhostTabs : false;
    const modes = [
        { value: 'Normal', icon: Lock, label: 'Normal', color: 'text-gray-400' },
        {
            value: 'Private',
            icon: Eye,
            label: 'Private',
            color: 'text-blue-400',
            disabled: privateDisabled,
        },
        {
            value: 'Ghost',
            icon: Network,
            label: 'Ghost',
            color: 'text-purple-400',
            disabled: ghostDisabled,
            badge: torDetected ? 'Tor' : undefined,
        },
    ];
    const handleModeChange = async (newMode) => {
        if (newMode === mode)
            return;
        const target = modes.find(m => m.value === newMode);
        if (target?.disabled) {
            return;
        }
        const { ipc } = await import('../lib/ipc-typed');
        const { activeId } = useTabsStore.getState();
        const ghostMode = getGhostMode();
        if (newMode === 'Ghost') {
            // Enable Ghost Mode
            try {
                // Check if Tor is detected
                const torDetection = detectTorBrowser();
                if (!torDetection.isTorBrowser) {
                    const confirmed = confirm('⚠️ Ghost Mode is most secure when running inside Tor Browser.\n\n' +
                        'Without Tor Browser, some security features may be limited.\n\n' +
                        'Enable Ghost Mode anyway?');
                    if (!confirmed) {
                        return;
                    }
                }
                ghostMode.enable();
                setGhostModeActive(true);
                // Enable Tor proxy if available
                if (activeId) {
                    try {
                        await ipc.proxy.set({
                            tabId: activeId,
                            type: 'socks5',
                            host: '127.0.0.1',
                            port: 9050, // Default Tor port
                        });
                    }
                    catch (error) {
                        console.warn('Could not set Tor proxy:', error);
                        // Continue anyway - Ghost Mode can work without Tor proxy
                    }
                }
                setMode('Ghost');
            }
            catch (error) {
                console.error('Failed to enable Ghost mode:', error);
            }
            return;
        }
        if (newMode === 'Normal') {
            // Disable Ghost Mode if active
            if (ghostModeActive) {
                ghostMode.disable();
                setGhostModeActive(false);
            }
            // Normal mode: Clear any active proxy settings
            try {
                if (activeId) {
                    // Clear per-tab proxy by omitting type/host/port
                    await ipc.proxy.set({ tabId: activeId });
                }
                // Clear global proxy by omitting type/host/port (schema allows optional fields)
                await ipc.proxy.set({});
                setMode('Normal');
            }
            catch (error) {
                console.error('Failed to switch to Normal mode:', error);
                setMode('Normal');
            }
        }
        else if (newMode === 'Private') {
            // Private = Incognito mode (separate session, no history)
            try {
                await ipc.private.createWindow({ url: 'about:blank' });
                // Reset mode after creating window (don't keep it active)
                setMode('Normal');
                return; // Don't set mode again at the end
            }
            catch (error) {
                console.error('Failed to create private window:', error);
                return;
            }
        }
        // Only set mode if we haven't already set it (Normal and Private modes set it themselves)
        if (newMode !== 'Normal' && newMode !== 'Private') {
            setMode(newMode);
        }
    };
    return (_jsx("div", { className: "flex items-center gap-1 rounded-lg border border-gray-700/50 bg-gray-800/50 p-1", role: "group", "aria-label": "Privacy mode selector", children: modes.map(m => {
            const Icon = m.icon;
            const isActive = mode === m.value;
            return (_jsxs(motion.button, { type: "button", onClick: () => handleModeChange(m.value), onKeyDown: e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleModeChange(m.value);
                    }
                }, whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, className: `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${isActive
                    ? `${m.color.replace('text-', 'bg-')} bg-opacity-20 text-white`
                    : m.disabled
                        ? 'cursor-not-allowed text-gray-600'
                        : 'text-gray-400 hover:text-gray-300'}`, disabled: m.disabled, "aria-label": `Switch to ${m.label} privacy mode`, "aria-pressed": isActive, "aria-disabled": m.disabled, title: m.disabled ? `${m.label} disabled by profile policy` : `Switch to ${m.label}`, children: [_jsx(Icon, { size: 14, "aria-hidden": "true" }), _jsx("span", { children: m.label }), m.badge && (_jsx("span", { className: "text-[10px] opacity-75", title: "Tor Browser detected", children: m.badge }))] }, m.value));
        }) }));
}
