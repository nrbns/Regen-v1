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
}

export const rules: AutomationRule[] = [
  {
    id: "arxiv-summarize",
    trigger: "TAB_OPEN",
    match: (url: string) => url.includes("arxiv.org") || url.includes("arxiv"),
    action: "SUMMARIZE_AND_SAVE",
    enabled: false, // Disabled by default - user must enable
  },
  {
    id: "github-summarize",
    trigger: "TAB_OPEN",
    match: (url: string) => url.includes("github.com"),
    action: "SUMMARIZE_AND_SAVE",
    enabled: false,
  },
  // Add more rules as needed
];

/**
 * Get enabled rules for a trigger
 */
export function getRulesForTrigger(trigger: AutomationRule["trigger"]): AutomationRule[] {
  return rules.filter((r) => r.trigger === trigger && r.enabled);
}