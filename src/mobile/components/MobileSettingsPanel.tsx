/**
 * Mobile Settings Panel Component
 * Compact, touch-optimized settings interface
 */

import { useState } from 'react';
import { 
  X, User, Palette, Shield, Keyboard, 
  Globe, Moon, Sun, ChevronRight 
} from 'lucide-react';
import { useSettingsStore } from '../../state/settingsStore';
import { cn } from '../../lib/utils';
import { useMobileDetection } from '../hooks/useMobileDetection';

interface MobileSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSettingsPanel({ isOpen, onClose }: MobileSettingsPanelProps) {
  const { isMobile } = useMobileDetection();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const _settings = useSettingsStore();

  if (!isMobile || !isOpen) return null;

  const sections = [
    {
      id: 'appearance',
      label: 'Appearance',
      icon: Palette,
      component: <AppearanceSettings />,
    },
    {
      id: 'account',
      label: 'Account',
      icon: User,
      component: <AccountSettings />,
    },
    {
      id: 'privacy',
      label: 'Privacy & Security',
      icon: Shield,
      component: <PrivacySettings />,
    },
    {
      id: 'language',
      label: 'Language',
      icon: Globe,
      component: <LanguageSettings />,
    },
    {
      id: 'shortcuts',
      label: 'Shortcuts',
      icon: Keyboard,
      component: <ShortcutsSettings />,
    },
  ];

  if (activeSection) {
    const section = sections.find(s => s.id === activeSection);
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 safe-top safe-bottom">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 safe-top">
          <button
            onClick={() => setActiveSection(null)}
            className="p-2 text-gray-400 hover:text-white transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <h2 className="text-white font-semibold text-lg">{section?.label}</h2>
          <div className="w-9" /> {/* Spacer */}
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-full pb-20 safe-bottom">
          {section?.component}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 safe-top safe-bottom">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800 safe-top">
        <h2 className="text-white font-semibold text-lg">Settings</h2>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-white transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Close settings"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Settings List */}
      <div className="overflow-y-auto pb-20 safe-bottom">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className="w-full flex items-center gap-4 p-4 border-b border-gray-800 text-left hover:bg-gray-800/50 transition-colors touch-manipulation min-h-[44px]"
            >
              <Icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <span className="text-white font-medium flex-1">{section.label}</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Settings Components
function AppearanceSettings() {
  const { theme, setTheme } = useSettingsStore();
  
  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-white font-medium mb-3">Theme</h3>
        <div className="space-y-2">
          <button
            onClick={() => setTheme('light')}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors touch-manipulation min-h-[44px]',
              theme === 'light'
                ? 'border-indigo-600 bg-indigo-600/20 text-white'
                : 'border-gray-800 bg-gray-800/50 text-gray-300 hover:bg-gray-800'
            )}
          >
            <Sun className="w-5 h-5" />
            <span>Light</span>
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors touch-manipulation min-h-[44px]',
              theme === 'dark'
                ? 'border-indigo-600 bg-indigo-600/20 text-white'
                : 'border-gray-800 bg-gray-800/50 text-gray-300 hover:bg-gray-800'
            )}
          >
            <Moon className="w-5 h-5" />
            <span>Dark</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function AccountSettings() {
  return (
    <div className="p-4">
      <p className="text-gray-400 text-sm">Account settings coming soon</p>
    </div>
  );
}

function PrivacySettings() {
  return (
    <div className="p-4">
      <p className="text-gray-400 text-sm">Privacy settings coming soon</p>
    </div>
  );
}

function LanguageSettings() {
  return (
    <div className="p-4">
      <p className="text-gray-400 text-sm">Language settings coming soon</p>
    </div>
  );
}

function ShortcutsSettings() {
  return (
    <div className="p-4">
      <p className="text-gray-400 text-sm">Keyboard shortcuts</p>
      <div className="mt-4 space-y-2 text-sm text-gray-400">
        <div className="flex justify-between">
          <span>Voice Assistant</span>
          <kbd className="px-2 py-1 bg-gray-800 rounded">Ctrl+Space</kbd>
        </div>
      </div>
    </div>
  );
}

