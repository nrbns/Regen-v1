/**
 * SmartActionButton - AI-generated action button with visual feedback
 * Based on Figma UI/UX Prototype Flow redesign
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Navigation,
  ExternalLink,
  Copy,
  FileText,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export type SmartActionType =
  | 'navigate'
  | 'openTab'
  | 'duplicateTab'
  | 'notes'
  | 'research'
  | 'copy'
  | 'search';

export interface SmartAction {
  id: string;
  type: SmartActionType;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  onClick: () => void | Promise<void>;
}

const actionIcons: Record<SmartActionType, React.ReactNode> = {
  navigate: <Navigation size={16} />,
  openTab: <ExternalLink size={16} />,
  duplicateTab: <ExternalLink size={16} />,
  notes: <FileText size={16} />,
  research: <Search size={16} />,
  copy: <Copy size={16} />,
  search: <Search size={16} />,
};

const actionColors: Record<SmartActionType, string> = {
  navigate: 'blue',
  openTab: 'green',
  duplicateTab: 'purple',
  notes: 'amber',
  research: 'indigo',
  copy: 'gray',
  search: 'blue',
};

export interface SmartActionButtonProps {
  action: SmartAction;
  compact?: boolean;
}

export function SmartActionButton({ action, compact = false }: SmartActionButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const color = actionColors[action.type];
  const icon = action.icon || actionIcons[action.type];

  const handleClick = async () => {
    setStatus('loading');
    try {
      await action.onClick();
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      console.error('[SmartActionButton] Action failed:', error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 size={14} className="animate-spin" />;
      case 'success':
        return <CheckCircle2 size={14} className="text-green-400" />;
      case 'error':
        return <XCircle size={14} className="text-red-400" />;
      default:
        return icon;
    }
  };

  const getColorClasses = () => {
    const base = `border-${color}-500/40 bg-${color}-500/15 hover:bg-${color}-500/25 text-${color}-200`;
    if (status === 'success') {
      return `border-green-500/40 bg-green-500/15 text-green-200`;
    }
    if (status === 'error') {
      return `border-red-500/40 bg-red-500/15 text-red-200`;
    }
    return base;
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={status === 'loading'}
      whileHover={{ scale: status === 'idle' ? 1.02 : 1 }}
      whileTap={{ scale: 0.98 }}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
        ${getColorClasses()}
        ${compact ? 'text-xs' : 'text-sm'}
        ${status === 'loading' ? 'cursor-wait opacity-75' : 'cursor-pointer'}
        focus:outline-none focus:ring-2 focus:ring-${color}-500/40
      `}
      title={action.description || action.label}
    >
      {getStatusIcon()}
      {!compact && <span className="font-medium">{action.label}</span>}
      {action.description && !compact && (
        <span className="text-xs opacity-75 truncate max-w-[200px]">{action.description}</span>
      )}
    </motion.button>
  );
}

export interface SmartActionGroupProps {
  actions: SmartAction[];
  compact?: boolean;
  className?: string;
}

export function SmartActionGroup({
  actions,
  compact = false,
  className = '',
}: SmartActionGroupProps) {
  if (actions.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {actions.map(action => (
        <SmartActionButton key={action.id} action={action} compact={compact} />
      ))}
    </div>
  );
}
