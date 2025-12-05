/**
 * Document Editor Types (Frontend)
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
    id: string;
    task: EditTask;
    fileType: string;
    originalName: string;
    downloadUrl: string;
    previewUrl: string;
    changes: Array<{
        type: 'added' | 'removed' | 'modified';
        original?: string;
        edited?: string;
        position?: number;
        section?: string;
    }>;
    confidence: 'high' | 'medium' | 'low';
    metadata?: {
        model?: string;
        processingTime?: number;
        wordCount?: number;
        pageCount?: number;
    };
}
