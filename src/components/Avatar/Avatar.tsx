/**
 * Avatar UI Component - Regen-v1
 * 
 * Interactive avatar interface like Siri/Google Assistant, but quieter and smarter.
 * Reacts instantly to events - no AI required for basic interactions.
 */

import React from "react";
import { useAvatar } from "../../core/avatar/avatarStore";
import { regenEventBus } from "../../core/events/eventBus";

interface AvatarProps {
  className?: string;
  size?: number;
}

export default function Avatar({ className = "", size = 64 }: AvatarProps) {
  const { state } = useAvatar();

  const handleClick = () => {
    // Emit immediately (non-blocking, real-time)
    regenEventBus.emit({ type: "AVATAR_INVOKE" });
  };

  return (
    <div
      className={`avatar avatar-${state} ${className}`}
      onClick={handleClick}
      style={{
        width: size,
        height: size,
        cursor: "pointer",
        transition: "transform 0.2s ease",
      }}
      role="button"
      aria-label="Invoke Regen Avatar"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Avatar visual representation */}
      <div
        className={`avatar-inner avatar-${state}`}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: getAvatarBackground(state),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.3s ease",
          transform: state === "listening" ? "scale(1.1)" : "scale(1)",
        }}
      >
        {/* Simple avatar icon/indicator */}
        <div
          style={{
            width: "60%",
            height: "60%",
            borderRadius: "50%",
            background: getAvatarForeground(state),
            opacity: getAvatarOpacity(state),
          }}
        />
      </div>
    </div>
  );
}

function getAvatarBackground(state: string): string {
  switch (state) {
    case "idle":
      return "rgba(148, 163, 184, 0.2)";
    case "aware":
      return "rgba(139, 92, 246, 0.3)";
    case "listening":
      return "rgba(139, 92, 246, 0.5)";
    case "thinking":
      return "rgba(59, 130, 246, 0.4)";
    case "reporting":
      return "rgba(34, 197, 94, 0.3)";
    default:
      return "rgba(148, 163, 184, 0.2)";
  }
}

function getAvatarForeground(state: string): string {
  switch (state) {
    case "idle":
      return "rgba(148, 163, 184, 0.4)";
    case "aware":
      return "rgba(139, 92, 246, 0.6)";
    case "listening":
      return "rgba(139, 92, 246, 0.8)";
    case "thinking":
      return "rgba(59, 130, 246, 0.7)";
    case "reporting":
      return "rgba(34, 197, 94, 0.6)";
    default:
      return "rgba(148, 163, 184, 0.4)";
  }
}

function getAvatarOpacity(state: string): number {
  switch (state) {
    case "idle":
      return 0.5;
    case "aware":
      return 0.7;
    case "listening":
      return 1.0;
    case "thinking":
      return 0.8;
    case "reporting":
      return 0.9;
    default:
      return 0.5;
  }
}