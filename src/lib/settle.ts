/** The outcome of a promise, for loading independent things at once and judging each on its own. */
export type Settled<T> = { ok: true; value: T } | { ok: false; error: unknown }

export async function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
  try {
    return { ok: true, value: await promise }
  } catch (error) {
    return { ok: false, error }
  }
}
