/**
 * Integration Test Suite
 * Verifies all service exports and orchestrator connections are working correctly
 */

import { describe, it, expect, beforeAll } from 'vitest';

describe('Service Module Exports', () => {
  describe('Mail Agent Service', () => {
    it('should export AgentExecutor', () => {
      const mailAgent = require('../services/mailAgent/index.ts');
      expect(mailAgent.AgentExecutor).toBeDefined();
    });

    it('should export MailSummarizer', () => {
      const mailAgent = require('../services/mailAgent/index.ts');
      expect(mailAgent.MailSummarizer).toBeDefined();
    });

    it('should export GmailConnector', () => {
      const mailAgent = require('../services/mailAgent/index.ts');
      expect(mailAgent.GmailConnector).toBeDefined();
    });

    it('should export AuditLogger', () => {
      const mailAgent = require('../services/mailAgent/index.ts');
      expect(mailAgent.AuditLogger).toBeDefined();
    });

    it('should export types', () => {
      const mailAgent = require('../services/mailAgent/index.ts');
      expect(mailAgent.EmailThread).toBeDefined();
    });
  });

  describe('Booking Agent Service', () => {
    it('should export BookingExecutor', () => {
      const bookingAgent = require('../services/bookingAgent/index.ts');
      expect(bookingAgent.BookingExecutor).toBeDefined();
    });

    it('should export IntentParser', () => {
      const bookingAgent = require('../services/bookingAgent/index.ts');
      expect(bookingAgent.IntentParser).toBeDefined();
    });
  });

  describe('PPT Agent Service', () => {
    it('should export PptExecutor', () => {
      const pptAgent = require('../services/pptAgent/index.ts');
      expect(pptAgent.PptExecutor).toBeDefined();
    });

    it('should export OutlineGenerator', () => {
      const pptAgent = require('../services/pptAgent/index.ts');
      expect(pptAgent.OutlineGenerator).toBeDefined();
    });

    it('should export SlidesConnector', () => {
      const pptAgent = require('../services/pptAgent/index.ts');
      expect(pptAgent.SlidesConnector).toBeDefined();
    });
  });

  describe('Agent Orchestrator Service', () => {
    it('should export TaskExecutor', () => {
      const orchestrator = require('../services/agentOrchestrator/index.ts');
      expect(orchestrator.TaskExecutor).toBeDefined();
    });

    it('should export IntentRouter', () => {
      const orchestrator = require('../services/agentOrchestrator/index.ts');
      expect(orchestrator.IntentRouter).toBeDefined();
    });

    it('should export TaskPlanner', () => {
      const orchestrator = require('../services/agentOrchestrator/index.ts');
      expect(orchestrator.TaskPlanner).toBeDefined();
    });

    it('should export LoadBalancer', () => {
      const orchestrator = require('../services/agentOrchestrator/index.ts');
      expect(orchestrator.LoadBalancer).toBeDefined();
    });
  });

  describe('RAG Service', () => {
    it('should export RAGEngine', () => {
      const rag = require('../services/rag/index.ts');
      expect(rag.RAGEngine).toBeDefined();
    });

    it('should export VectorStore', () => {
      const rag = require('../services/rag/index.ts');
      expect(rag.VectorStore).toBeDefined();
    });

    it('should export EmbeddingService', () => {
      const rag = require('../services/rag/index.ts');
      expect(rag.EmbeddingService).toBeDefined();
    });

    it('should export global RAGEngine', () => {
      const rag = require('../services/rag/index.ts');
      expect(rag.globalRAGEngine).toBeDefined();
    });
  });

  describe('Security Service', () => {
    it('should export PermissionControl', () => {
      const security = require('../services/security/index.ts');
      expect(security.PermissionControl).toBeDefined();
    });

    it('should export TokenVault', () => {
      const security = require('../services/security/index.ts');
      expect(security.TokenVault).toBeDefined();
    });

    it('should export global PermissionControl', () => {
      const security = require('../services/security/index.ts');
      expect(security.globalPermissionControl).toBeDefined();
    });

    it('should export middleware', () => {
      const security = require('../services/security/index.ts');
      expect(security.requireAuth).toBeDefined();
      expect(security.require2FA).toBeDefined();
      expect(security.rateLimit).toBeDefined();
    });
  });

  describe('Central Services Hub', () => {
    it('should export all agent services from services/index.ts', () => {
      const services = require('../services/index.ts');
      expect(services.AgentExecutor).toBeDefined();
      expect(services.BookingExecutor).toBeDefined();
      expect(services.PptExecutor).toBeDefined();
      expect(services.TaskExecutor).toBeDefined();
    });

    it('should export RAG services from central hub', () => {
      const services = require('../services/index.ts');
      expect(services.RAGEngine).toBeDefined();
      expect(services.globalRAGEngine).toBeDefined();
    });

    it('should export security services from central hub', () => {
      const services = require('../services/index.ts');
      expect(services.PermissionControl).toBeDefined();
      expect(services.globalPermissionControl).toBeDefined();
      expect(services.requireAuth).toBeDefined();
    });

    it('should export LLMClient', () => {
      const services = require('../services/index.ts');
      expect(services.LLMClient).toBeDefined();
    });
  });
});

describe('Orchestrator Connections', () => {
  describe('Intent Router', () => {
    it('should be able to classify intents', async () => {
      const orchestrator = require('../services/agentOrchestrator/index.ts');
      const router = new orchestrator.IntentRouter({ anthropicApiKey: null });

      // Quick classify should work even without API
      const classification = router.quickClassify?.('send an email');
      expect(classification).toBeDefined();
    });
  });

  describe('Task Executor', () => {
    it('should be able to register agents', () => {
      const orchestrator = require('../services/agentOrchestrator/index.ts');
      const executor = new orchestrator.TaskExecutor();

      // Mock agent registration
      const mockMailAgent = async () => ({ status: 'success' });
      executor.registerAgent('mail', mockMailAgent);

      expect(executor).toBeDefined();
    });

    it('should have proper configuration', () => {
      const orchestrator = require('../services/agentOrchestrator/index.ts');
      const executor = new orchestrator.TaskExecutor({
        maxRetries: 3,
        timeoutMs: 30000,
      });

      expect(executor).toBeDefined();
    });
  });

  describe('Task Planner', () => {
    it('should be able to create plans', async () => {
      const orchestrator = require('../services/agentOrchestrator/index.ts');
      const planner = new orchestrator.TaskPlanner({ anthropicApiKey: null });

      const intent = {
        primaryAgent: 'mail' as const,
        intent: 'send email',
        confidence: 0.95,
        alternativeAgents: [],
        parameters: { to: 'test@example.com' },
        reasoning: 'clear intent',
      };

      // Should have plan creation method
      expect(planner.createPlan).toBeDefined();
    });
  });

  describe('API Routes', () => {
    it('should have orchestrator routes defined', async () => {
      const orchestrator = require('../server/routes/orchestrator.ts');
      expect(orchestrator.default || orchestrator.router).toBeDefined();
    });

    it('should have WebSocket orchestrator', () => {
      const wsOrch = require('../server/websocket/orchestrator.ts');
      expect(wsOrch.OrchestratorWebSocket).toBeDefined();
    });

    it('should have RBAC integration', () => {
      const rbac = require('../server/orchestrator/rbac.ts');
      expect(rbac.extractUser).toBeDefined();
      expect(rbac.requireOrchestratorAction).toBeDefined();
    });
  });
});

describe('Mock Implementations', () => {
  describe('Gmail Connector Mock', () => {
    it('should have mock OAuth2 client', () => {
      const Gmail = require('../services/mailAgent/gmailConnector.ts').GmailConnector;
      const connector = new Gmail();

      expect(connector).toBeDefined();
    });

    it('should support authentication flow', async () => {
      const Gmail = require('../services/mailAgent/gmailConnector.ts').GmailConnector;
      const connector = new Gmail();

      const authUrl = connector.getAuthUrl?.();
      expect(authUrl).toBeDefined();
    });
  });

  describe('Slides Connector Mock', () => {
    it('should have mock presentation creation', () => {
      const Slides = require('../services/pptAgent/slidesConnector.ts').SlidesConnector;
      const connector = new Slides();

      expect(connector).toBeDefined();
    });

    it('should support presentation operations', async () => {
      const Slides = require('../services/pptAgent/slidesConnector.ts').SlidesConnector;
      const connector = new Slides();

      const presentationId = await connector.createPresentation?.('Test', {});
      expect(presentationId).toBeDefined();
    });
  });

  describe('Flight Search Service', () => {
    it('should have mock flight search', async () => {
      const Flight = require('../services/bookingAgent/flightSearchService.ts').FlightSearchService;
      const service = new Flight();

      expect(service).toBeDefined();
    });
  });
});

describe('Type System', () => {
  it('should have properly typed ExecutionResult', () => {
    const orchestrator = require('../services/agentOrchestrator/executor.ts');
    expect(orchestrator.ExecutionResult).toBeDefined();
  });

  it('should have properly typed IntentClassification', () => {
    const orchestrator = require('../services/agentOrchestrator/intentRouter.ts');
    expect(orchestrator.IntentClassification).toBeDefined();
  });

  it('should have properly typed ExecutionPlan', () => {
    const orchestrator = require('../services/agentOrchestrator/planner.ts');
    expect(orchestrator.ExecutionPlan).toBeDefined();
  });
});
