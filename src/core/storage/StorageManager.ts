/**
 * StorageManager
 * Centralized write guard for filesystem-like operations. v1 defaults to read-only
 * for most modules; only this manager may perform writes after policy checks.
 */

import path from 'path';

const APP_DATA_DIR = path.resolve(
  process.env.REGEN_DATA_DIR || path.join(process.cwd(), 'regen-data')
);

export function isPathAllowed(targetPath: string): boolean {
  const resolved = path.resolve(targetPath);
  return resolved.startsWith(APP_DATA_DIR);
}

export async function readFile(_p: string): Promise<string> {
  throw new Error('readFile not implemented in v1 shim');
}

export async function writeFile(p: string, _data: string): Promise<void> {
  if (!isPathAllowed(p)) {
    throw new Error('Write denied: path not allowed');
  }
  // Implement actual write with careful review; placeholder throws by default.
  throw new Error('writeFile not implemented in v1 shim');
}

export default { isPathAllowed, readFile, writeFile };
