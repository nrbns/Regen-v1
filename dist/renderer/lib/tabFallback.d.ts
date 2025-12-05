type FallbackOptions = {
    url?: string;
    title?: string;
    activate?: boolean;
    mode?: 'normal' | 'ghost' | 'private';
};
export declare function createFallbackTab(options?: FallbackOptions): {
    id: string;
    title: string;
    url: string;
    active: boolean;
    mode: "normal" | "ghost" | "private";
} | null;
export {};
