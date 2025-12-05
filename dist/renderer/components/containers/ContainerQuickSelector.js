import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * ContainerQuickSelector - Quick access to Work/Personal/Anonymous containers
 */
import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, User, EyeOff, ChevronDown } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import { useContainerStore } from '../../state/containerStore';
import { isWebMode } from '../../lib/env';
const PRESET_CONTAINERS = [
    {
        name: 'Work',
        color: '#3b82f6',
        icon: Briefcase,
        description: 'Work-related browsing',
    },
    {
        name: 'Personal',
        color: '#10b981',
        icon: User,
        description: 'Personal browsing',
    },
    {
        name: 'Anonymous',
        color: '#8b5cf6',
        icon: EyeOff,
        description: 'Private browsing',
    },
];
export function ContainerQuickSelector({ onSelect, compact = false, showLabel = true, }) {
    const { containers, activeContainerId, setActiveContainer } = useContainerStore();
    const [open, setOpen] = useState(false);
    const [presetContainers, setPresetContainers] = useState([]);
    // Ensure preset containers exist
    useEffect(() => {
        const ensurePresets = async () => {
            // Skip container operations in web mode
            if (isWebMode()) {
                // In web mode, use mock preset containers
                const mockPresets = PRESET_CONTAINERS.map((preset, index) => ({
                    id: `preset-${index}`,
                    name: preset.name,
                    color: preset.color,
                    scope: 'global',
                }));
                setPresetContainers(mockPresets);
                return;
            }
            try {
                const existing = await ipc.containers.list().catch(() => []);
                // const presetNames = PRESET_CONTAINERS.map(p => p.name.toLowerCase()); // Unused for now
                const missing = PRESET_CONTAINERS.filter(preset => !existing.some(c => c.name.toLowerCase() === preset.name.toLowerCase()));
                if (missing.length > 0) {
                    // Create missing preset containers
                    for (const preset of missing) {
                        try {
                            await ipc.containers.create({
                                name: preset.name,
                                color: preset.color,
                            });
                        }
                        catch {
                            // Suppress errors - containers are optional
                        }
                    }
                }
                // Reload containers
                const updated = await ipc.containers.list().catch(() => []);
                const presets = [];
                for (const preset of PRESET_CONTAINERS) {
                    const found = updated.find(c => c.name.toLowerCase() === preset.name.toLowerCase());
                    if (found && found.scope) {
                        presets.push(found);
                    }
                }
                setPresetContainers(presets);
            }
            catch {
                // Suppress errors - use mock containers as fallback
                const mockPresets = PRESET_CONTAINERS.map((preset, index) => ({
                    id: `preset-${index}`,
                    name: preset.name,
                    color: preset.color,
                    scope: 'global',
                }));
                setPresetContainers(mockPresets);
            }
        };
        void ensurePresets();
    }, []);
    // Update preset containers when containers change
    useEffect(() => {
        const presets = PRESET_CONTAINERS.map(preset => containers.find(c => c.name.toLowerCase() === preset.name.toLowerCase())).filter((c) => c !== undefined);
        setPresetContainers(presets);
    }, [containers]);
    const handleSelect = useCallback(async (container) => {
        // In web mode, just update local state
        if (isWebMode()) {
            setActiveContainer(container);
            onSelect?.(container.id);
            setOpen(false);
            return;
        }
        try {
            const active = await ipc.containers.setActive(container.id);
            if (active) {
                setActiveContainer(active);
            }
            else {
                setActiveContainer(container);
            }
            onSelect?.(container.id);
            setOpen(false);
        }
        catch {
            // Suppress errors - just update local state
            setActiveContainer(container);
            onSelect?.(container.id);
            setOpen(false);
        }
    }, [onSelect, setActiveContainer]);
    const activeContainer = containers.find(c => c.id === activeContainerId);
    const activePreset = presetContainers.find(c => c.id === activeContainerId);
    const activePresetDef = activePreset
        ? PRESET_CONTAINERS.find(p => p.name.toLowerCase() === activePreset.name.toLowerCase())
        : null;
    const Icon = activePresetDef?.icon || Briefcase;
    if (compact) {
        return (_jsxs("div", { className: "relative", children: [_jsxs(motion.button, { onClick: () => setOpen(!open), whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, className: "flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 transition-colors hover:bg-white/10", title: activeContainer?.name || 'Select container', children: [activePresetDef && _jsx(Icon, { size: 14, className: "text-muted" }), !activePresetDef && activeContainer?.color && (_jsx("div", { className: "h-3 w-3 rounded-full", style: { backgroundColor: activeContainer.color } })), showLabel && activeContainer && (_jsx("span", { className: "text-muted text-xs", children: activeContainer.name })), _jsx(ChevronDown, { size: 12, className: "text-muted" })] }), _jsx(AnimatePresence, { children: open && (_jsxs(_Fragment, { children: [_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "fixed inset-0 z-30", onClick: () => setOpen(false) }), _jsx(motion.div, { initial: { opacity: 0, y: -8, scale: 0.95 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -8, scale: 0.95 }, className: "bg-surface-elevated/95 absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 shadow-2xl backdrop-blur-xl", children: _jsx("div", { className: "p-2", children: presetContainers.map(container => {
                                        const preset = PRESET_CONTAINERS.find(p => p.name.toLowerCase() === container.name.toLowerCase());
                                        const PresetIcon = preset?.icon || Briefcase;
                                        const isActive = container.id === activeContainerId;
                                        return (_jsxs(motion.button, { onClick: () => handleSelect(container), whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, className: `flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors ${isActive
                                                ? 'bg-primary/20 border-primary/40 text-primary border'
                                                : 'text-muted hover:text-primary hover:bg-white/10'}`, children: [_jsx(PresetIcon, { size: 16 }), _jsxs("div", { className: "flex-1 text-left", children: [_jsx("div", { className: "text-sm font-medium", children: container.name }), preset && (_jsx("div", { className: "text-muted/70 text-xs", children: preset.description }))] }), isActive && _jsx("div", { className: "bg-primary h-2 w-2 rounded-full" })] }, container.id));
                                    }) }) })] })) })] }));
    }
    // Full selector with all containers
    return (_jsx("div", { className: "flex items-center gap-2", children: presetContainers.map(container => {
            const preset = PRESET_CONTAINERS.find(p => p.name.toLowerCase() === container.name.toLowerCase());
            const PresetIcon = preset?.icon || Briefcase;
            const isActive = container.id === activeContainerId;
            return (_jsxs(motion.button, { onClick: () => handleSelect(container), whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, className: `flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-all ${isActive
                    ? 'bg-primary/20 border-primary/40 text-primary shadow-primary/20 shadow-lg'
                    : 'text-muted hover:text-primary border-white/10 bg-white/5 hover:bg-white/10'}`, title: preset?.description || container.name, children: [_jsx(PresetIcon, { size: 16 }), showLabel && _jsx("span", { className: "text-sm font-medium", children: container.name })] }, container.id));
        }) }));
}
