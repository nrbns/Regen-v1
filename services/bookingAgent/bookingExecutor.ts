/**
 * Booking Agent Executor
 * Orchestrates travel booking workflow
 */

import type { BookingPlan, BookingTask, FlightOption } from './types';
import { FlightSearchService } from './flightSearchService';
import { AuditLogger } from '../mailAgent/auditLog';

export interface BookingExecutionContext {
  planId: string;
  userId: string;
  searchResults: FlightOption[];
  filteredOptions: FlightOption[];
  selectedOption?: FlightOption;
  bookingConfirmation?: {
    confirmationCode: string;
    bookingId: string;
  };
  errors: Record<string, Error>;
}

export interface BookingApprovalRequest {
  taskId: string;
  taskType: string;
  options: FlightOption[];
  selectedOption?: FlightOption;
  totalPrice?: number;
}

export class BookingExecutor {
  private flightService: FlightSearchService;
  private auditLogger: AuditLogger;

  constructor() {
    this.flightService = new FlightSearchService();
    this.auditLogger = new AuditLogger();
  }

  /**
   * Execute booking plan
   */
  async execute(
    userId: string,
    plan: BookingPlan,
    approvalHandler: (req: BookingApprovalRequest) => Promise<FlightOption | null>
  ): Promise<BookingExecutionContext> {
    const context: BookingExecutionContext = {
      planId: plan.id,
      userId,
      searchResults: [],
      filteredOptions: [],
      errors: {},
    };

    console.log(`[BookingExecutor] Starting plan ${plan.id}`);

    for (const task of plan.tasks) {
      try {
        console.log(`[BookingExecutor] Running task ${task.id}: ${task.type}`);

        task.status = 'in_progress';
        await this.executeTask(task, context, plan, approvalHandler);

        task.status = 'completed';
        task.completedAt = new Date();

        // Log success
        await this.auditLogger.log({
          planId: plan.id,
          userId,
          action: `booking_${task.type}`,
          taskId: task.id,
          status: 'completed',
          timestamp: new Date(),
        });
      } catch (error) {
        console.error(`[BookingExecutor] Task ${task.id} failed:`, error);
        task.status = 'failed';
        task.error = error instanceof Error ? error.message : String(error);
        context.errors[task.id] = error as Error;

        // Log failure
        await this.auditLogger.log({
          planId: plan.id,
          userId,
          action: `booking_${task.type}`,
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

    console.log(`[BookingExecutor] Plan ${plan.id} execution completed`);
    return context;
  }

  /**
   * Execute a single task
   */
  private async executeTask(
    task: BookingTask,
    context: BookingExecutionContext,
    plan: BookingPlan,
    approvalHandler: (req: BookingApprovalRequest) => Promise<FlightOption | null>
  ): Promise<void> {
    switch (task.type) {
      case 'search':
        await this.executeSearch(task, context, plan);
        break;

      case 'filter':
        await this.executeFilter(task, context);
        break;

      case 'compare':
        await this.executeCompare(task, context, approvalHandler);
        break;

      case 'book':
        await this.executeBook(task, context);
        break;

      case 'confirm':
        await this.executeConfirm(task, context);
        break;

      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  /**
   * Task: Search for options
   */
  private async executeSearch(
    task: BookingTask,
    context: BookingExecutionContext,
    plan: BookingPlan
  ): Promise<void> {
    const { bookingType, params } = task.input;

    if (bookingType === 'flight') {
      context.searchResults = await this.flightService.searchFlights(params);
      console.log(`[BookingExecutor] Found ${context.searchResults.length} flights`);
    } else {
      throw new Error(`Booking type ${bookingType} not yet implemented`);
    }

    // Store in plan
    plan.options = context.searchResults;
  }

  /**
   * Task: Filter and sort results
   */
  private async executeFilter(task: BookingTask, context: BookingExecutionContext): Promise<void> {
    const { criteria } = task.input;

    // Filter
    let filtered = context.searchResults;
    if (criteria && Object.keys(criteria).length > 0) {
      filtered = this.flightService.filterFlights(context.searchResults, criteria);
    }

    // Sort by price (default)
    filtered = this.flightService.sortFlights(filtered, 'price');

    context.filteredOptions = filtered.slice(0, 10); // Top 10
    console.log(`[BookingExecutor] Filtered to ${context.filteredOptions.length} options`);
  }

  /**
   * Task: Compare and select
   */
  private async executeCompare(
    task: BookingTask,
    context: BookingExecutionContext,
    approvalHandler: (req: BookingApprovalRequest) => Promise<FlightOption | null>
  ): Promise<void> {
    const maxOptions = task.input.maxOptions || 5;
    const topOptions = context.filteredOptions.slice(0, maxOptions);

    // Request user selection
    const selected = await approvalHandler({
      taskId: task.id,
      taskType: 'compare',
      options: topOptions,
    });

    if (!selected) {
      throw new Error('No option selected');
    }

    context.selectedOption = selected;
    console.log(
      `[BookingExecutor] Selected flight ${selected.id}: ${selected.airline} ${selected.flightNumber}`
    );
  }

  /**
   * Task: Book selected option
   */
  private async executeBook(task: BookingTask, context: BookingExecutionContext): Promise<void> {
    if (!context.selectedOption) {
      throw new Error('No option selected for booking');
    }

    // In production: call booking API with payment
    // For now: simulate booking
    await new Promise(resolve => setTimeout(resolve, 1000));

    const confirmationCode = `BOOK${Date.now().toString().slice(-6)}`;
    const bookingId = `booking-${Date.now()}`;

    context.bookingConfirmation = {
      confirmationCode,
      bookingId,
    };

    console.log(`[BookingExecutor] Booking confirmed: ${confirmationCode}`);
  }

  /**
   * Task: Send confirmation
   */
  private async executeConfirm(task: BookingTask, context: BookingExecutionContext): Promise<void> {
    if (!context.bookingConfirmation) {
      throw new Error('No booking to confirm');
    }

    // In production: send email confirmation
    console.log(
      `[BookingExecutor] Confirmation sent for ${context.bookingConfirmation.confirmationCode}`
    );
  }

  /**
   * Check if error is critical
   */
  private isCriticalError(taskType: string): boolean {
    return ['search', 'book'].includes(taskType);
  }
}

export function createBookingExecutor(): BookingExecutor {
  return new BookingExecutor();
}
