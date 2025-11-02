import type { Dsl } from './dsl';

export function compileToAgentSteps(dsl: Dsl) {
  // For now, passthrough: DSL steps already in agent skill format
  return dsl.steps;
}


