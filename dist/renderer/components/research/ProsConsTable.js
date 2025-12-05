import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Pros/Cons Comparison Table Component
 * Displays structured pros and cons in a side-by-side comparison table
 */
import { useMemo } from 'react';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';
export function ProsConsTable({ pros, cons }) {
    const { activeId } = useTabsStore();
    const handleOpenUrl = async (url) => {
        try {
            if (activeId) {
                await ipc.tabs.navigate(activeId, url);
            }
            else {
                await ipc.tabs.create(url);
            }
        }
        catch (error) {
            console.error('Failed to open URL:', error);
        }
    };
    // Create rows by pairing pros and cons
    const rows = useMemo(() => {
        const maxLength = Math.max(pros.length, cons.length);
        const tableRows = [];
        for (let i = 0; i < maxLength; i++) {
            tableRows.push({
                id: `row-${i}`,
                pros: pros[i],
                cons: cons[i],
            });
        }
        return tableRows;
    }, [pros, cons]);
    const columns = useMemo(() => [
        {
            id: 'pros',
            header: () => (_jsxs("div", { className: "flex items-center gap-2 text-green-400", children: [_jsx(CheckCircle2, { size: 16 }), _jsx("span", { className: "font-semibold", children: "Pros" }), _jsxs("span", { className: "text-xs text-gray-400", children: ["(", pros.length, ")"] })] })),
            cell: ({ row }) => {
                const item = row.original.pros;
                if (!item)
                    return _jsx("div", { className: "text-gray-600 text-sm", children: "\u2014" });
                return (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-start gap-2", children: [_jsx(CheckCircle2, { size: 14, className: "text-green-400 mt-0.5 flex-shrink-0" }), _jsx("p", { className: "text-sm text-gray-200 flex-1", children: item.text })] }), _jsxs("div", { className: "flex items-center justify-between text-xs", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-gray-400", children: "Source:" }), _jsxs("button", { onClick: () => handleOpenUrl(item.sourceUrl), className: "text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1", children: [item.source, _jsx(ExternalLink, { size: 12 })] })] }), _jsxs("span", { className: "text-gray-500", children: [(item.confidence * 100).toFixed(0), "% confidence"] })] })] }));
            },
        },
        {
            id: 'cons',
            header: () => (_jsxs("div", { className: "flex items-center gap-2 text-red-400", children: [_jsx(XCircle, { size: 16 }), _jsx("span", { className: "font-semibold", children: "Cons" }), _jsxs("span", { className: "text-xs text-gray-400", children: ["(", cons.length, ")"] })] })),
            cell: ({ row }) => {
                const item = row.original.cons;
                if (!item)
                    return _jsx("div", { className: "text-gray-600 text-sm", children: "\u2014" });
                return (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-start gap-2", children: [_jsx(XCircle, { size: 14, className: "text-red-400 mt-0.5 flex-shrink-0" }), _jsx("p", { className: "text-sm text-gray-200 flex-1", children: item.text })] }), _jsxs("div", { className: "flex items-center justify-between text-xs", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-gray-400", children: "Source:" }), _jsxs("button", { onClick: () => handleOpenUrl(item.sourceUrl), className: "text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1", children: [item.source, _jsx(ExternalLink, { size: 12 })] })] }), _jsxs("span", { className: "text-gray-500", children: [(item.confidence * 100).toFixed(0), "% confidence"] })] })] }));
            },
        },
    ], [pros.length, cons.length]);
    const table = useReactTable({
        data: rows,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });
    if (pros.length === 0 && cons.length === 0) {
        return null;
    }
    return (_jsx("div", { className: "bg-gray-900/60 rounded-lg border border-gray-800/50 overflow-hidden", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full border-collapse", children: [_jsx("thead", { children: table.getHeaderGroups().map(headerGroup => (_jsx("tr", { className: "border-b border-gray-800/50", children: headerGroup.headers.map(header => (_jsx("th", { className: "px-4 py-3 text-left bg-gray-800/30", style: { width: header.id === 'pros' || header.id === 'cons' ? '50%' : 'auto' }, children: header.isPlaceholder
                                    ? null
                                    : flexRender(header.column.columnDef.header, header.getContext()) }, header.id))) }, headerGroup.id))) }), _jsx("tbody", { children: table.getRowModel().rows.map(row => (_jsx("tr", { className: "border-b border-gray-800/30 hover:bg-gray-800/20 transition-colors", children: row.getVisibleCells().map(cell => (_jsx("td", { className: "px-4 py-3 align-top", children: flexRender(cell.column.columnDef.cell, cell.getContext()) }, cell.id))) }, row.id))) })] }) }) }));
}
