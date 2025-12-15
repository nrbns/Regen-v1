/**
 * PPT Agent Planner
 * Converts prompt into presentation generation tasks
 */

import type { PptPlan, PptTask, PresentationRequest } from './types';

export class PptPlanner {
  /**
   * Create execution plan for presentation generation
   */
  createPlan(request: PresentationRequest): PptPlan {
    const planId = `ppt-plan-${Date.now()}`;
    const tasks: PptTask[] = [];

    let taskId = 1;

    // Task 1: Generate outline
    tasks.push({
      id: `task-${taskId++}`,
      type: 'generate_outline',
      status: 'pending',
      input: {
        prompt: request.prompt,
        slideCount: request.options?.slideCount || 10,
        theme: request.options?.theme || 'professional',
      },
      createdAt: new Date(),
    });

    // Task 2: Create slides
    tasks.push({
      id: `task-${taskId++}`,
      type: 'create_slides',
      status: 'pending',
      input: {
        title: '', // Will be filled from outline
        aspectRatio: request.options?.aspectRatio || '16:9',
      },
      createdAt: new Date(),
    });

    // Task 3: Add content
    tasks.push({
      id: `task-${taskId++}`,
      type: 'add_content',
      status: 'pending',
      input: {
        slides: [], // Will be filled from outline
      },
      createdAt: new Date(),
    });

    // Task 4: Add images (if requested)
    if (request.options?.includeImages !== false) {
      tasks.push({
        id: `task-${taskId++}`,
        type: 'add_images',
        status: 'pending',
        input: {
          searchQueries: [], // Will be filled from outline
        },
        createdAt: new Date(),
      });
    }

    // Task 5: Finalize
    tasks.push({
      id: `task-${taskId++}`,
      type: 'finalize',
      status: 'pending',
      input: {
        theme: request.options?.theme || 'professional',
      },
      createdAt: new Date(),
    });

    // Estimate time: ~2s per task + 1s per slide
    const slideCount = request.options?.slideCount || 10;
    const estimatedTime = tasks.length * 2 + slideCount;

    const plan: PptPlan = {
      id: planId,
      userId: request.userId,
      prompt: request.prompt,
      tasks,
      estimatedTime,
      createdAt: new Date(),
    };

    console.log(`[PptPlanner] Created plan ${planId} with ${tasks.length} tasks`);
    return plan;
  }

  /**
   * Validate presentation request
   */
  validateRequest(request: PresentationRequest): { valid: boolean; error?: string } {
    if (!request.userId || request.userId.trim().length === 0) {
      return { valid: false, error: 'userId is required' };
    }

    if (!request.prompt || request.prompt.trim().length === 0) {
      return { valid: false, error: 'prompt is required' };
    }

    if (request.prompt.length > 1000) {
      return { valid: false, error: 'prompt too long (max 1000 characters)' };
    }

    const slideCount = request.options?.slideCount;
    if (slideCount && (slideCount < 3 || slideCount > 50)) {
      return { valid: false, error: 'slideCount must be between 3 and 50' };
    }

    return { valid: true };
  }
}

export function createPptPlanner(): PptPlanner {
  return new PptPlanner();
}
