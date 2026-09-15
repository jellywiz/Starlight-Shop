'use client'

import type { NumberFieldClientComponent } from 'payload'
import React from 'react'

import { DinarField } from './DinarField'

/** Product price: a positive whole dinar amount (spec section 5). */
export const PriceIqdField: NumberFieldClientComponent = (props) => (
  <DinarField {...props} allowZero={false} defaultLabel="Price (IQD)" />
)
