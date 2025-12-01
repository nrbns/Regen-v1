# Real-time SSE Streaming Demo

The `/v1/answer/stream` endpoint now delivers research answers token-by-token over **Server-Sent Events**. This doc shows how to connect both from Node.js and the browser.

## SSE Contract

Events emitted by the endpoint:

| event       | payload                                                          |
| ----------- | ---------------------------------------------------------------- |
| `token`     | `{ "text": "partial output ..." }`                               |
| `citations` | `{ "citations": [...] }` array of source metadata                |
| `done`      | `{ "query_id": "...", "model": { name, provider, latency_ms } }` |
| `error`     | `{ "error": "code", "message": "..." }`                          |

Requests accept the same body as `/v1/answer`, e.g.:

```json
POST /v1/answer/stream
{
  "q": "Latest Chandrayaan-3 findings",
  "source_filters": ["wikipedia", "news"],
  "freshness": "latest",
  "max_context_tokens": 1800
}
```

## Browser client (EventSource)

```ts
const controller = new AbortController();

async function streamAnswer(query: string) {
  const res = await fetch('/v1/answer/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query }),
    signal: controller.signal,
  });

  if (!res.body) throw new Error('No stream available');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const evt of events) {
      if (!evt.startsWith('event:')) continue;
      const [, nameLine, dataLine] = evt.split('\n');
      const eventName = nameLine.replace('event: ', '').trim();
      const data = JSON.parse(dataLine.replace('data: ', ''));

      switch (eventName) {
        case 'token':
          appendToUI(data.text);
          break;
        case 'citations':
          showCitations(data.citations);
          break;
        case 'done':
          markComplete(data);
          break;
        case 'error':
          showError(data.message);
          controller.abort();
          return;
      }
    }
  }
}
```

## Node.js client (EventSource parser)

```bash
npm install eventsource-parser node-fetch
```

```js
import fetch from 'node-fetch';
import { createParser } from 'eventsource-parser';

async function stream() {
  const res = await fetch('http://localhost:3030/v1/answer/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: 'Why is monsoon late in 2025?' }),
  });

  const parser = createParser(event => {
    if (event.type !== 'event') return;
    if (event.event === 'token') process.stdout.write(event.data);
    if (event.event === 'citations') console.log('\nSources:', event.data);
    if (event.event === 'done') console.log('\nDone:', event.data);
    if (event.event === 'error') console.error('\nError:', event.data);
  });

  for await (const chunk of res.body) {
    parser.feed(chunk.toString());
  }
}

stream();
```

## Testing with curl

```
curl -N -H "Content-Type: application/json" \
  -X POST http://localhost:3030/v1/answer/stream \
  -d '{"q":"impact of ONDC on kirana stores"}'
```

You’ll see SSE frames streamed in real time with tokens, citations, and a final `done` event once the LLM finishes.



