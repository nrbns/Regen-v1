/**
 * PermissionPrompt - Request permission modal with TTL
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Mic, HardDrive, Bell, X, Check, Clock } from 'lucide-react';
import { PermissionRequest } from '../../lib/ipc-events';
import { useState } from 'react';

interface PermissionPromptProps {
  request: PermissionRequest | null;
  onClose: () => void;
}

const permissionIcons = {
  camera: Camera,
  microphone: Mic,
  filesystem: HardDrive,
  notifications: Bell,
};

export function PermissionPrompt({ request, onClose }: PermissionPromptProps) {
  const [remember, setRemember] = useState(false);

  if (!request) return null;

  const Icon = permissionIcons[request.permission];

  const handleResponse = (granted: boolean) => {
    request.callback(granted, remember);
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
            className="fixed left-1/2 top-1/2 z-modalContent w-96 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-gray-700/50 bg-gray-900/95 shadow-2xl backdrop-blur-xl"
          >
            <div className="p-6">
              <div className="mb-4 flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600/20">
                  <Icon size={24} className="text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="mb-1 text-lg font-semibold text-gray-200">Permission Request</h3>
                  <p className="text-sm text-gray-400">
                    <span className="font-medium text-gray-300">
                      {new URL(request.origin).hostname}
                    </span>{' '}
                    wants to access your {request.permission}.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-800/60 hover:text-gray-200"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg bg-gray-800/40 p-3">
                  <Clock size={16} className="text-gray-500" />
                  <div className="flex-1">
                    <div className="text-xs font-medium text-gray-300">Remember this choice</div>
                    <div className="text-xs text-gray-500">
                      Allow this site to access {request.permission} automatically
                    </div>
                  </div>
                  <button
                    onClick={() => setRemember(!remember)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${remember ? 'bg-blue-600' : 'bg-gray-700'} `}
                  >
                    <motion.div
                      className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
                      animate={{ x: remember ? 20 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>

                <div className="flex gap-3 pt-2">
                  <motion.button
                    onClick={() => handleResponse(false)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-700/50 bg-gray-800/60 px-4 py-2.5 text-gray-300 transition-colors hover:bg-gray-800/80 hover:text-gray-100"
                  >
                    <X size={18} />
                    Deny
                  </motion.button>
                  <motion.button
                    onClick={() => handleResponse(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-blue-500/30 bg-blue-600/60 px-4 py-2.5 text-blue-200 transition-colors hover:bg-blue-600/80 hover:text-blue-100"
                  >
                    <Check size={18} />
                    Allow
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
