// Lightweight shim for Tauri `invoke` to make static imports safe in web/dev/test
export async function invoke(command: string, args?: any) {
  if (typeof (globalThis as any).mockInvoke === 'function') {
    return (globalThis as any).mockInvoke(command, args);
  }

  try {
    const modName = '@tauri-apps' + '/api/core';
    const { safeImport } = await import('../utils/safeImport').catch(() => ({ safeImport: null }));
    if (!safeImport) throw new Error('safeImport unavailable');
    const mod = await safeImport(modName, [modName]);
    if (mod && typeof mod.invoke === 'function') {
      return mod.invoke(command, args);
    }
  } catch (err) {
    // ignore - fallthrough to noop
  }

  return Promise.resolve(null);
}

export default { invoke };
