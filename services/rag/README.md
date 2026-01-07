# RAG (Retrieval-Augmented Generation) Module

Context-aware AI using vector embeddings and semantic search.

## Components

### Vector Store
In-memory vector database with semantic search.

```typescript
import { globalVectorStore } from './vectorStore';

// Add document with embedding
const docId = await globalVectorStore.addDocument(
  userId,
  'Email content here...',
  embedding,
  { threadId: 'thread-123', subject: 'Project Update' }
);

// Search similar documents
const results = await globalVectorStore.search(
  userId,
  queryEmbedding,
  5, // limit
  0.3 // minSimilarity
);
```

**Production Setup:**
- Pinecone: Serverless vector database
- Weaviate: Open-source vector search
- Milvus: Scalable vector database
- Qdrant: High-performance vector search

### Embedding Service
Convert text to vector embeddings.

```typescript
import { globalEmbeddingService } from './embeddingService';

// Embed single text
const embedding = await globalEmbeddingService.embed(
  'What is your current project status?'
);

// Embed batch
const embeddings = await globalEmbeddingService.embedBatch([
  'Text 1',
  'Text 2',
  'Text 3',
]);
```

**Supported Models:**
- OpenAI: `text-embedding-3-small` (1536-dim)
- Anthropic: `claude-embedding-001` (768-dim)
- Open-source: Sentence-Transformers

### RAG Engine
Retrieve documents + Generate responses with context.

```typescript
import { globalRAGEngine } from './ragEngine';

// Index document
const docId = await globalRAGEngine.indexDocument(
  userId,
  'Historical email thread content...',
  { type: 'email', date: '2025-12-01' }
);

// Retrieve and generate
const result = await globalRAGEngine.retrieveAndGenerate(
  userId,
  'What was discussed about project X last month?'
);

// Returns:
// {
//   query: '...',
//   documents: [{id, content, similarity}, ...],
//   generatedResponse: 'Based on email history...'
// }
```

### Email RAG Service
Specialized RAG for email context.

```typescript
import { emailRAGService } from './emailRAG';

// Index email thread
await emailRAGService.indexEmailThread(userId, thread);

// Index batch
await emailRAGService.indexEmailThreads(userId, threads);

// Generate context-aware summary
const summary = await emailRAGService.generateContextAwareSummary(userId, thread);
// Returns EnhancedEmailSummary with:
// - summary: Main content
// - contextDocuments: Related emails
// - contextAwarenessScore: 0-1
// - relatedEmails: Thread IDs
```

## Usage Patterns

### Pattern 1: Onboarding (Index Existing Emails)

```typescript
// 1. Fetch all user emails
const threads = await gmailConnector.getAllThreads(userId);

// 2. Index them
await emailRAGService.indexEmailThreads(userId, threads);

// Now: search will find relevant context
```

### Pattern 2: Improving Summaries

```typescript
// Before: Generic summary
const basicSummary = await mailSummarizer.summarize(thread);

// After: Context-aware summary
const enhancedSummary = await emailRAGService.generateContextAwareSummary(userId, thread);
// Now includes: contextDocuments, contextAwarenessScore, relatedEmails
```

### Pattern 3: Smart Search

```typescript
// User asks: "What did John say about deadlines?"

// RAG engine finds:
// 1. All emails mentioning 'John' + 'deadline'
// 2. Generates answer based on context
const result = await globalRAGEngine.retrieveAndGenerate(
  userId,
  "What did John say about deadlines?"
);
```

### Pattern 4: Batch Processing

```typescript
// Index all emails at once
const newThreads = await gmailConnector.getThreadsSince(userId, lastIndexDate);
await emailRAGService.indexEmailThreads(userId, newThreads);

// Stats
const stats = await emailRAGService.getStats(userId);
// { indexedThreads: 450, averageContextAwareness: 0.72 }
```

## Configuration

```typescript
const ragEngine = new RAGEngine({
  maxDocuments: 5, // Return top 5 results
  minSimilarity: 0.4, // Similarity threshold
  contextLength: 2000, // Max context length in chars
  systemPrompt: 'You are a helpful assistant...', // LLM system prompt
});
```

## Performance Tuning

### Memory Usage
- Keep only recent emails (last 6 months)
- Summarize old emails before indexing
- Delete low-relevance documents

### Similarity Threshold
- `0.5+`: Very relevant (high precision)
- `0.3-0.5`: Moderately relevant (balanced)
- `<0.3`: Loosely related (high recall)

### Context Window
- Smaller (500 chars): Faster, lower quality
- Medium (2000 chars): Balanced
- Larger (5000+ chars): Better quality, slower

## Deployment

### Development
In-memory vector store (good for testing).

### Staging
Pinecone free tier or local Milvus.

### Production
- **Pinecone**: Easiest, managed, cost-effective
- **Weaviate**: Open-source, self-hosted
- **Milvus**: High-performance, horizontally scalable

### Migration from In-Memory
```bash
# 1. Export documents
await vectorStore.exportDocuments()

# 2. Create Pinecone index
pinecone create-index email-context --dimension 768

# 3. Migrate documents
for each document:
  pinecone upsert document

# 4. Update config to use Pinecone
import { PineconeVectorStore } from '@pinecone-database/pinecone'
```

## Cost Optimization

### Prompt Caching
Cache embeddings for repeated queries:
```typescript
// Cache hits avoid re-embedding
const embedding = await cache.get(text) || 
  await globalEmbeddingService.embed(text);
```

### Batch Indexing
Index multiple emails in one operation (cheaper).

### Pruning
Delete old/irrelevant documents regularly.

**Estimated Costs (monthly):**
- OpenAI embeddings: $0.02 per 1M tokens (~$5-10/mo for typical user)
- Pinecone: Free tier (up to 1M vectors), $35/mo starter
- Milvus: Self-hosted (free) or cloud (~$50/mo)

## Security Considerations

- Embeddings are user-specific (isolated)
- Vector store respects user permissions
- Sensitive data: Mark as non-indexable
- Audit logging: All searches logged

## Future Enhancements

- [ ] Hybrid search (BM25 + semantic)
- [ ] Clustering similar emails
- [ ] Topic modeling
- [ ] Cross-user insights (aggregate summaries)
- [ ] Real-time indexing
- [ ] Semantic caching
