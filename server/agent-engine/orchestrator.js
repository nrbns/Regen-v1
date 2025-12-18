/**
 * Regen Agent Orchestrator - Workflow execution and planning
 * Handles multi-step tasks, planning, and agent coordination
 */

const { getAgentManager, getAgentMemory, AgentStateMachine } = require('./core');
const { createDefaultTools } = require('./tools');

// Plan Step - Represents a single step in a plan
class PlanStep {
  constructor(options) {
    this.id = options.id || `step-${Date.now()}`;
    this.tool = options.tool;
    this.params = options.params || {};
    this.description = options.description || '';
    this.condition = options.condition || null;
    this.onSuccess = options.onSuccess || null;
    this.onFailure = options.onFailure || null;
    this.retries = options.retries || 0;
    this.timeout = options.timeout || 30000;
    this.status = 'pending'; // pending, running, completed, failed, skipped
    this.result = null;
    this.error = null;
  }
}

// Agent Plan - Represents a complete execution plan
class AgentPlan {
  constructor(goal) {
    this.id = `plan-${Date.now()}`;
    this.goal = goal;
    this.steps = [];
    this.currentStepIndex = 0;
    this.status = 'pending'; // pending, running, completed, failed, cancelled
    this.createdAt = Date.now();
    this.startedAt = null;
    this.completedAt = null;
    this.context = {};
  }

  addStep(step) {
    this.steps.push(step instanceof PlanStep ? step : new PlanStep(step));
  }

  getCurrentStep() {
    return this.steps[this.currentStepIndex];
  }

  advanceStep() {
    this.currentStepIndex++;
    return this.currentStepIndex < this.steps.length;
  }

  isComplete() {
    return this.currentStepIndex >= this.steps.length;
  }

  getProgress() {
    return {
      current: this.currentStepIndex,
      total: this.steps.length,
      percent: Math.round((this.currentStepIndex / this.steps.length) * 100),
    };
  }
}

// Planner - Wrapper around enhanced AgentPlanner
// Kept for backward compatibility
const { AgentPlanner } = require('./planner.cjs');

class Planner {
  constructor(options = {}) {
    this.planner = new AgentPlanner(options);
  }

  async createPlan(goal, context = {}) {
    return this.planner.createPlan(goal, context);
  }

  createFallbackPlan(goal, context) {
    return this.planner.createFallbackPlan(goal, context);
  }
}

// Executor - Executes plans step by step
class Executor {
  constructor(options = {}) {
    this.toolRegistry = options.toolRegistry;
    this.onStepStart = options.onStepStart || (() => {});
    this.onStepComplete = options.onStepComplete || (() => {});
    this.onStepError = options.onStepError || (() => {});
  }

  async executePlan(plan, context = {}) {
    plan.status = 'running';
    plan.startedAt = Date.now();

    const results = [];

    while (!plan.isComplete() && plan.status === 'running') {
      const step = plan.getCurrentStep();

      // LAG FIX: Check if step can be parallelized with next steps
      const parallelSteps = this.getParallelizableSteps(plan, step);

      if (parallelSteps.length > 1) {
        // Execute parallel steps
        const parallelResults = await this.executeParallelSteps(
          parallelSteps,
          { ...context, ...plan.context },
          plan
        );
        results.push(...parallelResults);

        // Advance past all parallel steps
        for (let i = 0; i < parallelSteps.length; i++) {
          plan.advanceStep();
        }
        continue;
      }

      // Single step execution (original logic)
      step.status = 'running';

      this.onStepStart(step, plan.getProgress());

      try {
        // Execute step with retries
        let result = null;
        let lastError = null;
        let attempts = 0;

        while (attempts <= step.retries && !result?.success) {
          attempts++;
          try {
            result = await this.executeStep(step, { ...context, ...plan.context });
          } catch (error) {
            lastError = error;
            if (attempts <= step.retries) {
              console.log(`[Executor] Retry ${attempts}/${step.retries} for step ${step.id}`);
              await new Promise(r => setTimeout(r, 1000));
            }
          }
        }

        if (!result || !result.success) {
          throw lastError || new Error('Step execution failed');
        }

        step.status = 'completed';
        step.result = result;
        results.push(result);

        // Update plan context with result
        if (result.data) {
          plan.context[`step_${plan.currentStepIndex}_result`] = result.data;
        }

        this.onStepComplete(step, result);

        // Handle success transition
        if (step.onSuccess) {
          plan.currentStepIndex = plan.steps.findIndex(s => s.id === step.onSuccess);
          if (plan.currentStepIndex === -1) {
            plan.currentStepIndex = plan.steps.length; // End plan
          }
        } else {
          plan.advanceStep();
        }
      } catch (error) {
        step.status = 'failed';
        step.error = error.message;

        this.onStepError(step, error);

        // Handle failure transition
        if (step.onFailure) {
          const failureIndex = plan.steps.findIndex(s => s.id === step.onFailure);
          if (failureIndex !== -1) {
            plan.currentStepIndex = failureIndex;
            continue;
          }
        }

        // Default: fail the plan
        plan.status = 'failed';
        break;
      }
    }

    if (plan.status === 'running') {
      plan.status = 'completed';
    }
    plan.completedAt = Date.now();

    return {
      success: plan.status === 'completed',
      plan,
      results,
      duration: plan.completedAt - plan.startedAt,
    };
  }

  /**
   * LAG FIX: Identify steps that can run in parallel
   * Steps are parallelizable if they don't depend on each other's results
   */
  getParallelizableSteps(plan, currentStep) {
    const steps = [currentStep];
    let nextIndex = plan.currentStepIndex + 1;

    // Look ahead for independent steps (no onSuccess/onFailure branching)
    while (nextIndex < plan.steps.length) {
      const nextStep = plan.steps[nextIndex];

      // Stop if step has branching logic
      if (nextStep.onSuccess || nextStep.onFailure) break;

      // Stop if step params reference previous step results
      const dependsOnPrevious = Object.values(nextStep.params || {}).some(
        value => typeof value === 'string' && value.startsWith('$step_')
      );
      if (dependsOnPrevious) break;

      steps.push(nextStep);
      nextIndex++;

      // Limit parallel batch size
      if (steps.length >= 3) break;
    }

    return steps;
  }

  /**
   * LAG FIX: Execute multiple steps in parallel using Promise.all
   * Reduces sequential chain latency from 3s to sub-1s
   */
  async executeParallelSteps(steps, context, plan) {
    console.log(`[Executor] Parallel execution: ${steps.length} steps`);

    const promises = steps.map(async step => {
      step.status = 'running';
      this.onStepStart(step, plan.getProgress());

      try {
        let result = null;
        let lastError = null;
        let attempts = 0;

        while (attempts <= step.retries && !result?.success) {
          attempts++;
          try {
            result = await this.executeStep(step, context);
          } catch (error) {
            lastError = error;
            if (attempts <= step.retries) {
              await new Promise(r => setTimeout(r, 1000));
            }
          }
        }

        if (!result || !result.success) {
          throw lastError || new Error('Step execution failed');
        }

        step.status = 'completed';
        step.result = result;
        this.onStepComplete(step, result);

        return result;
      } catch (error) {
        step.status = 'failed';
        step.error = error.message;
        this.onStepError(step, error);
        throw error;
      }
    });

    return Promise.all(promises);
  }

  async executeStep(step, context) {
    if (!this.toolRegistry) {
      throw new Error('No tool registry configured');
    }

    // Evaluate params (substitute variables)
    const evaluatedParams = this.evaluateParams(step.params, context);

    console.log(`[Executor] Executing ${step.tool}:`, evaluatedParams);

    return this.toolRegistry.execute(step.tool, evaluatedParams, context);
  }

  evaluateParams(params, context) {
    const evaluated = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.startsWith('$')) {
        // Variable substitution
        const varName = value.slice(1);
        evaluated[key] = context[varName] ?? value;
      } else {
        evaluated[key] = value;
      }
    }

    return evaluated;
  }
}

// Main Orchestrator
class AgentOrchestrator {
  constructor(options = {}) {
    this.manager = options.manager || getAgentManager();
    this.memory = options.memory || getAgentMemory();
    this.toolRegistry = options.toolRegistry || createDefaultTools({ memory: this.memory });
    const { AgentPlanner } = require('./planner.cjs');
    this.planner = new AgentPlanner({
      toolRegistry: this.toolRegistry,
      ...options.planner,
    });
    this.executor = new Executor({
      toolRegistry: this.toolRegistry,
      ...options.executor,
    });
  }

  async handleQuery(sessionId, query, context = {}) {
    const session = this.manager.getOrCreateSession(sessionId, context);
    const stateMachine = new AgentStateMachine(session);

    // Add user message
    session.addMessage('user', query);

    try {
      // Thinking phase
      stateMachine.transition('thinking');

      // Retrieve relevant memories for context
      const memoryContext = await this.memory.getContext(query, {
        maxMemories: 5,
        maxFacts: 3,
        includePreferences: true,
      });

      // Enhance context with memories
      const enhancedContext = {
        ...context,
        ...session.context,
        memories: memoryContext.memories,
        facts: memoryContext.facts,
        preferences: memoryContext.preferences,
      };

      // Determine intent
      const intent = this.classifyIntent(query);
      console.log(`[Orchestrator] Intent: ${intent}`);

      if (intent === 'simple_question') {
        // Direct answer without plan
        stateMachine.transition('responding');
        const result = await this.toolRegistry.execute('answer', { question: query }, context);

        session.addMessage('assistant', result.answer || result.message, {
          tool: 'answer',
          citations: result.citations,
        });

        stateMachine.reset();
        return result;
      }

      // Complex task: create and execute plan
      stateMachine.transition('planning');
      const plan = await this.planner.createPlan(query, enhancedContext);

      // Execute plan
      stateMachine.transition('executing');

      this.executor.onStepStart = (step, progress) => {
        session.addMessage(
          'system',
          `Step ${progress.current + 1}/${progress.total}: ${step.description}`,
          {
            type: 'step_start',
            step: step.id,
          }
        );
      };

      this.executor.onStepComplete = (step, result) => {
        session.addMessage('tool', result.message || 'Step completed', {
          type: 'step_complete',
          step: step.id,
          tool: step.tool,
          result: result,
        });
      };

      this.executor.onStepError = (step, error) => {
        session.addMessage('system', `Step failed: ${error.message}`, {
          type: 'step_error',
          step: step.id,
          error: error.message,
        });
      };

      const execResult = await this.executor.executePlan(plan, {
        ...enhancedContext,
        emit: (event, data) => session.emit(event, data),
      });

      // Store successful execution in memory
      if (execResult.success) {
        await this.memory.addFact(`Successfully completed: ${query}`, 'execution', 0.9, {
          planId: plan.id,
          duration: execResult.duration,
        });
      }

      // Generate summary response
      const summary = this.generateSummary(query, execResult);
      session.addMessage('assistant', summary, {
        type: 'plan_complete',
        success: execResult.success,
        duration: execResult.duration,
      });

      stateMachine.reset();
      return execResult;
    } catch (error) {
      stateMachine.reset();
      session.addMessage('assistant', `I encountered an error: ${error.message}`, {
        type: 'error',
        error: error.message,
      });
      throw error;
    }
  }

  classifyIntent(query) {
    const queryLower = query.toLowerCase();

    // Simple questions
    if (queryLower.match(/^(what|who|when|where|why|how|is|are|does|do|can|will)\b/)) {
      if (!queryLower.includes(' and then ') && !queryLower.includes(' after ')) {
        return 'simple_question';
      }
    }

    // Definitions
    if (queryLower.match(/^(define|meaning of|what is the definition)/)) {
      return 'simple_question';
    }

    // Actions
    if (queryLower.match(/^(go|open|navigate|click|type|search|find|scroll|wait)/)) {
      return 'action';
    }

    // Multi-step
    if (
      queryLower.includes(' then ') ||
      queryLower.includes(' after ') ||
      queryLower.includes(' and ')
    ) {
      return 'multi_step';
    }

    return 'simple_question';
  }

  generateSummary(goal, result) {
    if (result.success) {
      const stepCount = result.plan.steps.length;
      const duration = (result.duration / 1000).toFixed(1);

      const lastResult = result.results[result.results.length - 1];
      const details = lastResult?.message || 'Task completed';

      return `✅ Completed: ${goal}\n\nExecuted ${stepCount} steps in ${duration}s.\n\n${details}`;
    } else {
      const failedStep = result.plan.steps.find(s => s.status === 'failed');
      return `❌ Failed to complete: ${goal}\n\nError: ${failedStep?.error || 'Unknown error'}`;
    }
  }

  async chat(sessionId, message, context = {}) {
    return this.handleQuery(sessionId, message, context);
  }

  getSession(sessionId) {
    return this.manager.getSession(sessionId);
  }

  getTools() {
    return this.toolRegistry.getSchema();
  }
}

module.exports = {
  AgentOrchestrator,
  Planner,
  Executor,
  AgentPlan,
  PlanStep,
};

// Export enhanced planner
module.exports.AgentPlanner = require('./planner.cjs').AgentPlanner;

// CLI Test
if (require.main === module) {
  (async () => {
    const orchestrator = new AgentOrchestrator();

    console.log('Testing orchestrator...\n');

    // Test simple question
    console.log('=== Simple Question ===');
    try {
      const result1 = await orchestrator.handleQuery('test-session', 'What is JavaScript?');
      console.log('Result:', result1);
    } catch (error) {
      console.error('Error:', error.message);
    }

    // Test action
    console.log('\n=== Action ===');
    try {
      const result2 = await orchestrator.handleQuery('test-session', 'Search for React tutorials');
      console.log('Result:', result2);
    } catch (error) {
      console.error('Error:', error.message);
    }

    // Show session history
    const session = orchestrator.getSession('test-session');
    console.log('\n=== Session History ===');
    session?.getMessages().forEach(m => {
      console.log(`[${m.role}] ${m.content.slice(0, 100)}...`);
    });
  })();
}
