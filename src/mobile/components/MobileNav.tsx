/**
 * Mobile Navigation Component
 * Bottom navigation bar for mobile devices
 */

import { Home, Search, TrendingUp, Settings, Mic } from 'lucide-react';
import { useAppStore } from '../../state/appStore';
import { useNavigate, useLocation } from 'react-router-dom';

export function MobileNav() {
  const { mode, setMode } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      id: 'browse',
      label: 'Browse',
      icon: Home,
      onClick: () => {
        setMode('Browse');
        navigate('/');
      },
      active: mode === 'Browse' && location.pathname === '/',
    },
    {
      id: 'research',
      label: 'Research',
      icon: Search,
      onClick: () => {
        setMode('Research');
        navigate('/research');
      },
      active: mode === 'Research',
    },
    {
      id: 'trade',
      label: 'Trade',
      icon: TrendingUp,
      onClick: () => {
        setMode('Trade');
        navigate('/trade');
      },
      active: mode === 'Trade',
    },
    {
      id: 'wispr',
      label: 'WISPR',
      icon: Mic,
      onClick: () => {
        navigate('/wispr');
      },
      active: location.pathname === '/wispr',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      onClick: () => {
        navigate('/settings');
      },
      active: location.pathname === '/settings',
    },
  ];

  return (
    <nav className="mobile-nav md:hidden safe-bottom" style={{ zIndex: 100 }}>
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={item.onClick}
            className={`flex flex-col items-center justify-center gap-1 px-3 py-2 min-h-[44px] min-w-[44px] rounded-lg transition-colors ${
              item.active
                ? 'text-indigo-400 bg-indigo-400/10'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
            aria-label={item.label}
            aria-current={item.active ? 'page' : undefined}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

