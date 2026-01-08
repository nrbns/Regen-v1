export const DEFAULT_ALLOWLIST = [
  // Add known, reviewed modules that may be loaded dynamically
  'some-known-module',
  'another-allowed-module',
];

export async function safeImport(moduleName: string, allowlist: string[] = DEFAULT_ALLOWLIST) {
  if (!moduleName || typeof moduleName !== 'string') {
    throw new Error('Invalid module name for dynamic import');
  }

  const allowed = allowlist.some(a => moduleName === a || moduleName.endsWith('/' + a));
  if (!allowed) {
    throw new Error(`Dynamic import blocked by policy: ${moduleName}`);
  }

  // Use dynamic import for allowed modules only

  // @ts-ignore
  return import(/* @vite-ignore */ moduleName);
}
