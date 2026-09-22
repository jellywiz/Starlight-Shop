import type { CatalogItem, PublicImage } from '@/lib/catalog/types'

/** How long each piece of the home slideshow stays before the next one. */
export const HERO_SLIDE_MS = 6000

export type HeroPiece = CatalogItem & { cover: PublicImage }

/** The featured pieces that have a photo, in the order the catalogue lists them. */
export function heroPieces(items: CatalogItem[]): HeroPiece[] {
  return items.filter((item): item is HeroPiece => item.cover !== null)
}
