/**
 * Writes docs/translations-review.md: every interface string in English, Sorani and
 * Arabic side by side, for native-speaker review (spec section 15 "Readiness evidence").
 *
 *   pnpm exec tsx scripts/export-translations.ts
 */
import fs from 'node:fs'
import path from 'node:path'

import { ar } from '../src/i18n/dictionaries/ar'
import { ckb } from '../src/i18n/dictionaries/ckb'
import { en } from '../src/i18n/dictionaries/en'

type Node = string | { [key: string]: Node }

function flatten(node: Node, prefix = ''): [string, string][] {
  if (typeof node === 'string') {
    return [[prefix, node]]
  }
  return Object.entries(node).flatMap(([key, value]) =>
    flatten(value as Node, prefix ? `${prefix}.${key}` : key),
  )
}

const rows = flatten(en as unknown as Node)
const ckbMap = new Map(flatten(ckb as unknown as Node))
const arMap = new Map(flatten(ar as unknown as Node))

const escape = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ')

const lines = [
  '# Interface translation review',
  '',
  'Generated from `src/i18n/dictionaries/*.ts` by `scripts/export-translations.ts`. The Sorani and',
  'Arabic columns are DRAFTS written during implementation and must be reviewed by a native',
  'speaker before launch (spec section 15). `{name}` placeholders are filled in at runtime and',
  'must be kept; plural entries list one line per form.',
  '',
  '| Key | English | Sorani (ckb) | Arabic (ar) | Reviewed |',
  '| --- | --- | --- | --- | --- |',
  ...rows.map(
    ([key, value]) =>
      `| \`${key}\` | ${escape(value)} | ${escape(ckbMap.get(key) ?? '**MISSING**')} | ${escape(arMap.get(key) ?? '**MISSING**')} | ☐ |`,
  ),
  '',
  `${rows.length} strings.`,
  '',
]
const target = path.resolve('docs/translations-review.md')
fs.writeFileSync(target, lines.join('\n'))
process.stdout.write(`Wrote ${target} (${rows.length} strings)\n`)
