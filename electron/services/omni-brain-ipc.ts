/**
 * OmniBrain IPC Handlers
 */

import { z } from 'zod';
import { registerHandler } from '../shared/ipc/router';
import { OmniBrainAddDocumentRequest, OmniBrainSearchRequest, OmniBrainSearchResponse } from '../shared/ipc/schema';
import { getVectorStore } from './omni-brain/vector-store';

export function registerOmniBrainIpc(): void {
  registerHandler('omni-brain:addDocument', OmniBrainAddDocumentRequest, async (_event, request) => {
    const store = getVectorStore();
    const id = await store.addDocument({
      text: request.text,
      url: request.url,
      metadata: request.metadata,
    });
    return { id };
  });

  registerHandler('omni-brain:search', OmniBrainSearchRequest, async (_event, request) => {
    const store = getVectorStore();
    const results = await store.search(request.query, request.limit);
    return results satisfies z.infer<typeof OmniBrainSearchResponse>;
  });

  registerHandler('omni-brain:getDocument', z.object({ id: z.string() }), async (_event, request) => {
    const store = getVectorStore();
    const document = store.getDocument(request.id);
    return { document };
  });

  registerHandler('omni-brain:listDocuments', z.object({}), async () => {
    const store = getVectorStore();
    const documents = store.listDocuments();
    return { documents };
  });

  registerHandler('omni-brain:deleteDocument', z.object({ id: z.string() }), async (_event, request) => {
    const store = getVectorStore();
    await store.deleteDocument(request.id);
    return { success: true };
  });

  registerHandler('omni-brain:clear', z.object({}), async () => {
    const store = getVectorStore();
    await store.clear();
    return { success: true };
  });
}

