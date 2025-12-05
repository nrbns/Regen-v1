type HeadingSize = 'xs' | 'sm' | 'md' | 'lg';
export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
    size?: HeadingSize;
    eyebrow?: string;
}
export declare function Heading({ size, eyebrow, className, children, ...props }: HeadingProps): import("react/jsx-runtime").JSX.Element;
export interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
    muted?: boolean;
    subtle?: boolean;
}
export declare function Text({ muted, subtle, className, children, ...props }: TextProps): import("react/jsx-runtime").JSX.Element;
export {};
