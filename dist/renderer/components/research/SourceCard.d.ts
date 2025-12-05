import type { ResearchSource } from '../../types/research';
type SourceCardProps = {
    source: ResearchSource;
    index: number;
    isActive: boolean;
    onActivate(sourceKey: string): void;
    onOpen(url: string): void;
};
export declare function SourceCard({ source, index, isActive, onActivate, onOpen }: SourceCardProps): import("react/jsx-runtime").JSX.Element;
export {};
