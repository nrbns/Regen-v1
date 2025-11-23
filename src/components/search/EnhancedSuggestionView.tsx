/**
 * EnhancedSuggestionView - Card-based suggestion view for Omnibox
 * Based on Figma UI/UX Prototype Flow redesign
 */

import { AnimatePresence } from 'framer-motion';
import { SuggestionCard, SuggestionCardGroup, type SuggestionType } from './SuggestionCard';

// Define Suggestion type locally (matches Omnibox interface)
type Suggestion = {
  type: 'history' | 'tab' | 'command' | 'search';
  title: string;
  subtitle?: string;
  url?: string;
  icon?: string;
  action?: {
    type: 'nav' | 'search' | 'ai' | 'agent' | 'calc' | 'command';
    url?: string;
    query?: string;
    prompt?: string;
    engine?: string;
    expr?: string;
    command?: string;
  };
  interactive?: boolean;
  badge?: string;
  metadata?: string;
};

export interface EnhancedSuggestionViewProps {
  suggestions: Suggestion[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onHover?: (index: number) => void;
}

// Group suggestions by type
function groupSuggestions(suggestions: Suggestion[]) {
  const groups: Record<string, Suggestion[]> = {
    ai: [],
    history: [],
    tabs: [],
    search: [],
    commands: [],
    bookmarks: [],
  };

  suggestions.forEach(suggestion => {
    if (suggestion.type === 'command' && suggestion.badge === '@redix') {
      groups.ai.push(suggestion);
    } else if (suggestion.type === 'history') {
      groups.history.push(suggestion);
    } else if (suggestion.type === 'tab') {
      groups.tabs.push(suggestion);
    } else if (suggestion.type === 'search') {
      groups.search.push(suggestion);
    } else if (suggestion.type === 'command') {
      groups.commands.push(suggestion);
    } else {
      groups.search.push(suggestion);
    }
  });

  return groups;
}

// Convert Suggestion to SuggestionCard props
function convertToCardProps(
  suggestion: Suggestion,
  _index: number
): Omit<Parameters<typeof SuggestionCard>[0], 'onClick' | 'onHover' | 'selected'> {
  const typeMap: Record<string, SuggestionType> = {
    history: 'history',
    tab: 'tab',
    search: 'search',
    command: 'command',
  };

  return {
    type: typeMap[suggestion.type] || 'search',
    title: suggestion.title,
    subtitle: suggestion.subtitle,
    url: suggestion.url,
    icon: suggestion.icon === 'sparkles' ? undefined : undefined, // Will use default icon
    badge: suggestion.badge,
    metadata: {
      favicon: undefined, // Could be extracted from suggestion if available
    },
  };
}

export function EnhancedSuggestionView({
  suggestions,
  selectedIndex,
  onSelect,
  onHover,
}: EnhancedSuggestionViewProps) {
  const groups = groupSuggestions(suggestions);

  // Calculate offsets for each group
  const aiOffset = 0;
  const historyOffset = groups.ai.length;
  const tabsOffset = historyOffset + groups.history.length;
  const searchOffset = tabsOffset + groups.tabs.length;

  // Filter tabs once to avoid repeated filtering
  const validTabs = groups.tabs.filter(s => s);

  return (
    <div className="p-2 space-y-3 max-h-[500px] overflow-y-auto">
      <AnimatePresence>
        {/* AI Suggestions */}
        {groups.ai.length > 0 && (
          <SuggestionCardGroup
            title="AI Suggestions"
            suggestions={groups.ai.map((s, localIdx) => {
              const globalIdx = aiOffset + localIdx;
              return {
                ...convertToCardProps(s, globalIdx),
                onClick: () => onSelect(globalIdx),
                selected: selectedIndex === globalIdx,
                onHover: () => onHover?.(globalIdx),
              };
            })}
            onSelect={localIndex => {
              if (localIndex >= 0 && localIndex < groups.ai.length) {
                onSelect(aiOffset + localIndex);
              }
            }}
            selectedIndex={
              selectedIndex >= aiOffset && selectedIndex < historyOffset
                ? selectedIndex - aiOffset
                : undefined
            }
          />
        )}

        {/* History */}
        {groups.history.length > 0 && (
          <SuggestionCardGroup
            title="History"
            suggestions={groups.history.map((s, localIdx) => {
              const globalIdx = historyOffset + localIdx;
              return {
                ...convertToCardProps(s, globalIdx),
                onClick: () => onSelect(globalIdx),
                selected: selectedIndex === globalIdx,
                onHover: () => onHover?.(globalIdx),
              };
            })}
            onSelect={localIndex => {
              if (localIndex >= 0 && localIndex < groups.history.length) {
                onSelect(historyOffset + localIndex);
              }
            }}
            selectedIndex={
              selectedIndex >= historyOffset && selectedIndex < tabsOffset
                ? selectedIndex - historyOffset
                : undefined
            }
          />
        )}

        {/* Open Tabs */}
        {validTabs.length > 0 && (
          <SuggestionCardGroup
            title="Open Tabs"
            suggestions={validTabs.map((s, _localIdx) => {
              // Find original index in groups.tabs array (before filtering)
              const originalIndex = groups.tabs.findIndex(t => t === s);
              const globalIdx = tabsOffset + originalIndex;
              return {
                ...convertToCardProps(s, globalIdx),
                onClick: () => onSelect(globalIdx),
                selected: selectedIndex === globalIdx,
                onHover: () => onHover?.(globalIdx),
              };
            })}
            onSelect={localIndex => {
              if (localIndex >= 0 && localIndex < validTabs.length) {
                const tab = validTabs[localIndex];
                const originalIndex = groups.tabs.findIndex(t => t === tab);
                if (originalIndex >= 0) {
                  onSelect(tabsOffset + originalIndex);
                }
              }
            }}
            selectedIndex={
              selectedIndex >= tabsOffset && selectedIndex < searchOffset
                ? (() => {
                    const globalIdx = selectedIndex;
                    const originalIdx = globalIdx - tabsOffset;
                    const tab = groups.tabs[originalIdx];
                    return tab && validTabs.includes(tab) ? validTabs.indexOf(tab) : undefined;
                  })()
                : undefined
            }
          />
        )}

        {/* Search Suggestions */}
        {groups.search.length > 0 && (
          <SuggestionCardGroup
            title="Search"
            suggestions={groups.search.map((s, localIdx) => {
              const globalIdx = searchOffset + localIdx;
              return {
                ...convertToCardProps(s, globalIdx),
                onClick: () => onSelect(globalIdx),
                selected: selectedIndex === globalIdx,
                onHover: () => onHover?.(globalIdx),
              };
            })}
            onSelect={localIndex => {
              if (localIndex >= 0 && localIndex < groups.search.length) {
                onSelect(searchOffset + localIndex);
              }
            }}
            selectedIndex={
              selectedIndex >= searchOffset && selectedIndex < searchOffset + groups.search.length
                ? selectedIndex - searchOffset
                : undefined
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}
