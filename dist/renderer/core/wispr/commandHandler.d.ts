/**
 * WISPR Command Handler
 * Parses and routes voice commands to appropriate executors
 */
export type WisprCommandType = 'trade' | 'search' | 'research' | 'summarize' | 'explain' | 'fill_form' | 'save_profile' | 'screenshot' | 'open_tabs' | 'navigate' | 'weather' | 'train' | 'flight' | 'unknown';
export interface ParsedWisprCommand {
    type: WisprCommandType;
    query?: string;
    symbol?: string;
    quantity?: number;
    stopLoss?: number;
    takeProfit?: number;
    orderType?: 'buy' | 'sell' | 'market' | 'limit';
    tabs?: number;
    url?: string;
    language?: string;
    originalText: string;
}
/**
 * Parse voice command into structured command
 */
export declare function parseWisprCommand(text: string): ParsedWisprCommand;
/**
 * Execute parsed WISPR command
 */
export declare function executeWisprCommand(command: ParsedWisprCommand): Promise<void>;
export declare function executeWeatherCommand(command: ParsedWisprCommand): Promise<void>;
export declare function executeTrainCommand(command: ParsedWisprCommand): Promise<void>;
export declare function executeFlightCommand(command: ParsedWisprCommand): Promise<void>;
