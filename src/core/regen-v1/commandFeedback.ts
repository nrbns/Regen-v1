/**
 * Command Feedback System - Regen-v1
 * 
 * Provides user feedback for command execution
 */

export interface CommandFeedback {
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
}

/**
 * Show command feedback to user
 */
export function showCommandFeedback(feedback: CommandFeedback): void {
  if (typeof window === "undefined") return;

  const event = new CustomEvent("regen:toast", {
    detail: {
      message: feedback.message,
      type: feedback.type,
      duration: feedback.duration || 3000,
    },
  });

  window.dispatchEvent(event);
}

/**
 * Show success feedback
 */
export function showSuccess(message: string, duration?: number): void {
  showCommandFeedback({
    message,
    type: "success",
    duration,
  });
}

/**
 * Show error feedback
 */
export function showError(message: string, duration?: number): void {
  showCommandFeedback({
    message,
    type: "error",
    duration,
  });
}

/**
 * Show info feedback
 */
export function showInfo(message: string, duration?: number): void {
  showCommandFeedback({
    message,
    type: "info",
    duration,
  });
}

/**
 * Show warning feedback
 */
export function showWarning(message: string, duration?: number): void {
  showCommandFeedback({
    message,
    type: "warning",
    duration,
  });
}
