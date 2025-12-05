/**
 * Voice Command Parser for Research Mode
 * Parses voice commands like "Research in Bengali about AI" or "Research about quantum computing"
 */
export interface ParsedVoiceCommand {
    isResearchCommand: boolean;
    language?: string;
    query: string;
    originalText: string;
}
/**
 * Parse voice command to extract research query and language
 */
export declare function parseResearchVoiceCommand(text: string): ParsedVoiceCommand;
/**
 * Check if text contains a research command
 */
export declare function isResearchCommand(text: string): boolean;
