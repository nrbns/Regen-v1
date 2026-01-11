/**
 * Avatar State Machine - Regen-v1
 * 
 * Live avatar state management with Zustand.
 * Avatar reacts instantly to events, even with AI OFF.
 */

import { create } from "zustand";

export type AvatarState =
  | "idle"
  | "aware"
  | "listening"
  | "thinking"
  | "reporting";

export const useAvatar = create<{
  state: AvatarState;
  set: (s: AvatarState) => void;
}>((set) => ({
  state: "idle",
  set: (s) => set({ state: s }),
}));