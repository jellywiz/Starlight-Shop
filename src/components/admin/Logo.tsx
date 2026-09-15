import React from 'react'

/** Admin panel branding: the supplied Starlight logo mark on its light surface. */
export const Logo: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src="/brand/logo-mark-192.png"
      alt=""
      width={56}
      height={56}
      style={{ background: '#fdfdfd', borderRadius: '12px' }}
    />
    <span style={{ fontSize: '1.5rem', fontWeight: 600 }}>Starlight Jewellery</span>
  </div>
)

export const Icon: React.FC = () => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src="/brand/logo-mark-64.png"
    alt=""
    width={28}
    height={28}
    style={{ background: '#fdfdfd', borderRadius: '6px' }}
  />
)
