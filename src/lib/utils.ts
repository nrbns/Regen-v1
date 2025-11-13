/**
 * Utility helpers shared across UI layers.
 */

type ClassValue = string | number | null | undefined | false | ClassValue[];

function flatten(values: ClassValue[]): string[] {
  const result: string[] = [];
  values.forEach((value) => {
    if (!value) {
      return;
    }
    if (Array.isArray(value)) {
      result.push(...flatten(value));
    } else {
      result.push(String(value));
    }
  });
  return result;
}

export function cn(...inputs: ClassValue[]): string {
  return flatten(inputs)
    .filter((value) => value.trim().length > 0)
    .join(' ');
}

