/**
 * Omni OS Layer
 * Auto PDF, Excel, Doc processing + Voice commands + Multi-agent workflows
 */
import { type AgentMode } from '../agents/multiAgentSystem';
import type { Action } from '../actions/safeExecutor';
export interface DocumentMetadata {
    type: 'pdf' | 'excel' | 'doc' | 'docx' | 'txt';
    path: string;
    size: number;
    pages?: number;
    sheets?: number;
    createdAt: number;
    modifiedAt: number;
}
export interface DocumentInsight {
    type: 'summary' | 'key-points' | 'tables' | 'actions' | 'entities';
    content: string;
    confidence: number;
    metadata?: Record<string, unknown>;
}
export interface VoiceCommand {
    text: string;
    intent: string;
    confidence: number;
    entities: Record<string, string>;
}
declare class OmniOSLayer {
    /**
     * Auto-process PDF
     */
    processPDF(path: string, options?: {
        extractText?: boolean;
        extractTables?: boolean;
        summarize?: boolean;
    }): Promise<{
        metadata: DocumentMetadata;
        text?: string;
        tables?: unknown[];
        summary?: string;
        insights?: DocumentInsight[];
    }>;
    /**
     * Auto-process Excel
     */
    processExcel(path: string, options?: {
        extractData?: boolean;
        analyze?: boolean;
    }): Promise<{
        metadata: DocumentMetadata;
        sheets?: Array<{
            name: string;
            data: unknown[][];
        }>;
        summary?: string;
        insights?: DocumentInsight[];
    }>;
    /**
     * Auto-process Doc/Docx
     */
    processDoc(path: string, options?: {
        extractText?: boolean;
        extractFormatting?: boolean;
        summarize?: boolean;
    }): Promise<{
        metadata: DocumentMetadata;
        text?: string;
        summary?: string;
        insights?: DocumentInsight[];
    }>;
    /**
     * Process voice command (Whisper)
     */
    processVoiceCommand(audioData: ArrayBuffer): Promise<VoiceCommand>;
    /**
     * Execute voice command
     */
    executeVoiceCommand(command: VoiceCommand): Promise<{
        success: boolean;
        actions?: Action[];
        result?: unknown;
    }>;
    /**
     * Multi-agent workflow execution
     */
    executeWorkflow(workflow: Array<{
        agent: AgentMode;
        query: string;
        context?: Record<string, unknown>;
    }>): Promise<Array<{
        agent: AgentMode;
        result: unknown;
        success: boolean;
    }>>;
    /**
     * Generate insights from document
     */
    private generateInsights;
    /**
     * Extract key points from text
     */
    private extractKeyPoints;
    /**
     * Extract action items from text
     */
    private extractActionItems;
}
export declare const omniOSLayer: OmniOSLayer;
export {};
