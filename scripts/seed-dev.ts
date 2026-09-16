/**
 * Development seed: SYNTHETIC sample data for local work and screenshots only.
 * Refuses to run against a hosted database. Product names, descriptions, city names and
 * fees are invented placeholders, never real shop inventory or real delivery charges
 * (spec section 8 "Content standards").
 *
 *   pnpm seed:dev            adds sample categories, images, products and two cities
 *   pnpm seed:dev --owner    also creates a dev owner (dev@example.com / Dev-password-1)
 */
import './lib/load-env'

import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'

type L = Record<'ckb' | 'ar' | 'en', string>

const CATEGORIES: { slug: string; name: L; sortOrder: number }[] = [
  { slug: 'necklaces', name: { ckb: 'ملوانکە', ar: 'قلائد', en: 'Necklaces' }, sortOrder: 1 },
  { slug: 'bracelets', name: { ckb: 'بازن', ar: 'أساور', en: 'Bracelets' }, sortOrder: 2 },
  { slug: 'rings', name: { ckb: 'ئەڵقە', ar: 'خواتم', en: 'Rings' }, sortOrder: 3 },
  { slug: 'earrings', name: { ckb: 'گوارە', ar: 'أقراط', en: 'Earrings' }, sortOrder: 4 },
]

type SampleProduct = {
  key: string
  category: string
  priceIqd: number
  available: boolean
  featured: boolean
  name: L
  description: L
  color: string
}

const PRODUCTS: SampleProduct[] = [
  {
    key: 'star-necklace',
    category: 'necklaces',
    priceIqd: 25000,
    available: true,
    featured: true,
    color: '#482044',
    name: { ckb: 'ملوانکەی ئەستێرەی نموونە', ar: 'قلادة نجمة تجريبية', en: 'Sample star necklace' },
    description: {
      ckb: 'ئەمە داتای نموونەیە بۆ گەشەپێدان. ملوانکەیەکی دەستکرد لەگەڵ ئاوێزانێکی ئەستێرەیی.',
      ar: 'هذه بيانات تجريبية للتطوير. قلادة مصنوعة يدويًا مع دلاية على شكل نجمة.',
      en: 'SAMPLE DATA for development. Handmade necklace with a small star pendant.',
    },
  },
  {
    key: 'moon-necklace',
    category: 'necklaces',
    priceIqd: 32000,
    available: false,
    featured: true,
    color: '#5d2f5b',
    name: { ckb: 'ملوانکەی مانگی نموونە', ar: 'قلادة هلال تجريبية', en: 'Sample moon necklace' },
    description: {
      ckb: 'ئەمە داتای نموونەیە بۆ گەشەپێدان. ملوانکەیەکی دەستکرد بە شێوەی مانگی نوێ.',
      ar: 'هذه بيانات تجريبية للتطوير. قلادة مصنوعة يدويًا على شكل هلال.',
      en: 'SAMPLE DATA for development. Handmade crescent moon necklace.',
    },
  },
  {
    key: 'beaded-bracelet',
    category: 'bracelets',
    priceIqd: 15000,
    available: true,
    featured: true,
    color: '#78467a',
    name: { ckb: 'بازنی مۆرەی نموونە', ar: 'سوار خرز تجريبي', en: 'Sample beaded bracelet' },
    description: {
      ckb: 'ئەمە داتای نموونەیە بۆ گەشەپێدان. بازنێکی دەستکرد لە مۆرەی بچووک.',
      ar: 'هذه بيانات تجريبية للتطوير. سوار مصنوع يدويًا من خرز صغير.',
      en: 'SAMPLE DATA for development. Handmade bracelet of small beads.',
    },
  },
  {
    key: 'twist-ring',
    category: 'rings',
    priceIqd: 12000,
    available: true,
    featured: false,
    color: '#3a1a3c',
    name: { ckb: 'ئەڵقەی پێچراوی نموونە', ar: 'خاتم ملتوٍ تجريبي', en: 'Sample twist ring' },
    description: {
      ckb: 'ئەمە داتای نموونەیە بۆ گەشەپێدان. ئەڵقەیەکی دەستکرد بە شێوەی پێچراو.',
      ar: 'هذه بيانات تجريبية للتطوير. خاتم مصنوع يدويًا بتصميم ملتوٍ.',
      en: 'SAMPLE DATA for development. Handmade ring with a twisted band.',
    },
  },
  {
    key: 'drop-earrings',
    category: 'earrings',
    priceIqd: 18500,
    available: true,
    featured: true,
    color: '#9a6b9b',
    name: { ckb: 'گوارەی دڵۆپەی نموونە', ar: 'أقراط متدلية تجريبية', en: 'Sample drop earrings' },
    description: {
      ckb: 'ئەمە داتای نموونەیە بۆ گەشەپێدان. جووتێک گوارەی دەستکردی دڵۆپەیی.',
      ar: 'هذه بيانات تجريبية للتطوير. زوج أقراط متدلية مصنوعة يدويًا.',
      en: 'SAMPLE DATA for development. A pair of handmade drop earrings.',
    },
  },
  {
    key: 'stud-earrings',
    category: 'earrings',
    priceIqd: 9000,
    available: true,
    featured: false,
    color: '#2d1230',
    name: { ckb: 'گوارەی بچووکی نموونە', ar: 'أقراط صغيرة تجريبية', en: 'Sample stud earrings' },
    description: {
      ckb: 'ئەمە داتای نموونەیە بۆ گەشەپێدان. گوارەی بچووکی دەستکرد.',
      ar: 'هذه بيانات تجريبية للتطوير. أقراط صغيرة مصنوعة يدويًا.',
      en: 'SAMPLE DATA for development. Small handmade stud earrings.',
    },
  },
]

/** Sample cities: invented fees, never real delivery charges. The zero fee is a test fixture. */
const CITIES: { name: L; feeIqd: number; sortOrder: number }[] = [
  {
    name: { ckb: 'شاری نموونە ١', ar: 'مدينة تجريبية ١', en: 'Sample city 1' },
    feeIqd: 5000,
    sortOrder: 1,
  },
  {
    name: { ckb: 'شاری نموونە ٢', ar: 'مدينة تجريبية ٢', en: 'Sample city 2' },
    feeIqd: 0,
    sortOrder: 2,
  },
]

function assertLocalDatabase() {
  const uri = process.env.DATABASE_URI ?? ''
  if (!/(127\.0\.0\.1|localhost)/.test(uri)) {
    throw new Error(
      'seed:dev only runs against a local database (DATABASE_URI must point to 127.0.0.1 or localhost).',
    )
  }
}

async function sampleImage(color: string, label: string): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200">
    <rect width="1200" height="1200" fill="#ffffff"/>
    <circle cx="600" cy="560" r="330" fill="none" stroke="${color}" stroke-width="46"/>
    <path transform="translate(600 560) scale(9)" fill="${color}" d="M12 0c.6 6.6 4.8 10.8 12 12-7.2 1.2-11.4 5.4-12 12-.6-6.6-4.8-10.8-12-12 7.2-1.2 11.4-5.4 12-12Z"/>
    <text x="600" y="1010" font-family="Arial, sans-serif" font-size="60" fill="${color}" text-anchor="middle">${label}</text>
    <text x="600" y="1090" font-family="Arial, sans-serif" font-size="40" fill="#7d6c7e" text-anchor="middle">SAMPLE IMAGE</text>
  </svg>`
  return sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer()
}

async function ensureOwner(payload: Payload) {
  const existing = await payload.count({ collection: 'users', overrideAccess: true })
  if (existing.totalDocs > 0) {
    return
  }
  await payload.create({
    collection: 'users',
    data: { email: 'dev@example.com', password: 'Dev-password-1', role: 'owner' },
    overrideAccess: true,
    context: { allowFirstUser: true },
  })
  process.stdout.write('Created dev owner dev@example.com / Dev-password-1\n')
}

async function main() {
  assertLocalDatabase()
  const payload = await getPayload({ config })
  if (process.argv.includes('--owner')) {
    await ensureOwner(payload)
  }

  const categoryIds = new Map<string, number>()
  for (const category of CATEGORIES) {
    const found = await payload.find({
      collection: 'categories',
      where: { slug: { equals: category.slug } },
      limit: 1,
      overrideAccess: true,
    })
    let id = found.docs[0]?.id
    if (!id) {
      const created = await payload.create({
        collection: 'categories',
        data: {
          name: category.name,
          slug: category.slug,
          sortOrder: category.sortOrder,
          isActive: true,
        },
        overrideAccess: true,
      })
      id = created.id
    }
    categoryIds.set(category.slug, id)
  }

  for (const product of PRODUCTS) {
    const exists = await payload.find({
      collection: 'products',
      where: { slug: { equals: `sample-${product.key}` } },
      limit: 1,
      overrideAccess: true,
      draft: true,
    })
    if (exists.totalDocs > 0) {
      continue
    }
    const photoIds: number[] = []
    for (let i = 1; i <= 2; i += 1) {
      const data = await sampleImage(product.color, `${product.name.en} ${i}`)
      // The first photo carries an optional description; the second relies on the fallback
      // (the product name in the page's language), as most real uploads will.
      const media = await payload.create({
        collection: 'media',
        data: { altText: i === 1 ? `${product.name.en} on a white background` : undefined },
        file: { data, mimetype: 'image/jpeg', name: 'sample.jpg', size: data.length },
        overrideAccess: true,
      })
      photoIds.push(media.id)
    }
    // Saved as a draft first, then published, like the admin's Save Draft → Publish flow.
    const created = await payload.create({
      collection: 'products',
      data: {
        name: product.name,
        description: product.description,
        slug: `sample-${product.key}`,
        category: categoryIds.get(product.category)!,
        photos: photoIds,
        priceIqd: product.priceIqd,
        isAvailable: product.available,
        featured: product.featured,
        _status: 'draft',
      },
      draft: true,
      overrideAccess: true,
    })
    await payload.update({
      collection: 'products',
      id: created.id,
      data: { _status: 'published' },
      draft: false,
      overrideAccess: true,
    })
    process.stdout.write(`Published sample product ${product.key}\n`)
  }

  const existingCities = await payload.count({ collection: 'cities', overrideAccess: true })
  if (existingCities.totalDocs === 0) {
    for (const city of CITIES) {
      await payload.create({
        collection: 'cities',
        data: {
          name: city.name,
          feeIqd: city.feeIqd,
          sortOrder: city.sortOrder,
          freeDeliveryConfirmed: city.feeIqd === 0,
          isActive: true,
        },
        overrideAccess: true,
      })
      process.stdout.write(`Activated sample city ${city.name.en} (fee ${city.feeIqd})\n`)
    }
  }

  const settings = await payload.findGlobal({ slug: 'shop-settings', overrideAccess: true })
  if (!settings.aboutText?.en) {
    await payload.updateGlobal({
      slug: 'shop-settings',
      data: {
        aboutText: {
          en: 'SAMPLE about text. Starlight Jewellery makes handmade jewellery and accessories; every piece is made by hand and orders are arranged through Instagram messages.',
          ckb: 'دەقی نموونە. ستارلایت جوێلەری خشڵ و ئەکسسواری دەستکرد دروست دەکات؛ هەموو پارچەیەک بە دەست دروست کراوە و داواکارییەکان لە ڕێگەی نامەی ئینستاگرامەوە ڕێک دەخرێن.',
          ar: 'نص تجريبي. ستارلايت جوليري تصنع مجوهرات وإكسسوارات يدوية؛ كل قطعة مصنوعة يدويًا وتُرتَّب الطلبات عبر رسائل إنستغرام.',
        },
      },
      overrideAccess: true,
    })
    process.stdout.write('Filled sample shop settings\n')
  }
  process.stdout.write('Seed complete.\n')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
