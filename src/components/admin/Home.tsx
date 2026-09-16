import Link from 'next/link'
import type { AdminViewServerProps, Where } from 'payload'
import React from 'react'

import { siteUrl } from '@/lib/env'

import {
  ArrowIcon,
  GemIcon,
  GlobeIcon,
  PhotoIcon,
  PinIcon,
  PlusIcon,
  SettingsIcon,
  StarIcon,
  TagIcon,
} from './icons'

/**
 * The admin home (replaces Payload's dashboard): what the owner does most, as large
 * touch targets, with live counts so the state of the shop is visible at a glance.
 * Server component: counts come straight from the database on each visit.
 */
export async function Home(props: AdminViewServerProps) {
  const { payload, user } = props.initPageResult.req
  const admin = payload.config.routes.admin

  const count = (collection: 'categories' | 'cities' | 'media' | 'products', where?: Where) =>
    payload
      .count({ collection, where, overrideAccess: true })
      .then((r) => r.totalDocs)
      .catch(() => null)

  const [published, drafts, unavailable, photos, categories, cities] = await Promise.all([
    count('products', { _status: { equals: 'published' } }),
    count('products', { _status: { not_equals: 'published' } }),
    count('products', {
      and: [{ _status: { equals: 'published' } }, { isAvailable: { equals: false } }],
    }),
    count('media'),
    count('categories', { isActive: { equals: true } }),
    count('cities', { isActive: { equals: true } }),
  ])

  const n = (value: number | null) => (value === null ? '–' : value.toLocaleString('en-US'))
  const plural = (value: number | null, one: string, many: string) => (value === 1 ? one : many)

  const name = user?.email?.split('@')[0] ?? ''

  return (
    <div className="sl-home gutter gutter--left gutter--right">
      <header className="sl-home__hero">
        <div className="sl-home__hero-text">
          <p className="sl-home__eyebrow">
            <StarIcon className="sl-home__eyebrow-icon" /> Starlight Jewellery
          </p>
          <h1 className="sl-home__title">Hello{name ? `, ${name}` : ''}</h1>
          <p className="sl-home__lead">
            {published === null
              ? 'Your shop at a glance.'
              : `${n(published)} ${plural(published, 'product is', 'products are')} on the website${
                  drafts ? `, ${n(drafts)} ${plural(drafts, 'draft', 'drafts')} waiting` : ''
                }.`}
          </p>
        </div>
        <Link className="sl-home__cta" href={`${admin}/collections/products/create`}>
          <PlusIcon className="sl-home__cta-icon" />
          Add a product
        </Link>
      </header>

      <div className="sl-home__grid">
        <Link className="sl-tile sl-tile--products" href={`${admin}/collections/products`}>
          <GemIcon className="sl-tile__icon" />
          <span className="sl-tile__label">Products</span>
          <span className="sl-tile__count">{n(published)}</span>
          <span className="sl-tile__note">
            {published === null
              ? 'Open the list'
              : [
                  `${n(published)} published`,
                  drafts ? `${n(drafts)} ${plural(drafts, 'draft', 'drafts')}` : null,
                  unavailable ? `${n(unavailable)} unavailable` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
          </span>
          <ArrowIcon className="sl-tile__arrow" />
        </Link>
        <Link className="sl-tile" href={`${admin}/collections/media`}>
          <PhotoIcon className="sl-tile__icon" />
          <span className="sl-tile__label">Photos</span>
          <span className="sl-tile__count">{n(photos)}</span>
          <span className="sl-tile__note">Upload once, used in every language</span>
          <ArrowIcon className="sl-tile__arrow" />
        </Link>
        <Link className="sl-tile" href={`${admin}/collections/categories`}>
          <TagIcon className="sl-tile__icon" />
          <span className="sl-tile__label">Categories</span>
          <span className="sl-tile__count">{n(categories)}</span>
          <span className="sl-tile__note">Active categories</span>
          <ArrowIcon className="sl-tile__arrow" />
        </Link>
        <Link className="sl-tile" href={`${admin}/collections/cities`}>
          <PinIcon className="sl-tile__icon" />
          <span className="sl-tile__label">Delivery cities</span>
          <span className="sl-tile__count">{n(cities)}</span>
          <span className="sl-tile__note">Cities with a delivery fee shown</span>
          <ArrowIcon className="sl-tile__arrow" />
        </Link>
        <Link className="sl-tile" href={`${admin}/globals/shop-settings`}>
          <SettingsIcon className="sl-tile__icon" />
          <span className="sl-tile__label">Shop settings</span>
          <span className="sl-tile__note sl-tile__note--solo">
            Name, logo, Instagram link and the introduction text
          </span>
          <ArrowIcon className="sl-tile__arrow" />
        </Link>
        <a className="sl-tile sl-tile--site" href={siteUrl()} target="_blank" rel="noreferrer">
          <GlobeIcon className="sl-tile__icon" />
          <span className="sl-tile__label">View the website</span>
          <span className="sl-tile__note sl-tile__note--solo">
            Opens the public shop in a new tab
          </span>
          <ArrowIcon className="sl-tile__arrow" />
        </a>
      </div>

      <section className="sl-home__tips" aria-label="How publishing works">
        <h2 className="sl-home__tips-title">Good to know</h2>
        <ul className="sl-home__tips-list">
          <li>
            <strong>Save Draft</strong> keeps a product private; <strong>Publish</strong> puts it on
            the website. Publishing needs the name and description in all three languages, at least
            one photo and a price.
          </li>
          <li>
            Each photo is uploaded once and shared by all languages. Photos are JPEG, PNG or WebP up
            to 3 MB.
          </li>
          <li>
            Mark a product <strong>Unavailable</strong> to keep it visible with a label; use
            <strong> Unpublish</strong> to remove it from the website.
          </li>
        </ul>
      </section>
    </div>
  )
}
