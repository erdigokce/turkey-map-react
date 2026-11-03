## MODIFIED Requirements

### Requirement: Custom tooltip content via `renderTooltip`

The component SHALL accept `renderTooltip?: (city: CityType, value?: unknown) => React.ReactNode`. When supplied and `showTooltip` is `true`, its return value MUST be rendered as the tooltip content for the hovered or focused province. The callback MUST receive the same `CityType` object supplied through `data`. The second argument MUST be the province's current choropleth value when `values` is supplied and that province has a finite value; otherwise it MUST be `undefined`. The second argument MUST remain optional so single-argument renderers continue to type-check. `renderTooltip` MUST take precedence over `tooltipText`, `disabledTooltipText`, and the province-name fallback. When `renderTooltip` is absent, the built-in text content MUST be used. A `null`, `false`, or empty return value MUST render an empty tooltip container without throwing.

#### Scenario: Custom element content

- **WHEN** `showTooltip` and `renderTooltip={(city) => <strong>{city.name} card</strong>}` are supplied and a province is hovered
- **THEN** the tooltip contains the rendered custom element for that province

#### Scenario: Custom content overrides text props

- **WHEN** `renderTooltip`, `tooltipText="Fallback"`, and `showTooltip` are supplied
- **THEN** the tooltip shows the custom content and does not fall back to `tooltipText`

#### Scenario: Custom content for a disabled province

- **WHEN** `renderTooltip` is supplied and a disabled province is hovered
- **THEN** the custom content is rendered for that province instead of `disabledTooltipText`

#### Scenario: Built-in fallback still works

- **WHEN** `renderTooltip` is omitted and `showTooltip` is `true`
- **THEN** the tooltip shows `tooltipText` when supplied and the province name otherwise

#### Scenario: Empty custom output is tolerated

- **WHEN** `renderTooltip` returns `null`
- **THEN** the tooltip element remains mounted and empty, and no error is thrown

#### Scenario: Full city object is supplied

- **WHEN** custom `data` is supplied and `renderTooltip` is called for a province
- **THEN** the callback receives the exact city object from `data`, including its `id`, `name`, `plateNumber`, `path`, and any optional fields

#### Scenario: Value is forwarded for a valued province

- **WHEN** `values={{ istanbul: 92 }}` and `renderTooltip={(city, value) => `${city.name}: ${value}`}` are supplied with `showTooltip`
- **THEN** hovering Istanbul calls the renderer with `value === 92`

#### Scenario: Value is undefined without choropleth data

- **WHEN** `values` is omitted and `renderTooltip` is supplied with `showTooltip`
- **THEN** the renderer receives `undefined` as its second argument, preserving the previous behavior

#### Scenario: Missing province value is undefined

- **WHEN** `values` supplies values for other provinces but not the hovered province
- **THEN** the renderer receives `undefined` rather than the no-data color or a sentinel value
