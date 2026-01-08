/**
 * Enhanced YAML/JSON Parser for Workflows
 * Phase 2, Day 3: Workflow Builder - Better parsing and validation
 */

import type { ChainDefinition, ChainStep } from '../agents/chainExecutor';

export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  parsed?: ChainDefinition;
}

/**
 * Phase 2, Day 3: Enhanced YAML/JSON parser with better error messages
 */
export function parseWorkflowDefinition(yamlOrJson: string): WorkflowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!yamlOrJson.trim()) {
    errors.push('Workflow definition cannot be empty');
    return { valid: false, errors, warnings };
  }

  let parsed: any;

  // Try JSON first
  try {
    parsed = JSON.parse(yamlOrJson);
  } catch (jsonError) {
    // Try YAML (enhanced simple parser)
    try {
      parsed = parseSimpleYAML(yamlOrJson);
    } catch (yamlError) {
      errors.push(
        `Invalid JSON: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`
      );
      errors.push(
        `Invalid YAML: ${yamlError instanceof Error ? yamlError.message : String(yamlError)}`
      );
      return { valid: false, errors, warnings };
    }
  }

  // Validate structure
  if (!parsed || typeof parsed !== 'object') {
    errors.push('Workflow must be an object');
    return { valid: false, errors, warnings };
  }

  // Validate steps
  if (!parsed.steps || !Array.isArray(parsed.steps)) {
    errors.push('Workflow must have a "steps" array');
    return { valid: false, errors, warnings };
  }

  if (parsed.steps.length === 0) {
    warnings.push('Workflow has no steps');
  }

  // Validate each step
  const validatedSteps: ChainStep[] = [];
  parsed.steps.forEach((step: any, idx: number) => {
    if (!step || typeof step !== 'object') {
      errors.push(`Step ${idx + 1} must be an object`);
      return;
    }

    const stepType = step.type || step.action ? 'action' : 'unknown';
    if (stepType === 'unknown' && !step.condition && !step.wait && !step.loop) {
      errors.push(`Step ${idx + 1} must have a type, action, condition, wait, or loop`);
      return;
    }

    validatedSteps.push({
      id: step.id || `step-${idx}`,
      type: stepType as any,
      action: step.action || step.skill,
      args: step.args || step.parameters || {},
      condition: step.condition,
      steps: step.steps,
      waitTime: step.waitTime || step.wait,
      loopCount: step.loopCount || step.loop,
      onSuccess: step.onSuccess,
      onFailure: step.onFailure,
    });
  });

  // Build chain definition
  const chainDefinition: ChainDefinition = {
    id: parsed.id || `workflow-${Date.now()}`,
    name: parsed.name || parsed.goal || parsed.title || 'Unnamed Workflow',
    description: parsed.description,
    steps: validatedSteps,
    variables: parsed.variables || {},
  };

  // Additional validations
  if (!chainDefinition.name) {
    warnings.push('Workflow has no name');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    parsed: errors.length === 0 ? chainDefinition : undefined,
  };
}

/**
 * Phase 2, Day 3: Enhanced simple YAML parser
 */
function parseSimpleYAML(yaml: string): any {
  const lines = yaml.split('\n');
  const result: any = {};
  const stack: Array<{ obj: any; indent: number }> = [{ obj: result, indent: -1 }];
  let currentArray: any[] | null = null;
  let _arrayKey = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Calculate indent
    const indent = line.length - line.trimStart().length;
    const current = stack[stack.length - 1];

    // Pop stack until we find the right parent
    while (stack.length > 1 && indent <= current.indent) {
      stack.pop();
      const prev = stack[stack.length - 1];
      if (prev) {
        currentArray = null;
        _arrayKey = '';
      }
    }

    const parent = stack[stack.length - 1];

    // Handle array items
    if (trimmed.startsWith('-')) {
      const value = trimmed.substring(1).trim();
      if (!currentArray) {
        // Start new array
        currentArray = [];
        if (parent) {
          const key = getKeyFromLine(line);
          if (key) {
            parent.obj[key] = currentArray;
            _arrayKey = key;
          }
        }
      }

      if (value) {
        if (value.startsWith('{') || value.startsWith('[')) {
          try {
            currentArray.push(JSON.parse(value));
          } catch {
            currentArray.push(value);
          }
        } else if (value.includes(':')) {
          const obj: any = {};
          const parts = value.split(':');
          obj[parts[0].trim()] = parts.slice(1).join(':').trim();
          currentArray.push(obj);
        } else {
          currentArray.push(value);
        }
      }
      continue;
    }

    // Handle key-value pairs
    if (trimmed.includes(':')) {
      const colonIndex = trimmed.indexOf(':');
      const key = trimmed.substring(0, colonIndex).trim();
      let value = trimmed.substring(colonIndex + 1).trim();

      // Remove quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // Parse value
      let parsedValue: any = value;
      if (value === 'true') parsedValue = true;
      else if (value === 'false') parsedValue = false;
      else if (value === 'null' || value === '~') parsedValue = null;
      else if (/^-?\d+$/.test(value)) parsedValue = parseInt(value, 10);
      else if (/^-?\d+\.\d+$/.test(value)) parsedValue = parseFloat(value);
      else if (value.startsWith('{') || value.startsWith('[')) {
        try {
          parsedValue = JSON.parse(value);
        } catch {
          // Keep as string
        }
      }

      // Check if next line is indented (nested object)
      const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
      const nextIndent = nextLine.length - nextLine.trimStart().length;

      if (nextIndent > indent) {
        // Nested object
        const nestedObj: any = {};
        if (value) {
          nestedObj._value = parsedValue;
        }
        parent.obj[key] = nestedObj;
        stack.push({ obj: nestedObj, indent });
        currentArray = null;
        const _arrayKey = '';
      } else {
        // Simple value
        if (currentArray) {
          currentArray.push(parsedValue);
        } else {
          parent.obj[key] = parsedValue;
        }
      }
    }
  }

  // Clean up _value wrappers
  function cleanObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(cleanObject);
    } else if (obj && typeof obj === 'object') {
      const cleaned: any = {};
      for (const key in obj) {
        if (key === '_value' && Object.keys(obj).length === 1) {
          return obj._value;
        }
        cleaned[key] = cleanObject(obj[key]);
      }
      return cleaned;
    }
    return obj;
  }

  return cleanObject(result);
}

function getKeyFromLine(line: string): string | null {
  const trimmed = line.trim();
  if (trimmed.includes(':')) {
    return trimmed.substring(0, trimmed.indexOf(':')).trim();
  }
  return null;
}
