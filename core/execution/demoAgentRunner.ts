import { createTask, start, stream, log, complete, fail } from "./taskManager";

/**
 * Demo agent that showcases real-time streaming capabilities
 * This simulates a typical AI agent workflow with streaming output
 */
export async function runDemoAgent(intent: string): Promise<string> {
  // Create task immediately - this makes it visible in UI
  const task = createTask(intent);

  try {
    // Start the task execution
    start(task);
    log(task, "Initializing demo agent...");

    // Simulate some initial processing
    await sleep(500);
    stream(task, "🔍 Analyzing request...");
    log(task, "Parsed intent: demonstration of streaming capabilities");

    // Simulate streaming analysis steps
    await sleep(300);
    stream(task, "\n📊 Gathering context...");
    log(task, "Connected to local knowledge base");

    await sleep(400);
    stream(task, "\n🤖 Processing with AI model...");
    log(task, "Using offline GGUF model for privacy");

    await sleep(600);
    stream(task, "\n✨ Generating response...");
    log(task, "Streaming tokens in real-time");

    // Simulate streaming response word by word
    const response = "This is a demonstration of Regen's real-time streaming capabilities. Every word appears instantly as the AI generates it, making the interface feel alive and responsive.";
    const words = response.split(" ");

    for (let i = 0; i < words.length; i++) {
      await sleep(100); // Simulate token generation time
      stream(task, (i === 0 ? "\n\n" : " ") + words[i]);
    }

    await sleep(300);
    stream(task, "\n\n✅ Task completed successfully!");
    log(task, "Demo agent execution finished");

    complete(task);
    return task.id;

  } catch (error) {
    log(task, `Error during execution: ${error}`);
    fail(task, String(error));
    throw error;
  }
}

/**
 * Helper function to simulate async work
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
