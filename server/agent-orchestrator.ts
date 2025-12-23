// server/agent-orchestrator.ts
import { execSync } from 'child_process';

export type AgentTask =
  | { type: 'llama2'; prompt: string }
  | { type: 'llm'; action: 'train' | 'infer'; data: any }
  | { type: 'nanogpt'; datasetPath: string }
  | { type: 'convnetjs'; script: string };

export async function runAgentTask(task: AgentTask): Promise<any> {
  switch (task.type) {
    case 'llama2': {
      // Call llama2.c binary for local inference
      const output = execSync(`./run tinyllama.bin -i "${task.prompt}"`);
      return output.toString();
    }
    case 'llm': {
      if (task.action === 'train') {
        // Example: call llm.c for training
        execSync(`./llm_train --data ${task.data}`);
        return { status: 'training started' };
      } else {
        // Example: call llm.c for inference
        const output = execSync(`./llm_infer --input "${task.data}"`);
        return output.toString();
      }
    }
    case 'nanogpt': {
      // Example: start nanoGPT training (Python)
      execSync(`python train.py --data_dir ${task.datasetPath}`);
      return { status: 'nanoGPT training started' };
    }
    case 'convnetjs': {
      // For convnetjs, run in-browser; here, just return script for frontend
      return { script: task.script };
    }
    default:
      throw new Error('Unknown agent task type');
  }
}
