export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    padding?: 'none' | 'sm' | 'md' | 'lg';
    surface?: 'panel' | 'elevated' | 'transparent';
}
export declare const Card: import("react").ForwardRefExoticComponent<CardProps & import("react").RefAttributes<HTMLDivElement>>;
export declare const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>>;
export declare const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>>;
export declare const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>>;
export declare const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>>;
export declare const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>>;
