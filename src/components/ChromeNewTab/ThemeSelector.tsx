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
            className="fixed inset-0 bg-black/50 z-[90]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-[100] p-6 max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <Palette size={24} />
                Customize Theme
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            {/* Upload Custom Image */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Custom Background
              </label>
              <label className="flex items-center justify-center gap-3 w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-colors">
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
              <label className="block text-sm font-medium text-gray-700 mb-3">Preset Themes</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {availableThemes.map(theme => (
                  <button
                    key={theme.name || 'default'}
                    onClick={() => theme.name && handleThemeSelect(theme.name)}
                    className={`relative p-4 rounded-lg border-2 transition-all ${
                      themeName === theme.name
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className="w-full h-20 rounded mb-2"
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
                      <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
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
