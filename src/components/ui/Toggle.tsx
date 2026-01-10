/**
 * Toggle Component - Switch/Toggle UI element
 * Used for enabling/disabling features or settings
 */

import React from "react";
import { motion } from "framer-motion";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = "md",
  className = "",
}: ToggleProps) {
  const sizeClasses = {
    sm: "w-8 h-4",
    md: "w-11 h-6",
    lg: "w-14 h-7",
  };

  const thumbSize = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const thumbTranslate = {
    sm: "translate-x-4",
    md: "translate-x-6",
    lg: "translate-x-7",
  };

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {(label || description) && (
        <div className="flex-1 mr-3">
          {label && (
            <label
              className={`cursor-pointer ${disabled ? "cursor-not-allowed opacity-50" : ""} ${
                size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm"
              } font-medium text-slate-200`}
            >
              {label}
            </label>
          )}
          {description && (
            <p className={`text-slate-400 mt-0.5 ${size === "sm" ? "text-xs" : "text-xs"}`}>
              {description}
            </p>
          )}
        </div>
      )}
      
      <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 ${
          sizeClasses[size]
        } ${
          checked
            ? disabled
              ? "bg-blue-600/50 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
            : disabled
            ? "bg-slate-700/50 cursor-not-allowed"
            : "bg-slate-700 hover:bg-slate-600"
        } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
        role="switch"
        aria-checked={checked}
        aria-label={label || "Toggle"}
      >
        <motion.span
          className={`inline-block rounded-full bg-white transition-transform ${
            thumbSize[size]
          }`}
          animate={{
            x: checked ? (size === "sm" ? 16 : size === "md" ? 24 : 28) : 4,
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
          }}
        />
      </button>
    </div>
  );
}
