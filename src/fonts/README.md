# Fonts

Self-hosted variable fonts (spec section 4). Loaded through `next/font/local`, so no
request ever goes to a third-party font service.

| File | Family | Axis | Source |
| --- | --- | --- | --- |
| `NotoSans-latin-wght.woff2` | Noto Sans (Latin subset) | wght 100–900 | @fontsource-variable/noto-sans 5.3.0 |
| `NotoSansArabic-wght.woff2` | Noto Sans Arabic (Arabic subset, further trimmed — see below) | wght 100–900 | @fontsource-variable/noto-sans-arabic 5.3.0 |

Both are licensed under the SIL Open Font License 1.1 (see the LICENSE files).

Coverage was verified programmatically during implementation: Noto Sans Arabic contains
every Sorani letter used by the site (ڕ ڵ ۆ ێ ە گ چ پ ژ ڤ ک ی ئ ھ), the Arabic letters,
both Arabic-Indic digit sets and Arabic punctuation. Latin letters and ASCII digits come
from Noto Sans through the font-family fallback order.

## Trimmed Arabic font

The fontsource file (166 KB) carries every Arabic block including 770 precomposed
presentation forms that shaping never needs. The committed file keeps only what the site
renders — the core Arabic block (all Sorani and Arabic letters, both digit sets, Arabic
punctuation), the Arabic Supplement, the space glyphs and the joiner/direction marks,
with every OpenType feature and the weight axis — and is 77 KB, which matters on the
slow connections the site is mostly read on. Shaped text was verified pixel-identical to
the original at several weights. To regenerate from the fontsource file:

```bash
pip install fonttools brotli
pyftsubset NotoSansArabic-wght.orig.woff2 \
  --unicodes="U+0000,U+000D,U+0020,U+00A0,U+0600-06FF,U+0750-077F,U+200B-200F,U+2010-2015,U+2018-201F,U+2026,U+FDF2,U+FDFD" \
  --layout-features='*' --flavor=woff2 --notdef-outline --name-IDs='*' \
  --output-file=NotoSansArabic-wght.woff2
```
