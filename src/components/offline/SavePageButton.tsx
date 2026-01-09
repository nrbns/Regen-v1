import React, { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';

interface SavePageButtonProps {
  url: string;
  title?: string;
  variant?: 'default' | 'outline';
  className?: string;
  onSave?: (url: string, title?: string) => void;
}

export function SavePageButton({
  url,
  title = '',
  variant = 'default',
  className = '',
  onSave
}: SavePageButtonProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!url.trim()) return;

    setIsSaving(true);
    try {
      // Simulate save operation
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (onSave) {
        onSave(url, title);
      } else {
        // Default save behavior
        console.log('Saving page:', { url, title });
      }
    } catch (error) {
      console.error('Failed to save page:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const baseClasses = "inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800";

  const variantClasses = variant === 'outline'
    ? "border border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white"
    : "bg-purple-600 text-white hover:bg-purple-700 disabled:bg-purple-800";

  return (
    <button
      onClick={handleSave}
      disabled={isSaving || !url.trim()}
      className={`${baseClasses} ${variantClasses} ${className}`}
    >
      {isSaving ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      <span>{isSaving ? 'Saving...' : 'Save'}</span>
    </button>
  );
}