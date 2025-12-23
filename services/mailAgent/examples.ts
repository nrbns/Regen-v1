/**
 * Mail Agent Integration Example
 * Demonstrates end-to-end usage of the Mail Agent system
 */

import { AgentPlanner } from './agentPlanner';
import { AgentExecutor } from './executor';
import { AuditLogger } from './auditLog';
import type { ApprovalRequest } from './executor';

/**
 * Example 1: Simple Read & Summarize
 * Low risk, auto-executes without approval
 */
export async function example1_ReadAndSummarize(userId: string): Promise<void> {
  console.log('\n=== Example 1: Read & Summarize ===');

  const planner = new AgentPlanner();
  const executor = new AgentExecutor();

  // Create plan from intent
  const plan = planner.createPlan(userId, 'summarize my unread emails');
  console.log(`Created plan: ${plan.id} with ${plan.tasks.length} tasks`);

  // Auto-approve handler (for low-risk tasks)
  const autoApprove = async () => true;

  // Execute
  const context = await executor.execute(userId, plan, autoApprove);

  console.log(`Execution complete:`);
  console.log(`- Threads read: ${context.threads.length}`);
  console.log(`- Summaries created: ${context.summaries.length}`);
}

/**
 * Example 2: Draft Reply with Approval
 * Medium risk, requires user approval before drafting
 */
export async function example2_DraftReply(userId: string): Promise<void> {
  console.log('\n=== Example 2: Draft Reply with Approval ===');

  const planner = new AgentPlanner();
  const executor = new AgentExecutor();

  // Create plan
  const plan = planner.createPlan(userId, 'draft reply to latest email');
  console.log(`Created plan: ${plan.id}`);
  console.log(`Risk level: ${plan.estimatedRiskLevel}`);
  console.log(`Requires approval: ${plan.requiresApproval}`);

  // Custom approval handler (shows preview)
  const approvalHandler = async (req: ApprovalRequest) => {
    console.log(`\nApproval requested for: ${req.taskType}`);
    console.log(`Preview:`, JSON.stringify(req.preview, null, 2));

    // In real UI, show modal and wait for user action
    // For demo, auto-approve
    return true;
  };

  // Execute with approval gates
  const context = await executor.execute(userId, plan, approvalHandler);

  console.log(`Execution complete:`);
  console.log(`- Drafts created: ${context.drafts.length}`);

  if (context.drafts.length > 0) {
    console.log(`\nDraft preview:`);
    console.log(`To: ${context.drafts[0].to}`);
    console.log(`Subject: ${context.drafts[0].subject}`);
    console.log(`Body: ${context.drafts[0].body.substring(0, 100)}...`);
  }
}

/**
 * Example 3: Send Email (High Risk)
 * Requires explicit user approval before sending
 */
export async function example3_SendEmail(userId: string): Promise<void> {
  console.log('\n=== Example 3: Send Email (High Risk) ===');

  const planner = new AgentPlanner();
  const executor = new AgentExecutor();

  // Create high-risk plan
  const plan = planner.createPlan(userId, 'reply to email and send immediately');
  console.log(`Created plan: ${plan.id}`);
  console.log(`Risk level: ${plan.estimatedRiskLevel}`);

  // Approval handler with confirmation
  const approvalHandler = async (req: ApprovalRequest) => {
    console.log(`\n⚠️  HIGH RISK ACTION: ${req.taskType}`);
    console.log(`Preview:`, JSON.stringify(req.preview, null, 2));

    // In production: show 2FA modal
    console.log(`Would show 2FA confirmation here...`);

    // For demo: reject high-risk actions
    return false; // User rejected
  };

  // Execute (will stop at rejection)
  const context = await executor.execute(userId, plan, approvalHandler);

  console.log(`Execution complete:`);
  console.log(`- Drafts created: ${context.drafts.length}`);
  console.log(`- Sent: ${context.results['sent'] || false}`);
}

/**
 * Example 4: Audit Trail Query
 * Demonstrates querying the audit log
 */
export async function example4_AuditTrail(userId: string): Promise<void> {
  console.log('\n=== Example 4: Audit Trail ===');

  const logger = new AuditLogger();

  // Run a simple action to generate logs
  const planner = new AgentPlanner();
  const executor = new AgentExecutor();
  const plan = planner.createPlan(userId, 'read emails');

  await executor.execute(userId, plan, async () => true);

  // Query audit trail
  const trail = await logger.getFullTrail(plan.id);
  console.log(`\nAudit trail for plan ${plan.id}:`);

  for (const entry of trail) {
    console.log(`[${entry.timestamp.toISOString()}] ${entry.action} - ${entry.status}`);
  }

  // Get user stats
  const stats = await logger.getUserStats(userId);
  console.log(`\nUser stats:`);
  console.log(`- Total actions: ${stats.totalActions}`);
  console.log(`- Successes: ${stats.successCount}`);
  console.log(`- Failures: ${stats.failureCount}`);
  console.log(`- Rejections: ${stats.rejectionCount}`);
  console.log(`- Last action: ${stats.lastAction?.toISOString()}`);
}

/**
 * Example 5: Multiple Intents
 * Batch processing multiple user intents
 */
export async function example5_BatchProcessing(userId: string): Promise<void> {
  console.log('\n=== Example 5: Batch Processing ===');

  const planner = new AgentPlanner();
  const executor = new AgentExecutor();

  const intents = [
    'read my unread emails',
    'summarize emails from this week',
    'draft reply to the latest email',
  ];

  for (const intent of intents) {
    console.log(`\nProcessing: "${intent}"`);

    const plan = planner.createPlan(userId, intent);
    await executor.execute(userId, plan, async () => true);

    console.log(`✓ Completed with ${plan.tasks.length} tasks`);
  }
}

/**
 * Main demo runner
 */
export async function runAllExamples(): Promise<void> {
  const userId = 'demo-user@example.com';

  console.log('╔════════════════════════════════════════╗');
  console.log('║   Mail Agent Integration Examples     ║');
  console.log('╚════════════════════════════════════════╝');

  try {
    await example1_ReadAndSummarize(userId);
    await example2_DraftReply(userId);
    await example3_SendEmail(userId);
    await example4_AuditTrail(userId);
    await example5_BatchProcessing(userId);

    console.log('\n✓ All examples completed successfully!\n');
  } catch (error) {
    console.error('\n✗ Example failed:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}
