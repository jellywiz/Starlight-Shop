/**
 * Generates the website's logo derivatives from the supplied Starlight logo
 * (public/brand/logo.png): downscaled and cropped copies only — never upscaled,
 * stretched or recoloured (spec section 4 "Visual identity").
 *
 *   pnpm brand:assets
 *
 * Outputs (all in public/brand):
 *   logo-full-512.png   trimmed logo (monogram + wordmark) fitted in 512px, light surface
 *   logo-512.png        the whole supplied image fitted in 512px (structured data)
 *   logo-mark-192.png   the SL monogram with its stars (no wordmark), 192px
 *   logo-mark-64.png    same, 64px
 *   favicon-32.png / favicon-16.png / apple-touch-icon.png (180px)
 *   social-default.png  1200x630 sharing image: plum background, stars, logo tile
 */
import fs from 'node:fs'
import path from 'node:path'

import sharp, { type Sharp } from 'sharp'

const BRAND_DIR = path.resolve('public/brand')
const SOURCE = path.join(BRAND_DIR, 'logo.png')
const SURFACE = { r: 253, g: 253, b: 253, alpha: 1 }
const PLUM = '#482044'

type Box = { left: number; top: number; width: number; height: number }

/** Bounding box of "ink" pixels (anything clearly darker than the light background). */
async function inkBox(
  image: Sharp,
): Promise<{ box: Box; rows: number[]; width: number; height: number }> {
  const { data, info } = await image.clone().greyscale().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  const rows: number[] = new Array(height).fill(0)
  let left = width
  let right = -1
  let top = height
  let bottom = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[y * width + x] < 200) {
        rows[y] += 1
        if (x < left) left = x
        if (x > right) right = x
        if (y < top) top = y
        if (y > bottom) bottom = y
      }
    }
  }
  if (right < 0) {
    throw new Error('The logo image appears to be empty.')
  }
  return {
    box: { left, top, width: right - left + 1, height: bottom - top + 1 },
    rows,
    width,
    height,
  }
}

/**
 * Finds the horizontal gap that separates the monogram (top) from the wordmark
 * (bottom): the widest run of ink-free rows in the lower half of the trimmed logo.
 */
function splitRow(rows: number[], box: Box): number {
  let bestStart = -1
  let bestLength = 0
  let runStart = -1
  const from = box.top + Math.floor(box.height * 0.4)
  const to = box.top + box.height
  for (let y = from; y <= to; y += 1) {
    const empty = y < to && rows[y] === 0
    if (empty && runStart < 0) {
      runStart = y
    }
    if (!empty && runStart >= 0) {
      const length = y - runStart
      if (length > bestLength) {
        bestLength = length
        bestStart = runStart
      }
      runStart = -1
    }
  }
  if (bestStart < 0) {
    return box.top + box.height
  }
  return bestStart + Math.floor(bestLength / 2)
}

function padded(box: Box, pad: number, width: number, height: number): Box {
  const left = Math.max(0, box.left - pad)
  const top = Math.max(0, box.top - pad)
  const right = Math.min(width, box.left + box.width + pad)
  const bottom = Math.min(height, box.top + box.height + pad)
  return { left, top, width: right - left, height: bottom - top }
}

async function fitted(image: Sharp, box: Box, size: number, out: string) {
  const crop = image.clone().extract(box)
  const meta = { width: box.width, height: box.height }
  const target = Math.min(size, Math.max(meta.width, meta.height)) // never upscale
  await crop
    .resize({
      width: target,
      height: target,
      fit: 'contain',
      background: SURFACE,
      withoutEnlargement: true,
    })
    .flatten({ background: SURFACE })
    .png({ compressionLevel: 9 })
    .toFile(path.join(BRAND_DIR, out))
  process.stdout.write(`wrote ${out} (${target}px)\n`)
}

function sparkleSvg(width: number, height: number, seed: number, count: number): string {
  let a = seed >>> 0
  const random = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const stars: string[] = []
  for (let i = 0; i < count; i += 1) {
    const x = random() * width
    const y = random() * height
    const s = 6 + random() * 22
    const o = (0.35 + random() * 0.65).toFixed(2)
    stars.push(
      `<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(s / 24).toFixed(3)})" fill="#f6e3b4" fill-opacity="${o}" d="M12 0c.6 6.6 4.8 10.8 12 12-7.2 1.2-11.4 5.4-12 12-.6-6.6-4.8-10.8-12-12 7.2-1.2 11.4-5.4 12-12Z"/>`,
    )
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1f0b21"/><stop offset=".55" stop-color="${PLUM}"/><stop offset="1" stop-color="#5d2f5b"/></linearGradient></defs>
    <rect width="${width}" height="${height}" fill="url(#g)"/>
    ${stars.join('\n')}
  </svg>`
}

async function main() {
  if (!fs.existsSync(SOURCE)) {
    throw new Error(`Missing ${SOURCE}: place the supplied logo there first.`)
  }
  const image = sharp(SOURCE).flatten({ background: SURFACE })
  const { box, rows, width, height } = await inkBox(image)
  const pad = Math.round(Math.max(box.width, box.height) * 0.06)
  const full = padded(box, pad, width, height)
  const split = splitRow(rows, box)
  const markInk: Box = { left: box.left, top: box.top, width: box.width, height: split - box.top }
  // Re-measure the monogram's own horizontal extent (it is narrower than the wordmark).
  const { box: markBox } = await inkBox(image.clone().extract(markInk))
  const markPadded = padded(
    {
      left: markInk.left + markBox.left,
      top: markInk.top + markBox.top,
      width: markBox.width,
      height: markBox.height,
    },
    Math.round(Math.max(markBox.width, markBox.height) * 0.08),
    width,
    height,
  )
  // Never let the mark crop reach into the wordmark below the gap.
  const markBottom = Math.min(markPadded.top + markPadded.height, split)
  const mark: Box = { ...markPadded, height: markBottom - markPadded.top }

  await fitted(image, full, 512, 'logo-full-512.png')
  await fitted(image, { left: 0, top: 0, width, height }, 512, 'logo-512.png')
  await fitted(image, mark, 192, 'logo-mark-192.png')
  await fitted(image, mark, 64, 'logo-mark-64.png')
  await fitted(image, mark, 32, 'favicon-32.png')
  await fitted(image, mark, 16, 'favicon-16.png')
  await fitted(image, mark, 180, 'apple-touch-icon.png')

  // Sharing image: plum gradient with stars and the full logo on its light tile.
  const tile = await image
    .clone()
    .extract(full)
    .resize({
      width: 420,
      height: 420,
      fit: 'contain',
      background: SURFACE,
      withoutEnlargement: true,
    })
    .flatten({ background: SURFACE })
    .png()
    .toBuffer()
  const tileMeta = await sharp(tile).metadata()
  const tileW = tileMeta.width ?? 420
  const tileH = tileMeta.height ?? 420
  const rounded = Buffer.from(
    `<svg width="${tileW}" height="${tileH}"><rect width="${tileW}" height="${tileH}" rx="36" ry="36" fill="#fff"/></svg>`,
  )
  const tileRounded = await sharp(tile)
    .composite([{ input: rounded, blend: 'dest-in' }])
    .png()
    .toBuffer()
  await sharp(Buffer.from(sparkleSvg(1200, 630, 99, 70)))
    .composite([
      {
        input: tileRounded,
        left: Math.round((1200 - tileW) / 2),
        top: Math.round((630 - tileH) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toFile(path.join(BRAND_DIR, 'social-default.png'))
  process.stdout.write('wrote social-default.png (1200x630)\n')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
