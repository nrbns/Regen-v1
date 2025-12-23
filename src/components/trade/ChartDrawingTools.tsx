/**
 * ChartDrawingTools - TradingView-style drawing tools
 * Supports trend lines, Fibonacci retracements, shapes, annotations
 */

import { useState, useRef as _useRef, useCallback as _useCallback } from 'react';
import { TrendingUp as Line, Move, Square, Circle, Type, Minus, X } from 'lucide-react';
import { motion, AnimatePresence as _AnimatePresence } from 'framer-motion';

export type DrawingToolType = 'trendline' | 'fibonacci' | 'rectangle' | 'circle' | 'text' | 'none';

export interface DrawingShape {
  id: string;
  type: DrawingToolType;
  points: Array<{ x: number; y: number }>;
  color: string;
  label?: string;
}

interface ChartDrawingToolsProps {
  selectedTool: DrawingToolType;
  onToolSelect: (tool: DrawingToolType) => void;
  shapes: DrawingShape[];
  onShapeAdd: (shape: DrawingShape) => void;
  onShapeRemove: (id: string) => void;
  onShapeUpdate: (id: string, shape: Partial<DrawingShape>) => void;
}

const TOOL_ICONS: Record<DrawingToolType, React.ComponentType<any>> = {
  trendline: Line,
  fibonacci: Minus,
  rectangle: Square,
  circle: Circle,
  text: Type,
  none: X,
};

const TOOL_COLORS: Record<DrawingToolType, string> = {
  trendline: 'text-blue-400',
  fibonacci: 'text-purple-400',
  rectangle: 'text-green-400',
  circle: 'text-yellow-400',
  text: 'text-orange-400',
  none: 'text-gray-400',
};

const TOOL_NAMES: Record<DrawingToolType, string> = {
  trendline: 'Trend Line',
  fibonacci: 'Fibonacci',
  rectangle: 'Rectangle',
  circle: 'Circle',
  text: 'Text',
  none: 'None',
};

export function ChartDrawingTools({
  selectedTool,
  onToolSelect,
  shapes,
  onShapeAdd: _onShapeAdd,
  onShapeRemove,
  onShapeUpdate: _onShapeUpdate,
}: ChartDrawingToolsProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [color, setColor] = useState('#3b82f6'); // Default blue

  const drawingTools: DrawingToolType[] = ['trendline', 'fibonacci', 'rectangle', 'circle', 'text'];

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mb-3 flex w-full items-center justify-between text-sm font-medium text-gray-300 hover:text-white"
      >
        <span className="flex items-center gap-2">
          <Move size={16} />
          Drawing Tools
        </span>
        <span className="text-xs text-gray-500">
          {selectedTool !== 'none' ? TOOL_NAMES[selectedTool] : 'None'}
        </span>
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-3"
        >
          {/* Tool Selection */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-400">Select Tool</div>
            <div className="grid grid-cols-2 gap-2">
              {drawingTools.map(tool => {
                const Icon = TOOL_ICONS[tool];
                const colorClass = TOOL_COLORS[tool];
                const isSelected = selectedTool === tool;
                return (
                  <button
                    key={tool}
                    onClick={() => onToolSelect(isSelected ? 'none' : tool)}
                    className={`flex items-center gap-2 rounded-lg border p-2 text-xs transition ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                        : 'border-slate-700/40 bg-slate-800/30 text-gray-300 hover:border-slate-600'
                    }`}
                  >
                    <Icon size={14} className={colorClass} />
                    {TOOL_NAMES[tool]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Picker */}
          {selectedTool !== 'none' && (
            <div className="space-y-2 border-t border-slate-700/40 pt-3">
              <div className="text-xs font-medium text-gray-400">Color</div>
              <div className="flex gap-2">
                {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded border-2 transition ${
                      color === c ? 'scale-110 border-white' : 'border-slate-600'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border border-slate-600 bg-transparent"
                />
              </div>
            </div>
          )}

          {/* Active Shapes */}
          {shapes.length > 0 && (
            <div className="space-y-2 border-t border-slate-700/40 pt-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-gray-400">Active Shapes</div>
                <span className="text-xs text-gray-500">{shapes.length}</span>
              </div>
              <div className="max-h-32 space-y-1 overflow-y-auto">
                {shapes.map(shape => {
                  const Icon = TOOL_ICONS[shape.type];
                  return (
                    <div
                      key={shape.id}
                      className="flex items-center justify-between rounded border border-slate-700/40 bg-slate-800/30 p-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded" style={{ backgroundColor: shape.color }} />
                        <Icon size={12} className={TOOL_COLORS[shape.type]} />
                        <span className="text-xs text-gray-300">
                          {shape.label || TOOL_NAMES[shape.type]}
                        </span>
                      </div>
                      <button
                        onClick={() => onShapeRemove(shape.id)}
                        className="text-gray-400 hover:text-red-400"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

/**
 * Helper function to draw shapes on canvas/chart
 */
export function drawShapeOnCanvas(
  ctx: CanvasRenderingContext2D,
  shape: DrawingShape,
  width: number,
  height: number
): void {
  ctx.strokeStyle = shape.color;
  ctx.lineWidth = 2;
  ctx.setLineDash([]);

  switch (shape.type) {
    case 'trendline':
      if (shape.points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x * width, shape.points[0].y * height);
        for (let i = 1; i < shape.points.length; i++) {
          ctx.lineTo(shape.points[i].x * width, shape.points[i].y * height);
        }
        ctx.stroke();
      }
      break;

    case 'fibonacci':
      if (shape.points.length >= 2) {
        const start = shape.points[0];
        const end = shape.points[1];
        const diff = end.y - start.y;
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];

        ctx.setLineDash([5, 5]);
        levels.forEach(level => {
          const y = start.y + diff * level;
          ctx.beginPath();
          ctx.moveTo(start.x * width, y * height);
          ctx.lineTo(end.x * width, y * height);
          ctx.stroke();

          // Draw level label
          ctx.fillStyle = shape.color;
          ctx.font = '10px sans-serif';
          ctx.fillText(`${(level * 100).toFixed(1)}%`, start.x * width + 5, y * height - 5);
        });
        ctx.setLineDash([]);
      }
      break;

    case 'rectangle':
      if (shape.points.length >= 2) {
        const start = shape.points[0];
        const end = shape.points[1];
        const x = Math.min(start.x, end.x) * width;
        const y = Math.min(start.y, end.y) * height;
        const w = Math.abs(end.x - start.x) * width;
        const h = Math.abs(end.y - start.y) * height;
        ctx.strokeRect(x, y, w, h);
      }
      break;

    case 'circle':
      if (shape.points.length >= 2) {
        const start = shape.points[0];
        const end = shape.points[1];
        const centerX = start.x * width;
        const centerY = start.y * height;
        const radius = Math.sqrt(
          Math.pow((end.x - start.x) * width, 2) + Math.pow((end.y - start.y) * height, 2)
        );
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;

    case 'text':
      if (shape.points.length >= 1 && shape.label) {
        ctx.fillStyle = shape.color;
        ctx.font = '12px sans-serif';
        ctx.fillText(shape.label, shape.points[0].x * width, shape.points[0].y * height);
      }
      break;
  }
}
