## MODIFIED Requirements

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
