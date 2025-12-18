export class LLMClient {
  async generate(prompt: string, options?: Record<string, any>): Promise<string> {
    const _opts = options;
    return `stub-response-for: ${prompt.substring(0, 50)}`;
  }

  async call(
    input:
      | string
      | { messages: { role: string; content: string }[]; system?: string; max_tokens?: number }
  ): Promise<string> {
    if (typeof input === 'string') {
      return this.generate(input);
    }
    const system = input.system ? `[System] ${input.system}\n` : '';
    const prompt = `${system}${input.messages.map(m => `${m.role}: ${m.content}`).join('\n')}`;
    return this.generate(prompt, { maxTokens: input.max_tokens });
  }
}
