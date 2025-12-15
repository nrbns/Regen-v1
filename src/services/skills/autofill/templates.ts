/**
 * Autofill Templates
 * Pre-built templates for common forms (personal, business, job applications)
 */

import type { AutofillTemplate, AutofillProfile } from './types';

/**
 * Built-in autofill templates
 */
export const AUTOFILL_TEMPLATES: AutofillTemplate[] = [
  {
    id: 'personal',
    name: 'Personal Information',
    description: 'Personal contact information',
    category: 'personal',
    fields: {
      name: 'name',
      email: 'email',
      phone: 'phone',
      address: 'address',
      city: 'city',
      state: 'state',
      zip: 'zip',
      country: 'country',
    },
  },
  {
    id: 'business',
    name: 'Business Information',
    description: 'Business contact and company details',
    category: 'business',
    fields: {
      company: 'company',
      jobTitle: 'jobTitle',
      email: 'email',
      phone: 'phone',
      website: 'website',
      address: 'address',
      city: 'city',
      state: 'state',
      zip: 'zip',
      country: 'country',
    },
  },
  {
    id: 'job-application',
    name: 'Job Application',
    description: 'Standard job application fields',
    category: 'job',
    fields: {
      name: 'name',
      email: 'email',
      phone: 'phone',
      address: 'address',
      city: 'city',
      state: 'state',
      zip: 'zip',
      country: 'country',
      company: 'company',
      jobTitle: 'jobTitle',
      website: 'website',
    },
  },
];

/**
 * Create profile from template
 */
export function createProfileFromTemplate(
  templateId: string,
  values: Partial<Record<string, string>>
): AutofillProfile | null {
  const template = AUTOFILL_TEMPLATES.find(t => t.id === templateId);
  if (!template) return null;

  const profile: AutofillProfile = {
    id: `profile-${Date.now()}`,
    name: template.name,
    fields: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Fill fields from template
  for (const [key] of Object.entries(template.fields)) {
    if (values[key]) {
      profile.fields[key] = values[key]!;
    } else {
      // Set empty string as placeholder
      profile.fields[key] = '';
    }
  }

  return profile;
}

/**
 * Get template by ID
 */
export function getTemplate(id: string): AutofillTemplate | undefined {
  return AUTOFILL_TEMPLATES.find(t => t.id === id);
}

/**
 * Get all templates
 */
export function getAllTemplates(): AutofillTemplate[] {
  return AUTOFILL_TEMPLATES;
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: AutofillTemplate['category']): AutofillTemplate[] {
  return AUTOFILL_TEMPLATES.filter(t => t.category === category);
}

/**
 * Save custom template
 */
export function saveCustomTemplate(template: AutofillTemplate): void {
  try {
    const customTemplates = getCustomTemplates();
    customTemplates.push(template);
    localStorage.setItem('regen-autofill-custom-templates', JSON.stringify(customTemplates));
  } catch (error) {
    console.error('Failed to save custom template:', error);
  }
}

/**
 * Get custom templates
 */
export function getCustomTemplates(): AutofillTemplate[] {
  try {
    const stored = localStorage.getItem('regen-autofill-custom-templates');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}
