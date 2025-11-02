type RunRecord = {
  dsl: unknown;
  startedAt: number;
  finishedAt?: number;
  steps: any[];
};

export class AgentStore {
  private runs = new Map<string, RunRecord>();
  start(runId: string, dsl: unknown) {
    this.runs.set(runId, { dsl, startedAt: Date.now(), steps: [] });
  }
  append(runId: string, entry: any) {
    const rec = this.runs.get(runId);
    if (rec) rec.steps.push(entry);
  }
  finish(runId: string) {
    const rec = this.runs.get(runId);
    if (rec) rec.finishedAt = Date.now();
  }
  get(runId: string) { return this.runs.get(runId); }
  list() {
    return Array.from(this.runs.entries()).map(([id, r]) => ({ id, startedAt: r.startedAt, finishedAt: r.finishedAt, steps: r.steps.length, goal: (r.dsl as any)?.goal }));
  }
}


