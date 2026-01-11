/**
 * Avatar Status Indicator
 * Shows current system state in UI
 */

import { useAvatar } from "../../core/avatar/avatarStore";

export function AvatarStatusIndicator() {
  const { state } = useAvatar();

  const statusText = {
    idle: "Observing",
    aware: "Aware",
    listening: "Listening...",
    thinking: "Thinking...",
    reporting: "Reporting",
  }[state];

  // Don't show when idle
  if (state === "idle") return null;

  return (
    <div 
      className="avatar-status-indicator"
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        padding: "8px 16px",
        background: "rgba(15, 23, 42, 0.9)",
        border: "1px solid rgba(148, 163, 184, 0.3)",
        borderRadius: "8px",
        fontSize: "12px",
        color: "rgba(241, 245, 249, 0.9)",
        zIndex: 9999,
      }}
    >
      {statusText}
    </div>
  );
}