/**
 * Read event-like streams line-by-line.
 * Supports both SSE (data: {...}) and JSONL ({"foo": "bar"}\n) formats.
 */
export async function readEventStream(
  body: ReadableStream<Uint8Array> | null,
  onData: (message: unknown) => void
): Promise<void> {
  if (!body) {
    return;
  }
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const raw of lines) {
        const line = raw.trim();
        if (!line) {
          continue;
        }
        if (line === '[DONE]') {
          onData('[DONE]');
          continue;
        }
        // SSE framing lines like "event: error" carry no JSON payload — skip
        // them so only the following "data:" line is parsed.
        if (line.startsWith('event:')) {
          continue;
        }
        let payload = line;
        if (line.startsWith('data:')) {
          payload = line.replace(/^data:\s?/, '');
        }
        let json: unknown;
        try {
          json = JSON.parse(payload);
        } catch {
          // ignore non-JSON lines (SSE comments, blank framing, etc.)
          continue;
        }
        // onData errors (e.g. a stream error the consumer re-throws) must
        // propagate to the caller — they were previously swallowed by the
        // JSON guard above, leaving failed streams hanging on "…" forever.
        onData(json);
      }
    }
  } finally {
    reader.releaseLock();
  }
}
