export const getEnvVar = (key: string): string | undefined => {
  if (typeof process !== 'undefined' && process?.env && process.env[key] !== undefined) {
    return process.env[key];
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key] !== undefined) {
    return (import.meta as any).env[key];
  }
  return undefined;
};

export const isDevEnv = (): boolean => {
  const nodeMode = getEnvVar('NODE_ENV');
  if (nodeMode) {
    return nodeMode === 'development';
  }
  const viteMode = getEnvVar('MODE');
  return viteMode === 'development';
};

export const isElectronRuntime = (): boolean => {
  return typeof window !== 'undefined' && Boolean((window as any).electron);
};
