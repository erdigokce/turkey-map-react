## Why

The map can only be themed through `customStyle.idleColor` and `customStyle.hoverColor`, every visual value is written as an inline style, and its component-level DOM ids are hardcoded. Design systems cannot target the map with utilities or CSS, consumers cannot style individual provinces beyond a selected/hover fill, and rendering two maps on one page produces duplicate ids. Issue #54 asks for the theming surface expected from a modern React component.

## What Changes

This change is **additive and non-breaking**. `<TurkeyMap />`, existing props, existing `customStyle` objects, and the legacy DOM ids keep working when the new props are omitted.

- Add container-level customization: `className?: string`, `style?: React.CSSProperties`, `id?: string`, and `containerProps?: React.HTMLAttributes<HTMLDivElement>`.
- Add SVG-level customization: `svgProps?: React.SVGAttributes<SVGSVGElement>`, including `aria-label`, `role`, and other root SVG attributes.
- Make component-level ids configurable while preserving legacy ids when `id` is omitted. With `id="checkout-map"` the container is `checkout-map`, the SVG is `checkout-map-svg`, the tooltip is `checkout-map-tooltip`, and the province group is `checkout-map-turkiye`.
- Add `getCityStyle?: (city: CityType, state: CityInteractionState) => React.CSSProperties | undefined`, where `CityInteractionState` is `{ hovered, selected, disabled, focused }`. It is evaluated per province and its result takes precedence over `customStyle` for that province. `undefined` entries in the returned object fall back to the resolved `customStyle` / CSS-variable value.
- Document and support CSS custom properties: `--tm-idle-color`, `--tm-hover-color`, `--tm-selected-color`, `--tm-disabled-color`, `--tm-stroke-color`, `--tm-stroke-width`, `--tm-focus-ring`. Precedence is `getCityStyle` > `customStyle` > CSS custom property > built-in default.
- Extend `CustomStyleType` with optional `strokeColor` and `strokeWidth` for province outlines, keeping `selectedStroke` / `selectedStrokeWidth` authoritative for selected provinces.
- Replace the static inline `@keyframes` name with one derived from the instance id (legacy name when `id` is omitted) so multiple maps do not share animation names.
- Update Jest / @testing-library tests, the TypeScript consumer smoke test, and the readme styling and API sections.

**Explicitly out of scope:** implementing disabled-province behavior itself (`add-disabled-cities` owns the disabled sources, styling default, and interaction rules), custom tooltip rendering/portal/pointer events (#55), roving tabindex and listbox ARIA semantics (#56), the separate data entry point (#57), prefixing province ids with the instance id (legacy `#istanbul` selectors must keep working), per-province `className`, theme objects or dark-mode detection, and adopting a CSS-in-JS runtime dependency.

## Capabilities

### New Capabilities

- `map-theming`: container and SVG customization props, instance-scoped component ids, CSS custom properties, per-province `getCityStyle`, stroke styling, and the precedence rules that keep existing `customStyle` usage working.

### Modified Capabilities

None. The only existing main spec is `security-scanning`, which is unrelated.

## Impact

- **Public API:** new optional props `className`, `style`, `id`, `containerProps`, `svgProps`, and `getCityStyle`; new exported types `CityInteractionState` and `CityStyleGetter` (or equivalent); `CustomStyleType` gains optional `strokeColor` and `strokeWidth`. No existing prop is removed or required.
- **Code:** `src/index.tsx` container/SVG rendering, id derivation, style resolution, and animation naming; `src/Tooltip.tsx` accepts an id. New theming test file plus updates to rendering/snapshot/tooltip/SSR tests and test helpers.
- **Docs/tooling:** `readme.md` styling section, CSS-variable table, DOM-id documentation, and props/types tables; `scripts/test-types.js` consumer usage.
- **Dependencies:** none. React >=16.8 peer dependency, zero runtime dependencies, and the <15 kB gzip entry budget are preserved.
- **Compatibility:** default output keeps the existing ids, colors, and legend of interaction behavior; only consumers that opt into `id`, CSS variables, or `getCityStyle` see new DOM attributes or values.
- **Sequencing assumption:** issue #54's `getCityStyle` state includes `disabled` and its `customStyle` example includes `disabledColor`, which are specified by the already-proposed `add-disabled-cities` change. This plan assumes that change is applied first; it does not re-specify disabled sources or disabled interaction behavior.
