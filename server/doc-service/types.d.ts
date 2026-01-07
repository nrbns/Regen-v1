/**
 * Document Auto-Edit Service Types
 */
export type EditTask = 'rewrite' | 'grammar' | 'summarize' | 'expand' | 'translate' | 'formal' | 'casual' | 'concise' | 'bulletize' | 'normalize' | 'fill-template';
export interface EditOptions {
    style?: 'preserve' | 'formal' | 'casual' | 'concise' | 'professional';
    language?: string;
    output?: 'original' | 'docx' | 'pdf' | 'txt' | 'md';
    cloudLLM?: boolean;
    preserveFormatting?: boolean;
    template?: Record<string, string>;
}
export interface EditResult {
    outputPath?: string;
    encryptedPath?: string;
    changes: Change[];
    confidence: 'high' | 'medium' | 'low';
    metadata?: {
        model?: string;
        processingTime?: number;
        wordCount?: number;
        pageCount?: number;
    };
}
export interface Change {
    type: 'added' | 'removed' | 'modified';
    original?: string;
    edited?: string;
    position?: number;
    section?: string;
}
export interface DocumentMetadata {
    title?: string;
    author?: string;
    pages?: number;
    wordCount?: number;
    language?: string;
    createdAt?: Date;
    modifiedAt?: Date;
}
