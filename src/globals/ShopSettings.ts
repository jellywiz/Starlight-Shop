import type { GlobalConfig } from 'payload'

import { anyone, ownerOnly } from '@/access'
import { translatedField } from '@/fields/translated'
import { trimTranslations } from '@/hooks/localized'
import { LOCALES, LOCALE_META } from '@/i18n/config'
import { SHOP_DEFAULTS, isInstagramProfileUrl } from '@/lib/shop'

/**
 * Shop-wide public content (spec section 6 "Shop settings global"): public name, logo,
 * the confirmed Instagram profile, the translated introduction and the default language.
 * No phone, WhatsApp, address, map or external-shop fields exist in this release.
 */
export const ShopSettings: GlobalConfig = {
  slug: 'shop-settings',
  label: 'Shop settings',
  admin: {
    group: 'Administration',
    description:
      'Public shop name, logo, Instagram destination and the introduction text. Changes are live on the next page request.',
  },
  access: {
    read: anyone,
    update: ownerOnly,
  },
  hooks: {
    beforeChange: [
      ({ data, req }) => {
        if (typeof data.instagramUrl === 'string') {
          data.instagramUrl = data.instagramUrl.trim()
        }
        trimTranslations(data.aboutText, { multiline: true })
        if (req.user && req.user.collection === 'users') {
          data.updatedBy = req.user.id
        }
        return data
      },
    ],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Identity',
          fields: [
            {
              name: 'publicName',
              type: 'text',
              required: true,
              defaultValue: SHOP_DEFAULTS.publicName,
              maxLength: 80,
            },
            {
              name: 'logo',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description:
                  'Optional replacement logo image. Leave empty to use the built-in Starlight logo files.',
              },
            },
            {
              name: 'defaultLocale',
              type: 'select',
              required: true,
              defaultValue: 'ckb',
              options: LOCALES.map((code) => ({
                label: `${LOCALE_META[code].label} (${code})`,
                value: code,
              })),
              admin: { description: 'Language shown when a visitor opens the site root.' },
            },
          ],
        },
        {
          label: 'Instagram',
          fields: [
            {
              name: 'instagramUrl',
              type: 'text',
              label: 'Instagram profile URL',
              required: true,
              defaultValue: SHOP_DEFAULTS.instagramUrl,
              validate: (value: unknown) =>
                isInstagramProfileUrl(value)
                  ? true
                  : 'Enter the full HTTPS profile address on instagram.com, e.g. https://www.instagram.com/sl_.jewellery/',
              admin: {
                rtl: false,
                description:
                  'The confirmed contact destination. Every "Enquire on Instagram" action opens this profile; the handle shown on the site is taken from it. Test the public link after saving.',
              },
            },
          ],
        },
        {
          label: 'Introduction',
          fields: [
            translatedField({
              name: 'aboutText',
              label: 'Introduction',
              type: 'textarea',
              maxLength: 3000,
              rows: 6,
              description:
                'Short factual introduction to the handmade jewellery shop, shown on the About page and the home page. A language left empty shows the built-in text.',
            }),
          ],
        },
      ],
    },
    {
      name: 'updatedBy',
      type: 'relationship',
      relationTo: 'users',
      access: { read: ({ req }) => Boolean(req.user), update: () => false },
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}
