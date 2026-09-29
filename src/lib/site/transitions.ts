/**
 * View transitions (spec section 11 "smooth"): a navigation cross-fades the page, and a
 * product's photo glides from the card that was tapped into the product page's gallery
 * because both carry the same view-transition name. Names must be unique on a page: a
 * product appears at most once per grid, and the home slideshow deliberately names
 * nothing (its piece may also be in the Featured pieces grid).
 */
export function photoTransitionName(slug: string): string {
  return `product-photo-${slug}`
}
