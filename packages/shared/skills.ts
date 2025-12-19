export interface SkillIO<TInputs = any, TOutputs = any> {
  inputs: TInputs;
  outputs: TOutputs;
}

export interface SkillDefinition<TInputs = any, TOutputs = any> {
  id: string;
  name: string;
  description?: string;
  steps: string[];
  tools?: string[];
  uiHints?: Record<string, any>;
  run(inputs: TInputs): Promise<TOutputs>;
}
