import React from 'react'

import { siteUrl } from '@/lib/env'

import { GlobeIcon } from './icons'

/** Rendered after the collection links in the admin navigation: a link to the public site. */
export function NavExtras() {
  return (
    <div className="sl-nav-extras">
      <a className="sl-nav-extras__link" href={siteUrl()} target="_blank" rel="noreferrer">
        <GlobeIcon className="sl-nav-extras__icon" />
        <span>View the website</span>
      </a>
    </div>
  )
}
