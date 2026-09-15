/** Plural forms keyed by Unicode CLDR categories. `one` and `other` are mandatory. */
export type PluralForms = {
  zero?: string
  one: string
  two?: string
  few?: string
  many?: string
  other: string
}

/** Identity helper that keeps dictionary entries typed as PluralForms. */
export const p = (forms: PluralForms): PluralForms => forms

const rulesCache = new Map<string, Intl.PluralRules>()

function rulesFor(locale: string): Intl.PluralRules {
  let rules = rulesCache.get(locale)
  if (!rules) {
    try {
      rules = new Intl.PluralRules(locale)
    } catch {
      rules = new Intl.PluralRules('en')
    }
    rulesCache.set(locale, rules)
  }
  return rules
}

/**
 * Selects the plural form for `count`. Zero uses the explicit `zero` form when the
 * dictionary provides one (even in languages whose CLDR rules have no zero category).
 */
export function selectPlural(forms: PluralForms, count: number, locale: string): string {
  if (count === 0 && forms.zero) {
    return forms.zero
  }
  const category = rulesFor(locale).select(count) as keyof PluralForms
  return forms[category] ?? forms.other
}
