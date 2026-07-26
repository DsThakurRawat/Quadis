# Quadis logo — SVG set

True vector, traced from the supplied 239×92 PNG. No raster data inside; every file
scales cleanly to any size. Ink bbox is tight to the artwork, so apply clear space in
layout rather than expecting padding inside the file.

Colours are the site tokens: ink `#211f1b` · cream `#f4efe4` · gold `#c8a24a` ·
gold-deep `#a07d3d` · dark `#1b1a17` · darkest `#141310`.

## Which file where

| File | Use |
|---|---|
| `quadis-wordmark-twotone-on-dark.svg` | **Header, footer, auth screens.** QUADIS cream, HOTELS gold |
| `quadis-wordmark-twotone-on-cream.svg` | Body pages on cream. HOTELS steps to gold-deep for 4.5:1 |
| `quadis-wordmark-cream.svg` | Single-colour on any dark ground |
| `quadis-wordmark-ink.svg` | Single-colour on cream or white — documents, invoices |
| `quadis-wordmark-gold.svg` | Stationery, key cards, folio. Not the website header |
| `quadis-wordmark-currentcolor.svg` | Inline in React — inherits CSS `color`, one file for every state |
| `quadis-favicon.svg` | Replaces the inline-SVG `Q` hardcoded in `index.html` |
| `quadis-app-icon.svg` | PWA / home-screen icon, 12-unit corner radius |
| `quadis-avatar-circle.svg` | Social profile pictures |
| `quadis-monogram-ink.svg` / `-gold.svg` | Bare Q, no container — compose your own background |
| `quadis-lockup-stacked-ink.svg` / `-cream.svg` | Narrow columns and the mobile drawer, where the horizontal mark drops below its 96px floor |

## Rules

- **Minimum width for the horizontal wordmark is 96px.** Below that the letterspaced
  HOTELS row closes up. Use the stacked lockup or the monogram instead.
- **Clear space** on all four sides = the cap height of the HOTELS row. Nothing enters it.
- Never re-letterspace, recolour outside the palette, or add effects to the mark.

## Implementation note

`quadis-wordmark-currentcolor.svg` is the one to reach for in the React app — inline it as
a component and the fill follows CSS `color`, so the header, footer and auth variants are
one asset with three colour rules instead of three files.

## Provenance

These are traced from a raster original, so curves are a faithful reconstruction rather
than the designer's original bézier points. They are accurate to well under a pixel at
the source size and hold up at 900px+ (checked). If your designer still has the original
vector, prefer it — but these are production-safe in the meantime.
