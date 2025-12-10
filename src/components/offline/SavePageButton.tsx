/**
 * Save Page Button
 * Button component to save current page for offline access
 */

import { useState } from 'react';
import { Save, Check, Loader2 } from 'lucide-react';
import { useOfflineRAG } from '../../hooks/useOfflineRAG';
import { toast } from '../../utils/toast';

interface SavePageButtonProps {
  url: string;
  title?: string;
  className?: string;
  variant?: 'default' | 'icon' | 'text';
}

export function SavePageButton({
  url,
  title,
  className = '',
  variant = 'default',
}: SavePageButtonProps) {
  const { savePage } = useOfflineRAG();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!url) {
      toast.error('No URL to save');
      return;
    }

    setSaving(true);
    try {
      const docId = await savePage(url, title);
      if (docId) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('[SavePageButton] Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleSave}
        disabled={saving || !url}
        className={`rounded-lg p-2 transition-colors hover:bg-slate-800 disabled:opacity-50 ${className}`}
        title="Save for offline"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : saved ? (
          <Check className="h-4 w-4 text-green-400" />
        ) : (
          <Save className="h-4 w-4" />
        )}
      </button>
    );
  }

  if (variant === 'text') {
    return (
      <button
        onClick={handleSave}
        disabled={saving || !url}
        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-slate-800 disabled:opacity-50 ${className}`}
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Saving...</span>
          </>
        ) : saved ? (
          <>
            <Check className="h-4 w-4 text-green-400" />
            <span>Saved</span>
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            <span>Save for Offline</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleSave}
      disabled={saving || !url}
      className={`flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {saving ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Saving...</span>
        </>
      ) : saved ? (
        <>
          <Check className="h-4 w-4" />
          <span>Saved</span>
        </>
      ) : (
        <>
          <Save className="h-4 w-4" />
          <span>Save for Offline</span>
        </>
      )}
    </button>
  );
}
