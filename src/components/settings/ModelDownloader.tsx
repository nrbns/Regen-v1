/**
 * Model Downloader Component
 * UI for downloading and installing quantized GGUF models
 */

import { useState, useEffect } from 'react';
import { Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import {
  getAvailableModels,
  detectHardwareCapabilities,
  type ModelRecommendation,
} from '../../lib/hardware-detection';
import { loadModel, getCurrentModelInfo } from '../../services/localModelService';

export function ModelDownloader() {
  const [models, setModels] = useState<ModelRecommendation[]>([]);
  const [capabilities, setCapabilities] = useState<any>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
    loadCurrentModel();
  }, []);

  const loadModels = () => {
    const availableModels = getAvailableModels();
    const caps = detectHardwareCapabilities();
    setModels(availableModels);
    setCapabilities(caps);
  };

  const loadCurrentModel = async () => {
    try {
      const model = await getCurrentModelInfo();
      setCurrentModel(model);
    } catch (error) {
      console.error('Failed to load current model:', error);
    }
  };

  const handleDownload = async (model: ModelRecommendation) => {
    setDownloading(model.modelName);
    setError(null);

    try {
      // In production, this would:
      // 1. Download model file
      // 2. Verify checksum
      // 3. Save to local storage
      // 4. Load model

      // For now, simulate download
      console.log('[ModelDownloader] Downloading:', model.modelName);

      // Show download progress
      // In production, use actual download with progress tracking
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Load model
      if (model.downloadUrl) {
        await loadModel(model.downloadUrl, model.modelName);
        await loadCurrentModel();
      }

      setDownloading(null);
    } catch (err: any) {
      setError(err.message || 'Download failed');
      setDownloading(null);
    }
  };

  const isModelCompatible = (model: ModelRecommendation) => {
    if (!capabilities) return false;
    return capabilities.memoryGB >= model.minRAMGB;
  };

  const isModelLoaded = (modelName: string) => {
    return currentModel?.name === modelName;
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-lg font-semibold text-white">Download Offline AI Model</h3>
        <p className="mb-4 text-sm text-gray-400">
          Download a quantized model to use AI features offline. Recommended model based on your
          device:
          <strong className="text-white"> {capabilities?.recommendedModel?.modelName}</strong>
        </p>
      </div>

      {/* Hardware Info */}
      {capabilities && (
        <div className="mb-4 rounded-lg bg-slate-800/50 p-4">
          <h4 className="mb-2 text-sm font-semibold text-white">Your Device</h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
            <div>Memory: {capabilities.memoryGB} GB</div>
            <div>WebGPU: {capabilities.webgpu ? '✅' : '❌'}</div>
            <div>WASM: {capabilities.wasm ? '✅' : '❌'}</div>
            <div>Device: {capabilities.deviceType}</div>
          </div>
        </div>
      )}

      {/* Models List */}
      <div className="space-y-2">
        {models.map(model => {
          const compatible = isModelCompatible(model);
          const loaded = isModelLoaded(model.modelName);
          const downloadingThis = downloading === model.modelName;

          return (
            <div
              key={model.modelName}
              className={`rounded-lg border p-4 ${
                compatible
                  ? 'border-slate-700 bg-slate-800/50'
                  : 'border-slate-800 bg-slate-900/50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h4 className="font-semibold text-white">{model.modelName}</h4>
                    {model.recommended && (
                      <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400">
                        Recommended
                      </span>
                    )}
                    {loaded && (
                      <span className="flex items-center gap-1 rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                        <CheckCircle className="h-3 w-3" />
                        Loaded
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-xs text-gray-400">
                    <div>Size: {model.sizeGB} GB</div>
                    <div>Quantization: {model.quantization}</div>
                    <div>Min RAM: {model.minRAMGB} GB</div>
                  </div>
                  {!compatible && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-yellow-400">
                      <AlertCircle className="h-3 w-3" />
                      Requires {model.minRAMGB} GB RAM (you have {capabilities?.memoryGB} GB)
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDownload(model)}
                  disabled={!compatible || downloadingThis || loaded}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
                    compatible && !loaded
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'cursor-not-allowed bg-slate-700 text-gray-500'
                  }`}
                >
                  {downloadingThis ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : loaded ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Loaded
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Download
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        <p>
          💡 <strong>Tip:</strong> Download the recommended model for best performance on your
          device.
        </p>
        <p className="mt-1">
          Models are quantized GGUF format and stored locally. They work completely offline.
        </p>
      </div>
    </div>
  );
}
