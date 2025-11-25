# LangChain Agentic Workflows - Examples & Usage

## Overview

This document provides examples and usage patterns for LangChain agentic workflows in Regen's Redix integration.

## Quick Start

### 1. Basic RAG Agent (Retrieval-Augmented Generation)

```typescript
import { getAgenticWorkflowEngine } from './langchain-agents';

const engine = getAgenticWorkflowEngine();

const result = await engine.ragWorkflow(
  'What is quantum computing?',
  'User is researching quantum computing for a paper',
  {
    useOllama: true, // Use local Ollama for efficiency
    temperature: 0.7,
  }
);

console.log(result.result); // Generated answer with citations
console.log(result.greenScore); // Eco-score (0-100)
```

### 2. Research Workflow (Search → Summarize → Ethics Check)

```typescript
const result = await engine.researchWorkflow('Research quantum computing ethics in 2025', '', {
  temperature: 0.7,
  maxIterations: 5,
});

// Result includes:
// - Search results
// - Summary
// - Ethics check
// - Green score
```

### 3. Multi-Agent Workflow

```typescript
const result = await engine.multiAgentWorkflow(
  'Generate code for a quantum computing simulation',
  '',
  {
    temperature: 0.2, // Lower temp for code generation
  }
);

// Multiple agents collaborate:
// 1. Research agent finds information
// 2. Code agent generates code
// 3. Ethics agent checks for safety
```

### 4. Streaming RAG Agent (Real-time)

```typescript
const streamCallback = (chunk: any) => {
  if (chunk.type === 'token') {
    process.stdout.write(chunk.content); // Stream tokens
  } else if (chunk.type === 'step') {
    console.log(`Step ${chunk.step}: ${chunk.content}`);
  } else if (chunk.type === 'done') {
    console.log(`\nGreen Score: ${chunk.data.greenScore}`);
  }
};

await engine.ragWorkflow(
  'Explain quantum entanglement',
  '',
  { stream: true, useOllama: true },
  streamCallback
);
```

## API Endpoints

### POST /workflow (Non-streaming)

```bash
curl -X POST http://localhost:8001/workflow \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is quantum computing?",
    "workflowType": "rag",
    "options": {
      "useOllama": true,
      "temperature": 0.7
    }
  }'
```

### POST /workflow (Streaming)

```bash
curl -X POST http://localhost:8001/workflow \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is quantum computing?",
    "workflowType": "rag",
    "stream": true,
    "options": {
      "useOllama": true
    }
  }'
```

## React Frontend Example

```tsx
import { useState, useEffect } from 'react';

function RAGAgent() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const [streaming, setStreaming] = useState(false);

  const handleQuery = async () => {
    setStreaming(true);
    setResult('');

    const response = await fetch('http://localhost:8001/workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        workflowType: 'rag',
        stream: true,
        options: { useOllama: true },
      }),
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));

          if (data.type === 'token') {
            setResult(prev => prev + data.content);
          } else if (data.type === 'step') {
            console.log(`Step ${data.step}: ${data.content}`);
          } else if (data.type === 'done') {
            setStreaming(false);
            console.log('Green Score:', data.data.greenScore);
          }
        }
      }
    }
  };

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Ask a question..."
      />
      <button onClick={handleQuery} disabled={streaming}>
        {streaming ? 'Streaming...' : 'Ask'}
      </button>
      <div>{result}</div>
    </div>
  );
}
```

## Workflow Types

### `rag` - Retrieval-Augmented Generation

- **Use case**: Answer questions with web search context
- **Tools**: Web search
- **Best for**: Research, Q&A, fact-checking

### `research` - Research Workflow

- **Use case**: Deep research with ethics check
- **Tools**: Web search, summarization, ethics checker
- **Best for**: Academic research, content creation

### `multi-agent` - Multi-Agent Collaboration

- **Use case**: Complex tasks requiring multiple agents
- **Tools**: All available tools
- **Best for**: Code generation, complex problem solving

## Ollama Integration

Ollama provides local, efficient LLM execution:

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama3.2

# Start Ollama server
ollama serve
```

Then use in workflows:

```typescript
{
  workflowType: 'rag',
  options: {
    useOllama: true, // Uses local Ollama instead of OpenAI
    temperature: 0.7,
  }
}
```

**Benefits**:

- ✅ Lower latency (local execution)
- ✅ Better privacy (no API calls)
- ✅ Lower cost (free)
- ✅ Higher green score (less energy)

## ReAct Pattern

The ReAct (Reason → Act → Observe) pattern enables autonomous agents:

1. **Reason**: LLM thinks about what to do
2. **Act**: Executes a tool (search, calculator, etc.)
3. **Observe**: Analyzes tool results
4. **Loop**: Repeats until goal is met

Example:

```
Thought: I need to search for information about quantum computing.
Action: web_search
Action Input: {"query": "quantum computing basics", "maxResults": 5}
Observation: [Search results...]
Thought: I have enough information. Let me provide a final answer.
Action: final_answer
Action Input: Quantum computing uses quantum mechanics...
```

## Tools Available

1. **web_search**: Search DuckDuckGo for information
2. **calculator**: Perform mathematical calculations
3. **code_executor**: Execute code (sandboxed)
4. **knowledge_graph**: Query/store knowledge graph

## Eco-Scoring

All workflows include eco-scoring:

- **Ollama**: ~0.01 Wh per 1K tokens (local, efficient)
- **OpenAI**: ~0.05 Wh per 1K tokens
- **Anthropic**: ~0.06 Wh per 1K tokens

Green score formula: `100 - (energy * 10 + tokens * 0.001)`

## Best Practices

1. **Use Ollama for local efficiency**: Set `useOllama: true` when available
2. **Stream for better UX**: Enable streaming for real-time feedback
3. **Choose the right workflow**: Use `rag` for Q&A, `research` for deep research
4. **Monitor green scores**: Prefer workflows with higher green scores
5. **Set appropriate temperatures**: Lower (0.2-0.5) for code, higher (0.7-0.9) for creative tasks

## Troubleshooting

### Ollama not available

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama
ollama serve
```

### API keys missing

```bash
# Set environment variables
export OPENAI_API_KEY="your-key"
export ANTHROPIC_API_KEY="your-key"
```

### Streaming not working

- Ensure `stream: true` in request
- Check Content-Type headers
- Verify SSE support in client

## Next Steps

- Add more tools (Tavily search, Wolfram Alpha, etc.)
- Implement LangGraph for complex multi-agent workflows
- Add memory/context management
- Integrate with SuperMemory for persistent context
