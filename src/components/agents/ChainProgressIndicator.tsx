import React from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export interface ChainProgressIndicatorProps {
  status: 'idle' | 'running' | 'completed' | 'error';
  currentStep?: string;
  progress?: number;
  steps?: string[];
}

export function ChainProgressIndicator({
  status,
  currentStep,
  progress = 0,
  steps = []
}: ChainProgressIndicatorProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-400" />;
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-400" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-400" />;
      default:
        return <div className="h-5 w-5 rounded-full bg-slate-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return 'text-blue-400';
      case 'completed':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-3">
        {getStatusIcon()}
        <div className="flex-1">
          <div className={`text-sm font-medium ${getStatusColor()}`}>
            {currentStep || 'Ready'}
          </div>
          {status === 'running' && progress > 0 && (
            <div className="mt-1 w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {steps.length > 0 && (
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-slate-600" />
              <span className="text-slate-400">{step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}