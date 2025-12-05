/**
 * Centralized error reporting hook
 * Provides consistent error handling and user feedback across the app
 */
import { useCallback } from 'react';
import { toast } from '../utils/toast';
export function useAppError() {
    const showError = useCallback((message, error, options = {}) => {
        const { showToUser = true, logToConsole = true, context = {}, fallback = null } = options;
        // Log to console with context
        if (logToConsole) {
            console.error('[App Error]', message, {
                error,
                ...context,
                timestamp: new Date().toISOString(),
            });
        }
        // Show user-friendly toast
        if (showToUser) {
            const userMessage = typeof message === 'string' && message.length > 0
                ? message
                : 'An unexpected error occurred';
            toast.error(userMessage);
        }
        return fallback;
    }, []);
    const handleError = useCallback((error, context, options = {}) => {
        const errorMessage = error instanceof Error
            ? error.message
            : typeof error === 'string'
                ? error
                : 'Unknown error occurred';
        const fullMessage = context ? `${context}: ${errorMessage}` : errorMessage;
        return showError(fullMessage, error, options);
    }, [showError]);
    const safeExecute = useCallback(async (fn, fallback, context) => {
        try {
            return await fn();
        }
        catch (error) {
            handleError(error, context, {
                showToUser: false, // Don't spam user for background operations
                logToConsole: true,
                fallback,
            });
            return fallback;
        }
    }, [handleError]);
    return {
        showError,
        handleError,
        safeExecute,
    };
}
