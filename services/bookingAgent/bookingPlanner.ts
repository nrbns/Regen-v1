/**
 * Booking Agent Planner
 * Creates task plans for travel bookings
 */

import type { BookingRequest, BookingPlan, BookingTask } from './types';

export class BookingPlanner {
  /**
   * Create booking plan from request
   */
  createPlan(request: BookingRequest): BookingPlan {
    const planId = `booking-plan-${Date.now()}`;
    const tasks: BookingTask[] = [];

    let taskId = 1;

    // Task 1: Search
    tasks.push({
      id: `task-${taskId++}`,
      type: 'search',
      status: 'pending',
      input: {
        bookingType: request.type,
        params: request.params,
      },
      createdAt: new Date(),
    });

    // Task 2: Filter & Sort
    tasks.push({
      id: `task-${taskId++}`,
      type: 'filter',
      status: 'pending',
      input: {
        criteria: this.inferFilterCriteria(request.intent),
      },
      createdAt: new Date(),
    });

    // Task 3: Compare Options
    tasks.push({
      id: `task-${taskId++}`,
      type: 'compare',
      status: 'pending',
      input: {
        maxOptions: 5,
      },
      createdAt: new Date(),
    });

    // Task 4: Book (requires approval)
    tasks.push({
      id: `task-${taskId++}`,
      type: 'book',
      status: 'pending',
      input: {
        requiresPayment: true,
      },
      createdAt: new Date(),
    });

    // Task 5: Confirm
    tasks.push({
      id: `task-${taskId++}`,
      type: 'confirm',
      status: 'pending',
      input: {},
      createdAt: new Date(),
    });

    const plan: BookingPlan = {
      id: planId,
      userId: request.userId,
      intent: request.intent,
      bookingType: request.type,
      tasks,
      estimatedTime: this.estimateTime(request.type),
      requiresApproval: true, // Always require approval for bookings
      createdAt: new Date(),
    };

    console.log(`[BookingPlanner] Created plan ${planId} with ${tasks.length} tasks`);
    return plan;
  }

  /**
   * Infer filter criteria from intent
   */
  private inferFilterCriteria(intent: string): Record<string, any> {
    const criteria: Record<string, any> = {};

    // Detect budget constraints
    const budgetMatch = intent.match(/under\s+\$?(\d+)/i);
    if (budgetMatch) {
      criteria.maxPrice = parseInt(budgetMatch[1]);
    }

    // Detect nonstop preference
    if (intent.toLowerCase().includes('nonstop') || intent.toLowerCase().includes('direct')) {
      criteria.maxStops = 0;
    }

    // Detect time preferences
    if (intent.toLowerCase().includes('morning')) {
      criteria.departureTimeRange = { start: 6, end: 12 };
    } else if (intent.toLowerCase().includes('afternoon')) {
      criteria.departureTimeRange = { start: 12, end: 18 };
    } else if (intent.toLowerCase().includes('evening')) {
      criteria.departureTimeRange = { start: 18, end: 23 };
    }

    return criteria;
  }

  /**
   * Estimate execution time
   */
  private estimateTime(bookingType: string): number {
    const estimates: Record<string, number> = {
      flight: 15, // 15 seconds for flight search
      hotel: 20, // 20 seconds for hotel search
      car: 10, // 10 seconds for car rental
      package: 30, // 30 seconds for package deals
    };

    return estimates[bookingType] || 15;
  }

  /**
   * Validate booking request
   */
  validateRequest(request: BookingRequest): { valid: boolean; error?: string } {
    if (!request.userId) {
      return { valid: false, error: 'userId required' };
    }

    if (!request.intent || request.intent.trim().length === 0) {
      return { valid: false, error: 'intent required' };
    }

    if (!request.type) {
      return { valid: false, error: 'booking type required' };
    }

    // Type-specific validation
    if (request.type === 'flight' && request.params) {
      const params = request.params as any;
      if (!params.from || !params.to) {
        return { valid: false, error: 'flight requires from and to locations' };
      }
      if (!params.departDate) {
        return { valid: false, error: 'flight requires departure date' };
      }
    }

    return { valid: true };
  }
}

export function createBookingPlanner(): BookingPlanner {
  return new BookingPlanner();
}
