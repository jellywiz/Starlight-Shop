'use client'

import type { NumberFieldClientComponent } from 'payload'
import React from 'react'

import { DinarField } from './DinarField'

/** Delivery fee: a whole dinar amount where 0 means intentional free delivery. */
export const FeeIqdField: NumberFieldClientComponent = (props) => (
  <DinarField
    {...props}
    allowZero
    defaultLabel="Delivery fee (IQD)"
    zeroHint="Fee 0: shown on the website as Free delivery once confirmed below."
  />
)
