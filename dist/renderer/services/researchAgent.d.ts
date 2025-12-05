import type { ResearchAgentAction, ResearchAgentRequest, ResearchAgentResponse, ResearchAgentContext } from '../types/researchAgent';
export declare function runResearchAgent(request: ResearchAgentRequest): Promise<ResearchAgentResponse>;
export declare function executeResearchAgentAction(action: ResearchAgentAction, context: ResearchAgentContext): Promise<string | void>;
