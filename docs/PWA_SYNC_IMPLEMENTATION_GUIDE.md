# 📱 Regen Browser - PWA + Cross-Device Sync Implementation Guide

**Step-by-Step Technical Implementation**

**Date**: December 2025  
**Version**: 1.0  
**Status**: Implementation Guide

---

## 🎯 Overview

This guide provides step-by-step instructions for implementing:

1. **Progressive Web App (PWA)** - Make Regen installable on mobile devices
2. **Cross-Device Sync** - Sync history, bookmarks, and settings across devices

**Target Completion**: Days 1-5 of 15-Day Sprint

---

## 📱 PART 1: PWA Implementation

### Step 1: Create PWA Manifest

**File**: `public/manifest.json`

```json
{
  "name": "Regen Browser - India's AI Browser",
  "short_name": "Regen",
  "description": "AI-powered browser with offline capabilities, built for India",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#6366f1",
  "orientation": "any",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/mobile-1.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ],
  "categories": ["productivity", "utilities"],
  "shortcuts": [
    {
      "name": "Research",
      "short_name": "Research",
      "description": "Open Research Mode",
      "url": "/?mode=research",
      "icons": [{ "src": "/icons/research.png", "sizes": "96x96" }]
    },
    {
      "name": "Voice Assistant",
      "short_name": "WISPR",
      "description": "Open WISPR Voice Assistant",
      "url": "/?action=wispr",
      "icons": [{ "src": "/icons/wispr.png", "sizes": "96x96" }]
    }
  ],
  "share_target": {
    "action": "/share",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url"
    }
  }
}
```

**Action Items**:

- [ ] Create `public/manifest.json`
- [ ] Generate app icons (72x72 to 512x512)
- [ ] Add manifest link to `index.html`

---

### Step 2: Implement Service Worker

**File**: `public/sw.js` or `src/lib/service-worker.ts`

```typescript
// Service Worker for PWA caching and offline support

const CACHE_NAME = 'regen-browser-v1';
const STATIC_CACHE = 'regen-static-v1';
const DYNAMIC_CACHE = 'regen-dynamic-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles/globals.css',
  '/assets/logo.svg',
  // Add critical assets
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map(name => caches.delete(name))
      );
    })
  );
  return self.clients.claim(); // Take control immediately
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip API calls (they should go to network)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(request).then(response => {
      if (response) {
        return response; // Serve from cache
      }

      // Fetch from network
      return fetch(request)
        .then(response => {
          // Clone response (can only read once)
          const responseClone = response.clone();

          // Cache dynamic content
          if (response.status === 200) {
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(request, responseClone);
            });
          }

          return response;
        })
        .catch(() => {
          // Offline fallback
          if (request.destination === 'document') {
            return caches.match('/offline.html');
          }
        });
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'sync-history') {
    event.waitUntil(syncHistory());
  }
  if (event.tag === 'sync-bookmarks') {
    event.waitUntil(syncBookmarks());
  }
});

async function syncHistory() {
  // Sync history from IndexedDB to server
  // Implementation in sync service
}

async function syncBookmarks() {
  // Sync bookmarks from IndexedDB to server
  // Implementation in sync service
}
```

**Registration** (in `src/main.tsx` or `src/lib/service-worker.ts`):

```typescript
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              showUpdateNotification();
            }
          });
        }
      });

      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}
```

**Action Items**:

- [ ] Create service worker file
- [ ] Register service worker on app load
- [ ] Test offline functionality
- [ ] Test cache invalidation

---

### Step 3: Install Prompt UI

**File**: `src/components/pwa/InstallPrompt.tsx`

```typescript
import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show prompt after 3 seconds (or based on user behavior)
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted install prompt');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for this session
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!showPrompt || !deferredPrompt) return null;

  // Check if already dismissed recently
  const dismissed = localStorage.getItem('pwa-install-dismissed');
  if (dismissed && Date.now() - parseInt(dismissed) < 24 * 60 * 60 * 1000) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gray-900 border border-gray-700 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-white font-semibold mb-1">Install Regen Browser</h3>
          <p className="text-gray-400 text-sm">
            Add Regen to your home screen for quick access and offline support.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="ml-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={handleInstall}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="px-4 py-2 text-gray-400 hover:text-white"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
```

**Action Items**:

- [ ] Create InstallPrompt component
- [ ] Add to app layout
- [ ] Test install flow on mobile devices

---

### Step 4: Mobile Responsive Design

**File**: `src/styles/mobile.css` (or add to existing styles)

```css
/* Mobile-first responsive design */

/* Base mobile styles */
@media (max-width: 768px) {
  /* Touch-optimized targets (minimum 44x44px) */
  button,
  a,
  input,
  select {
    min-height: 44px;
    min-width: 44px;
  }

  /* Mobile navigation drawer */
  .mobile-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #1a1a1a;
    border-top: 1px solid #333;
    padding: 8px;
    display: flex;
    justify-content: space-around;
    z-index: 100;
  }

  /* Hide desktop navigation */
  .desktop-nav {
    display: none;
  }

  /* Mobile-optimized tabs */
  .tab-list {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .tab-list::-webkit-scrollbar {
    display: none;
  }

  /* Swipe gestures */
  .swipeable {
    touch-action: pan-y;
  }
}
```

**Mobile Navigation Component**: `src/components/mobile/MobileNav.tsx`

```typescript
import { Home, Search, Settings, Mic } from 'lucide-react';
import { useAppStore } from '@/state/appStore';
import { useNavigate } from 'react-router-dom';

export function MobileNav() {
  const { mode, setMode } = useAppStore();
  const navigate = useNavigate();

  return (
    <nav className="mobile-nav md:hidden">
      <button
        onClick={() => { setMode('Browse'); navigate('/'); }}
        className={`flex flex-col items-center gap-1 px-4 py-2 ${
          mode === 'Browse' ? 'text-indigo-400' : 'text-gray-400'
        }`}
      >
        <Home className="w-6 h-6" />
        <span className="text-xs">Browse</span>
      </button>
      <button
        onClick={() => { setMode('Research'); navigate('/research'); }}
        className={`flex flex-col items-center gap-1 px-4 py-2 ${
          mode === 'Research' ? 'text-indigo-400' : 'text-gray-400'
        }`}
      >
        <Search className="w-6 h-6" />
        <span className="text-xs">Research</span>
      </button>
      <button
        onClick={() => navigate('/wispr')}
        className="flex flex-col items-center gap-1 px-4 py-2 text-gray-400"
      >
        <Mic className="w-6 h-6" />
        <span className="text-xs">WISPR</span>
      </button>
      <button
        onClick={() => navigate('/settings')}
        className="flex flex-col items-center gap-1 px-4 py-2 text-gray-400"
      >
        <Settings className="w-6 h-6" />
        <span className="text-xs">Settings</span>
      </button>
    </nav>
  );
}
```

**Action Items**:

- [ ] Create mobile CSS
- [ ] Create mobile navigation component
- [ ] Test on various mobile devices
- [ ] Optimize touch interactions

---

## 🔄 PART 2: Cross-Device Sync Implementation

### Step 5: Sync Service Architecture

**File**: `src/services/sync/syncService.ts`

```typescript
interface SyncData {
  history: HistoryEntry[];
  bookmarks: Bookmark[];
  settings: UserSettings;
  lastSynced: number;
}

interface SyncService {
  // Initialization
  initialize(): Promise<void>;

  // Sync operations
  syncAll(): Promise<void>;
  syncHistory(): Promise<void>;
  syncBookmarks(): Promise<void>;
  syncSettings(): Promise<void>;

  // Conflict resolution
  resolveConflict<T>(local: T, remote: T): Promise<T>;

  // Status
  getSyncStatus(): SyncStatus;
  isOnline(): boolean;
}

class SyncServiceImpl implements SyncService {
  private apiUrl = 'https://api.regenbrowser.com/sync'; // Replace with actual API
  private encryptionKey: CryptoKey | null = null;
  private userId: string | null = null;

  async initialize() {
    // Get or create user ID
    this.userId = await this.getUserId();

    // Initialize encryption
    this.encryptionKey = await this.getEncryptionKey();

    // Check online status
    this.setupOnlineListener();

    // Start periodic sync (every 5 minutes)
    setInterval(() => this.syncAll(), 5 * 60 * 1000);
  }

  async syncAll() {
    if (!this.isOnline()) {
      console.log('Offline - queuing sync');
      return this.queueSync();
    }

    try {
      await Promise.all([this.syncHistory(), this.syncBookmarks(), this.syncSettings()]);

      // Update last synced timestamp
      await this.updateLastSynced();
    } catch (error) {
      console.error('Sync failed:', error);
      this.queueSync();
    }
  }

  async syncHistory() {
    const localHistory = await this.getLocalHistory();
    const remoteHistory = await this.getRemoteHistory();

    // Merge and resolve conflicts
    const merged = this.mergeHistory(localHistory, remoteHistory);

    // Save merged data
    await this.saveLocalHistory(merged);
    await this.saveRemoteHistory(merged);
  }

  async syncBookmarks() {
    const localBookmarks = await this.getLocalBookmarks();
    const remoteBookmarks = await this.getRemoteBookmarks();

    // Merge and resolve conflicts
    const merged = this.mergeBookmarks(localBookmarks, remoteBookmarks);

    // Save merged data
    await this.saveLocalBookmarks(merged);
    await this.saveRemoteBookmarks(merged);
  }

  private async getUserId(): Promise<string> {
    let userId = localStorage.getItem('user-id');
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem('user-id', userId);
    }
    return userId;
  }

  private async getEncryptionKey(): Promise<CryptoKey> {
    // Use Web Crypto API for encryption
    // Key derived from user password or device-specific key
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(this.userId!),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new Uint8Array(16),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private async encrypt(data: any): Promise<string> {
    if (!this.encryptionKey) throw new Error('Encryption key not initialized');

    const encoded = new TextEncoder().encode(JSON.stringify(data));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      encoded
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  }

  private async decrypt(encrypted: string): Promise<any> {
    if (!this.encryptionKey) throw new Error('Encryption key not initialized');

    // Decode from base64
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      data
    );

    return JSON.parse(new TextDecoder().decode(decrypted));
  }

  private isOnline(): boolean {
    return navigator.onLine;
  }

  private setupOnlineListener() {
    window.addEventListener('online', () => {
      console.log('Back online - syncing');
      this.syncAll();
    });

    window.addEventListener('offline', () => {
      console.log('Offline - queuing syncs');
    });
  }

  private async queueSync() {
    // Store sync queue in IndexedDB
    // Service worker will handle when online
    const db = await this.getDB();
    await db.put('sync-queue', {
      type: 'sync-all',
      timestamp: Date.now(),
    });
  }
}
```

---

### Step 6: Sync Backend API

**File**: `server/api/sync.ts` (Fastify)

```typescript
import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const syncSchema = z.object({
  userId: z.string(),
  history: z.array(z.any()).optional(),
  bookmarks: z.array(z.any()).optional(),
  settings: z.any().optional(),
  lastSynced: z.number(),
});

export async function syncRoutes(fastify: FastifyInstance) {
  // Get sync data
  fastify.get('/sync/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };

    // Get data from database
    const data = await fastify.db.getSyncData(userId);

    return {
      success: true,
      data: {
        history: data.history || [],
        bookmarks: data.bookmarks || [],
        settings: data.settings || {},
        lastSynced: data.lastSynced || 0,
      },
    };
  });

  // Push sync data
  fastify.post('/sync/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const body = syncSchema.parse(request.body);

    // Save to database
    await fastify.db.saveSyncData(userId, {
      history: body.history || [],
      bookmarks: body.bookmarks || [],
      settings: body.settings || {},
      lastSynced: Date.now(),
    });

    return {
      success: true,
      message: 'Sync data saved',
    };
  });

  // Delta sync (only changes)
  fastify.post('/sync/:userId/delta', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const { lastSynced, changes } = request.body as {
      lastSynced: number;
      changes: any;
    };

    // Get changes since lastSync
    const remoteChanges = await fastify.db.getChangesSince(userId, lastSynced);

    // Apply local changes
    await fastify.db.applyChanges(userId, changes);

    return {
      success: true,
      changes: remoteChanges,
    };
  });
}
```

---

### Step 7: Sync UI Components

**File**: `src/components/sync/SyncStatus.tsx`

```typescript
import { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { syncService } from '@/services/sync/syncService';

export function SyncStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Get last synced time
    syncService.getLastSynced().then(setLastSynced);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncService.syncAll();
      setLastSynced(new Date());
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      {isOnline ? (
        <Cloud className="w-4 h-4 text-green-400" />
      ) : (
        <CloudOff className="w-4 h-4 text-gray-400" />
      )}

      {lastSynced && (
        <span className="text-gray-400">
          Synced {formatRelativeTime(lastSynced)}
        </span>
      )}

      <button
        onClick={handleSync}
        disabled={!isOnline || isSyncing}
        className="p-1 hover:bg-gray-800 rounded disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
```

---

## ✅ Implementation Checklist

### PWA Implementation

- [ ] Create `manifest.json` with all required fields
- [ ] Generate app icons (all sizes)
- [ ] Implement service worker
- [ ] Register service worker on app load
- [ ] Create install prompt UI
- [ ] Test PWA installation on mobile
- [ ] Test offline functionality
- [ ] Optimize mobile responsive design
- [ ] Create mobile navigation

### Sync Implementation

- [ ] Design sync data schema
- [ ] Implement sync service (frontend)
- [ ] Create sync API endpoints (backend)
- [ ] Implement encryption for sync data
- [ ] Add conflict resolution logic
- [ ] Create sync status UI
- [ ] Test sync across devices
- [ ] Handle offline sync queue
- [ ] Document sync architecture

---

## 🧪 Testing Guide

### PWA Testing

1. **Desktop**: Chrome DevTools → Application → Manifest
2. **Mobile**:
   - iOS: Safari → Share → Add to Home Screen
   - Android: Chrome → Menu → Install App
3. **Offline**: Disable network, test app functionality
4. **Updates**: Change service worker, test update flow

### Sync Testing

1. **Two Devices**: Install on two devices, test sync
2. **Offline Changes**: Make changes offline, verify sync on reconnect
3. **Conflicts**: Make conflicting changes, verify resolution
4. **Performance**: Test with large datasets (1000+ bookmarks)

---

**End of Implementation Guide**

_Generated: December 2025_  
_Version: 1.0_  
_Next Steps: Begin implementation (Days 1-5)_
