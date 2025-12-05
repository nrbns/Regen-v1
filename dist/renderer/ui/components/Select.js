import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Select Component
 * Accessible select dropdown
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { useTokens } from '../useTokens';
/**
 * Select - Accessible select dropdown
 *
 * Features:
 * - Keyboard navigation
 * - Search/filter
 * - ARIA attributes
 * - Custom styling
 */
export function Select({ options, value, onChange, placeholder = 'Select an option...', disabled = false, label, 'aria-label': ariaLabel, className = '', }) {
    const tokens = useTokens();
    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(0);
    const selectRef = useRef(null);
    const buttonRef = useRef(null);
    const selectedOption = options.find(opt => opt.value === value);
    // Close on outside click
    useEffect(() => {
        if (!isOpen)
            return;
        const handleClickOutside = (e) => {
            if (selectRef.current && !selectRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        window.addEventListener('mousedown', handleClickOutside);
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);
    // Keyboard navigation
    useEffect(() => {
        if (!isOpen)
            return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
                buttonRef.current?.focus();
                return;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedIndex(prev => (prev < options.length - 1 ? prev + 1 : 0));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedIndex(prev => (prev > 0 ? prev - 1 : options.length - 1));
                return;
            }
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const option = options[focusedIndex];
                if (option && !option.disabled) {
                    onChange(option.value);
                    setIsOpen(false);
                    buttonRef.current?.focus();
                }
                return;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, options, focusedIndex, onChange]);
    // Reset focused index when opening
    useEffect(() => {
        if (isOpen) {
            const currentIndex = options.findIndex(opt => opt.value === value);
            setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
        }
    }, [isOpen, options, value]);
    return (_jsxs("div", { className: `relative ${className}`, children: [label && (_jsx("label", { className: "block mb-1.5 text-[var(--text-primary)]", style: { fontSize: tokens.fontSize.sm }, children: label })), _jsxs("div", { ref: selectRef, className: "relative", children: [_jsxs("button", { ref: buttonRef, type: "button", onClick: () => !disabled && setIsOpen(!isOpen), disabled: disabled, "aria-label": ariaLabel || label, "aria-expanded": isOpen, "aria-haspopup": "listbox", className: `
            w-full flex items-center justify-between gap-2
            px-3 py-2 rounded-md
            bg-[var(--surface-elevated)] border border-[var(--surface-border)]
            text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
            transition-colors
            focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-[var(--surface-hover)]'}
          `, style: { fontSize: tokens.fontSize.sm }, children: [_jsxs("span", { className: "flex items-center gap-2 flex-1 min-w-0", children: [selectedOption?.icon && _jsx("span", { className: "flex-shrink-0", children: selectedOption.icon }), _jsx("span", { className: "truncate", children: selectedOption?.label || placeholder })] }), _jsx(ChevronDown, { size: 16, className: `flex-shrink-0 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}` })] }), _jsx(AnimatePresence, { children: isOpen && (_jsx(motion.ul, { initial: { opacity: 0, y: -8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.15 }, className: "absolute z-50 w-full mt-1 bg-[var(--surface-panel)] border border-[var(--surface-border)] rounded-md shadow-lg max-h-60 overflow-auto", role: "listbox", "aria-label": ariaLabel || label, children: options.map((option, index) => {
                                const isSelected = option.value === value;
                                const isFocused = index === focusedIndex;
                                const isDisabled = option.disabled;
                                return (_jsxs("li", { role: "option", "aria-selected": isSelected, onMouseEnter: () => setFocusedIndex(index), onClick: () => {
                                        if (!isDisabled) {
                                            onChange(option.value);
                                            setIsOpen(false);
                                            buttonRef.current?.focus();
                                        }
                                    }, className: `
                      flex items-center gap-2 px-3 py-2 cursor-pointer
                      transition-colors
                      ${isSelected ? 'bg-[var(--color-primary-600)] text-white' : ''}
                      ${isFocused && !isSelected ? 'bg-[var(--surface-hover)]' : ''}
                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `, style: { fontSize: tokens.fontSize.sm }, children: [option.icon && _jsx("span", { className: "flex-shrink-0", children: option.icon }), _jsx("span", { className: "flex-1", children: option.label }), isSelected && _jsx(Check, { size: 16, className: "flex-shrink-0" })] }, option.value));
                            }) })) })] })] }));
}
