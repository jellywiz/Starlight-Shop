# Fonts

Self-hosted variable fonts (spec section 4). Loaded through `next/font/local`, so no
request ever goes to a third-party font service.

| File | Family | Axis | Source |
| --- | --- | --- | --- |
| `NotoSans-latin-wght.woff2` | Noto Sans (Latin subset) | wght 100–900 | @fontsource-variable/noto-sans 5.3.0 |
| `NotoSansArabic-wght.woff2` | Noto Sans Arabic (Arabic subset) | wght 100–900 | @fontsource-variable/noto-sans-arabic 5.3.0 |

Both are licensed under the SIL Open Font License 1.1 (see the LICENSE files).

Coverage was verified programmatically during implementation: Noto Sans Arabic contains
every Sorani letter used by the site (ڕ ڵ ۆ ێ ە گ چ پ ژ ڤ ک ی ئ ھ), the Arabic letters,
both Arabic-Indic digit sets and Arabic punctuation. Latin letters and ASCII digits come
from Noto Sans through the font-family fallback order.
