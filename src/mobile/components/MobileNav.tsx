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
    <nav className="mobile-nav safe-bottom md:hidden" style={{ zIndex: 100 }}>
      {navItems.map(item => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={item.onClick}
            className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 transition-colors ${
              item.active
                ? 'bg-indigo-400/10 text-indigo-400'
                : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
            }`}
            aria-label={item.label}
            aria-current={item.active ? 'page' : undefined}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
