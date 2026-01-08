import { createTask, logTask, streamOutput, completeTask, setTaskStatus } from './taskManager';

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

export async function runDemoAgent(label = 'demo:offline-agent') {
  const task = createTask(label);
  setTaskStatus(task.id, 'RUNNING');
  logTask(task.id, 'Demo agent started');

  const steps = [
    'Building local context',
    'Generating embeddings',
    'Running summarizer',
    'Assembling response',
    'Finalizing',
  ];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    logTask(task.id, `Step ${i + 1}: ${step}`);
    // stream multiple partial outputs for each step
    for (let j = 0; j < 3; j++) {
      streamOutput(task.id, `${step} — chunk ${j + 1}`);
      await sleep(300);
    }
    await sleep(200);
  }

  logTask(task.id, 'Demo agent completed successfully');
  streamOutput(task.id, 'RESULT: Summary (demo) — All good.');
  completeTask(task.id);
  return task.id;
}

// Optional: auto-run when imported in a dev/test harness
if (require && require.main === module) {
  (async () => {
    console.log('Running demo agent...');
    const id = await runDemoAgent();
    console.log('Demo agent finished, task id=', id);
  })();
}
