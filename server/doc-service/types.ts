/**
 * Document Auto-Edit Service Types
 */

export type EditTask =
  | 'rewrite'
  | 'grammar'
  | 'summarize'
  | 'expand'
  | 'translate'
  | 'formal'
  | 'casual'
  | 'concise'
  | 'bulletize'
  | 'normalize'
  | 'fill-template';

export interface EditOptions {
  style?: 'preserve' | 'formal' | 'casual' | 'concise' | 'professional';
  language?: string; // Target language code (e.g., 'en', 'hi', 'es')
  output?: 'original' | 'docx' | 'pdf' | 'txt' | 'md';
  cloudLLM?: boolean; // Use cloud LLM (requires consent)
  preserveFormatting?: boolean;
  template?: Record<string, string>; // For fill-template task
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
