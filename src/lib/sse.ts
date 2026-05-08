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
        let payload = line;
        if (line.startsWith('data:')) {
          payload = line.replace(/^data:\s?/, '');
        }
        try {
          const json = JSON.parse(payload);
          onData(json);
        } catch {
          // ignore non-JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
