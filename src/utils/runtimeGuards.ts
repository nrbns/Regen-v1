// Runtime guards to distinguish desktop (Tauri) vs browser environments.
export function isDesktop(): boolean {
  try {
    // @ts-ignore - __TAURI__ is injected in Tauri renderer environments
    if (typeof window !== 'undefined' && (window as any).__TAURI__) return true
  } catch (e) {}
  try {
    // Some setups expose TAURI environment variable
    if (typeof process !== 'undefined' && (process as any).env && (process as any).env.TAURI) return true
  } catch (e) {}
  return false
}

export function isBrowser(): boolean {
  return !isDesktop()
}

export default { isDesktop, isBrowser }
