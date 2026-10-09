/**
 * Shuffle-once random sequence. Each run is a full shuffle of the pool, so
 * nothing repeats until the pool is exhausted. A new run is only appended
 * when the user walks past the end, and its first item never repeats the
 * last item shown.
 */
export function shuffle<T>(list: readonly T[], rand: () => number = Math.random): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const a = out[i]!;
    out[i] = out[j]!;
    out[j] = a;
  }
  return out;
}

export function nextRun<T>(pool: readonly T[], last: T | undefined, rand: () => number = Math.random): T[] {
  const run = shuffle(pool, rand);
  if (run.length > 1 && last !== undefined && run[0] === last) {
    const a = run[0]!;
    run[0] = run[1]!;
    run[1] = a;
  }
  return run;
}

/** Returns the queue to use when stepping to `index + 1`. Never reshuffles existing items. */
export function advance<T>(queue: readonly T[], index: number, pool: readonly T[], rand?: () => number): T[] {
  if (index < queue.length - 1) return queue as T[];
  return [...queue, ...nextRun(pool, queue[queue.length - 1], rand)];
}
