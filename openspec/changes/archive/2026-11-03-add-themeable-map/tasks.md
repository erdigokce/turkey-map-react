## 1. Prerequisites and baseline

- [x] 1.1 Confirm `add-disabled-cities` is implemented (disabled resolver, `disabledColor`, `aria-disabled`); if not, apply that change first so `getCityStyle` can receive a real `disabled` state instead of duplicating its rules here.
- [x] 1.2 Run `npm test` and `npm run typecheck` to establish a passing baseline before editing `src/index.tsx`.

## 2. Public types and id derivation

- [x] 2.1 Add `strokeColor?: string` and `strokeWidth?: number` to `CustomStyleType` without changing required fields.
- [x] 2.2 Export `CityInteractionState` (`hovered`, `selected`, `disabled`, `focused`) and `CityStyleGetter`; add `className`, `style`, `id`, `containerProps`, `svgProps`, and `getCityStyle` to the props type.
- [x] 2.3 Add legacy/derived id resolution: container `id`, SVG `${id}-svg`, tooltip `${id}-tooltip`, province group `${id}-turkiye`; treat empty/whitespace ids as omitted.
- [x] 2.4 Add an animation-name resolver that sanitizes the instance id with a safe `tm-` prefix and keeps `turkey_react_map_tooltip_fade_out` when no id is supplied.
- [x] 2.5 Update `src/Tooltip.tsx` to accept an optional id and pass the derived tooltip id from `TurkeyMap`.

## 3. Theme resolution

- [x] 3.1 Add a CSS-variable helper and rebuild the resolved style object so precedence is `getCityStyle` > `customStyle` > `var(--tm-*, fallback)` > built-in default.
- [x] 3.2 Apply `--tm-stroke-color` / `--tm-stroke-width` to non-selected province paths while keeping `selectedStroke` / `selectedStrokeWidth` authoritative for selected paths.
- [x] 3.3 Replace the hardcoded focus outline with `var(--tm-focus-ring, 2px solid #1a73e8)` and keep the existing offset.
- [x] 3.4 Add a defined-only style merge and call `getCityStyle(city, state)` for every province after the base path style is computed; `undefined` properties must fall back.
- [x] 3.5 Wire the resolved `disabled` state into both the path fill precedence and the callback state without changing disabled-cities behavior.

## 4. Container, SVG, and animation rendering

- [x] 4.1 Render the root container with merged `containerProps` first and authoritative `id`, joined `className`, merged `style`, and the `visible`-driven `hidden` attribute; ignore `containerProps.children`.
- [x] 4.2 Spread `svgProps` onto the root SVG while keeping `id`, `viewBox`, namespace attributes, and the base style/class merge authoritative.
- [x] 4.3 Apply the derived ids to the container, SVG, tooltip, and province group.
- [x] 4.4 Update the inline keyframes and tooltip fade-out to use the derived animation name.

## 5. Tests

- [x] 5.1 Add `src/__tests__/TurkeyMap.theming.test.tsx` covering container `className`/`style`/`containerProps`, precedence over `containerProps`, and ignoring `containerProps.children`.
- [x] 5.2 Add tests for `svgProps` (`aria-label`, `role`, data attributes), base style/class merging, and `viewBox`/id remaining authoritative.
- [x] 5.3 Add tests for custom id derivation, legacy id defaults, empty-id fallback, two instances with distinct component ids, and unchanged province ids.
- [x] 5.4 Add tests asserting paths reference the documented `--tm-*` variables with defaults, and that literal `customStyle`/`getCityStyle` values override them; cover per-instance CSS-variable setup.
- [x] 5.5 Add tests for `getCityStyle` state values (`hovered`, `selected`, `disabled`, `focused`), precedence over `customStyle`, defined-only fallback, per-province results, and re-evaluation after interaction.
- [x] 5.6 Add tests for `customStyle.strokeColor`/`strokeWidth`, selected-stroke precedence, and the `--tm-focus-ring` value.
- [x] 5.7 Add tooltip tests for the derived tooltip id and derived animation name, plus legacy id/animation behavior when `id` is omitted.
- [x] 5.8 Update existing rendering, snapshot, interaction, tooltip, edge-case, SSR, and artifact tests/helpers for the new variable-based inline styles and scoped ids.
- [x] 5.9 Update `scripts/test-types.js` to import and use the new types, imported props, and CSS-variable-compatible `customStyle` fields.

## 6. Documentation

- [x] 6.1 Rewrite the readme Styling section to document CSS variables, their defaults, and the precedence order.
- [x] 6.2 Document `className`, `style`, `id`, `containerProps`, `svgProps`, and `getCityStyle` with examples, including a two-map example with distinct ids.
- [x] 6.3 Add the new props and types to the readme API tables, and document the id derivation table and the fact that province ids remain unscoped.
- [x] 6.4 Note the multi-instance limitation for province ids and the need to pass `id` when isolation is required.

## 7. Verification

- [x] 7.1 Run `npm run typecheck` and `npm run test:coverage`; resolve any coverage-threshold regressions.
- [x] 7.2 Run `npm run clean-build`, `npm run test:artifact`, and `npm run test:types`.
- [x] 7.3 Confirm the default entry bundle remains under 15 kB gzip and that no runtime dependency was added.
- [x] 7.4 Run `openspec validate add-themeable-map --strict` and fix any spec formatting or scenario issues.
