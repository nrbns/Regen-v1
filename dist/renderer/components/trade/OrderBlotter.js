import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
export default function OrderBlotter({ onOrderClick, showPaperOnly = true }) {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, pending, filled, cancelled, rejected
    const [selectedOrder, setSelectedOrder] = useState(null);
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
        }
        catch (error) {
            console.error('Failed to load orders:', error);
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleCancelOrder = async (orderId) => {
        try {
            await ipc.trade.cancelOrder(orderId);
            await loadOrders();
        }
        catch (error) {
            console.error('Failed to cancel order:', error);
            alert('Failed to cancel order');
        }
    };
    const getStatusIcon = (status) => {
        switch (status) {
            case 'filled':
                return _jsx(CheckCircle, { className: "w-4 h-4 text-green-400" });
            case 'cancelled':
                return _jsx(XCircle, { className: "w-4 h-4 text-neutral-400" });
            case 'rejected':
                return _jsx(AlertCircle, { className: "w-4 h-4 text-red-400" });
            case 'pending':
            case 'partially_filled':
                return _jsx(Clock, { className: "w-4 h-4 text-yellow-400" });
            default:
                return _jsx(Clock, { className: "w-4 h-4 text-neutral-400" });
        }
    };
    const getStatusColor = (status) => {
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
    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    if (isLoading && orders.length === 0) {
        return (_jsx("div", { className: "bg-neutral-800 rounded-lg border border-neutral-700 p-4", children: _jsx("div", { className: "text-sm text-neutral-400", children: "Loading orders..." }) }));
    }
    return (_jsxs("div", { className: "bg-neutral-800 rounded-lg border border-neutral-700", children: [_jsxs("div", { className: "p-4 border-b border-neutral-700", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("h3", { className: "font-semibold text-sm", children: "Order Blotter" }), _jsx("button", { onClick: loadOrders, className: "text-xs text-neutral-400 hover:text-neutral-200 transition-colors", children: "Refresh" })] }), _jsx("div", { className: "flex gap-1", children: ['all', 'pending', 'filled', 'cancelled', 'rejected'].map((f) => (_jsx("button", { onClick: () => setFilter(f), className: `px-2 py-1 text-xs rounded transition-colors capitalize ${filter === f
                                ? 'bg-indigo-600 text-white'
                                : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'}`, children: f }, f))) })] }), _jsx("div", { className: "max-h-96 overflow-y-auto", children: orders.length === 0 ? (_jsx("div", { className: "p-4 text-sm text-neutral-400 text-center", children: "No orders found" })) : (_jsx("div", { className: "divide-y divide-neutral-700", children: orders.map((order) => (_jsxs(motion.div, { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, className: `p-3 hover:bg-neutral-900/50 transition-colors cursor-pointer ${selectedOrder?.id === order.id ? 'bg-neutral-900' : ''}`, onClick: () => {
                            setSelectedOrder(order);
                            onOrderClick?.(order);
                        }, children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [getStatusIcon(order.status), _jsx("span", { className: `font-semibold text-sm ${order.side === 'buy' ? 'text-green-400' : 'text-red-400'}`, children: order.side.toUpperCase() }), _jsx("span", { className: "font-semibold text-sm", children: order.symbol }), order.paper && (_jsx("span", { className: "text-xs bg-neutral-700 px-1.5 py-0.5 rounded", children: "Paper" }))] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: `text-xs ${getStatusColor(order.status)}`, children: order.status.replace('_', ' ') }), order.status === 'pending' && (_jsx("button", { onClick: (e) => {
                                                    e.stopPropagation();
                                                    handleCancelOrder(order.id);
                                                }, className: "text-xs text-red-400 hover:text-red-300 transition-colors", children: _jsx(X, { className: "w-3 h-3" }) }))] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2 text-xs text-neutral-400", children: [_jsxs("div", { children: [_jsx("span", { className: "text-neutral-500", children: "Qty: " }), order.filledQuantity > 0 ? (_jsxs("span", { children: [order.filledQuantity, "/", order.quantity] })) : (_jsx("span", { children: order.quantity }))] }), _jsxs("div", { children: [_jsx("span", { className: "text-neutral-500", children: "Type: " }), order.orderType] }), order.limitPrice && (_jsxs("div", { children: [_jsx("span", { className: "text-neutral-500", children: "Limit: " }), "$", order.limitPrice.toFixed(2)] })), order.averageFillPrice && (_jsxs("div", { children: [_jsx("span", { className: "text-neutral-500", children: "Fill: " }), _jsxs("span", { className: "text-green-400", children: ["$", order.averageFillPrice.toFixed(2)] })] })), _jsxs("div", { children: [_jsx("span", { className: "text-neutral-500", children: "Time: " }), formatTime(order.createdAt)] }), order.filledAt && (_jsxs("div", { children: [_jsx("span", { className: "text-neutral-500", children: "Filled: " }), formatTime(order.filledAt)] }))] })] }, order.id))) })) }), selectedOrder && (_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", onClick: () => setSelectedOrder(null), children: _jsxs(motion.div, { initial: { scale: 0.9, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.9, opacity: 0 }, className: "bg-neutral-800 rounded-lg border border-neutral-700 p-6 max-w-md w-full mx-4", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "font-semibold text-lg", children: "Order Details" }), _jsx("button", { onClick: () => setSelectedOrder(null), className: "text-neutral-400 hover:text-neutral-200 transition-colors", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "space-y-3 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-neutral-400", children: "Order ID:" }), _jsx("span", { className: "font-mono text-xs", children: selectedOrder.id })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-neutral-400", children: "Symbol:" }), _jsx("span", { className: "font-semibold", children: selectedOrder.symbol })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-neutral-400", children: "Side:" }), _jsx("span", { className: selectedOrder.side === 'buy' ? 'text-green-400' : 'text-red-400', children: selectedOrder.side.toUpperCase() })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-neutral-400", children: "Quantity:" }), _jsx("span", { children: selectedOrder.filledQuantity > 0 ? (_jsxs(_Fragment, { children: [selectedOrder.filledQuantity, "/", selectedOrder.quantity] })) : (selectedOrder.quantity) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-neutral-400", children: "Type:" }), _jsx("span", { children: selectedOrder.orderType })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-neutral-400", children: "Status:" }), _jsx("span", { className: getStatusColor(selectedOrder.status), children: selectedOrder.status.replace('_', ' ') })] }), selectedOrder.limitPrice && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-neutral-400", children: "Limit Price:" }), _jsxs("span", { children: ["$", selectedOrder.limitPrice.toFixed(2)] })] })), selectedOrder.stopPrice && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-neutral-400", children: "Stop Price:" }), _jsxs("span", { children: ["$", selectedOrder.stopPrice.toFixed(2)] })] })), selectedOrder.averageFillPrice && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-neutral-400", children: "Average Fill:" }), _jsxs("span", { className: "text-green-400", children: ["$", selectedOrder.averageFillPrice.toFixed(2)] })] })), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-neutral-400", children: "Created:" }), _jsx("span", { children: new Date(selectedOrder.createdAt).toLocaleString() })] }), selectedOrder.filledAt && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-neutral-400", children: "Filled:" }), _jsx("span", { children: new Date(selectedOrder.filledAt).toLocaleString() })] })), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-neutral-400", children: "Paper Trading:" }), _jsx("span", { children: selectedOrder.paper ? 'Yes' : 'No' })] })] }), selectedOrder.status === 'pending' && (_jsx("div", { className: "mt-4 pt-4 border-t border-neutral-700", children: _jsx("button", { onClick: () => {
                                    handleCancelOrder(selectedOrder.id);
                                    setSelectedOrder(null);
                                }, className: "w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm font-semibold transition-colors", children: "Cancel Order" }) }))] }) }))] }));
}
