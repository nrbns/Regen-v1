// MeiliSearch Client - Proper Indexing & Search
// Fixes: 429 errors, stuck tasks, wrong URLs, encoding issues

const MEILI_URL = 'http://127.0.0.1:7700';
const MASTER_KEY = 'regen2026'; // Match the key in main.rs (can also use "regen123")

export interface MeiliDocument {
  id: string | number;
  [key: string]: any;
}

export interface MeiliTask {
  taskUid: number;
  status: string;
  type: string;
}

/**
 * Create index if it doesn't exist
 */
export async function ensureIndex(index: string, primaryKey: string = 'id'): Promise<void> {
  try {
    // Check if index exists
    const checkRes = await fetch(`${MEILI_URL}/indexes/${index}`, {
      headers: {
        'X-Meili-API-Key': MASTER_KEY,
      },
    });

    if (checkRes.ok) {
      console.log(`[MeiliSearch] Index "${index}" already exists`);
      return;
    }

    // Create index
    const createRes = await fetch(`${MEILI_URL}/indexes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Meili-API-Key': MASTER_KEY,
      },
      body: JSON.stringify({
        uid: index,
        primaryKey: primaryKey,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Failed to create index: ${err}`);
    }

    console.log(`[MeiliSearch] Created index "${index}"`);
  } catch (error) {
    console.error(`[MeiliSearch] Error ensuring index "${index}":`, error);
    throw error;
  }
}

/**
 * Index documents in safe batches (max 900 per batch, max 10MB)
 */
export async function indexDocuments(
  index: string,
  docs: MeiliDocument[],
  primaryKey: string = 'id'
): Promise<MeiliTask[]> {
  if (!docs || docs.length === 0) {
    console.warn(`[MeiliSearch] No documents to index for "${index}"`);
    return [];
  }

  // Ensure index exists
  await ensureIndex(index, primaryKey);

  // Split into safe batches (max 900 docs per batch)
  const batches: MeiliDocument[][] = [];
  for (let i = 0; i < docs.length; i += 900) {
    batches.push(docs.slice(i, i + 900));
  }

  const tasks: MeiliTask[] = [];

  for (const batch of batches) {
    try {
      // Validate JSON size (max 10MB)
      const jsonString = JSON.stringify(batch);
      const sizeMB = new Blob([jsonString]).size / (1024 * 1024);

      if (sizeMB > 10) {
        console.warn(
          `[MeiliSearch] Batch too large (${sizeMB.toFixed(2)}MB), splitting further...`
        );
        // Split this batch even smaller
        for (let i = 0; i < batch.length; i += 100) {
          const miniBatch = batch.slice(i, i + 100);
          const task = await indexBatch(index, miniBatch);
          tasks.push(task);
        }
        continue;
      }

      const task = await indexBatch(index, batch);
      tasks.push(task);
    } catch (error) {
      console.error(`[MeiliSearch] Failed to index batch:`, error);
      throw error;
    }
  }

  console.log(`[MeiliSearch] Indexed ${docs.length} documents in ${batches.length} batch(es)`);
  return tasks;
}

/**
 * Index a single batch of documents
 */
async function indexBatch(index: string, batch: MeiliDocument[]): Promise<MeiliTask> {
  const res = await fetch(`${MEILI_URL}/indexes/${index}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Meili-API-Key': MASTER_KEY,
    },
    body: JSON.stringify(batch),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[MeiliSearch] Indexing failed:`, err);
    throw new Error(`MeiliSearch indexing failed: ${err}`);
  }

  const task = (await res.json()) as MeiliTask;
  console.log(`[MeiliSearch] Enqueued task ${task.taskUid} – ${batch.length} docs`);

  return task;
}

/**
 * Wait for task to complete
 */
export async function waitForTask(taskUid: number, timeout: number = 5000): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const res = await fetch(`${MEILI_URL}/tasks/${taskUid}`, {
        headers: {
          'X-Meili-API-Key': MASTER_KEY,
        },
      });

      if (!res.ok) {
        return false;
      }

      const task = await res.json();

      if (task.status === 'succeeded') {
        console.log(`[MeiliSearch] Task ${taskUid} succeeded`);
        return true;
      }

      if (task.status === 'failed') {
        console.error(`[MeiliSearch] Task ${taskUid} failed:`, task.error);
        return false;
      }

      // Still processing, wait a bit
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`[MeiliSearch] Error checking task ${taskUid}:`, error);
      return false;
    }
  }

  console.warn(`[MeiliSearch] Task ${taskUid} timeout after ${timeout}ms`);
  return false;
}

/**
 * Search documents
 */
export async function searchDocuments(
  index: string,
  query: string,
  options?: {
    limit?: number;
    offset?: number;
    filter?: string;
    sort?: string[];
  }
): Promise<{ hits: any[]; estimatedTotalHits: number; processingTimeMs: number }> {
  try {
    const searchParams = new URLSearchParams({
      q: query,
      limit: String(options?.limit || 20),
      offset: String(options?.offset || 0),
    });

    if (options?.filter) {
      searchParams.append('filter', options.filter);
    }

    if (options?.sort) {
      searchParams.append('sort', JSON.stringify(options.sort));
    }

    const res = await fetch(`${MEILI_URL}/indexes/${index}/search?${searchParams}`, {
      headers: {
        'X-Meili-API-Key': MASTER_KEY,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`MeiliSearch search failed: ${err}`);
    }

    const result = await res.json();
    return result;
  } catch (error) {
    console.error(`[MeiliSearch] Search error:`, error);
    throw error;
  }
}

/**
 * Multi-search across multiple indexes
 */
export async function multiSearch(
  queries: Array<{
    indexUid: string;
    q: string;
    limit?: number;
    filter?: string;
    sort?: string[];
  }>
): Promise<{
  results: Array<{
    indexUid: string;
    hits: any[];
    estimatedTotalHits: number;
    processingTimeMs: number;
  }>;
}> {
  try {
    const res = await fetch(`${MEILI_URL}/multi-search`, {
      method: 'POST',
      headers: {
        'X-Meili-API-Key': MASTER_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ queries }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`MeiliSearch multi-search failed: ${err}`);
    }

    const result = await res.json();
    return result;
  } catch (error) {
    console.error(`[MeiliSearch] Multi-search error:`, error);
    throw error;
  }
}

/**
 * Delete documents
 */
export async function deleteDocuments(
  index: string,
  documentIds: (string | number)[]
): Promise<MeiliTask> {
  const res = await fetch(`${MEILI_URL}/indexes/${index}/documents/delete-batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Meili-API-Key': MASTER_KEY,
    },
    body: JSON.stringify(documentIds),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`MeiliSearch delete failed: ${err}`);
  }

  return (await res.json()) as MeiliTask;
}

/**
 * Check if MeiliSearch is running
 */
export async function checkMeiliSearch(): Promise<boolean> {
  try {
    const res = await fetch(`${MEILI_URL}/health`, {
      method: 'GET',
    });
    return res.ok;
  } catch {
    return false;
  }
}
