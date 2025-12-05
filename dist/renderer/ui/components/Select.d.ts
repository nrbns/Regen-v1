/**
 * Select Component
 * Accessible select dropdown
 */
import React from 'react';
export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
    icon?: React.ReactNode;
}
export interface SelectProps {
    options: SelectOption[];
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    label?: string;
    'aria-label'?: string;
    className?: string;
}
/**
 * Select - Accessible select dropdown
 *
 * Features:
 * - Keyboard navigation
 * - Search/filter
 * - ARIA attributes
 * - Custom styling
 */
export declare function Select({ options, value, onChange, placeholder, disabled, label, 'aria-label': ariaLabel, className, }: SelectProps): import("react/jsx-runtime").JSX.Element;
