const MODES = ["research", "trade", "threat", "notes"];
const MODE_KEY = "MODE";

export function getModes() {
  return MODES.slice();
}

export async function getCurrentMode() {
  const stored = await chrome.storage.local.get({ [MODE_KEY]: MODES[0] });
  return stored[MODE_KEY];
}

export async function setMode(mode) {
  if (!MODES.includes(mode)) {
    throw new Error(`Unknown mode: ${mode}`);
  }
  await chrome.storage.local.set({ [MODE_KEY]: mode });
}

export async function cycleMode() {
  const current = await getCurrentMode();
  const idx = MODES.indexOf(current);
  const next = MODES[(idx + 1) % MODES.length];
  await setMode(next);
  return next;
}

