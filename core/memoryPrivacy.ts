// Regen Memory Privacy & Influence (Phase 2)
// Human-readable, local, encrypted memory; influences suggestions

export class MemoryPrivacyManager {
  private localOnly: boolean = true;
  private encrypted: boolean = true;

  setLocalOnly(val: boolean) {
    this.localOnly = val;
  }

  setEncrypted(val: boolean) {
    this.encrypted = val;
  }

  isLocalOnly() {
    return this.localOnly;
  }

  isEncrypted() {
    return this.encrypted;
  }

  // Example: make memory human-readable
  toHumanReadable(memory: any): string {
    if (typeof memory === 'string') return memory;
    if (Array.isArray(memory)) return memory.map(this.toHumanReadable).join('\n');
    if (typeof memory === 'object') return JSON.stringify(memory, null, 2);
    return String(memory);
  }

  // Example: influence suggestions
  influenceSuggestions(memory: any, suggestions: string[]): string[] {
    // Simple: boost suggestions containing memory facts
    const facts = typeof memory === 'string' ? [memory] : Array.isArray(memory) ? memory : [];
    return suggestions.sort((a, b) => {
      const aScore = facts.some(f => a.includes(f)) ? 1 : 0;
      const bScore = facts.some(f => b.includes(f)) ? 1 : 0;
      return bScore - aScore;
    });
  }
}
