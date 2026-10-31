// Headroom for the eight bounded device strings and TanStack's wire envelope.
export const TRIAL_BODY_MAX_BYTES = 16 * 1024;

/** Uses the compiler's actual URL, never a hardcoded/generated function hash. */
export async function boundTrialRequest(request: Request, trialUrl: string): Promise<Request | Response> {
  if (request.method !== "POST" || new URL(request.url).pathname !== new URL(trialUrl, request.url).pathname) {
    return request;
  }
  const reject = () => new Response("Trial request too large", { status: 413 });
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > TRIAL_BODY_MAX_BYTES) {
    void request.body?.cancel().catch(() => {});
    return reject();
  }
  if (!request.body) return request;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > TRIAL_BODY_MAX_BYTES) {
        void reader.cancel().catch(() => {});
        return reject();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  // Rebuild only the trial request, before the framework's JSON/Seroval decoder.
  return new Request(request, { body: body.buffer });
}