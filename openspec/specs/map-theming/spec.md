# map-theming Specification

## Purpose

Lets consumers theme the map with standard React container/SVG props, instance-scoped DOM ids, CSS custom properties, and a per-province style callback while preserving the existing `customStyle` API and legacy ids.

## Requirements

### Requirement: Container and SVG customization props

The component SHALL accept `className?: string`, `style?: React.CSSProperties`, `id?: string`, and `containerProps?: React.HTMLAttributes<HTMLDivElement>` for the root container, and `svgProps?: React.SVGAttributes<SVGSVGElement>` for the root SVG. `className`, `style`, and `containerProps` MUST apply to the same root container that currently carries `id="svg-turkiye-haritasi-container"`. `svgProps` MUST be applied to the root `<svg>` element.

`className` MUST be combined with any `containerProps.className` instead of replacing it. `style` MUST be merged over the component's existing container defaults and over `containerProps.style`, so consumer values win. Explicit `id`, `className`, and `style` props MUST take precedence over the same keys supplied through `containerProps`.

`svgProps` MUST allow accessible and arbitrary root SVG attributes such as `aria-label`, `role`, `data-*`, and event handlers. Component-controlled SVG attributes (`id`, `viewBox`, `version`, `xmlns`, `xmlns:xlink`, `xmlSpace`) MUST remain authoritative; `svgProps.className` and `svgProps.style` MUST be merged with the base SVG class/style rather than replacing them. `containerProps.children` MUST be ignored because the component owns its children.

#### Scenario: Container className and style are applied

- **WHEN** `<TurkeyMap className="my-map" style={{ maxWidth: 800 }} />` is rendered
- **THEN** the root container has the `my-map` class, keeps the default centering styles, and uses `max-width: 800px`

#### Scenario: containerProps supplies arbitrary attributes

- **WHEN** `containerProps={{ "data-testid": "map-shell", dir: "ltr" }}` is supplied
- **THEN** the root container renders both attributes

#### Scenario: Explicit props win over containerProps

- **WHEN** `containerProps={{ id: "from-container", className: "from-container" }}` and `id="explicit"` and `className="explicit"` are supplied together
- **THEN** the container id is `explicit` and both class names are present

#### Scenario: svgProps adds accessibility attributes

- **WHEN** `svgProps={{ "aria-label": "Turkey provinces", role: "img" }}` is supplied
- **THEN** the root SVG has `aria-label="Turkey provinces"` and `role="img"`

#### Scenario: svgProps cannot replace the viewBox

- **WHEN** `viewBox={{ top: 0, left: 0, width: 100, height: 100 }}` and `svgProps={{ viewBox: "0 0 1 1" }}` are supplied
- **THEN** the SVG viewBox is `0 0 100 100`

#### Scenario: Default container is unchanged

- **WHEN** no container or SVG customization props are supplied
- **THEN** the container keeps the existing max-width, centering, and text-alignment styles and the SVG keeps its existing base attributes

### Requirement: Instance-scoped component ids with legacy defaults

The component SHALL derive all component-level DOM ids from the optional `id` prop so multiple maps can coexist on one page. When `id="checkout-map"` is supplied, the root container id MUST be `checkout-map`, the SVG id MUST be `checkout-map-svg`, the built-in tooltip id MUST be `checkout-map-tooltip`, and the province group id MUST be `checkout-map-turkiye`.

When `id` is omitted or is an empty string, the component MUST keep the current legacy ids exactly: container `svg-turkiye-haritasi-container`, SVG `svg-turkiye-haritasi`, tooltip `svg-turkiye-haritasi-container-tooltip`, and province group `turkiye`. Two maps rendered with different non-empty `id` values MUST NOT share any component-level id.

Province (`<g id="{city.id}">`) ids MUST remain unchanged and MUST NOT be prefixed with the instance id, because existing consumers select provinces by the built-in city ids and custom-data ids.

#### Scenario: Custom id is applied consistently

- **WHEN** `<TurkeyMap id="checkout-map" showTooltip />` is rendered
- **THEN** the container is `#checkout-map`, the SVG is `#checkout-map-svg`, the tooltip is `#checkout-map-tooltip`, and the province group is `#checkout-map-turkiye`

#### Scenario: Legacy ids are preserved

- **WHEN** `id` is omitted
- **THEN** the container, SVG, tooltip, and province group keep the legacy ids used before this change

#### Scenario: Two instances have distinct component ids

- **WHEN** two maps are rendered with `id="map-a"` and `id="map-b"`
- **THEN** their container, SVG, tooltip, and province-group ids differ and both instances are addressable by their own ids

#### Scenario: Province ids stay stable

- **WHEN** `id="checkout-map"` is supplied
- **THEN** the İstanbul province group still has `id="istanbul"` so existing `#istanbul` selectors and city lookups keep working

#### Scenario: Empty id falls back to legacy ids

- **WHEN** `id=""` is supplied
- **THEN** the component renders the legacy ids instead of empty or suffixed ids

### Requirement: CSS custom properties theme the map

The component SHALL resolve visual defaults through documented CSS custom properties so consumers can theme the map from CSS or from an ancestor element:

- `--tm-idle-color` (default `#444`)
- `--tm-hover-color` (default `#dc3522`)
- `--tm-selected-color` (default `#dc3522`)
- `--tm-disabled-color` (default `#e5e5e5`)
- `--tm-stroke-color` (default no visible stroke)
- `--tm-stroke-width` (default `0.5`)
- `--tm-focus-ring` (default `2px solid #1a73e8`)
- `--tm-no-data-color` (default `#eeeeee`)

The custom properties MUST inherit from any ancestor or be set on the container through `style`/`containerProps.style`, so two instances can use different themes. A value supplied explicitly through `customStyle` MUST override the corresponding CSS custom property. A value returned by `getCityStyle` MUST override both. When no value is supplied by any layer, the documented default MUST apply and default rendering MUST remain visually equivalent to today.

The existing `selectedStroke` and `selectedStrokeWidth` fields MUST remain authoritative for selected provinces over `--tm-stroke-color` and `--tm-stroke-width`. The general stroke properties MUST apply to non-selected provinces; when neither the stroke custom property nor `customStyle.strokeColor` is provided, no visible stroke is added. The focus ring custom property MUST be used for the keyboard focus indicator.

When the choropleth capability is active because `values` is supplied, `--tm-no-data-color` MUST supply the default fill for provinces without a finite value, and `noDataColor` MUST override it. `--tm-hover-color` and the selected stroke values MUST remain the interaction outlines described by the choropleth capability. Choropleth value fills themselves are defined by the choropleth capability, not by `--tm-idle-color`.

#### Scenario: Colors come from CSS variables

- **WHEN** a parent element sets `--tm-idle-color: #eeeeee` and `--tm-hover-color: #ff0000` and `<TurkeyMap />` is rendered inside it
- **THEN** idle provinces use `#eeeeee` and hovered provinces use `#ff0000`

#### Scenario: Per-instance variable themes

- **WHEN** two maps are rendered and each container sets different `--tm-idle-color` values through `style`
- **THEN** each map renders with its own idle color without affecting the other instance

#### Scenario: customStyle overrides CSS variables

- **WHEN** a parent sets `--tm-idle-color: #eeeeee` and the map receives `customStyle={{ idleColor: "#123456", hoverColor: "#654321" }}`
- **THEN** idle provinces use `#123456` rather than the inherited variable

#### Scenario: Focus ring is themeable

- **WHEN** a selection mode is active, a city is focused, and `--tm-focus-ring` is set
- **THEN** the focus indicator uses that value instead of the default outline

#### Scenario: Stroke variables add an outline

- **WHEN** a parent sets `--tm-stroke-color: #ffffff` and `--tm-stroke-width: 0.5`
- **THEN** non-selected province paths render a white outline with width `0.5`

#### Scenario: No-data color is themeable

- **WHEN** a parent sets `--tm-no-data-color: #d8dee9` and the map is rendered with `values`
- **THEN** provinces without a finite value use `#d8dee9`

#### Scenario: Choropleth interaction outlines use themed colors

- **WHEN** `values` is supplied and `--tm-hover-color` is set
- **THEN** hovering a value-bearing province draws its outline with the themed hover color while keeping the value fill

#### Scenario: Defaults are visually unchanged

- **WHEN** no CSS variables, `customStyle`, `getCityStyle`, or `values` are supplied
- **THEN** province colors, selected styling, focus ring, and absence of default outlines match the previous default appearance

### Requirement: Per-province style callback

The component SHALL accept `getCityStyle?: (city: CityType, state: CityInteractionState) => React.CSSProperties | undefined`, where `CityInteractionState` is `{ hovered: boolean; selected: boolean; disabled: boolean; focused: boolean }`. The callback MUST be evaluated for every rendered province and MUST receive the province and its current interaction state for that render. `disabled` MUST reflect the disabled state resolved by the disabled-cities capability.

The returned style object MUST be merged over the province path style resolved from `customStyle` and CSS variables, and the callback MUST take precedence over `customStyle` for the properties it returns. Properties whose value is `undefined` MUST NOT override the resolved value, so `getCityStyle` can style only the stateful properties it cares about. Returning `undefined` or an empty object MUST leave the resolved style unchanged. The callback MUST be able to affect any inline path property, including `fill`, `stroke`, `strokeWidth`, `opacity`, and `cursor`.

#### Scenario: Callback styles the selected province

- **WHEN** `getCityStyle={(city, state) => ({ fill: state.selected ? "#dc3522" : undefined })}` is supplied and a province is selected
- **THEN** only selected province paths use `#dc3522` and other provinces keep their resolved idle color

#### Scenario: Callback receives hover and focus state

- **WHEN** the pointer hovers a province and that province also receives keyboard focus
- **THEN** `getCityStyle` is called with `hovered: true` and `focused: true` for that province

#### Scenario: Callback receives disabled state

- **WHEN** a province is disabled through the disabled-cities sources
- **THEN** `getCityStyle` receives `disabled: true` for that province

#### Scenario: Callback overrides customStyle

- **WHEN** `customStyle.idleColor` is `#444` and `getCityStyle` returns `{ fill: "#111111" }` for an idle province
- **THEN** that province renders with `#111111`

#### Scenario: Undefined values fall back

- **WHEN** `getCityStyle` returns `{ strokeWidth: 3, fill: undefined }`
- **THEN** the province uses stroke width `3` and keeps the fill resolved from `customStyle` or CSS variables

#### Scenario: Styles update with interaction

- **WHEN** a province becomes hovered or selected after a re-render
- **THEN** the callback is re-evaluated with the new state and the rendered path style reflects the result

#### Scenario: Callback styles one province at a time

- **WHEN** `getCityStyle` returns a fill based on `city.id`
- **THEN** each province receives only the style computed for its own city

### Requirement: Stroke styling through customStyle

`CustomStyleType` SHALL gain optional `strokeColor` and `strokeWidth` fields for a general province outline. They MUST apply to non-selected provinces and MUST NOT replace the existing `selectedStroke` and `selectedStrokeWidth` behavior for selected provinces. Omitting both fields MUST NOT add a visible outline to the default rendering.

#### Scenario: Custom stroke is applied

- **WHEN** `customStyle={{ idleColor: "#444", hoverColor: "#dc3522", strokeColor: "#ffffff", strokeWidth: 1 }}` is supplied
- **THEN** non-selected province paths render a white outline with width `1`

#### Scenario: Selected stroke still wins

- **WHEN** `strokeColor` is supplied and a province is selected with `selectedStroke` and `selectedStrokeWidth`
- **THEN** the selected province uses the selected stroke values instead of the general stroke values

#### Scenario: Existing customStyle keeps working

- **WHEN** `customStyle` supplies only `idleColor` and `hoverColor`
- **THEN** the component accepts the object and renders no new visible outline

### Requirement: Animation names are scoped per instance

The built-in tooltip fade animation MUST NOT rely on one globally fixed namespaced keyframe when an instance id is present. The animation name MUST be derived from the instance id so multiple maps can render their own stylesheet without sharing an animation name. When `id` is omitted, the legacy animation name MUST be kept so existing behavior is preserved. The tooltip fade-out behavior itself MUST remain unchanged.

#### Scenario: Custom id produces a scoped animation

- **WHEN** `<TurkeyMap id="checkout-map" showTooltip />` hovers and then leaves a province
- **THEN** the fade-out uses an animation name derived from `checkout-map` rather than the legacy global name

#### Scenario: Legacy animation is preserved

- **WHEN** `id` is omitted and the tooltip fades out
- **THEN** the existing legacy animation name is used

#### Scenario: Two instances do not share an animation name

- **WHEN** two maps with different ids render tooltips
- **THEN** their fade-out animation names differ

### Requirement: Accessibility is preserved and extensible

The change MUST NOT reduce keyboard or screen-reader behavior. Existing focusability, keyboard activation, focus outline, and selection behavior MUST keep working. `svgProps` and `containerProps` MUST allow consumers to add accessible names, roles, and other ARIA attributes, and the focus ring MUST remain visible and themeable through `--tm-focus-ring`.

#### Scenario: Accessible name can be added

- **WHEN** `svgProps={{ "aria-label": "Select a province" }}` is supplied
- **THEN** the accessibility tree exposes the map with that name and existing keyboard behavior is unchanged

#### Scenario: Focus remains visible

- **WHEN** a province is focused in a selection mode with a themed `--tm-focus-ring`
- **THEN** a visible focus indicator is still rendered

### Requirement: Backward compatibility and public types

The change MUST remain additive and non-breaking. `CustomStyleType` MUST keep its existing fields and add the new stroke fields as optional. The new props MUST be optional and MUST NOT change the behavior of `<TurkeyMap />`, legacy DOM ids, existing event callbacks, selection behavior, or default rendering when omitted. New public types used by the callback MUST be exported from the package entry point, and server-side rendering MUST continue to work without browser globals.

#### Scenario: Default usage is unchanged

- **WHEN** `<TurkeyMap />` is rendered
- **THEN** it renders the same component-level ids, default colors, interaction behavior, and province markup as before this change

#### Scenario: Existing custom style still type-checks

- **WHEN** a consumer supplies only `idleColor` and `hoverColor`
- **THEN** the object type-checks and existing appearance is preserved

#### Scenario: New callback type is exported

- **WHEN** a TypeScript consumer imports the interaction-state and style-getter types from `turkey-map-react`
- **THEN** the import compiles and `getCityStyle` accepts a function of that type

#### Scenario: Server rendering still works

- **WHEN** the map is rendered with `id`, `svgProps`, CSS variables, and `getCityStyle` through server-side rendering
- **THEN** markup is produced without accessing `document` or `window`
