/**
 * Automation Rules - Regen-v1
 * 
 * Visible, cancelable, cheap automation rules.
 * Event-driven automation that users can see and control.
 */

export interface AutomationRule {
  id: string;
  trigger: "TAB_OPEN" | "URL_CHANGE" | "SCROLL_END" | "IDLE";
  match?: (payload: any) => boolean;
  action: string;
  enabled: boolean;
  name?: string;
  description?: string;
}

export const rules: AutomationRule[] = [
  {
    id: "arxiv-summarize",
    name: "Auto-summarize ArXiv papers",
    description: "Automatically summarize and save ArXiv papers when opened",
    trigger: "TAB_OPEN",
    match: (payload: any) => {
      const url = typeof payload === "string" ? payload : payload?.url || "";
      return url.includes("arxiv.org") || url.includes("arxiv");
    },
    action: "SUMMARIZE_AND_SAVE",
    enabled: false, // Disabled by default - user must enable
  },
  {
    id: "github-summarize",
    name: "Auto-summarize GitHub repos",
    description: "Automatically summarize GitHub repositories when opened",
    trigger: "TAB_OPEN",
    match: (payload: any) => {
      const url = typeof payload === "string" ? payload : payload?.url || "";
      return url.includes("github.com");
    },
    action: "SUMMARIZE_AND_SAVE",
    enabled: false,
  },
  {
    id: "close-duplicates-idle",
    name: "Close duplicate tabs when idle",
    description: "Automatically close duplicate tabs after 5 minutes of idle time",
    trigger: "IDLE",
    match: (payload: any) => {
      // Only trigger if idle for more than 5 minutes
      const duration = typeof payload === "number" ? payload : payload?.duration || 0;
      return duration > 300000; // 5 minutes
    },
    action: "CLOSE_DUPLICATE_TABS",
    enabled: false,
  },
  {
    id: "save-page-idle",
    name: "Auto-save page when idle",
    description: "Save current page to workspace after 2 minutes of idle time",
    trigger: "IDLE",
    match: (payload: any) => {
      // Save current page if idle for 2 minutes
      const duration = typeof payload === "number" ? payload : payload?.duration || 0;
      return duration > 120000; // 2 minutes
    },
    action: "SAVE_CURRENT_PAGE",
    enabled: false,
  },
  {
    id: "organize-tabs-idle",
    name: "Organize tabs when idle",
    description: "Group tabs by domain after 5 minutes of idle time",
    trigger: "IDLE",
    match: (payload: any) => {
      const duration = typeof payload === "number" ? payload : payload?.duration || 0;
      return duration > 300000; // 5 minutes
    },
    action: "ORGANIZE_TABS",
    enabled: false,
  },
];

/**
 * Get enabled rules for a trigger
 */
export function getRulesForTrigger(trigger: AutomationRule["trigger"]): AutomationRule[] {
  return rules.filter((r) => r.trigger === trigger && r.enabled);
}