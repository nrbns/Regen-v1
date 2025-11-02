/**
 * Profile Switcher Component
 * Allows switching between browser profiles
 */

import { useState, useEffect } from 'react';
import { ipc } from '../lib/ipc-typed';
import { User, Plus } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  createdAt: number;
  proxy?: unknown;
}

export function ProfileSwitcher() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    try {
      const list = await ipc.profiles.list();
      setProfiles(list);
      // Get active profile (first profile or default)
      if (list.length > 0 && !activeProfileId) {
        setActiveProfileId(list[0].id);
      }
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
  }

  async function createProfile(name: string) {
    try {
      await ipc.profiles.create(name);
      await loadProfiles();
      setShowCreate(false);
    } catch (error) {
      console.error('Failed to create profile:', error);
      alert('Failed to create profile');
    }
  }

  return (
    <div className="flex items-center gap-2 px-2">
      <select
        value={activeProfileId || ''}
        onChange={async (e) => {
          const newProfileId = e.target.value || null;
          setActiveProfileId(newProfileId);
          // Profile switching is handled by tab creation with profileId
          // This just updates the UI state
        }}
        className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Default</option>
        {profiles.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.name}
          </option>
        ))}
      </select>
      
      <button
        onClick={() => setShowCreate(!showCreate)}
        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
        title="Create Profile"
      >
        <Plus size={16} />
      </button>

      {showCreate && (
        <div className="absolute top-full mt-2 bg-gray-800 border border-gray-700 rounded p-3 shadow-lg z-50">
          <input
            type="text"
            placeholder="Profile name"
            className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const name = (e.target as HTMLInputElement).value.trim();
                if (name) {
                  createProfile(name);
                }
              } else if (e.key === 'Escape') {
                setShowCreate(false);
              }
            }}
            autoFocus
          />
        </div>
      )}
    </div>
  );
}

