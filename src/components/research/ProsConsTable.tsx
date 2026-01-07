/**
 * Pros/Cons Comparison Table Component
 * Displays structured pros and cons in a side-by-side comparison table
 */

import { useMemo } from 'react';
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from '@tanstack/react-table';
import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';

interface ProsConsItem {
  text: string;
  source: string;
  sourceUrl: string;
  sourceIndex: number;
  confidence: number;
}

interface ProsConsTableProps {
  pros: ProsConsItem[];
  cons: ProsConsItem[];
  sources?: Array<{ url: string; title: string }>; // Reserved for future use
}

type TableRow = {
  id: string;
  pros?: ProsConsItem;
  cons?: ProsConsItem;
};

export function ProsConsTable({ pros, cons }: ProsConsTableProps) {
  const { activeId } = useTabsStore();

  const handleOpenUrl = async (url: string) => {
    try {
      if (activeId) {
        await ipc.tabs.navigate(activeId, url);
      } else {
        await ipc.tabs.create(url);
      }
    } catch (error) {
      console.error('Failed to open URL:', error);
    }
  };

  // Create rows by pairing pros and cons
  const rows = useMemo<TableRow[]>(() => {
    const maxLength = Math.max(pros.length, cons.length);
    const tableRows: TableRow[] = [];

    for (let i = 0; i < maxLength; i++) {
      tableRows.push({
        id: `row-${i}`,
        pros: pros[i],
        cons: cons[i],
      });
    }

    return tableRows;
  }, [pros, cons]);

  const columns = useMemo<ColumnDef<TableRow>[]>(
    () => [
      {
        id: 'pros',
        header: () => (
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle2 size={16} />
            <span className="font-semibold">Pros</span>
            <span className="text-xs text-gray-400">({pros.length})</span>
          </div>
        ),
        cell: ({ row }) => {
          const item = row.original.pros;
          if (!item) return <div className="text-gray-600 text-sm">—</div>;

          return (
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-200 flex-1">{item.text}</p>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Source:</span>
                  <button
                    onClick={() => handleOpenUrl(item.sourceUrl)}
                    className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
                  >
                    {item.source}
                    <ExternalLink size={12} />
                  </button>
                </div>
                <span className="text-gray-500">
                  {(item.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>
            </div>
          );
        },
      },
      {
        id: 'cons',
        header: () => (
          <div className="flex items-center gap-2 text-red-400">
            <XCircle size={16} />
            <span className="font-semibold">Cons</span>
            <span className="text-xs text-gray-400">({cons.length})</span>
          </div>
        ),
        cell: ({ row }) => {
          const item = row.original.cons;
          if (!item) return <div className="text-gray-600 text-sm">—</div>;

          return (
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <XCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-200 flex-1">{item.text}</p>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Source:</span>
                  <button
                    onClick={() => handleOpenUrl(item.sourceUrl)}
                    className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
                  >
                    {item.source}
                    <ExternalLink size={12} />
                  </button>
                </div>
                <span className="text-gray-500">
                  {(item.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>
            </div>
          );
        },
      },
    ],
    [pros.length, cons.length]
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (pros.length === 0 && cons.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-900/60 rounded-lg border border-gray-800/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="border-b border-gray-800/50">
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left bg-gray-800/30"
                    style={{ width: header.id === 'pros' || header.id === 'cons' ? '50%' : 'auto' }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr
                key={row.id}
                className="border-b border-gray-800/30 hover:bg-gray-800/20 transition-colors"
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-3 align-top">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
