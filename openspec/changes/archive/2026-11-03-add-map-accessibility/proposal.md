## Why

The map renders provinces as unlabeled SVG groups with no keyboard model, so screen-reader and keyboard users cannot tell what a province is or select one. Accessibility audits fail on the default map, and the library cannot claim to be usable as a form control until selection is operable without a pointer.

This is the v2.2 accessibility slice: keyboard + ARIA basics that harden the already-shipped selection API and make `<TurkeyMap />` a single, discoverable tab stop. A headless hook, full audit programme, and advanced theming stay in later releases.

## What Changes

This change is **additive at the public API level and non-breaking in the sense that no prop, callback, DOM id, or existing type is removed**. It deliberately changes default keyboard behavior for `selectionMode="none"`: the map becomes one roving tab stop instead of having no keyboard representation. Pointer behavior, callbacks, legacy ids, and the one-liner `<TurkeyMap />` are otherwise unchanged.

- Give the province container listbox semantics in `"single"`/`"multiple"` mode (`role="listbox"`, `aria-multiselectable` in multiple mode) and group semantics in `"none"` mode (`role="group"`), with an accessible name.
- Give every province an accessible name that includes its plate number (`"İstanbul, plate 34"`), plus `role="option"` and `aria-selected` in selection modes, or `role="button"` in `"none"` mode. Preserve `aria-disabled` behavior for disabled provinces.
- Replace per-city `tabIndex={0}` with a roving tabindex: exactly one province is tabbable, Arrow keys move through provinces in data order, Home/End jump to the first/last province, Enter/Space activates, and Escape clears a selection.
- Add a polite live region that announces the focused province and selection changes.
- Make the focus ring themeable through `customStyle.focusStroke` / `customStyle.focusStrokeWidth`, honoring an optional `--tm-focus-ring` custom property, and keep it visible in every mode.
- Add opt-in `a11yFallback` that renders a visually hidden native `<select>` of provinces for assistive technology and form tooling, synchronized with selection.
- Respect `prefers-reduced-motion` for the built-in tooltip animation (the only built-in motion today).
- Add Jest + @testing-library coverage for keyboard navigation and ARIA, an axe-based accessibility test, type-consumer coverage, and a readme keyboard/accessibility section.

**Explicitly out of scope:** full theming, `className`/`style`/`svgProps`/configurable ids and the complete `--tm-*` variable set (#54); custom tooltip rendering, portals, and pointer/touch support (#55); the separate data entry point (#57); choropleth/labels/regions/zoom (#58–#62); the headless `useTurkeyMap` hook (#63); localization of built-in labels; native form submission/`name` support on the fallback select; changes to the external demo site; and a full WCAG audit beyond automated axe checks and focused keyboard tests.

## Capabilities

### New Capabilities

- `accessibility`: container and province semantics, accessible names, roving tabindex and keyboard navigation, live-region announcements, visible focus styling, the hidden native-select fallback, reduced-motion handling, and axe/test obligations.

### Modified Capabilities

- `city-selection`: the existing keyboard requirement changes from per-city tab stops plus Enter/Space to a roving tabindex, Escape-to-clear, and `"none"`-mode keyboard activation through `onClick`.

## Impact

- **Public API:** new optional props `ariaLabel?: string` and `a11yFallback?: boolean`; `CustomStyleType` gains optional `focusStroke?: string` and `focusStrokeWidth?: number`. No removals or required additions.
- **Behavior:** `selectionMode="none"` gains one tab stop, arrow-key exploration, and Enter/Space `onClick` activation. Selection modes keep their existing Enter/Space semantics and add Escape clearing and roving focus. This is the one intentional keyboard behavior change; it is documented in the readme.
- **Code:** `src/index.tsx` markup/handlers and a small number of internal helpers; `src/Tooltip.tsx` or the injected stylesheet for reduced motion; new accessibility test file plus updates to existing rendering/selection/snapshot tests.
- **Docs/tooling:** `readme.md` accessibility and API sections; `scripts/test-types.js`; `jest-axe` added as a dev dependency only. Runtime dependencies remain zero and React stays a `>=16.8` peer dependency.
- **Bundle:** default entry must remain under 15 kB gzip; no data or helper entry points are added.
