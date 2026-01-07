/**
 * PPT Agent Integration Examples
 */

import { PptPlanner } from './pptPlanner';
import type { PresentationRequest } from './types';

/**
 * Example 1: Simple Presentation
 */
export async function example1_SimplePresentation(): Promise<void> {
  console.log('\n=== Example 1: Simple Presentation ===');

  const planner = new PptPlanner();

  const request: PresentationRequest = {
    userId: 'demo-user',
    prompt: 'Create a presentation about AI in healthcare',
    options: {
      slideCount: 10,
      theme: 'professional',
    },
  };

  // Validate request
  const validation = planner.validateRequest(request);
  if (!validation.valid) {
    console.error('Invalid request:', validation.error);
    return;
  }

  // Create plan
  const plan = planner.createPlan(request);
  console.log(`Created plan with ${plan.tasks.length} tasks`);
  console.log(`Estimated time: ${plan.estimatedTime}s`);

  // Execute (requires Google OAuth tokens)
  // const context = await executor.execute('demo-user', plan, authTokens);
  // console.log(`Presentation created: ${context.presentation?.url}`);
}

/**
 * Example 2: Custom Theme & Images
 */
export async function example2_CustomPresentation(): Promise<void> {
  console.log('\n=== Example 2: Custom Presentation ===');

  const planner = new PptPlanner();

  const request: PresentationRequest = {
    userId: 'demo-user',
    prompt: 'Product launch presentation for a new mobile app',
    options: {
      slideCount: 15,
      theme: 'creative',
      includeImages: true,
      aspectRatio: '16:9',
    },
  };

  const plan = planner.createPlan(request);
  console.log(`Plan created: ${plan.id}`);
  console.log(`Tasks: ${plan.tasks.map(t => t.type).join(' -> ')}`);
}

/**
 * Example 3: Batch Generation
 */
export async function example3_BatchGeneration(): Promise<void> {
  console.log('\n=== Example 3: Batch Generation ===');

  const planner = new PptPlanner();

  const prompts = ['Company quarterly review', 'Team onboarding guide', 'Marketing strategy 2025'];

  for (const prompt of prompts) {
    const plan = planner.createPlan({
      userId: 'demo-user',
      prompt,
      options: { slideCount: 8, theme: 'minimal' },
    });

    console.log(`Created plan for: "${prompt}"`);
    console.log(`- ${plan.tasks.length} tasks`);
    console.log(`- Estimated ${plan.estimatedTime}s\n`);
  }
}

/**
 * Main runner
 */
export async function runPptExamples(): Promise<void> {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   PPT Agent Integration Examples      ║');
  console.log('╚════════════════════════════════════════╝');

  await example1_SimplePresentation();
  await example2_CustomPresentation();
  await example3_BatchGeneration();

  console.log('\n✓ All examples completed!\n');
}

if (require.main === module) {
  runPptExamples();
}
