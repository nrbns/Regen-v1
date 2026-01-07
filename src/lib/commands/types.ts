export type CommandCategory =
  | 'Navigation'
  | 'Modes'
  | 'Workspace'
  | 'AI'
  | 'Privacy'
  | 'Settings'
  | 'Tabs'
  | 'Sessions'
  | 'Search'
  | 'System'
  | 'Custom';

export interface CommandDescriptor {
  id: string;
  title: string;
  subtitle?: string;
  category: CommandCategory;
  keywords?: string[];
  shortcut?: string[];
  badge?: string;
  run: () => Promise<void> | void;
}

export interface CommandSource {
  id: string;
  getCommands: () => Promise<CommandDescriptor[]> | CommandDescriptor[];
}


