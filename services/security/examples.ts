/**
 * Security Integration Examples
 * Complete workflows showing 2FA, token vault, permissions, rate limiting
 */

import { globalTokenVault } from './tokenVault';
import { globalTwoFactorAuth } from './twoFactorAuth';
import { globalPermissionControl } from './permissionControl';
import { globalRateLimiter } from './rateLimiter';

/**
 * Example 1: User Registration with 2FA Setup
 */
export async function example1_UserRegistrationWith2FA() {
  const userId = 'alice@example.com';

  // 1. Initialize user with editor role
  const perms = await globalPermissionControl.initializeUser(userId, 'editor');
  console.log(`✓ User initialized with permissions:`, perms.permissions);

  // 2. Setup TOTP 2FA
  const setupResult = await globalTwoFactorAuth.setupTwoFactor(userId, 'totp');
  console.log(`✓ 2FA setup (scan QR code):`, setupResult.qrCode);
  console.log(`  Backup codes:`, setupResult.backupCodes);

  // 3. User enters code from authenticator app
  const userProvidedCode = '123456'; // Mock
  const verified = await globalTwoFactorAuth.verifySetup(userId, userProvidedCode);
  console.log(`✓ 2FA verified:`, verified);

  // 4. Verify 2FA is now enabled
  const has2FA = await globalTwoFactorAuth.isTwoFactorEnabled(userId);
  console.log(`✓ 2FA enabled:`, has2FA);
}

/**
 * Example 2: Secure Action Execution with 2FA Challenge
 */
export async function example2_SecureActionWith2FA() {
  const userId = 'alice@example.com';
  const action = 'send_email';

  // 1. Check if action requires 2FA
  const needs2FA = await globalPermissionControl.requires2FA(userId, 'send');
  console.log(`✓ Action '${action}' requires 2FA:`, needs2FA);

  // 2. Create 2FA challenge
  const challenge = await globalTwoFactorAuth.createChallenge(userId, action);
  console.log(`✓ Challenge created:`, challenge.challengeId);
  console.log(`  Code sent to user: ${challenge.code}`);
  console.log(`  Expires in: ${(challenge.expiresAt.getTime() - Date.now()) / 1000}s`);

  // 3. User receives code and enters it
  const userCode = challenge.code!; // In reality: user types it in
  const valid = await globalTwoFactorAuth.verifyChallenge(challenge.challengeId, userCode);
  console.log(`✓ Challenge verified:`, valid);

  // 4. Proceed with action
  if (valid) {
    console.log(`✓ Permission granted to execute ${action}`);
  }
}

/**
 * Example 3: Token Management & OAuth Flow
 */
export async function example3_TokenManagement() {
  const userId = 'bob@example.com';

  // 1. Store OAuth token after user authorizes
  await globalTokenVault.storeToken(
    userId,
    'google',
    'ya29.a0AfH6SMBx...', // Access token
    '1//0gF2_o5wD...', // Refresh token
    3600 // expires in 1 hour
  );
  console.log(`✓ Gmail token stored securely`);

  // 2. Retrieve token when needed
  const token = await globalTokenVault.getToken(userId, 'google');
  console.log(`✓ Token retrieved (encrypted):`, token?.substring(0, 20) + '...');

  // 3. Check if token is still valid
  const isValid = await globalTokenVault.isTokenValid(userId, 'google');
  console.log(`✓ Token is valid:`, isValid);

  // 4. Get refresh token for renewal
  const refreshToken = await globalTokenVault.getRefreshToken(userId, 'google');
  console.log(`✓ Refresh token available:`, !!refreshToken);

  // 5. Revoke all tokens (logout)
  await globalTokenVault.revokeAllTokens(userId);
  console.log(`✓ All tokens revoked (user logged out)`);
}

/**
 * Example 4: Rate Limiting for Mail Agent
 */
export async function example4_RateLimiting() {
  const userId = 'charlie@example.com';

  // 1. Configure rate limits
  await globalRateLimiter.configureLimit({
    userId,
    action: 'send_email',
    maxRequests: 50, // 50 per window
    windowSizeSeconds: 3600, // 1 hour
    quotaPerDay: 500, // 500 total per day
  });
  console.log(`✓ Rate limit configured: 50/hour, 500/day`);

  // 2. Check if request is allowed
  let allowed = await globalRateLimiter.isRequestAllowed(userId, 'send_email');
  console.log(`✓ First request allowed:`, allowed);

  // 3. Simulate 50 requests to hit limit
  for (let i = 0; i < 50; i++) {
    await globalRateLimiter.logRequest(userId, 'send_email', true);
  }
  console.log(`✓ Logged 50 requests`);

  // 4. Check limit
  allowed = await globalRateLimiter.isRequestAllowed(userId, 'send_email');
  console.log(`✓ 51st request allowed:`, allowed); // Should be false

  // 5. Check remaining quota
  const remaining = await globalRateLimiter.getRemainingRequests(userId, 'send_email');
  console.log(`✓ Remaining requests this hour:`, remaining);

  // 6. Get statistics
  const stats = await globalRateLimiter.getStats(userId, 'send_email');
  console.log(`✓ Stats:`, {
    requestsThisHour: stats.requestsThisHour,
    requestsToday: stats.requestsToday,
    limit: stats.limit.maxRequests,
  });
}

/**
 * Example 5: Permission Control & Role-Based Access
 */
export async function example5_RoleBasedAccess() {
  // 1. Create users with different roles
  const viewer = 'viewer@example.com';
  const editor = 'editor@example.com';
  const admin = 'admin@example.com';

  await globalPermissionControl.initializeUser(viewer, 'viewer');
  await globalPermissionControl.initializeUser(editor, 'editor');
  await globalPermissionControl.initializeUser(admin, 'admin');

  // 2. Check what each role can do
  console.log(`✓ Viewer can read:`, await globalPermissionControl.canPerformAction(viewer, 'read'));
  console.log(`  Viewer can send:`, await globalPermissionControl.canPerformAction(viewer, 'send')); // false

  console.log(`✓ Editor can read:`, await globalPermissionControl.canPerformAction(editor, 'read'));
  console.log(`  Editor can send:`, await globalPermissionControl.canPerformAction(editor, 'send')); // true
  console.log(`  Editor requires approval for send:`, await globalPermissionControl.requiresApproval(editor, 'send')); // true

  console.log(`✓ Admin can delete:`, await globalPermissionControl.canPerformAction(admin, 'delete'));
  console.log(`  Admin requires 2FA for delete:`, await globalPermissionControl.requires2FA(admin, 'delete')); // true

  // 3. Audit an action
  await globalPermissionControl.auditAction(editor, 'send', 'email-thread-123', true, {
    recipients: ['john@example.com'],
    subject: 'Project Update',
    aiGenerated: true,
  });
  console.log(`✓ Action audited`);

  // 4. Get action history
  const history = await globalPermissionControl.getActionHistory(editor, 10);
  console.log(`✓ User action history:`, history.length, 'actions');
  if (history.length > 0) {
    console.log(`  Latest:`, {
      action: history[0].action,
      resource: history[0].resource,
      approved: history[0].approved,
      timestamp: history[0].timestamp,
    });
  }
}

/**
 * Example 6: Complete Secure Mail Agent Workflow
 */
export async function example6_MailAgentSecureWorkflow() {
  const userId = 'dave@example.com';

  // Setup user
  await globalPermissionControl.initializeUser(userId, 'editor');
  await globalTwoFactorAuth.setupTwoFactor(userId, 'totp');
  await globalTwoFactorAuth.verifySetup(userId, '123456');

  console.log(`\n✓ User setup complete`);

  // Simulate Mail Agent workflow
  console.log(`\n--- Mail Agent Workflow ---`);

  // 1. Plan creation (no approval needed)
  const canPlan = await globalPermissionControl.canPerformAction(userId, 'create');
  console.log(`1. Can create plan: ${canPlan}`);
  if (canPlan) {
    await globalPermissionControl.auditAction(userId, 'create', 'plan-001', true);
    console.log(`   ✓ Plan created and audited`);
  }

  // 2. Read emails (no approval needed)
  const canRead = await globalPermissionControl.canPerformAction(userId, 'read');
  console.log(`2. Can read emails: ${canRead}`);
  if (canRead) {
    await globalRateLimiter.configureLimit({
      userId,
      action: 'read_emails',
      maxRequests: 100,
      windowSizeSeconds: 3600,
    });
    const allowed = await globalRateLimiter.isRequestAllowed(userId, 'read_emails');
    if (allowed) {
      await globalRateLimiter.logRequest(userId, 'read_emails', true);
      await globalPermissionControl.auditAction(userId, 'read', 'emails', true, {
        threadCount: 5,
      });
      console.log(`   ✓ Read 5 emails, rate limit ok`);
    }
  }

  // 3. Generate summaries (no approval needed)
  console.log(`3. Can generate summaries: true`);
  await globalPermissionControl.auditAction(userId, 'create', 'summaries', true, {
    summaryCount: 5,
  });
  console.log(`   ✓ Generated 5 summaries`);

  // 4. Send emails (requires approval + 2FA)
  const canSend = await globalPermissionControl.canPerformAction(userId, 'send');
  const requiresApproval = await globalPermissionControl.requiresApproval(userId, 'send');
  const needs2FA = await globalPermissionControl.requires2FA(userId, 'send');

  console.log(`4. Can send: ${canSend}, requires approval: ${requiresApproval}, needs 2FA: ${needs2FA}`);

  if (canSend && needs2FA) {
    // Create 2FA challenge
    const challenge = await globalTwoFactorAuth.createChallenge(userId, 'send_email');
    console.log(`   ✓ 2FA challenge created: ${challenge.challengeId}`);

    // Verify challenge
    const verified = await globalTwoFactorAuth.verifyChallenge(challenge.challengeId, challenge.code!);
    if (verified) {
      // Check rate limit
      await globalRateLimiter.configureLimit({
        userId,
        action: 'send_email',
        maxRequests: 50,
        windowSizeSeconds: 3600,
        quotaPerDay: 500,
      });

      const allowed = await globalRateLimiter.isRequestAllowed(userId, 'send_email');
      if (allowed) {
        await globalRateLimiter.logRequest(userId, 'send_email', true);
        await globalPermissionControl.auditAction(userId, 'send', 'emails', true, {
          emailCount: 1,
          recipients: ['john@example.com'],
        });
        console.log(`   ✓ 2FA verified, sent email`);
      }
    }
  }

  console.log(`\n✓ Complete workflow executed securely`);
}

// Run examples
console.log('\n=== Security Integration Examples ===\n');

example1_UserRegistrationWith2FA().then(() => console.log(''));
example2_SecureActionWith2FA().then(() => console.log(''));
example3_TokenManagement().then(() => console.log(''));
example4_RateLimiting().then(() => console.log(''));
example5_RoleBasedAccess().then(() => console.log(''));
example6_MailAgentSecureWorkflow().then(() => console.log(''));
