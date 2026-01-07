/**
 * ConsentPrompt - Agent action approval modal
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle, XCircle, X } from 'lucide-react';
import { ConsentRequest } from '../../lib/ipc-events';

interface ConsentPromptProps {
  request: ConsentRequest | null;
  onClose: () => void;
}

const riskColors = {
  low: 'text-green-400',
  medium: 'text-yellow-400',
  high: 'text-red-400',
};

const riskBg = {
  low: 'bg-green-500/20',
  medium: 'bg-yellow-500/20',
  high: 'bg-red-500/20',
};

export function ConsentPrompt({ request, onClose }: ConsentPromptProps) {
  if (!request) return null;

  const handleResponse = (approved: boolean) => {
    request.callback(approved);
    onClose();
  };

  return (
    <AnimatePresence>
      {request && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-overlayBackdrop bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-modalContent w-96 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className={`flex-shrink-0 w-12 h-12 ${riskBg[request.action.risk]} rounded-lg flex items-center justify-center`}>
                  <Shield size={24} className={riskColors[request.action.risk]} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-200">
                      Consent Required
                    </h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${riskBg[request.action.risk]} ${riskColors[request.action.risk]}`}>
                      {request.action.risk.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    {request.action.description}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-gray-800/60 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mb-4 p-3 bg-gray-800/40 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                  <AlertTriangle size={14} />
                  Action Type: {request.action.type}
                </div>
                <div className="text-xs text-gray-500">
                  The agent wants to perform this action. Review carefully before approving.
                </div>
              </div>

              <div className="flex gap-3">
                <motion.button
                  onClick={() => handleResponse(false)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800/60 hover:bg-gray-800/80 border border-gray-700/50 rounded-lg text-gray-300 hover:text-gray-100 transition-colors"
                >
                  <XCircle size={18} />
                  Deny
                </motion.button>
                <motion.button
                  onClick={() => handleResponse(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600/60 hover:bg-blue-600/80 border border-blue-500/30 rounded-lg text-blue-200 hover:text-blue-100 transition-colors"
                >
                  <CheckCircle size={18} />
                  Approve
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

