/**
 * Upload limits (spec section 11), shared by the server-side validation
 * (src/collections/Media.ts) and the browser-side preparation that resizes phone photos
 * before they are sent (src/lib/photo-prep.ts, src/components/admin/PhotoPrep.tsx).
 */
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024
export const MAX_UPLOAD_PIXELS = 20_000_000

/**
 * Longest side a photo is reduced to before upload. The site never shows a photo larger
 * than its 1280px variant, so 2000px keeps a comfortable margin for cropping and sharp
 * downscaling while turning a 5–8 MB phone photo into well under 1 MB.
 */
export const PREPARED_MAX_SIDE = 2000
