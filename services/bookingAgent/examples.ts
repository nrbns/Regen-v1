/**
 * Booking Agent Integration Examples
 */

import { IntentParser } from './intentParser';
import { BookingPlanner } from './bookingPlanner';
import { BookingExecutor } from './bookingExecutor';
import type { FlightOption } from './types';

/**
 * Example 1: Simple Flight Search
 */
export async function example1_FlightSearch(): Promise<void> {
  console.log('\n=== Example 1: Flight Search ===');

  const parser = new IntentParser();
  const planner = new BookingPlanner();
  const executor = new BookingExecutor();

  // Parse intent
  const request = await parser.parseIntent(
    'demo-user',
    'Find me a flight from San Francisco to New York on December 20th'
  );

  console.log('Parsed request:', request);

  // Create plan
  const plan = planner.createPlan(request);
  console.log(`Plan created with ${plan.tasks.length} tasks`);

  // Execute with mock approval
  const approvalHandler = async (req: any) => {
    console.log(`\nApproval requested: ${req.taskType}`);
    console.log(`Options: ${req.options.length}`);

    // Auto-select cheapest option
    const cheapest = req.options.sort(
      (a: FlightOption, b: FlightOption) => a.price.amount - b.price.amount
    )[0];

    console.log(`Selected: ${cheapest.airline} - $${cheapest.price.amount}`);
    return cheapest;
  };

  const context = await executor.execute('demo-user', plan, approvalHandler);

  console.log('\nExecution complete:');
  console.log(`- Search results: ${context.searchResults.length}`);
  console.log(`- Filtered options: ${context.filteredOptions.length}`);
  console.log(
    `- Selected: ${context.selectedOption?.airline} ${context.selectedOption?.flightNumber}`
  );
  console.log(`- Confirmation: ${context.bookingConfirmation?.confirmationCode}`);
}

/**
 * Example 2: Flight with Filters
 */
export async function example2_FlightWithFilters(): Promise<void> {
  console.log('\n=== Example 2: Flight with Filters ===');

  const parser = new IntentParser();
  const planner = new BookingPlanner();

  const request = await parser.parseIntent(
    'demo-user',
    'Book a nonstop flight from LAX to JFK under $400 departing next Friday morning'
  );

  const plan = planner.createPlan(request);

  console.log(`Intent: ${request.intent}`);
  console.log(`Booking type: ${request.type}`);
  console.log(`Tasks: ${plan.tasks.map(t => t.type).join(' → ')}`);
  console.log(`Estimated time: ${plan.estimatedTime}s`);
}

/**
 * Example 3: Batch Searches
 */
export async function example3_BatchSearches(): Promise<void> {
  console.log('\n=== Example 3: Batch Searches ===');

  const parser = new IntentParser();
  const planner = new BookingPlanner();

  const intents = [
    'Flight from Boston to Miami tomorrow',
    'Hotel in Paris for 3 nights starting December 25th',
    'Rent a car in Rome from January 5 to January 12',
  ];

  for (const intent of intents) {
    const request = await parser.parseIntent('demo-user', intent);
    const plan = planner.createPlan(request);

    console.log(`\n"${intent}"`);
    console.log(`  Type: ${request.type}`);
    console.log(`  Tasks: ${plan.tasks.length}`);
    console.log(`  Est. time: ${plan.estimatedTime}s`);
  }
}

/**
 * Main runner
 */
export async function runBookingExamples(): Promise<void> {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   Booking Agent Examples              ║');
  console.log('╚════════════════════════════════════════╝');

  await example1_FlightSearch();
  await example2_FlightWithFilters();
  await example3_BatchSearches();

  console.log('\n✓ All examples completed!\n');
}

if (require.main === module) {
  runBookingExamples();
}
