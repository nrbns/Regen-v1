type ContainerWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    width?: ContainerWidth;
    padded?: boolean;
    bleed?: boolean;
}
export declare const Container: import("react").ForwardRefExoticComponent<ContainerProps & import("react").RefAttributes<HTMLDivElement>>;
export interface ScrollContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    padding?: 'none' | 'sm' | 'md';
}
export declare const ScrollContainer: import("react").ForwardRefExoticComponent<ScrollContainerProps & import("react").RefAttributes<HTMLDivElement>>;
export interface SectionProps extends React.HTMLAttributes<HTMLDivElement> {
    spacing?: 'sm' | 'md' | 'lg';
}
export declare function Section({ spacing, className, children, ...props }: SectionProps): import("react/jsx-runtime").JSX.Element;
interface SpacerProps {
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    axis?: 'vertical' | 'horizontal';
}
export declare function Spacer({ size, axis }: SpacerProps): import("react/jsx-runtime").JSX.Element;
export {};
