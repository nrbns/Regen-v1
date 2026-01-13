/**
 * Ollama Setup Wizard
 * One-click setup wizard for local AI models
 * Guides users through Ollama installation and model download
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, Download, Play, AlertCircle } from 'lucide-react';

interface OllamaStatus {
  installed: boolean;
  running: boolean;
  models: string[];
  error?: string;
}

export function OllamaSetupWizard({ onComplete }: { onComplete?: () => void }) {
  const [status, setStatus] = useState<OllamaStatus>({
    installed: false,
    running: false,
    models: [],
  });
  const [step, setStep] = useState<'check' | 'install' | 'download' | 'complete'>('check');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('phi3:mini');

  const recommendedModels = [
    { id: 'phi3:mini', name: 'Phi-3 Mini', size: '2.3GB', description: 'Fast, efficient for most tasks' },
    { id: 'llama3.2:3b', name: 'Llama 3.2 3B', size: '2.0GB', description: 'Balanced performance' },
    { id: 'mistral:7b', name: 'Mistral 7B', size: '4.1GB', description: 'High quality, requires more RAM' },
  ];

  useEffect(() => {
    checkOllamaStatus();
  }, []);

  const checkOllamaStatus = async () => {
    setLoading(true);
    try {
      // Check if Ollama is installed
      const installed = await checkOllamaInstalled();
      
      if (!installed) {
        setStatus({ installed: false, running: false, models: [] });
        setStep('install');
        setLoading(false);
        return;
      }

      // Check if Ollama is running
      const running = await checkOllamaRunning();
      
      if (!running) {
        setStatus({ installed: true, running: false, models: [] });
        setStep('install'); // Show start button
        setLoading(false);
        return;
      }

      // Get installed models
      const models = await getInstalledModels();
      setStatus({ installed: true, running: true, models });
      
      if (models.length === 0) {
        setStep('download');
      } else {
        setStep('complete');
      }
    } catch (error) {
      setStatus({
        installed: false,
        running: false,
        models: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkOllamaInstalled = async (): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      // Try checking if ollama command exists (for desktop app)
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const result = await invoke<boolean>('check_ollama_installed');
          return result;
        } catch {
          return false;
        }
      }
      return false;
    }
  };

  const checkOllamaRunning = async (): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  const getInstalledModels = async (): Promise<string[]> => {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch {
      return [];
    }
  };

  const handleInstall = async () => {
    // Open Ollama download page
    window.open('https://ollama.com/download', '_blank');
    setStep('install');
  };

  const handleStartOllama = async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('start_ollama');
        // Wait a bit for Ollama to start
        await new Promise(resolve => setTimeout(resolve, 2000));
        await checkOllamaStatus();
      } else {
        // For web, show instructions
        alert('Please start Ollama manually: Run "ollama serve" in your terminal');
        await checkOllamaStatus();
      }
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start Ollama',
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadModel = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:11434/api/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selectedModel, stream: false }),
      });

      if (!response.ok) {
        throw new Error('Failed to download model');
      }

      // Wait for download to complete
      const reader = response.body?.getReader();
      if (reader) {
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      }

      await checkOllamaStatus();
      setStep('complete');
      onComplete?.();
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to download model',
      }));
    } finally {
      setLoading(false);
    }
  };

  if (loading && step === 'check') {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary-500)]" />
        <span className="ml-2 text-sm text-[var(--text-secondary)]">Checking Ollama status...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-6 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] p-4 md:p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Ollama Setup</h2>
        {status.installed && status.running && status.models.length > 0 && (
          <CheckCircle className="h-6 w-6 text-[var(--color-success-500)]" />
        )}
      </div>

      {status.error && (
        <div className="flex items-center gap-2 rounded-lg bg-[var(--color-error-500)]/10 border border-[var(--color-error-500)]/20 p-3 text-sm text-[var(--color-error-500)]">
          <AlertCircle className="h-5 w-5" />
          <span>{status.error}</span>
        </div>
      )}

      {/* Step 1: Install Ollama */}
      {step === 'install' && !status.installed && (
        <div className="space-y-4">
          <p className="text-[var(--text-secondary)]">
            Ollama is not installed. Download and install it to use local AI models.
          </p>
          <button
            onClick={handleInstall}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary-500)] px-4 py-3 text-white transition-all hover:bg-[var(--color-primary-600)] hover:scale-105 active:scale-95"
          >
            <Download className="h-5 w-5" />
            Download Ollama
          </button>
          <p className="text-xs text-[var(--text-muted)]">
            After installation, restart Regen and run this wizard again.
          </p>
        </div>
      )}

      {/* Step 2: Start Ollama */}
      {step === 'install' && status.installed && !status.running && (
        <div className="space-y-4">
          <p className="text-[var(--text-secondary)]">Ollama is installed but not running.</p>
          <button
            onClick={handleStartOllama}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-success-500)] px-4 py-3 text-white transition-all hover:bg-[var(--color-success-600)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Play className="h-5 w-5" />
            )}
            Start Ollama
          </button>
        </div>
      )}

      {/* Step 3: Download Model */}
      {step === 'download' && status.installed && status.running && (
        <div className="space-y-4">
          <p className="text-[var(--text-secondary)]">Ollama is running! Download a model to get started.</p>
          <div className="space-y-2">
            {recommendedModels.map(model => (
              <label
                key={model.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
                  selectedModel === model.id
                    ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)]/10 hover:bg-[var(--color-primary-500)]/15'
                    : 'border-[var(--surface-border)] bg-[var(--surface-hover)] hover:border-[var(--surface-border-strong)] hover:bg-[var(--surface-active)]'
                }`}
              >
                <input
                  type="radio"
                  name="model"
                  value={model.id}
                  checked={selectedModel === model.id}
                  onChange={e => setSelectedModel(e.target.value)}
                  className="h-4 w-4 text-[var(--color-primary-500)]"
                />
                <div className="flex-1">
                  <div className="font-medium text-[var(--text-primary)]">{model.name}</div>
                  <div className="text-sm text-[var(--text-muted)]">
                    {model.size} • {model.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
          <button
            onClick={handleDownloadModel}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary-500)] px-4 py-3 text-white transition-all hover:bg-[var(--color-primary-600)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Downloading {selectedModel}...</span>
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Download Model
              </>
            )}
          </button>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && status.installed && status.running && status.models.length > 0 && (
        <div className="space-y-4">
          <div className="rounded-lg bg-[var(--color-success-500)]/10 border border-[var(--color-success-500)]/20 p-4">
            <div className="flex items-center gap-2 text-[var(--color-success-500)]">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Ollama is ready!</span>
            </div>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Installed models: {status.models.join(', ')}
            </p>
          </div>
          <button
            onClick={() => {
              onComplete?.();
            }}
            className="w-full rounded-lg bg-[var(--surface-hover)] px-4 py-2 text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-active)] hover:text-[var(--text-primary)] active:scale-95"
          >
            Close
          </button>
        </div>
      )}

      {/* Status indicators */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          {status.installed ? (
            <CheckCircle className="h-4 w-4 text-[var(--color-success-500)]" />
          ) : (
            <XCircle className="h-4 w-4 text-[var(--text-disabled)]" />
          )}
          <span className={status.installed ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
            Ollama Installed
          </span>
        </div>
        <div className="flex items-center gap-2">
          {status.running ? (
            <CheckCircle className="h-4 w-4 text-[var(--color-success-500)]" />
          ) : (
            <XCircle className="h-4 w-4 text-[var(--text-disabled)]" />
          )}
          <span className={status.running ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
            Ollama Running
          </span>
        </div>
        <div className="flex items-center gap-2">
          {status.models.length > 0 ? (
            <CheckCircle className="h-4 w-4 text-[var(--color-success-500)]" />
          ) : (
            <XCircle className="h-4 w-4 text-[var(--text-disabled)]" />
          )}
          <span className={status.models.length > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
            Models ({status.models.length})
          </span>
        </div>
      </div>
    </div>
  );
}
