/**
 * Autofill Types
 * Type definitions for autofill skill
 */

export interface AutofillData {
  id: string;
  type: 'form' | 'input' | 'text';
  selector: string;
  value: string;
  createdAt: number | Date;
  lastUsed: number | Date;
}

export interface AutofillProfile {
  id: string;
  name: string;
  fields: Record<string, string>;
  createdAt: number | Date;
  updatedAt?: number | Date;
  isDefault?: boolean;
}

export type AutofillDataType =
  | 'name'
  | 'email'
  | 'phone'
  | 'address'
  | 'city'
  | 'state'
  | 'zip'
  | 'country'
  | 'company'
  | 'jobTitle'
  | 'website'
  | 'creditCard'
  | 'password'
  | 'date'
  | 'custom';

export interface FormField {
  id: string;
  type: string;
  name?: string;
  label?: string;
  placeholder?: string;
  autocomplete?: string;
  value?: string;
  required?: boolean;
  inputType?: string;
  detectedType?: AutofillDataType;
}

export interface DetectedForm {
  url: string;
  fields: FormField[];
  submitButton?: {
    type: string;
    text?: string;
    selector: string;
  };
}

export interface AutofillResult {
  success: boolean;
  fieldsFilled: number;
  fieldsSkipped: number;
  errors?: string[];
}

export interface AutofillTemplate {
  id: string;
  name: string;
  description: string;
  category: 'personal' | 'business' | 'job';
  fields: Record<string, string>;
  createdAt?: number;
  updatedAt?: number;
}
