import os from 'os';
import { eventBus } from '../core/execution/eventBus';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function sampleCpuPercent(sampleMs = 100): Promise<number> {
  const cpus1 = os.cpus();
  await sleep(sampleMs);
  const cpus2 = os.cpus();

  let idleDiff = 0;
  let totalDiff = 0;

  for (let i = 0; i < cpus1.length; i++) {
    const c1 = cpus1[i].times;
    const c2 = cpus2[i].times;

    const t1 = c1.user + c1.nice + c1.sys + c1.idle + c1.irq;
    const t2 = c2.user + c2.nice + c2.sys + c2.idle + c2.irq;

    const idle = c2.idle - c1.idle;
    const total = t2 - t1;

    idleDiff += idle;
    totalDiff += total;
  }

  if (totalDiff === 0) return 0;
  const usage = 100 - Math.round((idleDiff / totalDiff) * 100);
  return Math.max(0, Math.min(100, usage));
}

export function startResourcePublisher(intervalMs = 1000) {
  let running = true;

  (async function pollLoop() {
    while (running) {
      try {
        const cpu = await sampleCpuPercent(120);
        const total = os.totalmem();
        const free = os.freemem();
        const used = total - free;
        const ram = Math.round((used / total) * 100);
        eventBus.emit('resource', { cpu, ram });
      } catch (err) {
        // ignore
      }
      await sleep(intervalMs);
    }
  })();

  return () => {
    running = false;
  };
}
