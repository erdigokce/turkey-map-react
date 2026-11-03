## Context

See `proposal.md` for motivation and `specs/map-theming/spec.md` for the behavior contract.

`src/index.tsx` renders a single root `<div id="svg-turkiye-haritasi-container">` containing the optional tooltip, the root `<svg id="svg-turkiye-haritasi">`, and `<g id="turkiye">`. Every province is a `<g id="{city.id}">` with `data-plakakodu` / `data-iladi` around a `<path>` whose fill, stroke, cursor, and focus outline are inline styles. `customStyle` currently supplies idle/hover colors plus optional selected colors, and `getCities` derives each path style on every render. `src/Tooltip.tsx` hardcodes `svg-turkiye-haritasi-container-tooltip`, and the fade-out animation uses one fixed keyframe name. The component is a public library with React >=16.8, no runtime dependencies, a <15 kB gzip entry budget, and tests that assert exact inline styles and snapshots. The disabled-province work referenced by issue #54 (`disabled` interaction state, `disabledColor`, `--tm-disabled-color`) is owned by `add-disabled-cities`; this design assumes that change is applied first.

## Goals / Non-Goals

**Goals:**

- Route every themeable visual value through a single resolution pipeline with a documented precedence order.
- Let CSS custom properties work from consumer CSS without asking consumers to override generated inline literals.
- Make container/SVG props extensible without breaking the component's controlled attributes.
- Give each map a distinct set of component-level ids while keeping province ids and legacy selectors stable.
- Keep the implementation hook-compatible with React 16.8, SSR-safe, and effectively free in bundle size.

**Non-Goals:**

- Adding disabled sources or disabled interaction rules (owned by `add-disabled-cities`).
- Prefixing province ids or introducing instance-scoped province selectors.
- Adopting CSS-in-JS, a theme provider, or a global runtime stylesheet manager.
- Exposing per-province class names or replacing the existing `cityWrapper` escape hatch.
- Changing tooltip positioning, portal behavior, or pointer/touch handling.

## Decisions

### Resolve every theme value through one precedence chain

Introduce a small, render-local resolver:

```
const cssVar = (name, fallback) => `var(--${name}, ${fallback})`;

const resolvedStyle = {
  idleColor: customStyle.idleColor ?? cssVar("tm-idle-color", "#444"),
  hoverColor: customStyle.hoverColor ?? cssVar("tm-hover-color", "#dc3522"),
  selectedColor: customStyle.selectedColor ?? cssVar("tm-selected-color", "#dc3522"),
  ...
};
```

Every color used by `getCities` comes from this object rather than reading `customStyle` directly. `getCityStyle` is applied last with a defined-only merge:

```
const mergeDefined = (base, override) => {
  const result = { ...base };
  for (const key of Object.keys(override ?? {})) {
    if (override[key] !== undefined) result[key] = override[key];
  }
  return result;
};
```

- `undefined` values are ignored rather than deleting the base property. This is required so the issue's `fill: state.selected ? "#dc3522" : undefined` example falls back to `customStyle`/CSS variables for unselected provinces.
- Precedence is `getCityStyle` > `customStyle` > CSS custom property > built-in default. CSS custom properties are referenced with `var(..., fallback)` rather than assigned as inline custom properties on the container, because an inline assignment would mask a consumer's own `--tm-*` rules. An inline `fill: var(--tm-idle-color, #444)` still inherits consumer custom properties from any ancestor.
- Alternative considered: set `--tm-idle-color` etc. inline from `customStyle`. Rejected because the component would then beat consumer CSS and because the required `customStyle.idleColor`/`hoverColor` defaults would make variables unusable.
- Alternative considered: inject a stylesheet with default classes. Rejected because it adds specificity and SSR/global-injection complexity without a benefit; inline `var()` references already allow consumer variables to win.

### Give `id` root-container semantics and derive the rest

`id` is the root container id, matching the usual expectation that a component's `id` addresses its root element:

| Element | With `id="checkout-map"` | With `id` omitted |
| --- | --- | --- |
| Container | `checkout-map` | `svg-turkiye-haritasi-container` |
| SVG | `checkout-map-svg` | `svg-turkiye-haritasi` |
| Tooltip | `checkout-map-tooltip` | `svg-turkiye-haritasi-container-tooltip` |
| Province group | `checkout-map-turkiye` | `turkiye` |

- Derivation is computed once per render from the `id` prop. Empty or whitespace-only ids are treated as omitted so the component never produces `#-svg` or an empty container id.
- The tooltip suffix matches the existing legacy formula (container id + `-tooltip`), so the new behavior is a natural extension rather than a second convention.
- Alternative considered: treat `id` as the SVG base and suffix the container (`checkout-map-container`). Rejected because consumers usually pass `id` to address the component root, and because it would make `id` and `containerProps.id` disagree about which element they mean.
- Alternative considered: prefix province ids too. Rejected because `#istanbul` selectors, event extraction from the parent group, and custom datasets all rely on the stable city id. Province ids therefore remain duplicated across instances by design; the uniqueness guarantee is limited to component-level scaffolding.
- The root group id also becomes instance-scoped because two `g#turkiye` elements would otherwise collide; it is a component-level container (not a province) and has no documented consumer contract beyond the current tests.

### Merge container and SVG props with component-owned attributes authoritative

Container rendering order:

```
const { children: _ignored, className: cpClassName, style: cpStyle, ...rest } = containerProps ?? {};
<div
  {...rest}
  id={resolvedContainerId}
  className={joinClassNames(cpClassName, className)}
  style={{ maxWidth: 1140, margin: "0 auto", textAlign: "center", ...cpStyle, ...style }}
  hidden={!visible}
>
```

- Component defaults come first, then `containerProps.style`, then the explicit `style` prop. `className` values are joined rather than replaced. `id` is always derived from the `id` prop so `containerProps.id` cannot silently desynchronize the related SVG/tooltip ids.
- `containerProps.children` is stripped because the component owns its subtree.
- `hidden` is rendered after spreading `containerProps`, so `visible` remains authoritative.
- SVG rendering spreads `svgProps` first, then component attributes/merged style and class. `id`, `viewBox`, `version`, `xmlns`, `xmlns:xlink`, and `xmlSpace` cannot be overridden through `svgProps`; consumers already have the `viewBox` prop. `svgProps.style` overrides the base `{ width: "100%", height: "auto" }` values if supplied, and `svgProps.className` is joined with any base class.
- Alternative considered: make `svgProps` fully override everything. Rejected because losing `viewBox` would break the map geometry and losing the id would break the instance-scoping guarantee.

### Keep stroke and focus ring themable without changing the default look

Non-selected paths use:

```
stroke: customStyle.strokeColor ?? cssVar("tm-stroke-color", "none"),
strokeWidth: customStyle.strokeWidth ?? cssVar("tm-stroke-width", 0.5),
```

Selected paths keep the existing `selectedStroke` / `selectedStrokeWidth` resolution (including their defaults), which override the general stroke values. The focused group outline becomes `var(--tm-focus-ring, 2px solid #1a73e8)` with the existing `outlineOffset: 2`.

- The default stroke fallback is `none`, so rendering a `stroke` declaration does not add a visible outline. `strokeWidth` is harmless without a visible stroke.
- This necessarily changes the inline style string of default paths even though the visual result is unchanged. The rendering snapshot and any tests asserting `toHaveStyle({ fill: "#444" })` need updating to assert the variable expression or the fallback behavior.
- jsdom does not resolve `var()` inside computed styles, so tests assert that the inline style contains the expected custom-property reference and separately cover literal `customStyle`/`getCityStyle` values. Real visual resolution is covered by the documented CSS contract, not by jsdom.
- Alternative considered: omit stroke style unless `customStyle.strokeColor` is provided. Rejected because then `--tm-stroke-color` would never apply when `customStyle` is absent.

### Rebuild path style per province, with `getCityStyle` last

`getCities` continues to derive the base state (`disabled` > `selected` > `hovered` > `idle` for fill; selected stroke over general stroke; `cursor: not-allowed` for disabled) and then calls:

```
const themed = getCityStyle ? getCityStyle(city, { hovered, selected, disabled, focused }) : undefined;
const pathStyle = mergeDefined(baseStyle, themed);
```

- The callback runs for every province on every render. This matches the existing per-render style derivation, avoids stale closures over consumer state, and is cheap for 81 provinces. Consumers with expensive logic can memoize the callback themselves; the readme should say so.
- The callback is not wrapped in `try/catch`; consumer errors should surface in development rather than being swallowed.
- The focus outline stays on the group (so `getCityStyle`, which styles the path, cannot remove it); the focus ring is themeable through the CSS variable instead.
- Alternative considered: call the callback once per city group and apply the result to the group. Rejected because all current visual state is on the path, `cityWrapper` receives the group, and group-level styles would not compose with the existing selected-stroke behavior.

### Use an instance-derived animation name, not a global stylesheet registry

```
const animationName = normalizedId
  ? `tm-${normalizedId.replace(/[^A-Za-z0-9_-]/g, "-")}-tooltip-fade-out`
  : "turkey_react_map_tooltip_fade_out";
```

The existing inline `<style>` block stays, but its keyframe name and the fade-out `animation` value come from this derived name. The `tm-` prefix prevents a leading digit from producing an invalid CSS identifier.

- This satisfies multi-instance isolation without module-level state, DOM injection, `document` access during render, or SSR hydration coordination. When no id is supplied, two maps still emit the same harmless legacy keyframes; consumers who need strict isolation pass an `id` (as documented).
- Alternative considered: inject one global stylesheet keyed by a module-level flag. Rejected because it introduces global mutable state, makes SSR output depend on prior renders, and is harder to test.
- Alternative considered: use `useId`. Rejected because it requires React 18 and the peer range starts at 16.8.

### Keep public types additive and explicit

- Add `strokeColor?: string` and `strokeWidth?: number` to `CustomStyleType`; keep `idleColor` and `hoverColor` required so existing objects still type-check unchanged.
- Export `CityInteractionState` and `CityStyleGetter = (city: CityType, state: CityInteractionState) => React.CSSProperties | undefined` from the entry point; add the new props to the props interface.
- Type `containerProps` as `React.HTMLAttributes<HTMLDivElement>` and `svgProps` as `React.SVGAttributes<SVGSVGElement>`. No new dependency is needed.
- Alternative considered: introduce a single `theme` object or a `styles` prop. Rejected because the issue's requested API is prop-level and CSS-variable-based, and a new theme abstraction would expand scope.

## Risks / Trade-offs

- **Default inline style strings change (`var(...)` and stroke declarations)** → update the rendering snapshot, artifact tests, and inline-style assertions; keep the visual defaults identical and call this out in the changelog/readme so consumers inspecting exact DOM strings are not surprised.
- **jsdom cannot verify resolved CSS variables** → test the emitted `var()` references and literal override paths, and keep the documented CSS contract simple; do not add a browser test dependency for this change.
- **Province ids still duplicate across instances** → document that only component-level ids are instance-scoped; province ids stay stable for selectors and event extraction. Consumers who need per-instance province targeting scope their CSS with the map container id.
- **`customStyle` still requires `idleColor`/`hoverColor`, so it overrides variables whenever supplied** → document the precedence clearly and show CSS variables as the no-`customStyle` theming path.
- **`getCityStyle` runs for all provinces on every hover/focus render** → acceptable for 81 provinces; document consumer memoization for expensive logic.
- **`disabled` state depends on an unapplied change** → implement after `add-disabled-cities` or port that change's disabled resolver first; do not invent a second disabled definition inside the theming change.
- **Instance-derived animation names depend on an id being supplied** → document `id` as the multi-instance opt-in; legacy behavior remains unchanged without it.
- **`containerProps` can pass unexpected attributes or handlers** → spread only onto the root container, strip `children`, keep `visible`, `id`, `className`, and `style` authoritative, and rely on TypeScript for the common cases.

## Migration Plan

No consumer migration. The release is additive and lands as a minor version. Existing props, datasets, `customStyle` objects, callbacks, and legacy DOM ids keep working. Rollback removes the new optional props, the derived-id branch, the CSS-variable references (restoring literal defaults), and the `getCityStyle` merge; there is no persisted state or schema change.
