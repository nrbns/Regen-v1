// server/routes/agent.ts
import { FastifyInstance } from 'fastify';
import { runAgentTask, AgentTask } from '../agent-orchestrator';

export default async function (fastify: FastifyInstance) {
  fastify.post('/api/agent', async (request, reply) => {
    const result = await runAgentTask(request.body as AgentTask);
    reply.send(result);
  });
}
