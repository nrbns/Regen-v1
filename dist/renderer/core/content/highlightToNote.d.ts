/**
 * Highlight to Note Workflow - Real-time text selection → note creation
 */
export declare class HighlightToNote {
    private static selectionListener;
    private static isEnabled;
    /**
     * Enable highlight → note workflow
     */
    static enable(): void;
    /**
     * Disable highlight → note workflow
     */
    static disable(): void;
    /**
     * Handle text selection
     */
    private static handleSelection;
    /**
     * Show floating action button for creating note
     */
    private static showFloatingButton;
    /**
     * Create note from text selection
     */
    private static createNoteFromSelection;
    /**
     * Show note creation dialog
     */
    private static showNoteDialog;
    /**
     * Show notification
     */
    private static showNotification;
    /**
     * Add context menu option
     */
    private static addContextMenu;
    /**
     * Remove context menu
     */
    private static removeContextMenu;
}
