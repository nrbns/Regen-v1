/**
 * Regen Core Store
 * Zustand store for Sentinel AI state management
 */

import { create } from "zustand";
import { RegenCoreState, RegenSignal, RegenObservation, RegenReport } from "./regenCore.types";

interface RegenCoreStore {
  state: RegenCoreState;
  signal?: RegenSignal;
  observation?: RegenObservation;
  report?: RegenReport;
  setState: (state: RegenCoreState) => void;
  emitSignal: (signal: RegenSignal, observation?: RegenObservation) => void;
  setReport: (report: RegenReport) => void;
  reset: () => void;
}

export const useRegenCore = create<RegenCoreStore>((set) => ({
  state: "observing",
  signal: undefined,
  observation: undefined,
  report: undefined,

  setState: (state) => set({ state }),

  emitSignal: (signal, observation) => {
    // First transition to "aware" state (awareness shift - avatar reacts, no panel)
    set({ 
      state: "aware", 
      signal,
    });
    
    // After brief delay, transition to "noticing" (show panel with suggestion)
    setTimeout(() => {
      set((prev) => ({
        ...prev,
        state: "noticing",
        observation: observation || {
          signal,
          statement: getDefaultStatement(signal),
        }
      }));
    }, 800); // 800ms awareness shift before showing panel
  },

  setReport: (report) => set({ state: "reporting", report }),

  reset: () => set({ 
    state: "observing", 
    signal: undefined, 
    observation: undefined,
    report: undefined 
  }),
}));

/**
 * Get default statement for a signal
 */
function getDefaultStatement(signal: RegenSignal): string {
  switch (signal) {
    case "TAB_REDUNDANT":
      return "Redundant content pattern detected.";
    case "SEARCH_LOOP":
      return "Query intent unclear. Refinement suggested.";
    case "LONG_SCROLL":
      return "Page credibility score: Moderate. Bias indicators present.";
    case "IDLE":
      return "Focus degradation detected after extended period.";
    case "ERROR":
      return "This request failed. Local alternative available.";
    default:
      return "Observation detected.";
  }
}
