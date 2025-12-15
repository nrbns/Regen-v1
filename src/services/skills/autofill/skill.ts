/**
 * Autofill Skill Implementation
 * Skill that enables intelligent form autofill
 */

import { getSkillRegistry } from '../registry';
import { getAutofillStorage } from './storage';
import { detectForms } from './formDetector';
import type { SkillManifest, SkillContext, SkillResult } from '../types';
import type { AutofillProfile, FormField, AutofillResult } from './types';

/**
 * Autofill Skill Manifest
 */
export const AUTOFILL_SKILL_MANIFEST: SkillManifest = {
  id: 'regen-autofill',
  name: 'Autofill Forms',
  version: '1.0.0',
  description: 'Intelligently fill forms with saved profiles',
  author: 'Regen Browser',
  icon: '📝',
  permissions: [
    {
      type: 'read_page',
      description: 'Read page content to detect forms',
      required: true,
    },
    {
      type: 'write_page',
      description: 'Fill form fields',
      required: true,
    },
    {
      type: 'access_storage',
      description: 'Access encrypted autofill storage',
      required: true,
    },
  ],
  triggers: [
    {
      type: 'page_load',
      pattern: '.*', // Match all pages
    },
    {
      type: 'manual',
    },
  ],
  actions: [
    {
      type: 'autofill_form',
      name: 'Autofill Form',
      description: 'Fill detected form with profile data',
      parameters: {
        profileId: 'string',
        formSelector: 'string',
      },
      handler: 'autofillForm',
    },
    {
      type: 'autofill_form',
      name: 'Autofill Field',
      description: 'Fill a specific field',
      parameters: {
        fieldSelector: 'string',
        value: 'string',
      },
      handler: 'autofillField',
    },
  ],
  settings: {
    autoFillOnDetection: {
      type: 'boolean',
      default: false,
      description: 'Automatically fill forms when detected',
    },
    useDefaultProfile: {
      type: 'boolean',
      default: true,
      description: 'Use default profile for autofill',
    },
  },
};

/**
 * Autofill Skill Implementation
 */
export class AutofillSkill {
  private storage: ReturnType<typeof getAutofillStorage>;

  constructor() {
    this.storage = getAutofillStorage();
  }

  /**
   * Initialize autofill skill
   */
  async initialize(): Promise<void> {
    await this.storage.initialize();
  }

  /**
   * Detect forms on current page
   */
  async detectForms(): Promise<SkillResult> {
    try {
      const forms = detectForms();
      return {
        success: true,
        data: { forms },
        message: `Detected ${forms.length} form(s)`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to detect forms',
      };
    }
  }

  /**
   * Autofill a form
   */
  async autofillForm(
    context: SkillContext,
    data: { profileId?: string; formSelector?: string }
  ): Promise<SkillResult> {
    try {
      // Get profile
      let profile: AutofillProfile | null = null;

      if (data.profileId) {
        profile = await this.storage.getProfile(data.profileId);
      } else {
        // Use default profile or first available
        const skill = getSkillRegistry().get('regen-autofill');
        const useDefault = skill?.settings?.useDefaultProfile ?? true;

        if (useDefault) {
          profile = await this.storage.getDefaultProfile();
        }

        if (!profile) {
          const allProfiles = await this.storage.getAllProfiles();
          profile = allProfiles[0] || null;
        }
      }

      if (!profile) {
        return {
          success: false,
          error: 'No autofill profile available',
        };
      }

      // Detect forms
      const forms = detectForms();
      if (forms.length === 0) {
        return {
          success: false,
          error: 'No forms detected on page',
        };
      }

      // Use specified form or first form
      const form = data.formSelector
        ? forms.find(f => f.url.includes(data.formSelector!))
        : forms[0];

      if (!form) {
        return {
          success: false,
          error: 'Form not found',
        };
      }

      // Fill form
      const result = await this.fillForm(form, profile);

      return {
        success: result.success,
        data: result,
        message: `Filled ${result.fieldsFilled} field(s)`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to autofill form',
      };
    }
  }

  /**
   * Fill a form with profile data
   */
  private async fillForm(form: any, profile: AutofillProfile): Promise<AutofillResult> {
    const result: AutofillResult = {
      success: true,
      fieldsFilled: 0,
      fieldsSkipped: 0,
      errors: [],
    };

    for (const field of form.fields) {
      try {
        const value = this.getProfileValue(profile, field.detectedType || 'custom', field);
        if (value) {
          const filled = await this.fillField(field, value);
          if (filled) {
            result.fieldsFilled++;
          } else {
            result.fieldsSkipped++;
          }
        } else {
          result.fieldsSkipped++;
        }
      } catch (error: any) {
        result.errors?.push(`Failed to fill field ${field.name || field.id}: ${error.message}`);
        result.fieldsSkipped++;
      }
    }

    return result;
  }

  /**
   * Get value from profile for a field type
   */
  private getProfileValue(profile: AutofillProfile, type: string, field: FormField): string | null {
    // Direct field name match
    if (field.name && profile.fields[field.name]) {
      return String(profile.fields[field.name]);
    }

    // Type-based match
    const typeMap: Record<string, string[]> = {
      name: ['name', 'fullName', 'full_name'],
      email: ['email', 'e-mail', 'mail'],
      phone: ['phone', 'tel', 'telephone', 'mobile'],
      address: ['address', 'street', 'addr'],
      city: ['city', 'town'],
      state: ['state', 'province', 'region'],
      zip: ['zip', 'postal', 'postalCode', 'pincode'],
      country: ['country', 'nation'],
      company: ['company', 'organization', 'org'],
      jobTitle: ['jobTitle', 'title', 'position'],
      website: ['website', 'url', 'site'],
    };

    const keys = typeMap[type] || [type];
    for (const key of keys) {
      if (profile.fields[key]) {
        return String(profile.fields[key]);
      }
    }

    return null;
  }

  /**
   * Fill a single field
   */
  private async fillField(field: FormField, value: string): Promise<boolean> {
    try {
      const element = this.findFieldElement(field);
      if (!element) return false;

      // Set value
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        element.value = value;
        // Trigger input event
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (element instanceof HTMLSelectElement) {
        // Try to find matching option
        const option = Array.from(element.options).find(
          opt => opt.value === value || opt.text === value
        );
        if (option) {
          element.value = option.value;
          element.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Find DOM element for a field
   */
  private findFieldElement(field: FormField): HTMLElement | null {
    // Try by name
    if (field.name) {
      const byName = document.querySelector(`[name="${field.name}"]`) as HTMLElement;
      if (byName) return byName;
    }

    // Try by id
    if (field.id) {
      const byId = document.getElementById(field.id);
      if (byId) return byId;
    }

    // Try by placeholder (less reliable)
    if (field.placeholder) {
      const byPlaceholder = document.querySelector(
        `[placeholder="${field.placeholder}"]`
      ) as HTMLElement;
      if (byPlaceholder) return byPlaceholder;
    }

    return null;
  }

  /**
   * Autofill a single field
   */
  async autofillField(
    context: SkillContext,
    data: { fieldSelector: string; value: string }
  ): Promise<SkillResult> {
    try {
      const element = document.querySelector(data.fieldSelector) as HTMLElement;
      if (!element) {
        return {
          success: false,
          error: 'Field not found',
        };
      }

      const filled = await this.fillField(
        {
          id: data.fieldSelector,
          type: element.tagName.toLowerCase(),
        } as FormField,
        data.value
      );

      return {
        success: filled,
        message: filled ? 'Field filled successfully' : 'Failed to fill field',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to autofill field',
      };
    }
  }
}

// Singleton instance
let autofillSkillInstance: AutofillSkill | null = null;

export function getAutofillSkill(): AutofillSkill {
  if (!autofillSkillInstance) {
    autofillSkillInstance = new AutofillSkill();
  }
  return autofillSkillInstance;
}
