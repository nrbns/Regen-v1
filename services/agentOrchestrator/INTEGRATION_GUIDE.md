# Agent Integration Guide - Week 1 Day 5

## Overview

This guide shows how to integrate existing agents (mail, ppt, booking) with the new orchestrator system.

## Integration Pattern

Each agent needs to implement a simple interface:

```typescript
interface AgentHandler {
  execute(action: string, parameters: Record<string, any>): Promise<any>;
}
```

## Example: Mail Agent Integration

### 1. Create Agent Wrapper

```typescript
// services/agentOrchestrator/agents/mailAgent.ts
import { mailService } from '../../mailAgent';

export class MailAgentHandler {
  async execute(action: string, parameters: any): Promise<any> {
    switch (action) {
      case 'compose_email':
        return await this.composeEmail(parameters);
      
      case 'send_email':
        return await this.sendEmail(parameters);
      
      case 'search_emails':
        return await this.searchEmails(parameters);
      
      case 'summarize':
        return await this.summarizeEmails(parameters);
      
      default:
        throw new Error(`Unknown mail action: ${action}`);
    }
  }

  private async composeEmail(params: any) {
    const { to, subject, body } = params;
    
    // Use existing mail service
    const draft = await mailService.createDraft({
      to,
      subject,
      body,
    });

    return {
      draftId: draft.id,
      preview: draft.preview,
    };
  }

  private async sendEmail(params: any) {
    const { draftId, to, subject, body } = params;

    if (draftId) {
      // Send existing draft
      const result = await mailService.sendDraft(draftId);
      return result;
    } else {
      // Send directly
      const result = await mailService.send({ to, subject, body });
      return result;
    }
  }

  private async searchEmails(params: any) {
    const { query, limit = 10 } = params;
    return await mailService.search(query, limit);
  }

  private async summarizeEmails(params: any) {
    const { emails } = params;
    return await mailService.summarize(emails);
  }
}
```

### 2. Register Agent with Executor

```typescript
// server/orchestrator-setup.ts
import { getTaskExecutor } from '../services/agentOrchestrator/executor';
import { MailAgentHandler } from '../services/agentOrchestrator/agents/mailAgent';
import { PPTAgentHandler } from '../services/agentOrchestrator/agents/pptAgent';
import { BookingAgentHandler } from '../services/agentOrchestrator/agents/bookingAgent';

export function setupAgents() {
  const executor = getTaskExecutor();

  // Register all agents
  executor.registerAgent('mail', new MailAgentHandler());
  executor.registerAgent('ppt', new PPTAgentHandler());
  executor.registerAgent('booking', new BookingAgentHandler());
  
  console.log('[Orchestrator] All agents registered');
}
```

### 3. Use in Server

```typescript
// server/redix-server.js
import { setupAgents } from './orchestrator-setup';
import orchestratorRouter from './routes/orchestrator';

// ... existing setup

// Setup orchestrator
setupAgents();

// Mount orchestrator routes
app.use('/api', orchestratorRouter);

// ... rest of server
```

## Example: PPT Agent Integration

```typescript
// services/agentOrchestrator/agents/pptAgent.ts
import { pptService } from '../../pptAgent';

export class PPTAgentHandler {
  async execute(action: string, parameters: any): Promise<any> {
    switch (action) {
      case 'gather_content':
        return await this.gatherContent(parameters);
      
      case 'generate_outline':
        return await this.generateOutline(parameters);
      
      case 'create_slides':
        return await this.createSlides(parameters);
      
      default:
        throw new Error(`Unknown ppt action: ${action}`);
    }
  }

  private async gatherContent(params: any) {
    const { topic } = params;
    // Use research service to gather content
    const content = await pptService.researchTopic(topic);
    return { content, topic };
  }

  private async generateOutline(params: any) {
    const { content } = params;
    const outline = await pptService.generateOutline(content);
    return { outline, sections: outline.sections.length };
  }

  private async createSlides(params: any) {
    const { outline } = params;
    const presentation = await pptService.createPresentation(outline);
    return {
      presentationId: presentation.id,
      slides: presentation.slides.length,
      url: presentation.url,
    };
  }
}
```

## Example: Booking Agent Integration

```typescript
// services/agentOrchestrator/agents/bookingAgent.ts
import { bookingService } from '../../bookingAgent';

export class BookingAgentHandler {
  async execute(action: string, parameters: any): Promise<any> {
    switch (action) {
      case 'search_options':
        return await this.searchOptions(parameters);
      
      case 'compare_and_select':
        return await this.compareOptions(parameters);
      
      case 'complete_booking':
        return await this.completeBooking(parameters);
      
      default:
        throw new Error(`Unknown booking action: ${action}`);
    }
  }

  private async searchOptions(params: any) {
    const { type, destination, dates } = params;
    
    if (type === 'flight') {
      return await bookingService.searchFlights(destination, dates);
    } else if (type === 'hotel') {
      return await bookingService.searchHotels(destination, dates);
    }
    
    throw new Error(`Unknown booking type: ${type}`);
  }

  private async compareOptions(params: any) {
    const { options } = params;
    
    // Use AI to compare and select best option
    const comparison = await bookingService.compareOptions(options);
    return {
      recommended: comparison.best,
      reasoning: comparison.reasoning,
    };
  }

  private async completeBooking(params: any) {
    const { selection, paymentInfo } = params;
    
    // This is HIGH RISK - should always require approval
    const booking = await bookingService.book(selection, paymentInfo);
    return {
      bookingId: booking.id,
      confirmationNumber: booking.confirmationNumber,
      cost: booking.totalCost,
    };
  }
}
```

## Testing Integration

```typescript
// tests/agents/mailAgent.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getTaskExecutor } from '../../services/agentOrchestrator/executor';
import { MailAgentHandler } from '../../services/agentOrchestrator/agents/mailAgent';

describe('Mail Agent Integration', () => {
  let executor;

  beforeEach(() => {
    executor = getTaskExecutor();
    executor.registerAgent('mail', new MailAgentHandler());
  });

  it('should execute email composition', async () => {
    const plan = {
      planId: 'test_plan',
      userId: 'user123',
      intent: {},
      tasks: [
        {
          id: 'task_1',
          agentType: 'mail',
          action: 'compose_email',
          parameters: {
            to: 'test@example.com',
            subject: 'Test',
            body: 'Hello',
          },
          dependencies: [],
          estimatedDuration: 3,
          retryable: true,
          criticalPath: true,
        },
      ],
      totalEstimatedDuration: 3,
      riskLevel: 'medium',
      requiresApproval: true,
      createdAt: new Date(),
    };

    const result = await executor.executePlan(plan);
    
    expect(result.status).toBe('completed');
    expect(result.taskResults[0].output.draftId).toBeDefined();
  });
});
```

## Full Example: End-to-End Flow

```typescript
// example-usage.ts
import express from 'express';
import { getIntentRouter, getTaskPlanner, getTaskExecutor } from './services/agentOrchestrator';
import { MailAgentHandler } from './services/agentOrchestrator/agents/mailAgent';

const app = express();
app.use(express.json());

// Setup
const router = getIntentRouter();
const planner = getTaskPlanner();
const executor = getTaskExecutor();
executor.registerAgent('mail', new MailAgentHandler());

app.post('/api/execute', async (req, res) => {
  try {
    const { input, userId } = req.body;

    // 1. Classify
    const intent = await router.classify(input);

    // 2. Plan
    const plan = await planner.createPlan(intent, userId);

    // 3. Validate
    const validation = planner.validatePlan(plan);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors });
    }

    // 4. Check if approval required
    if (plan.requiresApproval) {
      // Store plan and return for approval
      return res.json({
        requiresApproval: true,
        plan,
        message: 'Plan requires user approval',
      });
    }

    // 5. Execute (low-risk only)
    const result = await executor.executePlan(plan);

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Orchestrator API running on :3000');
});
```

## Migration Checklist

### Day 5 Tasks

- [ ] **Mail Agent**
  - [ ] Create MailAgentHandler wrapper
  - [ ] Map actions to existing mail service
  - [ ] Write integration tests
  - [ ] Register with executor

- [ ] **PPT Agent**
  - [ ] Create PPTAgentHandler wrapper
  - [ ] Integrate with existing ppt service
  - [ ] Write integration tests
  - [ ] Register with executor

- [ ] **Booking Agent**
  - [ ] Create BookingAgentHandler wrapper
  - [ ] Integrate with booking service
  - [ ] Add high-risk markers
  - [ ] Write integration tests
  - [ ] Register with executor

- [ ] **Research Agent**
  - [ ] Create ResearchAgentHandler wrapper
  - [ ] Integrate with search service
  - [ ] Write integration tests
  - [ ] Register with executor

- [ ] **Trading Agent**
  - [ ] Create TradingAgentHandler wrapper
  - [ ] Add security controls (2FA)
  - [ ] Write integration tests
  - [ ] Register with executor

### Frontend Integration

- [ ] Import ApprovalPanel component
- [ ] Wire up to orchestrator API
- [ ] Add WebSocket for real-time updates
- [ ] Handle approval/rejection flows
- [ ] Add loading states
- [ ] Error handling

### Backend Integration

- [ ] Setup orchestrator routes
- [ ] Register all agent handlers
- [ ] Configure rate limiting
- [ ] Setup Sentry error tracking
- [ ] Add monitoring dashboards
- [ ] Deploy to staging

## Performance Tips

1. **Lazy Load Agents:** Only initialize agents when first used
2. **Connection Pooling:** Reuse API connections across tasks
3. **Caching:** Cache intent classifications for repeat queries
4. **Parallel Execution:** Execute independent tasks concurrently
5. **Timeouts:** Set aggressive timeouts to prevent hanging

## Security Considerations

1. **Token Vault:** Always use token vault for credentials
2. **2FA:** Require 2FA for high-risk operations (booking, trading)
3. **Rate Limiting:** Enforce per-user rate limits
4. **Audit Logging:** Log all actions for compliance
5. **Input Validation:** Sanitize all user inputs

## Next Steps

Once all agents are integrated:
1. Run full integration tests
2. Deploy to staging
3. Invite 5 internal testers
4. Fix bugs
5. Deploy to production
6. Week 4 alpha launch! 🚀

---

*Integration Guide - Week 1 Day 5*
*Ready for production integration*
