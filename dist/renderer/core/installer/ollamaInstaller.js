/**
 * Ollama Auto-Installer
 * Downloads, installs Ollama, and pulls required models automatically
 * Works on Windows, macOS, and Linux
 */
import { toast } from '../../utils/toast';
const OLLAMA_URLS = {
    windows: 'https://ollama.com/download/windows',
    macos: 'https://ollama.com/download/mac',
    linux: 'https://ollama.com/download/linux',
};
const REQUIRED_MODELS = ['phi3:mini', 'llava:7b'];
/**
 * Check if Ollama is already installed
 */
export async function checkOllamaInstalled() {
    try {
        // Try to run 'ollama --version' or check if ollama command exists
        if (typeof window !== 'undefined' && window.ipc) {
            const ipc = window.ipc;
            if (ipc.system && typeof ipc.system.checkCommand === 'function') {
                const result = await ipc.system.checkCommand('ollama');
                return result?.installed === true;
            }
        }
        // Fallback: Check if Ollama service is running
        try {
            const response = await fetch('http://localhost:11434/api/tags', { method: 'GET' });
            return response.ok;
        }
        catch {
            return false;
        }
    }
    catch {
        return false;
    }
}
/**
 * Check which models are already installed
 */
export async function checkInstalledModels() {
    try {
        const response = await fetch('http://localhost:11434/api/tags');
        if (!response.ok)
            return [];
        const data = await response.json();
        return (data.models || []).map((m) => m.name);
    }
    catch {
        return [];
    }
}
/**
 * Get platform-specific Ollama download URL
 */
function getOllamaDownloadUrl() {
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('win'))
        return OLLAMA_URLS.windows;
    if (platform.includes('mac'))
        return OLLAMA_URLS.macos;
    return OLLAMA_URLS.linux;
}
/**
 * Download Ollama installer
 */
async function downloadOllamaInstaller(onProgress) {
    const url = getOllamaDownloadUrl();
    onProgress({
        stage: 'downloading',
        progress: 0,
        message: 'Downloading Ollama installer...',
    });
    try {
        // Use IPC to download if available (for Electron/Tauri)
        if (typeof window !== 'undefined' && window.ipc) {
            const ipc = window.ipc;
            if (ipc.system && typeof ipc.system.downloadFile === 'function') {
                const result = await ipc.system.downloadFile(url, {
                    onProgress: (progress) => {
                        onProgress({
                            stage: 'downloading',
                            progress,
                            message: `Downloading Ollama... ${Math.round(progress)}%`,
                        });
                    },
                });
                return result?.path || '';
            }
        }
        // Fallback: Direct download (will need to handle differently)
        const response = await fetch(url);
        if (!response.ok)
            throw new Error('Failed to download Ollama');
        // For browser, we'll need to trigger download
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'ollama-installer';
        a.click();
        onProgress({
            stage: 'downloading',
            progress: 100,
            message: 'Download complete. Please run the installer.',
        });
        return downloadUrl;
    }
    catch (error) {
        console.error('[Installer] Download failed:', error);
        throw error;
    }
}
/**
 * Install Ollama (platform-specific)
 */
async function installOllama(installerPath, onProgress) {
    onProgress({
        stage: 'installing',
        progress: 0,
        message: 'Installing Ollama...',
    });
    try {
        // Use IPC to run installer if available
        if (typeof window !== 'undefined' && window.ipc) {
            const ipc = window.ipc;
            if (ipc.system && typeof ipc.system.runInstaller === 'function') {
                await ipc.system.runInstaller(installerPath, {
                    silent: true,
                    onProgress: (progress) => {
                        onProgress({
                            stage: 'installing',
                            progress,
                            message: `Installing Ollama... ${Math.round(progress)}%`,
                        });
                    },
                });
                return;
            }
        }
        // Fallback: Open installer (user must click through)
        onProgress({
            stage: 'installing',
            progress: 50,
            message: 'Please complete the Ollama installation in the opened window...',
        });
        // For browser, we can't auto-install, so we guide the user
        toast.info('Please complete the Ollama installation, then return here.');
    }
    catch (error) {
        console.error('[Installer] Installation failed:', error);
        throw error;
    }
}
/**
 * Pull a model with progress tracking
 */
async function pullModel(model, onProgress) {
    onProgress({
        stage: 'pulling_models',
        progress: 0,
        message: `Downloading ${model}...`,
        modelProgress: { model, progress: 0 },
    });
    try {
        const response = await fetch('http://localhost:11434/api/pull', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: model, stream: true }),
        });
        if (!response.ok)
            throw new Error(`Failed to pull ${model}`);
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader)
            throw new Error('No response body');
        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (!line.trim())
                    continue;
                try {
                    const data = JSON.parse(line);
                    if (data.completed) {
                        onProgress({
                            stage: 'pulling_models',
                            progress: 100,
                            message: `${model} downloaded successfully`,
                            modelProgress: { model, progress: 100 },
                        });
                        break;
                    }
                    if (data.total && data.completed !== undefined) {
                        const progress = (data.completed / data.total) * 100;
                        onProgress({
                            stage: 'pulling_models',
                            progress: (progress / REQUIRED_MODELS.length) * 100,
                            message: `Downloading ${model}... ${Math.round(progress)}%`,
                            modelProgress: { model, progress },
                        });
                    }
                }
                catch {
                    // Skip invalid JSON
                }
            }
        }
    }
    catch (error) {
        console.error(`[Installer] Failed to pull ${model}:`, error);
        throw error;
    }
}
/**
 * Full installation workflow
 */
export async function installOllamaAndModels(onProgress) {
    try {
        // Step 1: Check if already installed
        onProgress({
            stage: 'checking',
            progress: 0,
            message: 'Checking Ollama installation...',
        });
        const isInstalled = await checkOllamaInstalled();
        if (isInstalled) {
            onProgress({
                stage: 'pulling_models',
                progress: 0,
                message: 'Ollama already installed. Checking models...',
            });
        }
        else {
            // Step 2: Download installer
            const installerPath = await downloadOllamaInstaller(onProgress);
            // Step 3: Install Ollama
            await installOllama(installerPath, onProgress);
            // Step 4: Wait for Ollama to be ready
            onProgress({
                stage: 'checking',
                progress: 90,
                message: 'Waiting for Ollama to start...',
            });
            // Poll until Ollama is ready
            let retries = 30;
            while (retries > 0) {
                if (await checkOllamaInstalled()) {
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
                retries--;
            }
            if (retries === 0) {
                throw new Error('Ollama did not start. Please restart the app.');
            }
        }
        // Step 5: Check and pull required models
        const installedModels = await checkInstalledModels();
        const modelsToPull = REQUIRED_MODELS.filter(m => !installedModels.includes(m));
        if (modelsToPull.length === 0) {
            onProgress({
                stage: 'complete',
                progress: 100,
                message: 'All models already installed!',
            });
            return;
        }
        // Pull each model
        for (let i = 0; i < modelsToPull.length; i++) {
            const model = modelsToPull[i];
            await pullModel(model, onProgress);
        }
        onProgress({
            stage: 'complete',
            progress: 100,
            message: 'Installation complete! Your AI brain is ready.',
        });
    }
    catch (error) {
        console.error('[Installer] Installation failed:', error);
        onProgress({
            stage: 'error',
            progress: 0,
            message: `Installation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
        throw error;
    }
}
