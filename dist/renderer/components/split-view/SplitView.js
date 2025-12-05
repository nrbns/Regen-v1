import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Split View - Feature #3
 * Multi-pane layout for side-by-side browsing
 */
import { useState, useRef, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { useTabsStore } from '../../state/tabsStore';
export function SplitView() {
    const [layout, setLayout] = useState('single');
    const [panes, setPanes] = useState([{ id: 'pane-1', tabId: null, width: 100 }]);
    const { tabs, activeId, setActive } = useTabsStore();
    const containerRef = useRef(null);
    const [resizing, setResizing] = useState(null);
    const addPane = () => {
        if (layout === 'single') {
            setLayout('split-2');
            setPanes([
                { id: 'pane-1', tabId: activeId || null, width: 50 },
                { id: 'pane-2', tabId: null, width: 50 },
            ]);
        }
        else if (layout === 'split-2') {
            setLayout('split-3');
            setPanes([
                { id: 'pane-1', tabId: panes[0].tabId, width: 33.33 },
                { id: 'pane-2', tabId: panes[1].tabId, width: 33.33 },
                { id: 'pane-3', tabId: null, width: 33.34 },
            ]);
        }
    };
    const removePane = (paneId) => {
        if (panes.length === 1)
            return;
        const newPanes = panes.filter(p => p.id !== paneId);
        const totalWidth = newPanes.reduce((sum, p) => sum + p.width, 0);
        // Redistribute width
        const updatedPanes = newPanes.map(p => ({
            ...p,
            width: (p.width / totalWidth) * 100,
        }));
        setPanes(updatedPanes);
        setLayout(updatedPanes.length === 1 ? 'single' : updatedPanes.length === 2 ? 'split-2' : 'split-3');
    };
    const setPaneTab = (paneId, tabId) => {
        setPanes(panes.map(p => (p.id === paneId ? { ...p, tabId } : p)));
        setActive(tabId);
    };
    const startResize = (paneId) => {
        setResizing(paneId);
    };
    useEffect(() => {
        if (!resizing)
            return;
        const handleMouseMove = (e) => {
            if (!containerRef.current)
                return;
            const containerWidth = containerRef.current.offsetWidth;
            const mouseX = e.clientX - containerRef.current.getBoundingClientRect().left;
            const newWidth = (mouseX / containerWidth) * 100;
            const paneIndex = panes.findIndex(p => p.id === resizing);
            if (paneIndex === -1)
                return;
            const updatedPanes = [...panes];
            const oldWidth = updatedPanes[paneIndex].width;
            const diff = newWidth - oldWidth;
            // Adjust current and next pane
            updatedPanes[paneIndex].width = Math.max(20, Math.min(80, newWidth));
            if (paneIndex < updatedPanes.length - 1) {
                updatedPanes[paneIndex + 1].width = Math.max(20, Math.min(80, updatedPanes[paneIndex + 1].width - diff));
            }
            setPanes(updatedPanes);
        };
        const handleMouseUp = () => {
            setResizing(null);
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizing, panes]);
    return (_jsxs("div", { ref: containerRef, className: "relative h-full w-full flex", children: [panes.map((pane, index) => (_jsxs("div", { className: "relative flex flex-col border-r border-gray-700 last:border-r-0", style: { width: `${pane.width}%` }, children: [_jsxs("div", { className: "flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700", children: [_jsx("div", { className: "flex items-center gap-2 flex-1 min-w-0", children: _jsxs("select", { value: pane.tabId || '', onChange: e => setPaneTab(pane.id, e.target.value), className: "flex-1 bg-gray-700 text-white text-sm rounded px-2 py-1 min-w-0", children: [_jsx("option", { value: "", children: "Select tab..." }), tabs.map(tab => (_jsx("option", { value: tab.id, children: tab.title || tab.url }, tab.id)))] }) }), _jsx("div", { className: "flex items-center gap-1", children: panes.length > 1 && (_jsx("button", { onClick: () => removePane(pane.id), className: "p-1 text-gray-400 hover:text-white transition-colors", children: _jsx(X, { className: "w-4 h-4" }) })) })] }), _jsx("div", { className: "flex-1 relative", children: pane.tabId ? (_jsx("iframe", { src: tabs.find(t => t.id === pane.tabId)?.url || 'about:blank', className: "w-full h-full border-0", title: `Pane ${index + 1}` })) : (_jsx("div", { className: "flex items-center justify-center h-full bg-gray-900 text-gray-500", children: _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-sm mb-2", children: "No tab selected" }), _jsx("p", { className: "text-xs", children: "Select a tab from the dropdown above" })] }) })) }), index < panes.length - 1 && (_jsx("div", { onMouseDown: () => startResize(pane.id), className: "absolute right-0 top-0 bottom-0 w-1 bg-gray-700 hover:bg-purple-500 cursor-col-resize z-10" }))] }, pane.id))), layout !== 'split-3' && (_jsx("button", { onClick: addPane, className: "absolute bottom-4 right-4 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-all hover:scale-110", title: "Add pane", children: _jsx(Plus, { className: "w-5 h-5" }) }))] }));
}
