/**
 * Command Input Component - Regen-v1
 * 
 * Single command strip for user input.
 * Like Siri/Google Assistant but quieter.
 */

import React, { useState, useEffect, useRef } from "react";
import { regenEventBus } from "../../core/events/eventBus";
import { useAvatar } from "../../core/avatar/avatarStore";

interface CommandInputProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export default function CommandInput({ isOpen, onClose, className = "" }: CommandInputProps) {
  const [command, setCommand] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { state, set } = useAvatar();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim()) {
      // Emit command event - intent observer will handle it
      regenEventBus.emit({ type: "COMMAND", payload: command.trim() });
      setCommand("");
      onClose();
      
      // Avatar state will be updated by intent observer
      // Don't set state here - let the system handle it
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      setCommand("");
      // Return avatar to idle
      const { set } = useAvatar.getState();
      set("idle");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`command-input ${className}`}
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 10000,
        background: "rgba(15, 23, 42, 0.95)",
        border: "1px solid rgba(148, 163, 184, 0.3)",
        borderRadius: "12px",
        padding: "16px 20px",
        minWidth: "400px",
        maxWidth: "600px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
      }}
    >
      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tell Regen what to do…"
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            color: "rgba(241, 245, 249, 0.9)",
            fontSize: "16px",
            padding: "8px 0",
          }}
        />
      </form>
    </div>
  );
}