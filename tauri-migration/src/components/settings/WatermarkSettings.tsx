/**
 * Watermark Settings Component
 * Allows users to configure watermark preferences
 */

import { useState, useEffect } from 'react';
import { Image as ImageIcon, QrCode, Eye, EyeOff } from 'lucide-react';
import {
  isWatermarkEnabled,
  setWatermarkEnabled,
  generateQRCodeDataURL,
} from '../../utils/watermark';
import { toast } from '../../utils/toast';

export function WatermarkSettings() {
  const [enabled, setEnabled] = useState(true);
  const [qrPreview, setQrPreview] = useState<string>('');

  useEffect(() => {
    setEnabled(isWatermarkEnabled());
    // Generate QR preview
    generateQRCodeDataURL().then(setQrPreview).catch(console.error);
  }, []);

  const handleToggle = (newEnabled: boolean) => {
    setEnabled(newEnabled);
    setWatermarkEnabled(newEnabled);
    toast.success(`Watermark ${newEnabled ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ImageIcon size={20} className="text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Watermark Settings</h3>
          </div>
          <button
            onClick={() => handleToggle(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? 'bg-blue-600' : 'bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <p className="text-sm text-slate-400 mb-4">
          Add "Made with RegenBrowser" watermark and QR code to all exports (PDFs, images, charts).
          This helps spread the word about RegenBrowser!
        </p>

        {enabled && (
          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <QrCode size={20} className="text-blue-400 mt-1" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white mb-2">QR Code Preview</p>
                <p className="text-xs text-slate-400 mb-3">
                  Scanners will be redirected to the RegenBrowser download page
                </p>
                {qrPreview && (
                  <div className="inline-block p-3 bg-white rounded-lg">
                    <img src={qrPreview} alt="QR Code" className="w-32 h-32" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <Eye size={20} className="text-green-400 mt-1" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white mb-1">What gets watermarked?</p>
                <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                  <li>PDF exports (Research mode, Resume Fixer)</li>
                  <li>Chart exports (Trade mode)</li>
                  <li>Screenshots (when available)</li>
                  <li>Video clips (AI Clips Recorder)</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg bg-amber-900/20 border border-amber-700/50">
              <EyeOff size={20} className="text-amber-400 mt-1" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-200 mb-1">Pro Users</p>
                <p className="text-xs text-amber-300/80">
                  Pro users can disable watermarks. Upgrade to Pro to remove watermarks from your
                  exports.
                </p>
              </div>
            </div>
          </div>
        )}

        {!enabled && (
          <div className="mt-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <p className="text-sm text-slate-300">
              Watermark is currently disabled. Enable it to help spread the word about RegenBrowser!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
