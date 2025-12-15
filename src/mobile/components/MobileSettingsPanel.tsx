/**
 * Mobile Settings Panel Component
 * Compact, touch-optimized settings interface
 */

import { useState } from 'react';
import { X, User, Palette, Shield, Keyboard, Globe, Moon, Sun, ChevronRight } from 'lucide-react';
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
      <div className="safe-top safe-bottom fixed inset-0 z-50 bg-gray-900">
        {/* Header */}
        <div className="safe-top flex items-center justify-between border-b border-gray-800 p-4">
          <button
            onClick={() => setActiveSection(null)}
            className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center p-2 text-gray-400 transition-colors hover:text-white"
          >
            <ChevronRight className="h-5 w-5 rotate-180" />
          </button>
          <h2 className="text-lg font-semibold text-white">{section?.label}</h2>
          <div className="w-9" /> {/* Spacer */}
        </div>

        {/* Content */}
        <div className="safe-bottom h-full overflow-y-auto pb-20">{section?.component}</div>
      </div>
    );
  }

  return (
    <div className="safe-top safe-bottom fixed inset-0 z-50 bg-gray-900">
      {/* Header */}
      <div className="safe-top flex items-center justify-between border-b border-gray-800 p-4">
        <h2 className="text-lg font-semibold text-white">Settings</h2>
        <button
          onClick={onClose}
          className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center p-2 text-gray-400 transition-colors hover:text-white"
          aria-label="Close settings"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Settings List */}
      <div className="safe-bottom overflow-y-auto pb-20">
        {sections.map(section => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className="flex min-h-[44px] w-full touch-manipulation items-center gap-4 border-b border-gray-800 p-4 text-left transition-colors hover:bg-gray-800/50"
            >
              <Icon className="h-5 w-5 flex-shrink-0 text-gray-400" />
              <span className="flex-1 font-medium text-white">{section.label}</span>
              <ChevronRight className="h-5 w-5 text-gray-400" />
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
    <div className="space-y-4 p-4">
      <div>
        <h3 className="mb-3 font-medium text-white">Theme</h3>
        <div className="space-y-2">
          <button
            onClick={() => setTheme('light')}
            className={cn(
              'flex min-h-[44px] w-full touch-manipulation items-center gap-3 rounded-lg border p-3 transition-colors',
              theme === 'light'
                ? 'border-indigo-600 bg-indigo-600/20 text-white'
                : 'border-gray-800 bg-gray-800/50 text-gray-300 hover:bg-gray-800'
            )}
          >
            <Sun className="h-5 w-5" />
            <span>Light</span>
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={cn(
              'flex min-h-[44px] w-full touch-manipulation items-center gap-3 rounded-lg border p-3 transition-colors',
              theme === 'dark'
                ? 'border-indigo-600 bg-indigo-600/20 text-white'
                : 'border-gray-800 bg-gray-800/50 text-gray-300 hover:bg-gray-800'
            )}
          >
            <Moon className="h-5 w-5" />
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
      <p className="text-sm text-gray-400">Account settings coming soon</p>
    </div>
  );
}

function PrivacySettings() {
  return (
    <div className="p-4">
      <p className="text-sm text-gray-400">Privacy settings coming soon</p>
    </div>
  );
}

function LanguageSettings() {
  return (
    <div className="p-4">
      <p className="text-sm text-gray-400">Language settings coming soon</p>
    </div>
  );
}

function ShortcutsSettings() {
  return (
    <div className="p-4">
      <p className="text-sm text-gray-400">Keyboard shortcuts</p>
      <div className="mt-4 space-y-2 text-sm text-gray-400">
        <div className="flex justify-between">
          <span>Voice Assistant</span>
          <kbd className="rounded bg-gray-800 px-2 py-1">Ctrl+Space</kbd>
        </div>
      </div>
    </div>
  );
}
