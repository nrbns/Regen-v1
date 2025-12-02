import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertTriangle } from 'lucide-react';

export interface OrderDetails {
  side: 'buy' | 'sell';
  symbol: string;
  quantity: number;
  price: number;
  orderType: 'market' | 'limit';
  stopLoss?: number;
  takeProfit?: number;
  estimatedCost: number;
  fees: number;
  marginRequired?: number;
}

interface OrderConfirmModalProps {
  isOpen: boolean;
  order: OrderDetails | null;
  onConfirm: () => void;
  onCancel: () => void;
  warnings?: string[];
  errors?: string[];
}

export default function OrderConfirmModal({
  isOpen,
  order,
  onConfirm,
  onCancel,
  warnings = [],
  errors = [],
}: OrderConfirmModalProps) {
  if (!order) return null;

  const canConfirm = errors.length === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-700 p-6">
                <h3 className="text-xl font-bold text-white">Confirm Order</h3>
                <button
                  onClick={onCancel}
                  className="rounded-lg p-2 transition-colors hover:bg-gray-800"
                  aria-label="Close"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              {/* Order Details */}
              <div className="space-y-4 p-6">
                {/* Errors */}
                {errors.length > 0 && (
                  <div className="rounded-lg border border-red-700 bg-red-900/30 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-red-400" />
                      <span className="text-sm font-semibold text-red-300">Errors</span>
                    </div>
                    <ul className="space-y-1 text-xs text-red-200">
                      {errors.map((error, idx) => (
                        <li key={idx}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings */}
                {warnings.length > 0 && (
                  <div className="rounded-lg border border-yellow-700 bg-yellow-900/30 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-yellow-400" />
                      <span className="text-sm font-semibold text-yellow-300">Warnings</span>
                    </div>
                    <ul className="space-y-1 text-xs text-yellow-200">
                      {warnings.map((warning, idx) => (
                        <li key={idx}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Order Summary */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Side</span>
                    <span
                      className={`text-sm font-bold ${
                        order.side === 'buy' ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {order.side.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Symbol</span>
                    <span className="text-sm font-semibold text-white">{order.symbol}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Quantity</span>
                    <span className="text-sm font-semibold text-white">{order.quantity}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Order Type</span>
                    <span className="text-sm font-semibold text-white">
                      {order.orderType.toUpperCase()}
                    </span>
                  </div>

                  {order.orderType === 'limit' && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Limit Price</span>
                      <span className="text-sm font-semibold text-white">
                        {order.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  {order.stopLoss && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Stop Loss</span>
                      <span className="text-sm font-semibold text-red-400">
                        {order.stopLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  {order.takeProfit && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Take Profit</span>
                      <span className="text-sm font-semibold text-green-400">
                        {order.takeProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <div className="space-y-2 border-t border-gray-700 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Estimated Cost</span>
                      <span className="text-sm font-semibold text-white">
                        {order.estimatedCost.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Fees</span>
                      <span className="text-sm text-gray-300">
                        {order.fees.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {order.marginRequired && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Margin Required</span>
                        <span className="text-sm font-semibold text-yellow-400">
                          {order.marginRequired.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-gray-700 pt-2">
                      <span className="text-base font-semibold text-gray-300">Total</span>
                      <span className="text-lg font-bold text-white">
                        {(order.estimatedCost + order.fees).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 border-t border-gray-700 p-6">
                <button
                  onClick={onCancel}
                  className="flex-1 rounded-lg bg-gray-800 px-4 py-3 font-semibold text-white transition-colors hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={!canConfirm}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold transition-all ${
                    order.side === 'buy'
                      ? 'bg-green-600 text-white hover:bg-green-500'
                      : 'bg-red-600 text-white hover:bg-red-500'
                  } ${!canConfirm ? 'cursor-not-allowed opacity-50' : 'shadow-lg'}`}
                >
                  {canConfirm ? (
                    <>
                      <CheckCircle2 size={18} />
                      Confirm {order.side.toUpperCase()}
                    </>
                  ) : (
                    'Cannot Confirm'
                  )}
                </button>
              </div>

              {/* Keyboard hint */}
              <div className="px-6 pb-4 text-center text-xs text-gray-500">
                Press <kbd className="rounded bg-gray-800 px-1.5 py-0.5">Enter</kbd> to confirm,{' '}
                <kbd className="rounded bg-gray-800 px-1.5 py-0.5">Esc</kbd> to cancel
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
