/**
 * Regen Core Types
 * Type definitions for the Sentinel AI presence system
 */

export type RegenCoreState =
  | "observing"
  | "aware" // Awareness shift - eye opens wider, glow intensifies, no panel yet
  | "noticing"
  | "executing"
  | "reporting";

export type RegenSignal =
  | "TAB_REDUNDANT"
  | "SEARCH_LOOP"
  | "LONG_SCROLL"
  | "IDLE"
  | "ERROR";

export interface RegenObservation {
  signal: RegenSignal;
  statement: string;
  action?: string;
  actionLabel?: string;
  reasoning?: string;
}

export interface RegenReport {
  title: string;
  metrics: string[];
  points?: string[];
}
