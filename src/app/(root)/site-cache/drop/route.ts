import { revalidatePath } from 'next/cache'

import { isDroppablePath, verifyDropRequest } from '@/lib/site/outage'

export const dynamic = 'force-dynamic'

/**
 * Internal: drops one cached public page. Called by the site itself after it has served
 * a render made during a database outage (see src/lib/site/outage.ts); the request must
 * carry a signature made with the application secret.
 */
export async function POST(request: Request): Promise<Response> {
  let body: { path?: unknown; signature?: unknown }
  try {
    body = (await request.json()) as { path?: unknown; signature?: unknown }
  } catch {
    return new Response(null, { status: 400 })
  }
  const { path, signature } = body
  if (typeof path !== 'string' || typeof signature !== 'string' || !isDroppablePath(path)) {
    return new Response(null, { status: 400 })
  }
  if (!verifyDropRequest(path, signature)) {
    return new Response(null, { status: 403 })
  }
  revalidatePath(path)
  return new Response(null, { status: 204 })
}
