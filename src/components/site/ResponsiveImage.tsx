import type { PublicImage } from '@/lib/catalog/types'

type Props = {
  image: PublicImage
  sizes: string
  priority?: boolean
  className?: string
}

/**
 * Plain <img> with pregenerated variants (spec section 11): width/height for layout
 * stability, srcset/sizes for responsive loading, lazy by default.
 */
export function ResponsiveImage({ image, sizes, priority = false, className = '' }: Props) {
  const srcSet = image.sources.map((s) => `${s.url} ${s.width}w`).join(', ')
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.src}
      srcSet={srcSet || undefined}
      sizes={srcSet ? sizes : undefined}
      width={image.width}
      height={image.height}
      alt={image.alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={className}
    />
  )
}
