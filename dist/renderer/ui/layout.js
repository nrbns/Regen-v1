import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef, useMemo } from 'react';
import { cn } from '../lib/utils';
const widthMap = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-[var(--layout-page-width)]',
};
export const Container = forwardRef(({ width = '2xl', padded = true, bleed = false, className, ...props }, ref) => {
    const maxWidth = width === 'full' ? 'w-full' : widthMap[width];
    return (_jsx("div", { ...props, ref: ref, className: cn('mx-auto w-full', maxWidth, padded && 'px-[var(--layout-page-padding)]', bleed && '!px-0', className) }));
});
Container.displayName = 'Container';
const paddingMap = {
    none: '',
    sm: 'px-3 py-2',
    md: 'px-4 py-3',
};
export const ScrollContainer = forwardRef(({ padding = 'md', className, ...props }, ref) => (_jsx("div", { ...props, ref: ref, className: cn('flex-1 overflow-y-auto', paddingMap[padding], className) })));
ScrollContainer.displayName = 'ScrollContainer';
const sectionSpacing = {
    sm: 'py-4',
    md: 'py-6',
    lg: 'py-8',
};
export function Section({ spacing = 'md', className, children, ...props }) {
    return (_jsx("section", { className: cn('w-full', sectionSpacing[spacing], className), ...props, children: children }));
}
const spacerSizeMap = {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
};
export function Spacer({ size = 'md', axis = 'vertical' }) {
    const style = useMemo(() => {
        const value = spacerSizeMap[size];
        return axis === 'vertical' ? { height: value } : { width: value, display: 'inline-block' };
    }, [axis, size]);
    return _jsx("span", { "aria-hidden": "true", style: style });
}
