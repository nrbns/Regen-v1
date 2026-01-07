/**
 * Regen Vault - Feature #4
 * Private tabs + encryption + auto-delete
 */

import { useState, useEffect } from 'react';
import { Lock, Trash2, Eye, Shield } from 'lucide-react';

interface VaultTab {
  id: string;
  url: string;
  title: string;
  createdAt: number;
  expiresAt: number;
  encrypted: boolean;
}

// Simple encryption (in production, use Web Crypto API)
function encrypt(text: string, key: string): string {
  // Simple XOR encryption (replace with proper encryption in production)
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}

function decrypt(encrypted: string, key: string): string {
  try {
    const text = atob(encrypted);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch {
    return '';
  }
}

export function RegenVault() {
  const [vaultTabs, setVaultTabs] = useState<VaultTab[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [autoDelete, setAutoDelete] = useState(true);
  const [deleteAfter, setDeleteAfter] = useState(60); // minutes

  const encryptionKey = password || 'default-key';

  useEffect(() => {
    // Load vault tabs
    const saved = localStorage.getItem('regen-vault-tabs');
    if (saved) {
      try {
        const decrypted = JSON.parse(saved);
        setVaultTabs(decrypted);
      } catch {
        // Invalid data
      }
    }

    // Auto-delete expired tabs
    if (autoDelete) {
      const interval = setInterval(() => {
        setVaultTabs(prev => {
          const now = Date.now();
          const filtered = prev.filter(tab => tab.expiresAt > now);
          if (filtered.length !== prev.length) {
            localStorage.setItem('regen-vault-tabs', JSON.stringify(filtered));
          }
          return filtered;
        });
      }, 60000); // Check every minute

      return () => clearInterval(interval);
    }
  }, [autoDelete]);

  const unlock = () => {
    if (password.length >= 4) {
      setIsUnlocked(true);
    }
  };

  const _createVaultTab = async (url: string, title: string) => {
    const vaultTab: VaultTab = {
      id: `vault-${Date.now()}`,
      url: encrypt(url, encryptionKey),
      title: encrypt(title, encryptionKey),
      createdAt: Date.now(),
      expiresAt: Date.now() + deleteAfter * 60 * 1000,
      encrypted: true,
    };

    const updated = [vaultTab, ...vaultTabs];
    setVaultTabs(updated);
    localStorage.setItem('regen-vault-tabs', JSON.stringify(updated));
  };

  const deleteVaultTab = (id: string) => {
    const updated = vaultTabs.filter(t => t.id !== id);
    setVaultTabs(updated);
    localStorage.setItem('regen-vault-tabs', JSON.stringify(updated));
  };

  const openVaultTab = async (vaultTab: VaultTab) => {
    if (!isUnlocked) return;

    const url = decrypt(vaultTab.url, encryptionKey);
    // const title = decrypt(vaultTab.title, encryptionKey);

    // Create new tab in vault mode
    // Note: This would need proper tab creation API
    window.open(url, '_blank');
  };

  const clearAll = () => {
    if (confirm('Delete all vault tabs? This cannot be undone.')) {
      setVaultTabs([]);
      localStorage.removeItem('regen-vault-tabs');
    }
  };

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900 p-8">
        <Shield className="w-16 h-16 text-purple-400 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Regen Vault</h2>
        <p className="text-gray-400 mb-6">Enter password to unlock private tabs</p>
        <div className="w-full max-w-sm space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && unlock()}
            placeholder="Vault password"
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={unlock}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-semibold"
          >
            Unlock Vault
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Vault</h2>
          <span className="text-xs text-gray-400">({vaultTabs.length} tabs)</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={autoDelete}
              onChange={e => setAutoDelete(e.target.checked)}
              className="rounded"
            />
            Auto-delete
          </label>
          {autoDelete && (
            <select
              value={deleteAfter}
              onChange={e => setDeleteAfter(Number(e.target.value))}
              className="bg-gray-800 text-white text-xs rounded px-2 py-1"
            >
              <option value={5}>5 min</option>
              <option value={15}>15 min</option>
              <option value={60}>1 hour</option>
              <option value={1440}>24 hours</option>
            </select>
          )}
          <button
            onClick={clearAll}
            className="p-2 text-red-400 hover:text-red-300 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs List */}
      <div className="flex-1 overflow-y-auto p-4">
        {vaultTabs.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No vault tabs yet</p>
            <p className="text-xs mt-2">Create a private tab to add it to the vault</p>
          </div>
        ) : (
          <div className="space-y-2">
            {vaultTabs.map(tab => (
              <div
                key={tab.id}
                className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    {decrypt(tab.title, encryptionKey) || 'Untitled'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {decrypt(tab.url, encryptionKey)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Expires: {new Date(tab.expiresAt).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openVaultTab(tab)}
                    className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteVaultTab(tab.id)}
                    className="p-2 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
