/**
 * Ollama Auto-Installer
 * Downloads, installs Ollama, and pulls required models automatically
 * Works on Windows, macOS, and Linux
 */
export interface InstallProgress {
    stage: 'checking' | 'downloading' | 'installing' | 'pulling_models' | 'complete' | 'error';
    progress: number;
    message: string;
    modelProgress?: {
        model: string;
        progress: number;
    };
}
type ProgressCallback = (progress: InstallProgress) => void;
/**
 * Check if Ollama is already installed
 */
export declare function checkOllamaInstalled(): Promise<boolean>;
/**
 * Check which models are already installed
 */
export declare function checkInstalledModels(): Promise<string[]>;
/**
 * Full installation workflow
 */
export declare function installOllamaAndModels(onProgress: ProgressCallback): Promise<void>;
export {};
