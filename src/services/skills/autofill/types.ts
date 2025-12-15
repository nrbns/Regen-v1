/**
 * Autofill Types
 * Type definitions for autofill skill
 */

export interface AutofillData {
  id: string;
  type: 'form' | 'input' | 'text';
  selector: string;
  value: string;
  createdAt: Date;
  lastUsed: Date;
}

export interface AutofillProfile {
  id: string;
  name: string;
  fields: Record<string, string>;
  createdAt: Date;
}
