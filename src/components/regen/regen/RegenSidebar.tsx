/**
 * Regen Sidebar Component
 * The AI brain of Regen - chat + voice interface
 */

import { useState, useEffect, useRef } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Sparkles,
  Loader2,
  X,
  Search,
  TrendingUp,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useTabsStore } from '../../state/tabsStore';
import { ipc } from '../../lib/ipc-typed';
import { toast } from '../../utils/toast';
import { HandsFreeMode } from './HandsFreeMode';
import { getRegenSocket } from '../../lib/realtime/regen-socket';

export type RegenMode = 'research' | 'trade';

interface RegenMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  done?: boolean; // For streaming messages
  commands?: Array<{ type: string; payload: Record<string, unknown> }>;
}

// RegenCommand type is now handled by RegenSocket client

export function RegenSidebar() {
  // Regen Sidebar implementation deferred to src/_deferred/regen/RegenSidebar.tsx
  return null;
}
      </div>

      {/* Hands-Free Mode Overlay */}
      {handsFreeMode && (
        <HandsFreeMode
          sessionId={sessionId}
          mode={mode}
          onCommand={async cmd => {
            // Execute browser commands
            try {
              switch (cmd.type) {
                case 'OPEN_TAB':
                  if (cmd.payload.url) {
                    await ipc.regen.openTab({ url: cmd.payload.url as string });
                  }
                  break;
                case 'SCROLL':
                  if (cmd.payload.tabId) {
                    await ipc.regen.scroll({
                      tabId: cmd.payload.tabId as string,
                      amount: (cmd.payload.amount as number) || 500,
                    });
                  }
                  break;
                case 'CLICK_ELEMENT':
                  if (cmd.payload.tabId && cmd.payload.elementId) {
                    await ipc.regen.clickElement({
                      tabId: cmd.payload.tabId as string,
                      selector: cmd.payload.elementId as string,
                    });
                  }
                  break;
                case 'GO_BACK':
                  if (activeTab?.id) {
                    await ipc.tabs.goBack(activeTab.id);
                  }
                  break;
                case 'GO_FORWARD':
                  if (activeTab?.id) {
                    await ipc.tabs.goForward(activeTab.id);
                  }
                  break;
              }
            } catch (error) {
              console.error('[HandsFree] Command execution failed:', error);
            }
          }}
          onClose={() => setHandsFreeMode(false)}
        />
      )}
    </div>
  );
}
