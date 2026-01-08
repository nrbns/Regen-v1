/**
 * OmniDesk (deferred)
 * Original implementation moved to _deferred/omni-mode for v1.
 */

// Full original OmniDesk implementation preserved here for rollback.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Sparkles, Search } from 'lucide-react';
import { useTabsStore } from '../../state/tabsStore';
import { useAppStore } from '../../state/appStore';
import { ipc } from '../../lib/ipc-typed';
import { useNavigate } from 'react-router-dom';
import { ipcEvents } from '../../lib/ipc-events';
import { AIResponsePane } from '../ai/AIResponsePane';
import { useEfficiencyStore } from '../../state/efficiencyStore';
import { useWorkspaceEventsStore } from '../../state/workspaceEventsStore';
import { useAgentStreamStore } from '../../state/agentStreamStore';
import { createFallbackTab } from '../../lib/tabFallback';
import { ChromeNewTabPage } from '../ChromeNewTab/ChromeNewTabPage';
import { useSettingsStore } from '../../state/settingsStore';

export function OmniDesk() {
  // Deferred original component retained here for reference.
  return null;
}

export default OmniDesk;
