// Knowledge RAG Service: Indexes and searches markdown files using the RAG engine
// This service integrates the markdown knowledge engine with the semantic search (RAG) engine

import { globalRAGEngine } from '../../services/rag/ragEngine';
import fs from 'fs';
import path from 'path';

const knowledgeDir = path.join(process.cwd(), 'apps', 'knowledge-engine', 'content');

// Index all markdown files for a user
export async function indexAllMarkdownFiles(userId: string) {
  const files = fs.readdirSync(knowledgeDir).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const content = fs.readFileSync(path.join(knowledgeDir, file), 'utf8');
    await globalRAGEngine.indexDocument(userId, content, { file });
  }
}

// Index a single markdown file for a user
export async function indexMarkdownFile(userId: string, file: string) {
  const filePath = path.join(knowledgeDir, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    await globalRAGEngine.indexDocument(userId, content, { file });
  }
}

// Remove a markdown file from the vector store (not implemented: needs docId tracking)
export async function removeMarkdownFile(_userId: string, _file: string) {
  // TODO: Track docId <-> file mapping for precise removal
}

// Semantic search over indexed markdown files
export async function semanticSearch(userId: string, query: string) {
  return await globalRAGEngine.retrieveAndGenerate(userId, query);
}
