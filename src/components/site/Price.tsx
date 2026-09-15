import type { Dictionary } from '@/i18n/dictionary'
import { formatIqd } from '@/lib/catalog/dinar'

/**
 * Whole-dinar amount inside the translated currency label, isolated left-to-right so the
 * digits read correctly in Sorani and Arabic text. Same ASCII digits in every language.
 */
export function Price({
  amount,
  dict,
  className = '',
}: {
  amount: number
  dict: Dictionary
  className?: string
}) {
  return (
    <bdi dir="ltr" className={`ltr-isolate font-semibold tabular-nums ${className}`}>
      {formatIqd(amount, dict.common.currencyFormat)}
    </bdi>
  )
}
