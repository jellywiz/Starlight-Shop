'use client'

import type { DefaultCellComponentProps, NumberFieldClient } from 'payload'
import React from 'react'

import { formatIqd } from '@/lib/catalog/dinar'

/** List-view cell for delivery fees: "Free delivery (IQD 0)" or IQD 5,000; "—" when missing. */
export const FeeIqdCell: React.FC<DefaultCellComponentProps<NumberFieldClient>> = ({
  cellData,
}) => {
  if (typeof cellData !== 'number') {
    return <span>— (missing fee)</span>
  }
  if (cellData === 0) {
    return <span dir="ltr">Free delivery (IQD 0)</span>
  }
  return <span dir="ltr">{formatIqd(cellData)}</span>
}
