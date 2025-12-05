import { HTMLMotionProps } from 'framer-motion';
type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';
export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'size' | 'children'> {
    tone?: ButtonTone;
    size?: ButtonSize;
    loading?: boolean;
    icon?: React.ReactNode;
    trailingIcon?: React.ReactNode;
    fullWidth?: boolean;
    children?: React.ReactNode;
}
export declare const Button: import("react").ForwardRefExoticComponent<Omit<ButtonProps, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;
/**
 * IconButton - Icon-only button variant
 */
export interface IconButtonProps extends Omit<ButtonProps, 'icon' | 'trailingIcon' | 'children'> {
    icon: React.ReactNode;
    'aria-label': string;
}
export declare const IconButton: import("react").ForwardRefExoticComponent<Omit<IconButtonProps, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;
/**
 * FAB - Floating Action Button
 */
export interface FABProps extends Omit<ButtonProps, 'size'> {
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    fixed?: boolean;
}
export declare const FAB: import("react").ForwardRefExoticComponent<Omit<FABProps, "ref"> & import("react").RefAttributes<HTMLButtonElement>>;
export {};
