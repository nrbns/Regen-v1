/**
 * Production Agent Manager
 * Manages agent sessions, tools, planning, and execution
 */

const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');
const Pino = require('pino');

const logger = Pino({ name: 'agent-manager' });

class AgentManager extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map(); // sessionId -> AgentSession
    this.tools = new Map(); // toolName -> Tool
    this.memory = new Map(); // sessionId -> MemoryStore
    this.registerDefaultTools();
  }

  /**
   * Register default tools
   */
  registerDefaultTools() {
    // Search tool
    this.registerTool({
      name: 'search',
      description: 'Search the web or knowledge base',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          limit: { type: 'number', description: 'Max results', default: 10 },
        },
        required: ['query'],
      },
      execute: async (params, context) => {
        const { getRAGPipeline } = require('../search-engine/rag-pipeline.cjs');
        const pipeline = getRAGPipeline();
        const results = await pipeline.search(params.query, { limit: params.limit || 10 });
        return {
          success: true,
          results: results.results,
          count: results.count,
        };
      },
    });

    // Browser DOM tool
    this.registerTool({
      name: 'browser_dom',
      description: 'Interact with browser DOM elements',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['click', 'type', 'scroll', 'extract', 'navigate', 'wait', 'get_events', 'get_stats'],
            description: 'Action to perform',
          },
          selector: { type: 'string', description: 'CSS selector or description' },
          text: { type: 'string', description: 'Text to type (for type action)' },
          url: { type: 'string', description: 'URL to navigate to' },
          duration: { type: 'number', description: 'Wait duration in ms (for wait action)' },
          direction: { type: 'string', enum: ['up', 'down', 'left', 'right'], description: 'Scroll direction' },
          attribute: { type: 'string', description: 'Attribute to extract (for extract action)' },
          limit: { type: 'number', description: 'Limit for get_events action' },
        },
        required: ['action'],
      },
      execute: async (params, context) => {
        // Browser DOM automation - simplified for now
        // TODO: Integrate with actual browser automation when available
        try {
          const { getBrowserEventBridge } = require('./browser-event-bridge.cjs');
          const eventBridge = getBrowserEventBridge({ sessionId: context.sessionId });
          
          switch (params.action) {
            case 'navigate': {
              if (!params.url) {
                throw new Error('URL required for navigate action');
              }
              eventBridge.recordEvent({ 
                type: 'navigate', 
                url: params.url,
                timestamp: Date.now(),
              });
              this.emit('browser:navigate', { sessionId: context.sessionId, url: params.url });
              return { 
                success: true, 
                message: `Navigation requested to ${params.url}`,
                url: params.url,
              };
            }
            
            case 'click': {
              if (!params.selector) {
                throw new Error('Selector required for click action');
              }
              eventBridge.recordEvent({ 
                type: 'click', 
                selector: params.selector,
                timestamp: Date.now(),
              });
              this.emit('browser:click', { 
                sessionId: context.sessionId, 
                selector: params.selector,
              });
              return { 
                success: true, 
                message: `Click requested on ${params.selector}`,
                selector: params.selector,
              };
            }
            
            case 'type': {
              if (!params.selector || !params.text) {
                throw new Error('Selector and text required for type action');
              }
              eventBridge.recordEvent({ 
                type: 'type', 
                selector: params.selector, 
                text: params.text,
                timestamp: Date.now(),
              });
              this.emit('browser:type', { 
                sessionId: context.sessionId, 
                selector: params.selector,
                text: params.text,
              });
              return { 
                success: true, 
                message: `Type requested into ${params.selector}`,
                selector: params.selector,
                textLength: params.text.length,
              };
            }
            
            case 'scroll': {
              const selector = params.selector || 'window';
              eventBridge.recordEvent({ 
                type: 'scroll', 
                selector,
                direction: params.direction || 'down',
                timestamp: Date.now(),
              });
              this.emit('browser:scroll', { 
                sessionId: context.sessionId, 
                selector,
                direction: params.direction || 'down',
              });
              return { 
                success: true, 
                message: `Scroll requested on ${selector}`,
                selector,
              };
            }
            
            case 'extract': {
              if (!params.selector) {
                throw new Error('Selector required for extract action');
              }
              eventBridge.recordEvent({ 
                type: 'extract', 
                selector: params.selector,
                attribute: params.attribute,
                timestamp: Date.now(),
              });
              this.emit('browser:extract', { 
                sessionId: context.sessionId, 
                selector: params.selector,
                attribute: params.attribute,
              });
              return { 
                success: true, 
                message: `Extraction requested from ${params.selector}`,
                selector: params.selector,
                data: 'Extraction pending frontend execution',
              };
            }
            
            case 'wait': {
              const duration = params.duration || 1000;
              eventBridge.recordEvent({ 
                type: 'wait', 
                duration,
                timestamp: Date.now(),
              });
              await new Promise(resolve => setTimeout(resolve, duration));
              return { 
                success: true, 
                message: `Waited ${duration}ms`,
                duration,
              };
            }
            
            case 'get_events': {
              const limit = params.limit || 10;
              const events = eventBridge.getRecentEvents(limit);
              return {
                success: true,
                events,
                count: events.length,
                message: `Retrieved ${events.length} recent events`,
              };
            }
            
            case 'get_stats': {
              const stats = eventBridge.getEventStats();
              return {
                success: true,
                stats,
                message: 'Event statistics retrieved',
              };
            }
            
            default:
              throw new Error(`Unknown browser action: ${params.action}`);
          }
        } catch (error) {
          // Fallback if browser-event-bridge not available
          logger.warn({ error: error.message }, 'Browser event bridge not available, using fallback');
          return { 
            success: true, 
            message: `Browser action ${params.action} recorded (fallback mode)`,
            action: params.action,
            params,
          };
        }
      },
    });

    // Execute code tool (sandboxed)
    this.registerTool({
      name: 'exec_code',
      description: 'Execute JavaScript code in sandboxed environment',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'JavaScript code to execute' },
          language: { type: 'string', default: 'javascript' },
        },
        required: ['code'],
      },
      execute: async (params, context) => {
        // TODO: Implement proper sandboxed execution
        // For now, return error (safety first)
        throw new Error('Code execution not yet implemented (requires sandbox)');
      },
    });

    // Trade API tool
    this.registerTool({
      name: 'trade_api',
      description: 'Interact with trading API',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['get_price', 'get_orderbook', 'place_order', 'get_orders'],
            description: 'Trading action',
          },
          symbol: { type: 'string', description: 'Trading symbol' },
          side: { type: 'string', enum: ['buy', 'sell'] },
          quantity: { type: 'number' },
          price: { type: 'number' },
        },
        required: ['action'],
      },
      execute: async (params, context) => {
        try {
          const { getOrderManager } = require('../services/trade/order-manager.cjs');
          const { getMarketFeed } = require('../services/trade/market-feed.cjs');
          const orderManager = getOrderManager();
          const marketFeed = getMarketFeed();

          switch (params.action) {
            case 'get_price': {
              if (!params.symbol) {
                throw new Error('Symbol required for get_price');
              }
              const price = marketFeed.getPrice(params.symbol);
              return {
                success: true,
                symbol: params.symbol,
                price: price || null,
                message: price ? `Current price: ${price}` : 'Price not available',
              };
            }

            case 'get_orderbook': {
              if (!params.symbol) {
                throw new Error('Symbol required for get_orderbook');
              }
              const orderbook = marketFeed.getOrderbook(params.symbol);
              return {
                success: true,
                symbol: params.symbol,
                orderbook: orderbook || null,
                message: orderbook ? 'Orderbook retrieved' : 'Orderbook not available',
              };
            }

            case 'place_order': {
              if (!params.symbol || !params.side || !params.quantity) {
                throw new Error('Symbol, side, and quantity required for place_order');
              }
              
              const order = await orderManager.placeOrder({
                symbol: params.symbol,
                side: params.side,
                quantity: params.quantity,
                price: params.price, // Optional for market orders
                type: params.price ? 'limit' : 'market',
                sessionId: context.sessionId,
              });

              return {
                success: true,
                orderId: order.id,
                symbol: order.symbol,
                side: order.side,
                quantity: order.quantity,
                price: order.price,
                status: order.status,
                message: `Order ${order.id} placed successfully`,
              };
            }

            case 'get_orders': {
              const orders = await orderManager.getOrders({
                sessionId: context.sessionId,
                symbol: params.symbol, // Optional filter
              });

              return {
                success: true,
                orders: orders || [],
                count: orders?.length || 0,
                message: `Retrieved ${orders?.length || 0} orders`,
              };
            }

            default:
              throw new Error(`Unknown trade action: ${params.action}`);
          }
        } catch (error) {
          logger.error({ error: error.message, params }, 'Trade API execution failed');
          return {
            success: false,
            error: error.message,
            message: `Trade API error: ${error.message}`,
          };
        }
      },
    });
  }

  /**
   * Register a tool
   */
  registerTool(tool) {
    this.tools.set(tool.name, tool);
    logger.info({ tool: tool.name }, 'Registered tool');
  }

  /**
   * Get available tools
   */
  getTools() {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  /**
   * Create or get agent session
   */
  getSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      const session = {
        id: sessionId,
        createdAt: Date.now(),
        tasks: [],
        memory: this.memory.get(sessionId) || new Map(),
        state: 'idle',
      };
      this.sessions.set(sessionId, session);
      this.memory.set(sessionId, session.memory);
    }
    return this.sessions.get(sessionId);
  }

  /**
   * Plan task execution
   */
  async plan(task, context = {}) {
    const steps = [];
    
    // Simple planning: break down task into steps
    // In production, use LLM for better planning
    const taskLower = task.toLowerCase();
    
    if (taskLower.includes('search') || taskLower.includes('find')) {
      steps.push({
        type: 'tool_call',
        tool: 'search',
        params: { query: task },
      });
    }
    
    if (taskLower.includes('click') || taskLower.includes('navigate')) {
      steps.push({
        type: 'tool_call',
        tool: 'browser_dom',
        params: { action: 'navigate', url: this._extractURL(task) },
      });
    }
    
    // Default: search first, then act
    if (steps.length === 0) {
      steps.push({
        type: 'tool_call',
        tool: 'search',
        params: { query: task },
      });
    }

    return {
      task,
      steps,
      estimatedTime: steps.length * 2, // seconds
    };
  }

  /**
   * Extract URL from text (simple)
   */
  _extractURL(text) {
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    return urlMatch ? urlMatch[0] : null;
  }

  /**
   * Execute agent task
   */
  async executeTask(sessionId, task, options = {}) {
    const session = this.getSession(sessionId);
    const taskId = uuidv4();
    
    session.state = 'running';
    session.currentTask = {
      id: taskId,
      task,
      status: 'planning',
      steps: [],
      startTime: Date.now(),
    };

    this.emit('task:start', { sessionId, taskId, task });

    try {
      // 1. Plan
      this.emit('task:plan', { sessionId, taskId, task });
      const plan = await this.plan(task, { sessionId });
      session.currentTask.plan = plan;
      session.currentTask.status = 'executing';

      // 2. Execute steps
      const results = [];
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        
        this.emit('task:step:start', {
          sessionId,
          taskId,
          stepIndex: i,
          step,
        });

        try {
          const tool = this.tools.get(step.tool);
          if (!tool) {
            throw new Error(`Tool not found: ${step.tool}`);
          }

          const result = await tool.execute(step.params, {
            sessionId,
            taskId,
            stepIndex: i,
          });

          results.push({
            step,
            result,
            success: true,
          });

          this.emit('task:step:complete', {
            sessionId,
            taskId,
            stepIndex: i,
            step,
            result,
          });

          // Store in memory
          session.memory.set(`step_${i}`, { step, result });
        } catch (error) {
          logger.error({ sessionId, taskId, step, error: error.message }, 'Step failed');
          
          results.push({
            step,
            error: error.message,
            success: false,
          });

          this.emit('task:step:error', {
            sessionId,
            taskId,
            stepIndex: i,
            step,
            error: error.message,
          });

          // Retry logic
          if (options.maxRetries && i < options.maxRetries) {
            logger.info({ sessionId, taskId, step }, 'Retrying step');
            // Retry once
            i--; // Retry this step
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
        }
      }

      // 3. Finalize
      session.currentTask.status = 'completed';
      session.currentTask.endTime = Date.now();
      session.currentTask.results = results;
      session.state = 'idle';

      const finalResult = {
        taskId,
        task,
        success: results.every(r => r.success),
        results,
        duration: Date.now() - session.currentTask.startTime,
      };

      this.emit('task:complete', { sessionId, taskId, result: finalResult });

      return finalResult;
    } catch (error) {
      logger.error({ sessionId, taskId, error: error.message }, 'Task failed');
      session.currentTask.status = 'error';
      session.currentTask.error = error.message;
      session.state = 'idle';

      this.emit('task:error', { sessionId, taskId, error: error.message });

      throw error;
    }
  }

  /**
   * Cancel running task
   */
  cancelTask(sessionId, taskId) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.currentTask || session.currentTask.id !== taskId) {
      return false;
    }

    session.currentTask.status = 'cancelled';
    session.state = 'idle';
    
    this.emit('task:cancel', { sessionId, taskId });
    return true;
  }

  /**
   * Get task status
   */
  getTaskStatus(sessionId, taskId) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.currentTask || session.currentTask.id !== taskId) {
      return null;
    }

    return {
      ...session.currentTask,
      progress: this._calculateProgress(session.currentTask),
    };
  }

  /**
   * Calculate task progress
   */
  _calculateProgress(task) {
    if (!task.plan) return 0;
    const totalSteps = task.plan.steps.length;
    const completedSteps = task.steps?.filter(s => s.completed).length || 0;
    return totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  }

  /**
   * Get session memory
   */
  getMemory(sessionId) {
    const session = this.getSession(sessionId);
    return Array.from(session.memory.entries()).map(([key, value]) => ({
      key,
      value,
    }));
  }

  /**
   * Clear session
   */
  clearSession(sessionId) {
    this.sessions.delete(sessionId);
    this.memory.delete(sessionId);
    logger.info({ sessionId }, 'Cleared session');
  }
}

// Singleton instance
let agentManagerInstance = null;

function getAgentManager() {
  if (!agentManagerInstance) {
    agentManagerInstance = new AgentManager();
  }
  return agentManagerInstance;
}

module.exports = { AgentManager, getAgentManager };

