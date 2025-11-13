import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';

export interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  filledQuantity: number;
  orderType: string;
  status: string;
  limitPrice?: number;
  stopPrice?: number;
  averageFillPrice?: number;
  createdAt: number;
  filledAt?: number;
  paper: boolean;
}

interface OrderBlotterProps {
  onOrderClick?: (order: Order) => void;
  showPaperOnly?: boolean;
}

export default function OrderBlotter({ onOrderClick, showPaperOnly = true }: OrderBlotterProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all'); // all, pending, filled, cancelled, rejected
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadOrders();
    // Refresh orders every 2 seconds
    const interval = setInterval(loadOrders, 2000);
    return () => clearInterval(interval);
  }, [filter, showPaperOnly]);

  const loadOrders = async () => {
    try {
      const status = filter === 'all' ? undefined : filter;
      const { orders: allOrders } = await ipc.trade.getOrders(status);
      const filtered = showPaperOnly ? allOrders.filter((o) => o.paper) : allOrders;
      // Sort by creation time (newest first)
      filtered.sort((a, b) => b.createdAt - a.createdAt);
      setOrders(filtered);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await ipc.trade.cancelOrder(orderId);
      await loadOrders();
    } catch (error) {
      console.error('Failed to cancel order:', error);
      alert('Failed to cancel order');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'filled':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-neutral-400" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'pending':
      case 'partially_filled':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      default:
        return <Clock className="w-4 h-4 text-neutral-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'filled':
        return 'text-green-400';
      case 'cancelled':
        return 'text-neutral-400';
      case 'rejected':
        return 'text-red-400';
      case 'pending':
      case 'partially_filled':
        return 'text-yellow-400';
      default:
        return 'text-neutral-400';
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (isLoading && orders.length === 0) {
    return (
      <div className="bg-neutral-800 rounded-lg border border-neutral-700 p-4">
        <div className="text-sm text-neutral-400">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-800 rounded-lg border border-neutral-700">
      {/* Header */}
      <div className="p-4 border-b border-neutral-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Order Blotter</h3>
          <button
            onClick={loadOrders}
            className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1">
          {['all', 'pending', 'filled', 'cancelled', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-xs rounded transition-colors capitalize ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="max-h-96 overflow-y-auto">
        {orders.length === 0 ? (
          <div className="p-4 text-sm text-neutral-400 text-center">No orders found</div>
        ) : (
          <div className="divide-y divide-neutral-700">
            {orders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 hover:bg-neutral-900/50 transition-colors cursor-pointer ${
                  selectedOrder?.id === order.id ? 'bg-neutral-900' : ''
                }`}
                onClick={() => {
                  setSelectedOrder(order);
                  onOrderClick?.(order);
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(order.status)}
                    <span className={`font-semibold text-sm ${order.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                      {order.side.toUpperCase()}
                    </span>
                    <span className="font-semibold text-sm">{order.symbol}</span>
                    {order.paper && (
                      <span className="text-xs bg-neutral-700 px-1.5 py-0.5 rounded">Paper</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${getStatusColor(order.status)}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                    {order.status === 'pending' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelOrder(order.id);
                        }}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400">
                  <div>
                    <span className="text-neutral-500">Qty: </span>
                    {order.filledQuantity > 0 ? (
                      <span>
                        {order.filledQuantity}/{order.quantity}
                      </span>
                    ) : (
                      <span>{order.quantity}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-neutral-500">Type: </span>
                    {order.orderType}
                  </div>
                  {order.limitPrice && (
                    <div>
                      <span className="text-neutral-500">Limit: </span>${order.limitPrice.toFixed(2)}
                    </div>
                  )}
                  {order.averageFillPrice && (
                    <div>
                      <span className="text-neutral-500">Fill: </span>
                      <span className="text-green-400">${order.averageFillPrice.toFixed(2)}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-neutral-500">Time: </span>
                    {formatTime(order.createdAt)}
                  </div>
                  {order.filledAt && (
                    <div>
                      <span className="text-neutral-500">Filled: </span>
                      {formatTime(order.filledAt)}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelectedOrder(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-neutral-800 rounded-lg border border-neutral-700 p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Order Details</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-400">Order ID:</span>
                <span className="font-mono text-xs">{selectedOrder.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Symbol:</span>
                <span className="font-semibold">{selectedOrder.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Side:</span>
                <span className={selectedOrder.side === 'buy' ? 'text-green-400' : 'text-red-400'}>
                  {selectedOrder.side.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Quantity:</span>
                <span>
                  {selectedOrder.filledQuantity > 0 ? (
                    <>
                      {selectedOrder.filledQuantity}/{selectedOrder.quantity}
                    </>
                  ) : (
                    selectedOrder.quantity
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Type:</span>
                <span>{selectedOrder.orderType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Status:</span>
                <span className={getStatusColor(selectedOrder.status)}>
                  {selectedOrder.status.replace('_', ' ')}
                </span>
              </div>
              {selectedOrder.limitPrice && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Limit Price:</span>
                  <span>${selectedOrder.limitPrice.toFixed(2)}</span>
                </div>
              )}
              {selectedOrder.stopPrice && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Stop Price:</span>
                  <span>${selectedOrder.stopPrice.toFixed(2)}</span>
                </div>
              )}
              {selectedOrder.averageFillPrice && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Average Fill:</span>
                  <span className="text-green-400">${selectedOrder.averageFillPrice.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-neutral-400">Created:</span>
                <span>{new Date(selectedOrder.createdAt).toLocaleString()}</span>
              </div>
              {selectedOrder.filledAt && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Filled:</span>
                  <span>{new Date(selectedOrder.filledAt).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-neutral-400">Paper Trading:</span>
                <span>{selectedOrder.paper ? 'Yes' : 'No'}</span>
              </div>
            </div>

            {selectedOrder.status === 'pending' && (
              <div className="mt-4 pt-4 border-t border-neutral-700">
                <button
                  onClick={() => {
                    handleCancelOrder(selectedOrder.id);
                    setSelectedOrder(null);
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm font-semibold transition-colors"
                >
                  Cancel Order
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

