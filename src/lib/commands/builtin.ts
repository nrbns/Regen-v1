import { registerCommand, registerCommandSource, markHydrated, commandsHydrated, notifyCommandsChanged } from './registry';
import type { CommandDescriptor } from './types';
import { ipc } from '../ipc-typed';
import { useAppStore } from '../../state/appStore';
import { useTabsStore } from '../../state/tabsStore';

let builtinsRegistered = false;

type AppState = ReturnType<typeof useAppStore.getState>;
type AppMode = AppState['mode'];

const staticCommands: CommandDescriptor[] = [
  {
    id: 'core:new-tab',
    title: 'Open New Tab',
    subtitle: 'Create a blank tab in the current container',
    category: 'Navigation',
    keywords: ['tab', 'new', 'create'],
    shortcut: ['Ctrl/Cmd', 'T'],
    run: async () => {
      await ipc.tabs.create('about:blank');
    },
  },
  {
    id: 'core:privacy-dashboard',
    title: 'Open Privacy Dashboard',
    subtitle: 'Review shields, permissions, and session data',
    category: 'Privacy',
    keywords: ['privacy', 'dashboard', 'settings'],
    run: () => {
      window.location.hash = '#/privacy';
    },
  },
  {
    id: 'core:save-workspace',
    title: 'Save Workspace Snapshot',
    subtitle: 'Capture current tabs and layout into a workspace bundle',
    category: 'Workspace',
    keywords: ['workspace', 'session', 'save'],
    run: async () => {
      const name = prompt('Name of the workspace snapshot?');
      if (!name) return;
      await ipc.storage.saveWorkspace({
        id: crypto.randomUUID(),
        name,
        partition: `persist:workspace:${Date.now()}`,
      });
    },
  },
  {
    id: 'core:burn-active-tab',
    title: 'Burn Active Tab',
    subtitle: 'Permanently delete data for the current tab',
    category: 'Privacy',
    keywords: ['burn', 'tab', 'privacy'],
    run: async () => {
      const { activeId } = useTabsStore.getState();
      if (!activeId) return;
      const confirmed = confirm('Burn this tab? All associated storage will be destroyed.');
      if (!confirmed) return;
      await ipc.tabs.burn(activeId);
    },
  },
  {
    id: 'core:ask-agent',
    title: 'Ask Omni Agent',
    subtitle: 'Send a custom question to the AI agent',
    category: 'AI',
    keywords: ['agent', 'ai', 'question'],
    run: async () => {
      const promptText = prompt('What would you like the agent to do?');
      if (!promptText) return;
      await ipc.agent.createTask({
        title: 'Command Palette Request',
        role: 'researcher',
        goal: promptText,
        budget: { tokens: 4096, seconds: 120, requests: 20 },
      });
    },
  },
];

function registerModeCommands() {
  const modes: Array<{ id: string; title: string; mode: AppMode }> = [
    { id: 'core:mode-browse', title: 'Switch to Browse Mode', mode: 'Browse' },
    { id: 'core:mode-research', title: 'Switch to Research Mode', mode: 'Research' },
    { id: 'core:mode-threats', title: 'Switch to Threat Mode', mode: 'Threats' },
    { id: 'core:mode-trade', title: 'Switch to Trade Mode', mode: 'Trade' },
    { id: 'core:mode-docs', title: 'Switch to Docs Mode', mode: 'Docs' },
  ];

  modes.forEach((entry) => {
    registerCommand({
      id: entry.id,
      title: entry.title,
      category: 'Modes',
      keywords: ['mode', entry.mode.toLowerCase()],
      run: () => {
        useAppStore.getState().setMode(entry.mode);
      },
    });
  });
}

function registerStaticCommands() {
  staticCommands.forEach((command) => registerCommand(command));
}

function registerActiveTabCommands() {
  registerCommandSource({
    id: 'dynamic:tabs',
    getCommands: async () => {
      const { tabs, activeId } = useTabsStore.getState();
      return tabs.slice(0, 25).map((tab) => ({
        id: `tab:focus:${tab.id}`,
        title: tab.title || 'Untitled Tab',
        subtitle: tab.url,
        category: 'Tabs',
        badge: tab.id === activeId ? 'Active' : undefined,
        keywords: [tab.title, tab.url].filter(Boolean) as string[],
        run: async () => {
          await ipc.tabs.activate({ id: tab.id });
        },
      }));
    },
  });

  useTabsStore.subscribe(() => {
    notifyCommandsChanged();
  });
}

export function initializeBuiltinCommands() {
  if (builtinsRegistered) {
    return;
  }
  builtinsRegistered = true;

  registerStaticCommands();
  registerModeCommands();
  registerActiveTabCommands();
  markHydrated();
}

export function builtinsInitialized(): boolean {
  return builtinsRegistered && commandsHydrated();
}


