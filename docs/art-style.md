# Art style for card illustrations

All 50 card pictures share one look: bright, friendly children's-book cartoon with a dark sepia ink outline,
coloured with a palette borrowed from Armenian illuminated manuscripts (lapis blue, vermilion, gold, malachite).

## Canvas
- `viewBox="0 0 200 200"`, no `width`/`height` attributes, transparent background (no full-size background rect).
- Keep the drawing inside roughly x 12..188, y 12..188. Fill the space: the subject should be big and readable from 3 metres away.
- A soft ground shadow is welcome: `<ellipse cx="100" cy="182" rx="70" ry="8" fill="#3a2618" opacity=".12"/>`.

## Line
- Main outlines: `stroke="#3a2618" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`.
- Inner details: same colour, `stroke-width="2.5"`.
- Every shape that has a fill gets an explicit `fill`.

## Palette (use these hex values)
| role | base | light | dark |
|---|---|---|---|
| ink outline | `#3a2618` | | |
| lapis blue | `#2c5aa0` | `#6f9ad8` | `#1d3f75` |
| vermilion | `#d9432b` | `#f07a5f` | `#a82f1c` |
| gold | `#e8b33a` | `#f6d779` | `#b9831c` |
| malachite green | `#3f9a5a` | `#8cc97a` | `#2a6e3e` |
| earth brown | `#8a5a36` | `#b88457` | `#5e3b22` |
| stone | `#b9ad9c` | `#ddd3c3` | `#8c7f6e` |
| water / sky | `#5fb3d9` | `#a9dcef` | `#2f86b0` |
| purple | `#7a4a9e` | `#a77cc8` | `#56317a` |
| parchment / cream | `#f6e7c8` | `#fffaf0` | |
| skin | `#e9b98f` | `#f3cfab` | `#c98d61` |

- Shading: overlay shapes in `#3a2618` at `opacity=".12"`. Highlights: `#ffffff` at `opacity=".45"`.
- Flat colours, no gradients, no filters, no `<style>` blocks, no `<text>`, no emoji, no external references, no `id` attributes.
- Friendly, never scary (lions smile, chains are simple links, the nail is a plain old iron nail).
- Never draw the hero person on an object card: object cards show only the object.
- Keep each file under ~7 KB.

## Card backgrounds the art must work on
- hero cards: `#fbefd6` (warm parchment)
- object cards: `#e4eef2` (cool pale blue-grey)
