# Changelog

## 0.3.0 — 2026-10-21

The first public release.

- Renamed the project to **ClaudeTex** (`Claude` + `TeX`).
- Claude-colored icon, light/dark banners, and a Claude-palette KaTeX preview.
- A 10-second intro animation, embedded as a GIF with a 1080p MP4 link.
- Automatic terminal typesetting for inline and display math.
- `/tex` and `/tex all` browser previews with KaTeX; `/tex-preview` alias.
- Two-dimensional Unicode layout: fractions, roots, limits, matrices, `cases`, `aligned`, `boxed`.
- Markdown-safe scanner: code fences and inline code untouched; currency and shell variables protected.
- Hardened parser/layout with length, depth and size limits; malformed input falls back to LaTeX.
- SRI-checked CDN assets, strict CSP, DOMPurify, and an inert `<template>` for the preview source.
- 38 tests covering malformed input, deep nesting, oversized replies, CRLF, code spans, heuristics and command paths.

## 0.2.0

- Added parser depth/length limits and guaranteed progress on malformed input.
- Tightened inline math detection; exact backtick code spans; CRLF support.
- Added SRI/CSP and the inert template preview source.
- Added `/tex` command with `/tex-preview` alias and plugin icon.
- Expanded the test suite to 38 tests.

## 0.1.0

- Initial mod: `ui.render` math replacement, Unicode inline/display layout, and `/tex-preview`.
