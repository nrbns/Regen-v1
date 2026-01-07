/**
 * PPT Agent Executor
 * Orchestrates presentation generation
 */

import type {
  PptPlan,
  PptTask,
  PresentationOutline,
  GoogleSlidesPresentation,
} from './types';
import { OutlineGenerator } from './outlineGenerator';
import { SlidesConnector } from './slidesConnector';
import { AuditLogger } from '../mailAgent/auditLog';

export interface PptExecutionContext {
  planId: string;
  userId: string;
  outline?: PresentationOutline;
  presentation?: GoogleSlidesPresentation;
  errors: Record<string, Error>;
}

export class PptExecutor {
  private outlineGenerator: OutlineGenerator;
  private slidesConnector: SlidesConnector;
  private auditLogger: AuditLogger;

  constructor() {
    this.outlineGenerator = new OutlineGenerator();
    this.slidesConnector = new SlidesConnector();
    this.auditLogger = new AuditLogger();
  }

  /**
   * Execute presentation generation plan
   */
  async execute(
    userId: string,
    plan: PptPlan,
    authTokens?: { access_token: string; refresh_token?: string }
  ): Promise<PptExecutionContext> {
    const context: PptExecutionContext = {
      planId: plan.id,
      userId,
      errors: {},
    };

    console.log(`[PptExecutor] Starting plan ${plan.id}`);

    // Set auth tokens if provided
    if (authTokens) {
      this.slidesConnector.setTokens(authTokens);
    }

    for (const task of plan.tasks) {
      try {
        console.log(`[PptExecutor] Running task ${task.id}: ${task.type}`);

        task.status = 'in_progress';
        await this.executeTask(task, context, plan);

        task.status = 'completed';
        task.completedAt = new Date();

        // Log success
        await this.auditLogger.log({
          planId: plan.id,
          userId,
          action: `ppt_${task.type}`,
          taskId: task.id,
          status: 'completed',
          timestamp: new Date(),
        });
      } catch (error) {
        console.error(`[PptExecutor] Task ${task.id} failed:`, error);
        task.status = 'failed';
        task.error = error instanceof Error ? error.message : String(error);
        context.errors[task.id] = error as Error;

        // Log failure
        await this.auditLogger.log({
          planId: plan.id,
          userId,
          action: `ppt_${task.type}`,
          taskId: task.id,
          status: 'failed',
          timestamp: new Date(),
          error: error instanceof Error ? error.message : String(error),
        });

        // Stop on critical errors
        if (this.isCriticalError(task.type)) {
          break;
        }
      }
    }

    console.log(`[PptExecutor] Plan ${plan.id} execution completed`);
    return context;
  }

  /**
   * Execute a single task
   */
  private async executeTask(
    task: PptTask,
    context: PptExecutionContext,
    plan: PptPlan
  ): Promise<void> {
    switch (task.type) {
      case 'generate_outline':
        context.outline = await this.executeGenerateOutline(task, plan);
        break;

      case 'create_slides':
        context.presentation = await this.executeCreateSlides(task, context);
        break;

      case 'add_content':
        await this.executeAddContent(task, context);
        break;

      case 'add_images':
        await this.executeAddImages(task, context);
        break;

      case 'finalize':
        await this.executeFinalize(task, context);
        break;

      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  /**
   * Task: Generate outline
   */
  private async executeGenerateOutline(
    task: PptTask,
    plan: PptPlan
  ): Promise<PresentationOutline> {
    const { prompt, slideCount, theme } = task.input;

    const outline = await this.outlineGenerator.generateOutline(prompt, {
      slideCount,
      theme,
    });

    // Store outline in plan
    plan.outline = outline;

    console.log(`[PptExecutor] Generated outline with ${outline.slides.length} slides`);
    return outline;
  }

  /**
   * Task: Create slides
   */
  private async executeCreateSlides(
    _task: PptTask,
    context: PptExecutionContext
  ): Promise<GoogleSlidesPresentation> {
    if (!context.outline) {
      throw new Error('No outline available for creating slides');
    }

    const presentation = await this.slidesConnector.createPresentation(
      context.outline.title
    );

    console.log(`[PptExecutor] Created presentation: ${presentation.presentationId}`);
    return presentation;
  }

  /**
   * Task: Add content
   */
  private async executeAddContent(
    _task: PptTask,
    context: PptExecutionContext
  ): Promise<void> {
    if (!context.outline || !context.presentation) {
      throw new Error('Missing outline or presentation');
    }

    await this.slidesConnector.addSlides(
      context.presentation.presentationId,
      context.outline.slides
    );

    console.log(`[PptExecutor] Added ${context.outline.slides.length} slides with content`);
  }

  /**
   * Task: Add images
   */
  private async executeAddImages(
    _task: PptTask,
    context: PptExecutionContext
  ): Promise<void> {
    if (!context.outline || !context.presentation) {
      throw new Error('Missing outline or presentation');
    }

    // Find slides with image queries
    const slidesWithImages = context.outline.slides.filter((s) => s.imageQuery);

    console.log(`[PptExecutor] Adding images to ${slidesWithImages.length} slides`);

    for (const slide of slidesWithImages) {
      try {
        // In production: search for images via Unsplash API or similar
        const imageUrl = await this.searchImage(slide.imageQuery!);

        await this.slidesConnector.addImage(
          context.presentation.presentationId,
          `slide_${slide.slideNumber}`,
          imageUrl,
          { x: 300, y: 150, width: 400, height: 300 }
        );
      } catch (error) {
        console.warn(`Failed to add image to slide ${slide.slideNumber}:`, error);
        // Non-critical: continue
      }
    }
  }

  /**
   * Task: Finalize
   */
  private async executeFinalize(
    task: PptTask,
    context: PptExecutionContext
  ): Promise<void> {
    if (!context.presentation) {
      throw new Error('No presentation to finalize');
    }

    const theme = task.input.theme || 'professional';

    await this.slidesConnector.applyTheme(context.presentation.presentationId, theme);

    console.log(`[PptExecutor] Finalized presentation with ${theme} theme`);
  }

  /**
   * Search for image (placeholder)
   */
  private async searchImage(_query: string): Promise<string> {
    // Placeholder: would use Unsplash API
    // For now, return a placeholder image
    return 'https://via.placeholder.com/800x600.png?text=Image+Placeholder';
  }

  /**
   * Check if error is critical
   */
  private isCriticalError(taskType: string): boolean {
    // Outline generation and slide creation are critical
    return ['generate_outline', 'create_slides'].includes(taskType);
  }
}

export function createPptExecutor(): PptExecutor {
  return new PptExecutor();
}
