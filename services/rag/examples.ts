/**
 * RAG Integration Examples
 * Vector search, context-aware summaries, email timeline
 */

import { globalVectorStore } from './vectorStore';
import { globalEmbeddingService } from './embeddingService';
import { globalRAGEngine } from './ragEngine';
import { emailRAGService } from './emailRAG';
import type { EmailThread } from '../mailAgent/types';

/**
 * Example 1: Index and Search Documents
 */
export async function example1_IndexAndSearch() {
  const userId = 'alice@example.com';

  console.log('📚 Example 1: Index and Search');

  // Create sample documents
  const docs = [
    'The Q4 budget was approved on October 15th. Maximum spend per team: $50,000.',
    'John needs deadline extension on the project X deliverables until December 10th.',
    'New security policies: All passwords must be 16+ characters with 2FA enabled.',
    'Team building event scheduled for December 20th at downtown venue.',
    'Project X kickoff meeting notes: Focus on user experience and performance.',
  ];

  // Index documents
  console.log(`  Indexing ${docs.length} documents...`);
  for (const doc of docs) {
    const embedding = await globalEmbeddingService.embed(doc);
    await globalVectorStore.addDocument(userId, doc, embedding, {
      type: 'email',
      date: new Date(),
    });
  }

  // Search for similar documents
  const query = 'What are the budget limits?';
  const queryEmbedding = await globalEmbeddingService.embed(query);
  const results = await globalVectorStore.search(userId, queryEmbedding, 3, 0.3);

  console.log(`\n  Query: "${query}"`);
  console.log(`  Found ${results.length} similar documents:`);
  results.forEach((result, i) => {
    console.log(
      `    ${i + 1}. (${(result.similarity * 100).toFixed(1)}% match) ${result.content.substring(0, 60)}...`
    );
  });
}

/**
 * Example 2: RAG Engine - Retrieve and Generate
 */
export async function example2_RetrieveAndGenerate() {
  const userId = 'bob@example.com';

  console.log('\n🤖 Example 2: Retrieve and Generate');

  // Index sample knowledge base
  const knowledge = [
    'Company lunch policy: Employees get $15 daily lunch allowance or bring lunch.',
    'Remote work policy: 3 days remote, 2 days in office required.',
    'PTO accrual: 15 days/year, 3 days/year for sick leave.',
    'Travel approvals: Under $500 self-approved, $500-5000 manager approval required.',
  ];

  console.log(`  Indexing ${knowledge.length} policy documents...`);
  for (const policy of knowledge) {
    await globalRAGEngine.indexDocument(userId, policy, {
      type: 'policy',
    });
  }

  // Query the knowledge base
  const query = 'How much lunch budget do I get per day?';
  const ragContext = await globalRAGEngine.retrieveAndGenerate(userId, query);

  console.log(`\n  Query: "${query}"`);
  console.log(`\n  Context Found:`);
  ragContext.documents.forEach((doc, i) => {
    console.log(
      `    ${i + 1}. (${(doc.similarity * 100).toFixed(1)}%) ${doc.content.substring(0, 50)}...`
    );
  });

  console.log(`\n  Generated Answer:`);
  console.log(`    ${ragContext.generatedResponse.substring(0, 150)}...`);
}

/**
 * Example 3: Email Context-Aware Summarization
 */
export async function example3_ContextAwareSummary() {
  const userId = 'charlie@example.com';

  console.log('\n📧 Example 3: Context-Aware Email Summarization');

  // Create sample email history
  const emailHistory = [
    {
      content: 'Project X initial scope: Build user authentication, dashboard, and reporting.',
      metadata: { date: '2025-10-01', type: 'project_kickoff' },
    },
    {
      content:
        'Status update: Authentication module complete, 70% dashboard done, reporting pending.',
      metadata: { date: '2025-11-01', type: 'status_update' },
    },
    {
      content: 'Dashboard completed but needs performance optimization. Reporting design ready.',
      metadata: { date: '2025-11-15', type: 'progress_update' },
    },
  ];

  // Index email history
  console.log(`  Indexing ${emailHistory.length} historical emails...`);
  for (const email of emailHistory) {
    await globalRAGEngine.indexDocument(userId, email.content, email.metadata);
  }

  // Current email to summarize
  const currentThread: EmailThread = {
    id: 'thread-123',
    subject: 'Project X Final Status - Ready for handoff',
    messages: [
      {
        id: 'msg-1',
        from: 'john@example.com',
        to: 'team@company.com',
        subject: 'Project X Final Status - Ready for handoff',
        body: 'All modules complete! Reporting is live, performance optimizations done. Ready for production deployment.',
        timestamp: new Date(),
      },
    ],
  };

  // Generate context-aware summary
  const summary = await emailRAGService.generateContextAwareSummary(userId, currentThread);

  console.log(`\n  Email: "${currentThread.subject}"`);
  console.log(`\n  Summary: ${summary.summary}`);
  console.log(`  Context Awareness: ${(summary.contextAwarenessScore * 100).toFixed(0)}%`);
  console.log(`  Related Emails: ${summary.relatedEmails.length} found`);
  console.log(`\n  Key Points:`);
  summary.keyPoints.forEach(point => {
    console.log(`    • ${point}`);
  });
  if (summary.actionItems.length > 0) {
    console.log(`\n  Action Items:`);
    summary.actionItems.forEach(item => {
      console.log(`    ✓ ${item}`);
    });
  }
}

/**
 * Example 4: Finding Related Conversations
 */
export async function example4_FindRelatedEmails() {
  const userId = 'diana@example.com';

  console.log('\n🔗 Example 4: Finding Related Emails');

  // Index various email topics
  const emails = [
    { content: 'Meeting with sales team about Q4 targets and revenue goals.', topic: 'sales' },
    { content: 'Engineering architecture review for new microservices platform.', topic: 'tech' },
    {
      content: 'HR announcement: New benefits program including dental and vision coverage.',
      topic: 'hr',
    },
    { content: 'Sales strategy discussion: How to approach enterprise customers.', topic: 'sales' },
    { content: 'Product roadmap update: Q1 priorities and feature planning.', topic: 'product' },
  ];

  console.log(`  Indexing ${emails.length} emails...`);
  for (const email of emails) {
    await globalRAGEngine.indexDocument(userId, email.content, {
      topic: email.topic,
    });
  }

  // Find related emails for a new thread
  const newThread: EmailThread = {
    id: 'thread-456',
    subject: 'Q4 Sales Performance and Next Steps',
    messages: [
      {
        id: 'msg-1',
        from: 'boss@company.com',
        to: 'team@company.com',
        subject: 'Q4 Sales Performance and Next Steps',
        body: 'Great quarter! Revenue targets exceeded. Let us discuss strategy for enterprise deals.',
        timestamp: new Date(),
      },
    ],
  };

  const related = await emailRAGService.findRelatedEmails(userId, newThread, 3);

  console.log(`\n  Email: "${newThread.subject}"`);
  console.log(`  Found ${related.length} related emails from context:`);
  related.forEach((id, i) => {
    console.log(`    ${i + 1}. Document: ${id}`);
  });
}

/**
 * Example 5: RAG Statistics and Analytics
 */
export async function example5_RAGAnalytics() {
  const userId = 'eve@example.com';

  console.log('\n📊 Example 5: RAG Statistics');

  // Simulate indexing documents over time
  const daysOfData = 5;
  for (let day = 0; day < daysOfData; day++) {
    for (let i = 0; i < 10; i++) {
      await globalRAGEngine.indexDocument(userId, `Email content from day ${day}, email ${i}`, {
        date: new Date(Date.now() - day * 24 * 60 * 60 * 1000),
      });
    }
  }

  // Get statistics
  const stats = await globalRAGEngine.getStats(userId);

  console.log(`\n  User: ${userId}`);
  console.log(`  Documents indexed: ${stats.documentCount}`);
  console.log(`  Max documents per search: ${stats.config.maxDocuments}`);
  console.log(`  Minimum similarity: ${(stats.config.minSimilarity * 100).toFixed(0)}%`);
  console.log(`  Context length: ${stats.config.contextLength} characters`);
}

/**
 * Example 6: Batch Indexing
 */
export async function example6_BatchIndexing() {
  const userId = 'frank@example.com';

  console.log('\n📦 Example 6: Batch Indexing');

  // Simulate 100 emails
  const emailBatch = Array.from({ length: 100 }, (_, i) => ({
    content: `Email thread ${i}: Discussion about feature ${i % 10}`,
    metadata: {
      threadId: `thread-${i}`,
      sender: `user${i % 5}@company.com`,
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    },
  }));

  console.log(`  Batch indexing ${emailBatch.length} emails...`);
  const startTime = Date.now();

  const docIds = await globalRAGEngine.indexBatch(userId, emailBatch);

  const duration = Date.now() - startTime;
  console.log(`  ✓ Indexed ${docIds.length} documents in ${duration}ms`);
  console.log(`  Performance: ${(docIds.length / (duration / 1000)).toFixed(0)} docs/second`);

  // Get final stats
  const stats = await globalRAGEngine.getStats(userId);
  console.log(`  Total documents: ${stats.documentCount}`);
}

// Run all examples
console.log('=== RAG Integration Examples ===\n');

example1_IndexAndSearch().then(() => console.log(''));
example2_RetrieveAndGenerate().then(() => console.log(''));
example3_ContextAwareSummary().then(() => console.log(''));
example4_FindRelatedEmails().then(() => console.log(''));
example5_RAGAnalytics().then(() => console.log(''));
example6_BatchIndexing().then(() => console.log(''));
