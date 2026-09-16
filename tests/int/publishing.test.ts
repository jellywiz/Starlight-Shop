import sharp from 'sharp'
import { describe, expect, it, beforeAll } from 'vitest'

import { MAX_UPLOAD_BYTES } from '@/collections/Media'

import {
  createCategory,
  createMedia,
  createOwner,
  createProduct,
  expectFailure,
  ownerUser,
  resetDatabase,
  testPayload,
} from './helpers'

const ALT = 'Necklace photo'

describe('content model: publishing, drafts and access (A02, A04, A05, A06, A13)', () => {
  let categoryId: number
  let mediaId: number

  beforeAll(async () => {
    const payload = await testPayload()
    await resetDatabase(payload)
    await createOwner(payload)
    const category = await createCategory(
      payload,
      { ckb: 'ملوانکە', ar: 'قلائد', en: 'Necklaces' },
      'necklaces',
    )
    const media = await createMedia(payload, { alt: ALT })
    categoryId = category.id
    mediaId = media.id
  })

  it('blocks first-user registration without the bootstrap context', async () => {
    const payload = await testPayload()
    await expect(
      payload.create({
        collection: 'users',
        data: { email: 'stranger@example.com', password: 'Stranger-password-1', role: 'owner' },
        overrideAccess: true,
      }),
    ).rejects.toThrow()
  })

  it('derives the slug and search fields, and refuses to publish an incomplete product (A04)', async () => {
    const payload = await testPayload()
    const draft = await payload.create({
      collection: 'products',
      data: {
        name: { en: '  Star   necklace ' },
        category: categoryId,
        photos: [mediaId],
        priceIqd: 25000,
        isAvailable: true,
        description: { en: 'English only description' },
        _status: 'draft',
      },
      draft: true,
      overrideAccess: true,
    })
    expect(draft.slug).toBe('star-necklace')
    expect(draft.name?.en).toBe('Star necklace')
    expect(draft.adminTitle).toBe('Star necklace')

    const owner = await ownerUser(payload)
    const hidden = await payload.findByID({
      collection: 'products',
      id: draft.id,
      user: owner,
      overrideAccess: false,
      draft: true,
      context: { catalogRead: true },
    })
    expect(hidden.normalizedName).toBe('star necklace')
    expect(hidden.searchText).toContain('english only description')

    // Public reads reveal nothing about drafts.
    const publicList = await payload.find({
      collection: 'products',
      overrideAccess: false,
      draft: false,
      where: { slug: { equals: draft.slug } },
    })
    expect(publicList.totalDocs).toBe(0)
    await expect(
      payload.findByID({
        collection: 'products',
        id: draft.id,
        overrideAccess: false,
        draft: false,
      }),
    ).rejects.toThrow()

    // Publishing must name the missing locales.
    const messages = await expectFailure(() =>
      payload.update({
        collection: 'products',
        id: draft.id,
        data: { _status: 'published' },
        overrideAccess: true,
      }),
    )
    expect(messages).toMatch(/name\.ckb: .*Sorani Kurdish/)
    expect(messages).toMatch(/name\.ar: .*Arabic/)
    expect(messages).toMatch(/description\.ar: .*Arabic/)
    expect(messages).not.toMatch(/photos/)
  })

  it('suffixes the slug when product names repeat (names need not be unique)', async () => {
    const payload = await testPayload()
    const first = await createProduct(payload, {
      names: { ckb: 'بازنی مۆرە', ar: 'سوار خرز', en: 'Beaded bracelet' },
      category: categoryId,
      photos: [mediaId],
      priceIqd: 15000,
    })
    const second = await createProduct(payload, {
      names: { ckb: 'بازنی مۆرە', ar: 'سوار خرز', en: 'Beaded bracelet' },
      category: categoryId,
      photos: [mediaId],
      priceIqd: 16000,
    })
    expect(first.slug).toBe('beaded-bracelet')
    expect(second.slug).toBe('beaded-bracelet-2')

    // A first save with only the Kurdish name has no English name yet: the slug waits.
    const kurdishFirst = await payload.create({
      collection: 'products',
      data: {
        name: { ckb: 'گوارە' },
        description: { ckb: 'وەسف' },
        category: categoryId,
        priceIqd: 9000,
        isAvailable: false,
        _status: 'draft',
      },
      draft: true,
      overrideAccess: true,
    })
    expect(kurdishFirst.slug ?? null).toBeNull()
    expect(kurdishFirst.adminTitle).toBe('گوارە')
    const withEnglish = await payload.update({
      collection: 'products',
      id: kurdishFirst.id,
      data: { name: { en: 'Stud earrings' }, description: { en: 'Small studs' }, _status: 'draft' },
      draft: true,
      overrideAccess: true,
    })
    expect(withEnglish.slug).toBe('stud-earrings')
    // A partial update keeps the other languages and refreshes the admin title.
    expect(withEnglish.name).toMatchObject({ ckb: 'گوارە', en: 'Stud earrings' })
    expect(withEnglish.adminTitle).toBe('Stud earrings · گوارە')
  })

  it('publishes a complete product and serves the last published revision while a draft exists (A02, A05, A06, A15)', async () => {
    const payload = await testPayload()
    const product = await createProduct(
      payload,
      {
        names: { ckb: 'ملوانکەی مانگ', ar: 'قلادة هلال', en: 'Moon necklace' },
        category: categoryId,
        photos: [mediaId],
        priceIqd: 32000,
      },
      { publish: true },
    )
    expect(product._status).toBe('published')
    expect(product.publishedAt).toBeTruthy()

    // Public read: six business fields with every language, shared whole-dinar price.
    const result = await payload.find({
      collection: 'products',
      where: { slug: { equals: product.slug } },
      overrideAccess: false,
      draft: false,
      depth: 1,
    })
    expect(result.totalDocs).toBe(1)
    expect(result.docs[0].name).toEqual({
      ckb: 'ملوانکەی مانگ',
      ar: 'قلادة هلال',
      en: 'Moon necklace',
    })
    expect(result.docs[0].priceIqd).toBe(32000)
    // Internal fields never reach anonymous readers.
    expect(result.docs[0]).not.toHaveProperty('searchText')
    expect(result.docs[0]).not.toHaveProperty('normalizedName')
    expect(result.docs[0]).not.toHaveProperty('updatedBy')

    // Draft edit of a published item keeps the public price until Publish.
    await payload.update({
      collection: 'products',
      id: product.id,
      data: { priceIqd: 35000, _status: 'draft' },
      draft: true,
      overrideAccess: true,
    })
    const stillPublished = await payload.findByID({
      collection: 'products',
      id: product.id,
      overrideAccess: false,
      draft: false,
    })
    expect(stillPublished.priceIqd).toBe(32000)
    expect(stillPublished._status).toBe('published')

    const latestDraft = await payload.findByID({
      collection: 'products',
      id: product.id,
      overrideAccess: true,
      draft: true,
    })
    expect(latestDraft.priceIqd).toBe(35000)

    // Publish again: fresh public read shows the new price (A15).
    await payload.update({
      collection: 'products',
      id: product.id,
      data: { _status: 'published' },
      draft: false,
      overrideAccess: true,
    })
    const republished = await payload.findByID({
      collection: 'products',
      id: product.id,
      overrideAccess: false,
      draft: false,
    })
    expect(republished.priceIqd).toBe(35000)

    // Toggling availability keeps the item public (A03).
    await payload.update({
      collection: 'products',
      id: product.id,
      data: { isAvailable: false, _status: 'published' },
      draft: false,
      overrideAccess: true,
    })
    const unavailable = await payload.findByID({
      collection: 'products',
      id: product.id,
      overrideAccess: false,
      draft: false,
    })
    expect(unavailable.isAvailable).toBe(false)

    // Unpublish hides it from public list and direct reads (A06).
    await payload.update({
      collection: 'products',
      id: product.id,
      data: { _status: 'draft' },
      draft: false,
      overrideAccess: true,
    })
    const gone = await payload.find({
      collection: 'products',
      where: { slug: { equals: product.slug } },
      overrideAccess: false,
      draft: false,
    })
    expect(gone.totalDocs).toBe(0)
    await expect(
      payload.findByID({
        collection: 'products',
        id: product.id,
        overrideAccess: false,
        draft: false,
      }),
    ).rejects.toThrow()
  })

  it('rejects fractional, zero, negative and oversized dinar prices', async () => {
    const payload = await testPayload()
    for (const priceIqd of [12.5, 0, -1, 1_000_000_000, Number.NaN]) {
      await expect(
        payload.create({
          collection: 'products',
          data: {
            name: { en: 'Bad price' },
            category: categoryId,
            priceIqd,
            isAvailable: true,
            description: { en: 'x' },
            _status: 'draft',
          },
          draft: true,
          overrideAccess: true,
        }),
      ).rejects.toThrow()
    }
  })

  it('creates a redirect when a published slug changes and prevents loops', async () => {
    const payload = await testPayload()
    const product = await createProduct(
      payload,
      {
        names: { ckb: 'ئەڵقە', ar: 'خاتم', en: 'Twist ring' },
        category: categoryId,
        photos: [mediaId],
        priceIqd: 12000,
      },
      { publish: true },
    )
    const oldSlug = product.slug as string
    await payload.update({
      collection: 'products',
      id: product.id,
      data: { slug: 'twisted-silver-ring', _status: 'published' },
      draft: false,
      overrideAccess: true,
    })
    const redirects = await payload.find({
      collection: 'redirects',
      where: { oldSlug: { equals: oldSlug } },
      overrideAccess: false,
      depth: 1,
    })
    expect(redirects.totalDocs).toBe(1)
    const target = redirects.docs[0].product
    expect(typeof target === 'object' && target.slug).toBe('twisted-silver-ring')

    // Changing back removes the would-be loop and creates the reverse redirect.
    await payload.update({
      collection: 'products',
      id: product.id,
      data: { slug: oldSlug, _status: 'published' },
      draft: false,
      overrideAccess: true,
    })
    const loop = await payload.find({
      collection: 'redirects',
      where: { oldSlug: { equals: oldSlug } },
      overrideAccess: true,
    })
    expect(loop.totalDocs).toBe(0)
    const reverse = await payload.find({
      collection: 'redirects',
      where: { oldSlug: { equals: 'twisted-silver-ring' } },
      overrideAccess: true,
    })
    expect(reverse.totalDocs).toBe(1)
  })

  it('denies anonymous writes and private reads (A13)', async () => {
    const payload = await testPayload()
    await expect(
      payload.create({
        collection: 'products',
        data: {
          name: { en: 'Hacked' },
          category: categoryId,
          priceIqd: 1,
          isAvailable: true,
          description: { en: 'x' },
        },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    await expect(payload.find({ collection: 'users', overrideAccess: false })).rejects.toThrow()
    await expect(
      payload.findVersions({ collection: 'products', overrideAccess: false }),
    ).rejects.toThrow()
    await expect(
      payload.updateGlobal({
        slug: 'shop-settings',
        data: { instagramUrl: 'https://www.instagram.com/someone-else/' },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'cities',
        data: { name: { en: 'Hacked city' }, feeIqd: 0, isActive: true },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'categories',
        data: { name: { en: 'Hacked category' }, slug: 'hacked' },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('validates the Instagram destination in shop settings', async () => {
    const payload = await testPayload()
    for (const bad of [
      'http://www.instagram.com/sl_.jewellery/',
      'https://example.com/sl_.jewellery/',
      'https://www.instagram.com/',
      'https://www.instagram.com/sl_.jewellery/?utm=1',
      'not a url',
    ]) {
      await expect(
        payload.updateGlobal({
          slug: 'shop-settings',
          data: { instagramUrl: bad },
          overrideAccess: true,
        }),
      ).rejects.toThrow()
    }
    const ok = await payload.updateGlobal({
      slug: 'shop-settings',
      data: { instagramUrl: ' https://www.instagram.com/sl_.jewellery/ ' },
      overrideAccess: true,
    })
    expect(ok.instagramUrl).toBe('https://www.instagram.com/sl_.jewellery/')
    const anonymous = await payload.findGlobal({ slug: 'shop-settings', overrideAccess: false })
    expect(anonymous).not.toHaveProperty('updatedBy')
  })

  it('protects referenced media and categories, and requires reassignment before removal (A12)', async () => {
    const payload = await testPayload()
    const category = await createCategory(
      payload,
      { ckb: 'گوارە', ar: 'أقراط', en: 'Earrings' },
      'earrings',
    )
    const product = await createProduct(
      payload,
      {
        names: { ckb: 'گوارەی دڵۆپە', ar: 'أقراط متدلية', en: 'Drop earrings' },
        category: category.id,
        photos: [mediaId],
        priceIqd: 18500,
      },
      { publish: true },
    )
    await expect(
      payload.delete({ collection: 'media', id: mediaId, overrideAccess: true }),
    ).rejects.toThrow(/still used/)
    await expect(
      payload.update({
        collection: 'categories',
        id: category.id,
        data: { isActive: false },
        overrideAccess: true,
      }),
    ).rejects.toThrow(/cannot be deactivated/)
    await expect(
      payload.delete({ collection: 'categories', id: category.id, overrideAccess: true }),
    ).rejects.toThrow(/used by 1 product/)

    // After unpublishing, deactivation is allowed; deletion still counts the draft.
    await payload.update({
      collection: 'products',
      id: product.id,
      data: { _status: 'draft' },
      draft: false,
      overrideAccess: true,
    })
    await payload.update({
      collection: 'categories',
      id: category.id,
      data: { isActive: false },
      overrideAccess: true,
    })
    await expect(
      payload.delete({ collection: 'categories', id: category.id, overrideAccess: true }),
    ).rejects.toThrow(/used by 1 product/)

    // The draft cannot be published while its category is inactive.
    const messages = await expectFailure(() =>
      payload.update({
        collection: 'products',
        id: product.id,
        data: { _status: 'published' },
        draft: false,
        overrideAccess: true,
      }),
    )
    expect(messages).toMatch(/category: .*inactive/)

    // Reassigning the product frees the category for deletion.
    await payload.update({
      collection: 'products',
      id: product.id,
      data: { category: categoryId, _status: 'draft' },
      draft: true,
      overrideAccess: true,
    })
    await payload.delete({ collection: 'categories', id: category.id, overrideAccess: true })
  })

  it('requires all three names before a category can be activated', async () => {
    const payload = await testPayload()
    const partial = await payload.create({
      collection: 'categories',
      data: { name: { en: 'Brooches' }, slug: 'brooches', isActive: false },
      overrideAccess: true,
    })
    expect(partial.adminTitle).toBe('Brooches')
    const messages = await expectFailure(() =>
      payload.update({
        collection: 'categories',
        id: partial.id,
        data: { isActive: true },
        overrideAccess: true,
      }),
    )
    expect(messages).toMatch(
      /Cannot activate this category: the name is missing in .*Sorani Kurdish/,
    )
    expect(messages).toMatch(/Arabic/)
    // Inactive categories are invisible to anonymous readers.
    const anonymous = await payload.find({
      collection: 'categories',
      where: { slug: { equals: 'brooches' } },
      overrideAccess: false,
    })
    expect(anonymous.totalDocs).toBe(0)
  })

  it('rejects uploads that are not real images and strips metadata', async () => {
    const payload = await testPayload()
    const fake = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
    const rejected = await expectFailure(() =>
      payload.create({
        collection: 'media',
        data: {},
        file: { data: fake, mimetype: 'image/png', name: 'fake.png', size: fake.length },
        overrideAccess: true,
      }),
    )
    expect(rejected).toMatch(/JPEG, PNG and WebP/)

    const media = await createMedia(payload, { alt: ALT, width: 1600, height: 1200 })
    expect(media.filename).toMatch(/^[0-9a-f]{24}\.jpg$/)
    expect(media.sizes?.w320?.width).toBe(320)
    expect(media.sizes?.w640?.width).toBe(640)
    expect(media.sizes?.w1280?.width).toBe(1280)

    const small = await createMedia(payload, { width: 500, height: 400 })
    expect(small.sizes?.w320?.width).toBe(320)
    expect(small.sizes?.w640?.url ?? null).toBeNull()
    expect(small.sizes?.w1280?.url ?? null).toBeNull()
  })

  it('explains oversized uploads instead of failing on the truncated file', async () => {
    const payload = await testPayload()
    // Incompressible noise, so the PNG is comfortably above the 3 MB limit.
    const side = 1200
    const noise = Buffer.alloc(side * side * 3)
    let state = 0x9e3779b9
    for (let i = 0; i < noise.length; i += 1) {
      // xorshift32: deterministic pseudo-random bytes that PNG cannot compress.
      state ^= state << 13
      state ^= state >>> 17
      state ^= state << 5
      noise[i] = state & 0xff
    }
    const big = await sharp(noise, { raw: { width: side, height: side, channels: 3 } })
      .png({ compressionLevel: 1 })
      .toBuffer()
    expect(big.length).toBeGreaterThan(MAX_UPLOAD_BYTES)

    // Whole file over the limit (Local API): rejected by size with the real size shown.
    const whole = await expectFailure(() =>
      payload.create({
        collection: 'media',
        data: {},
        file: { data: big, mimetype: 'image/png', name: 'big.png', size: big.length },
        overrideAccess: true,
      }),
    )
    expect(whole).toMatch(/larger than 3 MB \(about \d+\.\d MB\)/)

    // What the REST multipart parser delivers for the same file: exactly 3 MB, flagged as
    // truncated. It must be reported as "too large", not as an image that cannot be processed.
    const cut = big.subarray(0, MAX_UPLOAD_BYTES)
    const truncatedFile = {
      data: cut,
      mimetype: 'image/png',
      name: 'big.png',
      size: cut.length,
      truncated: true,
    }
    const truncated = await expectFailure(() =>
      payload.create({
        collection: 'media',
        data: {},
        file: truncatedFile as unknown as NonNullable<Parameters<typeof payload.create>[0]['file']>,
        overrideAccess: true,
      }),
    )
    expect(truncated).toMatch(/larger than 3 MB/)
    expect(truncated).not.toMatch(/could not be processed/)

    // Too many pixels: the dimensions are named so the owner knows what to resize.
    const wide = await sharp({
      create: { width: 5000, height: 4100, channels: 3, background: '#482044' },
    })
      .jpeg({ quality: 30 })
      .toBuffer()
    expect(wide.length).toBeLessThan(MAX_UPLOAD_BYTES)
    const pixels = await expectFailure(() =>
      payload.create({
        collection: 'media',
        data: {},
        file: { data: wide, mimetype: 'image/jpeg', name: 'wide.jpg', size: wide.length },
        overrideAccess: true,
      }),
    )
    expect(pixels).toMatch(/5000 × 4100 pixels, more than 20 megapixels/)
  })
})
