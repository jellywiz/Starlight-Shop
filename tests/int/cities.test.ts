import { beforeAll, describe, expect, it } from 'vitest'

import { listDeliveryCities } from '@/lib/catalog/queries'

import { createCity, createOwner, expectFailure, resetDatabase, testPayload } from './helpers'

describe('delivery cities: activation rules, ordering and public reads (A21–A25)', () => {
  beforeAll(async () => {
    const payload = await testPayload()
    await resetDatabase(payload)
    await createOwner(payload)
  })

  it('lists active cities with translated names and saved fees in the configured order (A21, A22)', async () => {
    const payload = await testPayload()
    const second = await createCity(
      payload,
      { ckb: 'شاری دوو', ar: 'مدينة اثنان', en: 'City two' },
      7500,
      { sortOrder: 2 },
    )
    const first = await createCity(
      payload,
      { ckb: 'شاری یەک', ar: 'مدينة واحد', en: 'City one' },
      5000,
      { sortOrder: 1 },
    )
    const third = await createCity(
      payload,
      { ckb: 'شاری سێ', ar: 'مدينة ثلاثة', en: 'Another city' },
      6000,
      { sortOrder: 2 },
    )

    const en = await listDeliveryCities('en')
    expect(en.map((c) => c.name)).toEqual(['City one', 'Another city', 'City two'])
    expect(en.map((c) => c.id)).toEqual([first.id, third.id, second.id])
    expect(en[0]).toEqual({ id: first.id, name: 'City one', feeIqd: 5000, currency: 'IQD' })

    const ckb = await listDeliveryCities('ckb')
    expect(ckb.find((c) => c.id === first.id)?.name).toBe('شاری یەک')
    const ar = await listDeliveryCities('ar')
    expect(ar.find((c) => c.id === first.id)?.name).toBe('مدينة واحد')

    // A fee change is visible on the next read without any redeploy.
    await payload.update({
      collection: 'cities',
      id: first.id,
      data: { feeIqd: 5500, isActive: true },
      locale: 'en',
      overrideAccess: true,
    })
    const updated = await listDeliveryCities('en')
    expect(updated.find((c) => c.id === first.id)?.feeIqd).toBe(5500)
  })

  it('refuses to activate incomplete records and rejects invalid fees (A23)', async () => {
    const payload = await testPayload()
    // Missing translations and fee: can be saved inactive, not activated.
    const partial = await payload.create({
      collection: 'cities',
      data: { name: 'Partial city', isActive: false },
      locale: 'en',
      overrideAccess: true,
    })
    const messages = await expectFailure(() =>
      payload.update({
        collection: 'cities',
        id: partial.id,
        data: { isActive: true },
        locale: 'en',
        overrideAccess: true,
      }),
    )
    expect(messages).toMatch(/Cannot activate this city: the name is missing in .*Sorani Kurdish/)
    expect(messages).toMatch(/Arabic/)
    expect(messages).toMatch(/delivery fee is missing/i)

    for (const feeIqd of [-1, 12.5, 1_000_000_000]) {
      await expect(
        payload.create({
          collection: 'cities',
          data: { name: `Bad fee ${feeIqd}`, feeIqd, isActive: false },
          locale: 'en',
          overrideAccess: true,
        }),
      ).rejects.toThrow()
    }
  })

  it('treats zero as intentional free delivery only after confirmation (A23)', async () => {
    const payload = await testPayload()
    const free = await createCity(
      payload,
      { ckb: 'شاری بەخۆڕایی', ar: 'مدينة مجانية', en: 'Free city' },
      0,
      { isActive: false, freeDeliveryConfirmed: false, sortOrder: 9 },
    )
    const messages = await expectFailure(() =>
      payload.update({
        collection: 'cities',
        id: free.id,
        data: { isActive: true },
        locale: 'en',
        overrideAccess: true,
      }),
    )
    expect(messages).toMatch(/intentionally free/)

    await payload.update({
      collection: 'cities',
      id: free.id,
      data: { isActive: true, freeDeliveryConfirmed: true },
      locale: 'en',
      overrideAccess: true,
    })
    const cities = await listDeliveryCities('en')
    const listed = cities.find((c) => c.id === free.id)
    // Zero is returned as an explicit amount, never omitted or treated as missing.
    expect(listed).toEqual({ id: free.id, name: 'Free city', feeIqd: 0, currency: 'IQD' })
  })

  it('rejects duplicate normalized names within a language (A24)', async () => {
    const payload = await testPayload()
    await createCity(
      payload,
      { ckb: 'شاری نموونە', ar: 'مدينة نموذجية', en: 'Sample city' },
      1000,
      {
        sortOrder: 20,
      },
    )
    const duplicateEnglish = await expectFailure(() =>
      payload.create({
        collection: 'cities',
        data: { name: '  sample   CITY ', feeIqd: 2000, isActive: false },
        locale: 'en',
        overrideAccess: true,
      }),
    )
    expect(duplicateEnglish).toMatch(/name: .*already exists in English/)

    // Arabic keyboard variants of the same Sorani name are duplicates too.
    const other = await payload.create({
      collection: 'cities',
      data: { name: 'Other city', feeIqd: 2000, isActive: false },
      locale: 'en',
      overrideAccess: true,
    })
    const duplicateSorani = await expectFailure(() =>
      payload.update({
        collection: 'cities',
        id: other.id,
        data: { name: 'شاري نموونە' },
        locale: 'ckb',
        overrideAccess: true,
      }),
    )
    expect(duplicateSorani).toMatch(/already exists in Sorani Kurdish/)

    // The same string in a DIFFERENT language is not a duplicate.
    await payload.update({
      collection: 'cities',
      id: other.id,
      data: { name: 'Sample city' },
      locale: 'ckb',
      overrideAccess: true,
    })
  })

  it('hides deactivated and deleted cities from the public and from anonymous reads (A24, A25)', async () => {
    const payload = await testPayload()
    const city = await createCity(
      payload,
      { ckb: 'شاری کاتی', ar: 'مدينة مؤقتة', en: 'Temporary city' },
      3000,
      { sortOrder: 30 },
    )
    expect((await listDeliveryCities('en')).some((c) => c.id === city.id)).toBe(true)

    await payload.update({
      collection: 'cities',
      id: city.id,
      data: { isActive: false },
      locale: 'en',
      overrideAccess: true,
    })
    expect((await listDeliveryCities('en')).some((c) => c.id === city.id)).toBe(false)
    const anonymous = await payload.find({
      collection: 'cities',
      where: { id: { equals: city.id } },
      overrideAccess: false,
    })
    expect(anonymous.totalDocs).toBe(0)
    await expect(
      payload.findByID({ collection: 'cities', id: city.id, overrideAccess: false }),
    ).rejects.toThrow()

    // Public projections never expose internal fields.
    const listed = await payload.find({ collection: 'cities', overrideAccess: false, limit: 1 })
    expect(listed.docs[0]).not.toHaveProperty('normalizedName')
    expect(listed.docs[0]).not.toHaveProperty('updatedBy')

    // Cities have no product relationship: deletion just needs the admin confirmation.
    await payload.delete({ collection: 'cities', id: city.id, overrideAccess: true })
    const remaining = await payload.find({
      collection: 'cities',
      where: { id: { equals: city.id } },
      overrideAccess: true,
    })
    expect(remaining.totalDocs).toBe(0)
  })
})
