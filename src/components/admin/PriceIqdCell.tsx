'use client'

import type { DefaultCellComponentProps, NumberFieldClient } from 'payload'
import React from 'react'

import { formatIqd } from '@/lib/catalog/dinar'

/** List-view cell showing the stored whole dinars as IQD 25,000. */
export const PriceIqdCell: React.FC<DefaultCellComponentProps<NumberFieldClient>> = ({
  cellData,
}) => {
  if (typeof cellData !== 'number') {
    return <span>—</span>
  }
  return <span dir="ltr">{formatIqd(cellData)}</span>
}
