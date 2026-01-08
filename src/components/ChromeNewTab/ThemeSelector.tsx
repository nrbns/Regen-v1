/**
 * ThemeSelector - Component for selecting and customizing Chrome themes
 */

import { useState } from 'react';
import { Palette, Upload, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChromeTheme } from './useChromeTheme';

interface ThemeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeSelector({ isOpen, onClose }: ThemeSelectorProps) {
  const { themeName, availableThemes, setTheme, setThemeById } = useChromeTheme();
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setUploading(true);
    try {
      // Convert to data URL for immediate use
      const reader = new FileReader();
      reader.onload = e => {
        const imageUrl = e.target?.result as string;
        setTheme({
          backgroundImage: imageUrl,
          themeColor: '#4CAF50',
          name: 'Custom Theme',
        });
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('[ThemeSelector] Failed to upload image:', error);
      setUploading(false);
    }
  };

  const handleThemeSelect = (themeId: string) => {
    setThemeById(themeId);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 z-[100] max-h-[80vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
                <Palette size={24} />
                Customize Theme
              </h2>
              <button
                onClick={onClose}
                className="rounded-full p-2 transition-colors hover:bg-gray-100"
                aria-label="Close"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            {/* Upload Custom Image */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Upload Custom Background
              </label>
              <label className="flex h-32 w-full cursor-pointer items-center justify-center gap-3 rounded-lg border-2 border-dashed border-gray-300 transition-colors hover:border-blue-500 hover:bg-blue-50/50">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
                {uploading ? (
                  <span className="text-gray-600">Uploading...</span>
                ) : (
                  <>
                    <Upload size={20} className="text-gray-600" />
                    <span className="text-sm text-gray-600">Click to upload or drag and drop</span>
                  </>
                )}
              </label>
            </div>

            {/* Theme Presets */}
            <div>
              <label className="mb-3 block text-sm font-medium text-gray-700">Preset Themes</label>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {availableThemes.map(theme => (
                  <button
                    key={theme.name || 'default'}
                    onClick={() => theme.name && handleThemeSelect(theme.name)}
                    className={`relative rounded-lg border-2 p-4 transition-all ${
                      themeName === theme.name
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className="mb-2 h-20 w-full rounded"
                      style={{
                        backgroundColor: theme.themeColor,
                        backgroundImage: theme.backgroundImage
                          ? `url(${theme.backgroundImage})`
                          : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                    <div className="text-sm font-medium text-gray-900">{theme.name}</div>
                    {themeName === theme.name && (
                      <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
