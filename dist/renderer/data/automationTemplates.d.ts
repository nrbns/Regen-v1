/**
 * Sample Automation Templates
 * Pre-built automations for common tasks
 */
import type { AutomationPlaybook } from '../services/automationBridge';
export declare const AUTOMATION_TEMPLATES: AutomationPlaybook[];
/**
 * Load template by ID
 */
export declare function getTemplate(id: string): AutomationPlaybook | undefined;
/**
 * Get all templates
 */
export declare function getAllTemplates(): AutomationPlaybook[];
