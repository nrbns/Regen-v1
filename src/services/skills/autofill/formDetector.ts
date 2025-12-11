/**
 * Form Detection System
 * Detects and analyzes forms on the page
 */

import type { FormField, DetectedForm, AutofillDataType } from './types';

/**
 * Detect all forms on the page
 */
export function detectForms(): DetectedForm[] {
  const forms = Array.from(document.querySelectorAll('form'));
  const detected: DetectedForm[] = [];

  for (const form of forms) {
    const fields = detectFormFields(form);
    const submitButton = detectSubmitButton(form);

    if (fields.length > 0) {
      detected.push({
        url: window.location.href,
        fields,
        submitButton,
      });
    }
  }

  return detected;
}

/**
 * Detect form fields in a form element
 */
export function detectFormFields(form: HTMLFormElement): FormField[] {
  const fields: FormField[] = [];
  
  // Get all input fields
  const inputs = form.querySelectorAll('input, textarea, select');
  
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i] as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    
    // Skip submit buttons and hidden fields
    if (
      input.type === 'submit' ||
      input.type === 'button' ||
      input.type === 'hidden' ||
      input.type === 'reset'
    ) {
      continue;
    }

    const field: FormField = {
      id: `field-${i}`,
      type: input.tagName.toLowerCase(),
      name: input.name || undefined,
      placeholder: (input as HTMLInputElement).placeholder || undefined,
      autocomplete: (input as HTMLInputElement).autocomplete || undefined,
      value: (input as HTMLInputElement).value || undefined,
      required: input.required || undefined,
      inputType: (input as HTMLInputElement).type || undefined,
    };

    // Get label for this field
    field.label = getFieldLabel(input);

    // Detect autofill type
    field.detectedType = detectFieldType(input);

    fields.push(field);
  }

  return fields;
}

/**
 * Get label for a form field
 */
function getFieldLabel(input: HTMLElement): string | undefined {
  // Try to find associated label
  if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) {
      return label.textContent?.trim() || undefined;
    }
  }

  // Try to find parent label
  const parentLabel = input.closest('label');
  if (parentLabel) {
    return parentLabel.textContent?.trim() || undefined;
  }

  // Try to find preceding label
  let prev = input.previousElementSibling;
  while (prev) {
    if (prev.tagName === 'LABEL') {
      return prev.textContent?.trim() || undefined;
    }
    prev = prev.previousElementSibling;
  }

  return undefined;
}

/**
 * Detect field type for autofill
 */
function detectFieldType(input: HTMLElement): AutofillDataType {
  const inputElem = input as HTMLInputElement;

  // Check autocomplete attribute first
  if (inputElem.autocomplete) {
    const type = parseAutocompleteType(inputElem.autocomplete);
    if (type) return type;
  }

  // Check input type
  if (inputElem.type) {
    const type = parseInputType(inputElem.type);
    if (type) return type;
  }

  // Check name attribute patterns
  if (inputElem.name) {
    const type = parseNamePattern(inputElem.name);
    if (type) return type;
  }

  // Check id attribute patterns
  if (inputElem.id) {
    const type = parseIdPattern(inputElem.id);
    if (type) return type;
  }

  // Check placeholder patterns
  if (inputElem.placeholder) {
    const type = parsePlaceholderPattern(inputElem.placeholder);
    if (type) return type;
  }

  // Check label patterns
  const label = getFieldLabel(input);
  if (label) {
    const type = parseLabelPattern(label);
    if (type) return type;
  }

  return 'custom';
}

/**
 * Parse autocomplete attribute
 */
function parseAutocompleteType(autocomplete: string): AutofillDataType | null {
  const map: Record<string, AutofillDataType> = {
    'name': 'name',
    'email': 'email',
    'tel': 'phone',
    'address-line1': 'address',
    'address-line2': 'address',
    'address-level2': 'city',
    'address-level1': 'state',
    'postal-code': 'zip',
    'country': 'country',
    'organization': 'company',
    'job-title': 'jobTitle',
    'url': 'website',
    'cc-number': 'creditCard',
    'current-password': 'password',
    'new-password': 'password',
  };

  for (const [key, value] of Object.entries(map)) {
    if (autocomplete.includes(key)) {
      return value;
    }
  }

  return null;
}

/**
 * Parse input type
 */
function parseInputType(type: string): AutofillDataType | null {
  const map: Record<string, AutofillDataType> = {
    'email': 'email',
    'tel': 'phone',
    'url': 'website',
    'password': 'password',
    'date': 'date',
  };

  return map[type] || null;
}

/**
 * Parse name attribute patterns
 */
function parseNamePattern(name: string): AutofillDataType | null {
  const lower = name.toLowerCase();

  const patterns: Array<[RegExp, AutofillDataType]> = [
    [/name|fullname|fname|lname/i, 'name'],
    [/email|e-mail|mail/i, 'email'],
    [/phone|tel|mobile|cell/i, 'phone'],
    [/address|addr|street/i, 'address'],
    [/city|town/i, 'city'],
    [/state|province|region/i, 'state'],
    [/zip|postal|pincode/i, 'zip'],
    [/country|nation/i, 'country'],
    [/company|organization|org/i, 'company'],
    [/job|title|position/i, 'jobTitle'],
    [/website|url|site/i, 'website'],
    [/card|creditcard|ccnumber/i, 'creditCard'],
    [/password|pass|pwd/i, 'password'],
  ];

  for (const [pattern, type] of patterns) {
    if (pattern.test(lower)) {
      return type;
    }
  }

  return null;
}

/**
 * Parse id attribute patterns
 */
function parseIdPattern(id: string): AutofillDataType | null {
  return parseNamePattern(id); // Same patterns as name
}

/**
 * Parse placeholder patterns
 */
function parsePlaceholderPattern(placeholder: string): AutofillDataType | null {
  return parseNamePattern(placeholder); // Same patterns as name
}

/**
 * Parse label patterns
 */
function parseLabelPattern(label: string): AutofillDataType | null {
  return parseNamePattern(label); // Same patterns as name
}

/**
 * Detect submit button
 */
function detectSubmitButton(form: HTMLFormElement): DetectedForm['submitButton'] | undefined {
  const submitButton = form.querySelector('button[type="submit"], input[type="submit"]') as
    | HTMLButtonElement
    | HTMLInputElement
    | null;

  if (!submitButton) return undefined;

  return {
    type: submitButton.tagName.toLowerCase(),
    text: submitButton.textContent?.trim() || (submitButton as HTMLInputElement).value || undefined,
    selector: getElementSelector(submitButton),
  };
}

/**
 * Get CSS selector for an element
 */
function getElementSelector(element: HTMLElement): string {
  if (element.id) {
    return `#${element.id}`;
  }

  if (element.name) {
    return `[name="${element.name}"]`;
  }

  // Fallback to tag and position
  const parent = element.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children);
    const index = siblings.indexOf(element);
    return `${element.tagName.toLowerCase()}:nth-child(${index + 1})`;
  }

  return element.tagName.toLowerCase();
}

