type ExecFn = (ctx: { runId: string; memory: Record<string, unknown> }, args: any) => Promise<any>;

class SkillRegistry {
  private skills = new Map<string, { exec: ExecFn }>();
  register(name: string, exec: ExecFn) {
    this.skills.set(name, { exec });
  }
  get(name: string) {
    return this.skills.get(name);
  }
}

export const registry = new SkillRegistry();


