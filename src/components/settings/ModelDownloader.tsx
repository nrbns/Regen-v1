import React, { useState } from 'react';
import { Download, CheckCircle, Loader2 } from 'lucide-react';

interface AIModel {
  id: string;
  name: string;
  size: string;
  description: string;
  downloaded: boolean;
  downloading?: boolean;
}

export function ModelDownloader() {
  const [models, setModels] = useState<AIModel[]>([
    {
      id: '1',
      name: 'GPT-2 Small',
      size: '117MB',
      description: 'Fast text generation for basic tasks',
      downloaded: true,
    },
    {
      id: '2',
      name: 'Llama 2 7B',
      size: '3.9GB',
      description: 'Advanced language model for complex tasks',
      downloaded: false,
    },
    {
      id: '3',
      name: 'CodeLlama 7B',
      size: '3.8GB',
      description: 'Specialized for code generation and analysis',
      downloaded: false,
    },
  ]);

  const handleDownload = (modelId: string) => {
    setModels(prev => prev.map(model =>
      model.id === modelId
        ? { ...model, downloading: true }
        : model
    ));

    // Simulate download
    setTimeout(() => {
      setModels(prev => prev.map(model =>
        model.id === modelId
          ? { ...model, downloaded: true, downloading: false }
          : model
      ));
    }, 3000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-200">AI Models</h3>
        <span className="text-sm text-slate-400">Manage downloaded models</span>
      </div>

      <div className="space-y-3">
        {models.map((model) => (
          <div key={model.id} className="flex items-center justify-between p-4 bg-slate-800 border border-slate-700 rounded-lg">
            <div className="flex-1">
              <h4 className="font-medium text-slate-200">{model.name}</h4>
              <p className="text-sm text-slate-400 mt-1">{model.description}</p>
              <p className="text-xs text-slate-500 mt-1">Size: {model.size}</p>
            </div>

            <div className="ml-4">
              {model.downloaded ? (
                <div className="flex items-center space-x-2 text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm">Downloaded</span>
                </div>
              ) : model.downloading ? (
                <div className="flex items-center space-x-2 text-blue-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Downloading...</span>
                </div>
              ) : (
                <button
                  onClick={() => handleDownload(model.id)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}