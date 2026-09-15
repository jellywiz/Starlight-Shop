import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

/** Any unknown path under a locale renders the translated 404 page. */
export default function CatchAllPage() {
  notFound()
}
