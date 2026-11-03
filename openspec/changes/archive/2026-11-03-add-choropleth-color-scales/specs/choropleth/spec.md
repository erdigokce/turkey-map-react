## Purpose

Lets consumers color provinces by a numeric metric using a small, dependency-free set of color scales, with explicit no-data styling, an escape-hatch color callback, optional value transitions, and interaction states that keep the metric fill visible.

## ADDED Requirements

### Requirement: Values activate choropleth coloring

The component SHALL accept `values?: Record<string, number>`, keyed by city `id`. When `values` is omitted or `undefined`, the component MUST render exactly as before and MUST NOT apply any choropleth-specific fill, outline, or transition. When `values` is supplied, including an empty object, choropleth coloring MUST be active.

Only own keys whose value is a finite number MUST be treated as data. A missing key, a non-finite number (`NaN`, `Infinity`), or a non-number runtime value MUST be treated as "no data". Keys that do not match a rendered city id MUST be ignored without throwing. A province with no data MUST render with `noDataColor` instead of `idleColor`.

`noDataColor?: string` SHALL default to `var(--tm-no-data-color, #eeeeee)`. A supplied `noDataColor` MUST take precedence over the CSS custom property. Provinces with a value MUST NOT use `noDataColor`.

#### Scenario: Values color provinces

- **WHEN** `values={{ istanbul: 92, ankara: 45 }}` and a color scale are supplied
- **THEN** Istanbul and Ankara render with colors from the scale and every other province renders with `noDataColor`

#### Scenario: No values prop preserves current rendering

- **WHEN** `values` is omitted
- **THEN** provinces keep their existing idle, hover, selected, disabled, `customStyle`, CSS-variable, and `getCityStyle` fills and no no-data color is applied

#### Scenario: Empty values object means every province is no-data

- **WHEN** `values={{}}` is supplied
- **THEN** choropleth mode is active and every province renders with `noDataColor`

#### Scenario: Missing value uses no-data color

- **WHEN** `values` supplies values for some provinces but not others
- **THEN** provinces without a finite value render with `noDataColor`

#### Scenario: Invalid values are treated as no-data

- **WHEN** a supplied value is `NaN`, `Infinity`, a numeric string, or `null`
- **THEN** rendering does not throw and that province uses `noDataColor`

#### Scenario: Unknown city ids are ignored

- **WHEN** `values` contains an id that is not present in `data`
- **THEN** rendering does not throw and no rendered province is affected by that entry

#### Scenario: No-data color is configurable

- **WHEN** `noDataColor="#d9d9d9"` is supplied
- **THEN** provinces without a value use `#d9d9d9` regardless of `--tm-no-data-color`

### Requirement: Color scale input forms

The component SHALL accept `colorScale?: string[] | ((value: number) => string)`. When `colorScale` is omitted, the default palette MUST be `["#f7fbff", "#08306b"]`.

The array form MUST be interpreted according to `scaleType`. An empty array or an array with no usable string entries MUST fall back to the default palette. The function form MUST be called once per province that has a finite value, receive that raw value, and return the color directly; `scaleType` and `thresholds` MUST NOT affect the function form.

When the function returns an empty string, `undefined`, or a non-string value, the component MUST fall back to `noDataColor` for that province without throwing.

#### Scenario: Array colors are used by the scale

- **WHEN** `colorScale={["#f7fbff", "#08306b"]}` is supplied
- **THEN** value-bearing provinces are colored from that array according to `scaleType`

#### Scenario: Default palette is applied

- **WHEN** `values` is supplied and `colorScale` is omitted
- **THEN** value-bearing provinces are colored from `["#f7fbff", "#08306b"]`

#### Scenario: Function scale maps raw values

- **WHEN** `colorScale={(value) => (value > 50 ? "#08306b" : "#f7fbff")}` is supplied with `scaleType="quantile"`
- **THEN** each value-bearing province receives the result of the function for its own raw value and `scaleType` has no effect

#### Scenario: Invalid scale output falls back

- **WHEN** a `colorScale` function returns `undefined` for a province
- **THEN** that province renders with `noDataColor` and no error is thrown

#### Scenario: Empty array falls back to the default palette

- **WHEN** `colorScale={[]}` is supplied
- **THEN** value-bearing provinces use the default palette instead of crashing

### Requirement: Scale types

The component SHALL accept `scaleType?: "linear" | "quantize" | "quantile" | "threshold"` with a default of `"linear"`. The value domain MUST be derived from all finite supplied values using their minimum and maximum. No public domain override is required.

- `linear` MUST interpolate continuously between adjacent array stops across the domain.
- `quantize` MUST split `[min, max]` into `colorScale.length` equal-width buckets and assign the color whose bucket contains the value.
- `quantile` MUST compute `colorScale.length - 1` bucket boundaries from the sorted supplied values using the `j / colorScale.length` quantiles with linear interpolation, then assign the color whose bucket contains the value.
- `threshold` MUST sort `thresholds` ascending, compare each value against those thresholds, and use `colorScale[count of thresholds less than or equal to the value]`.

For `linear`, `quantize`, and `quantile`, the minimum value MUST map to the first color and the maximum value MUST map to the last color. When `min` equals `max`, those three scale types MUST give every value-bearing province the last color in the scale. `threshold` does not use the derived domain and compares values against its thresholds directly. When `scaleType="threshold"` is used without `thresholds`, or when `colorScale.length` is not exactly `thresholds.length + 1`, the component MUST fall back to `quantize` behavior so rendering never throws, and MAY warn in development. `thresholds` MUST be ignored by the other scale types.

#### Scenario: Linear interpolates across the domain

- **WHEN** values range from 0 to 100 and `colorScale={["#000000", "#ffffff"]}` with `scaleType="linear"`
- **THEN** the value 50 renders with the midpoint blend of the two colors, and 0 and 100 render with the endpoint colors

#### Scenario: Quantize creates equal-width buckets

- **WHEN** values range from 0 to 90 and a four-color `colorScale` with `scaleType="quantize"` is supplied
- **THEN** values 0–22 use the first color, 23–45 the second, 46–67 the third, and 68–90 the fourth

#### Scenario: Quantile creates equal-count buckets

- **WHEN** values are `[1, 2, 3, 4]` and a two-color `colorScale` with `scaleType="quantile"` is supplied
- **THEN** the two lowest values use the first color and the two highest values use the second color

#### Scenario: Threshold uses explicit boundaries

- **WHEN** `scaleType="threshold"`, `thresholds={[10, 25, 50]}`, and `colorScale` has four colors
- **THEN** values below 10 use the first color, 10–24 the second, 25–49 the third, and 50 and above the fourth

#### Scenario: Threshold boundaries are sorted

- **WHEN** `thresholds={[50, 10, 25]}` is supplied in unsorted order
- **THEN** the scale behaves as if the thresholds were `[10, 25, 50]`

#### Scenario: Mismatched threshold configuration falls back

- **WHEN** `scaleType="threshold"` is supplied without `thresholds`, or the threshold count does not match the color count minus one
- **THEN** rendering does not throw and the scale behaves like `quantize`

#### Scenario: Constant values use the last color

- **WHEN** every supplied value is `42` with `scaleType` `linear`, `quantize`, or `quantile`
- **THEN** every value-bearing province renders with the last color in the scale

#### Scenario: Domain endpoints use the extreme colors

- **WHEN** `scaleType="linear"` is used
- **THEN** the minimum value uses the first color and the maximum value uses the last color

#### Scenario: Threshold ignores a constant domain

- **WHEN** every supplied value is `42`, `scaleType="threshold"`, and `thresholds={[10, 25, 50]}`
- **THEN** every value-bearing province uses the color for the 25–49 bucket rather than the last color

### Requirement: getColor escape hatch

The component SHALL accept `getColor?: (value: number, city: CityType) => string`. When `getColor` is supplied, it MUST be evaluated for each province with a finite value and its returned color MUST take precedence over `colorScale` and `scaleType`. It MUST NOT be called for provinces without a value; those provinces MUST use `noDataColor`.

When `getColor` returns an empty string, `undefined`, or a non-string value, the component MUST fall back to `colorScale` for that province, and then to `noDataColor` if no scale color is available. `getColor` MUST receive the exact city object supplied through `data` and MUST be re-evaluated when its values, city data, or the callback identity change.

#### Scenario: getColor wins over the scale

- **WHEN** `getColor={(value) => (value > 50 ? "#08306b" : "#f7fbff")}` and a different `colorScale` are supplied together
- **THEN** each value-bearing province uses the color returned by `getColor`

#### Scenario: getColor receives value and city

- **WHEN** `getColor` is supplied and a province is rendered
- **THEN** it receives that province's numeric value and its `CityType` object

#### Scenario: getColor is skipped for no-data provinces

- **WHEN** a province has no finite value
- **THEN** `getColor` is not called for it and it renders with `noDataColor`

#### Scenario: Invalid getColor output falls back to the scale

- **WHEN** `getColor` returns `undefined` for a province and `colorScale` is supplied
- **THEN** that province uses its `colorScale` color

#### Scenario: getColor is optional

- **WHEN** `getColor` is omitted
- **THEN** coloring uses `colorScale` exactly as specified

### Requirement: Value transitions respect reduced motion

The component SHALL accept `animateValues?: boolean`. When `animateValues` is `true` and the user does not prefer reduced motion, changes to a province's choropleth fill MUST animate with a CSS transition on the `fill` property lasting 300 milliseconds with an ease timing function. When `animateValues` is `false` or omitted, fill changes MUST be instant.

When the user prefers reduced motion, fill changes MUST be instant even if `animateValues` is `true`. The component MUST react to a change in the media-query preference after mount and MUST remove its listener on unmount. In environments without `matchMedia`, including server rendering and tests, the component MUST not throw and MUST use the instant behavior. Transitions MUST apply to the fill only and MUST NOT delay hover, selection, focus, or disabled styling.

#### Scenario: Value change animates

- **WHEN** `animateValues` is `true`, reduced motion is not preferred, and `values` changes for a province
- **THEN** that province's fill transitions to the new color over 300 milliseconds

#### Scenario: Animation is opt-in

- **WHEN** `animateValues` is omitted and `values` changes
- **THEN** the new fill is applied without an animated transition

#### Scenario: Reduced motion disables the transition

- **WHEN** the user prefers reduced motion and `animateValues` is `true`
- **THEN** the new fill is applied immediately with no transition

#### Scenario: Preference changes at runtime

- **WHEN** the motion preference changes while the map is mounted
- **THEN** subsequent value changes use the new preference without remounting the map

#### Scenario: Server rendering is safe

- **WHEN** a map with `values` and `animateValues` is rendered to a string on a server
- **THEN** rendering does not throw and does not access `window` or `document`

### Requirement: Choropleth fills compose with interaction states

When choropleth mode is active, the fill of a value-bearing or no-data province MUST remain the choropleth or no-data color across hover and selection. Hover and selection MUST be indicated by province outline styling instead of replacing the metric fill.

- A disabled province MUST keep the disabled fill and disabled cursor, matching the disabled-cities capability, and MUST NOT receive a hover outline.
- A selected enabled province MUST use the existing `selectedStroke` and `selectedStrokeWidth` values.
- A hovered, non-selected enabled province MUST use the existing hover color as its outline with a width of at least 1.
- A non-hovered, non-selected enabled province MUST use the existing general stroke styling.
- Selected MUST win over hovered for outline styling.
- `getCityStyle` MUST remain the highest-precedence style layer and MUST be able to override the fill and outline for any province.
- Without `values`, hover and selection MUST keep the existing fill-based behavior exactly.

#### Scenario: Hover keeps the metric fill

- **WHEN** a value-bearing province is hovered in choropleth mode
- **THEN** its fill stays the value color and its outline uses the hover color

#### Scenario: Selection keeps the metric fill

- **WHEN** a value-bearing province is selected in choropleth mode
- **THEN** its fill stays the value color and its outline uses `selectedStroke` with `selectedStrokeWidth`

#### Scenario: Selection wins over hover outline

- **WHEN** a selected value-bearing province is also hovered
- **THEN** its outline uses the selected stroke rather than the hover stroke

#### Scenario: Disabled keeps disabled styling

- **WHEN** a province with a value is disabled
- **THEN** it renders with the disabled fill and disabled cursor instead of the value color

#### Scenario: getCityStyle still wins

- **WHEN** `getCityStyle` returns a `fill` for a value-bearing province
- **THEN** that fill replaces the choropleth color for that province

#### Scenario: Non-choropleth interaction is unchanged

- **WHEN** `values` is omitted and a province is hovered or selected
- **THEN** the existing hover and selected fill behavior is preserved

#### Scenario: No-data provinces still show interaction

- **WHEN** a no-data province is hovered or selected
- **THEN** it keeps `noDataColor` as its fill and receives the same hover or selected outline treatment as a value-bearing province

### Requirement: Backward compatibility, public types, and accessibility

The choropleth feature MUST remain additive and non-breaking. Every new prop MUST be optional, and the component MUST render its existing markup, ids, callbacks, selection, disabled, tooltip, theming, and default appearance when the new props are omitted. The public types `ChoroplethValues`, `ColorScale`, `ColorScaleFunction`, and `ScaleType` MUST be exported from the package entry points alongside the existing types.

The feature MUST NOT add runtime dependencies, MUST NOT add keyboard tab stops, and MUST NOT change ARIA roles, names, or selection semantics. Server-side rendering MUST continue to work without browser globals. The feature MUST preserve the <15 kB gzip default-entry budget and MUST keep React >=16.8 compatibility.

#### Scenario: Default usage is unchanged

- **WHEN** `<TurkeyMap />` is rendered without any choropleth prop
- **THEN** the rendered markup, colors, ids, interactions, and ARIA attributes match the previous behavior

#### Scenario: Choropleth types are exported

- **WHEN** a TypeScript consumer imports `ChoroplethValues`, `ColorScale`, `ColorScaleFunction`, or `ScaleType` from `turkey-map-react`
- **THEN** the import compiles

#### Scenario: Existing renderTooltip signature still compiles

- **WHEN** a consumer supplies `renderTooltip={(city) => city.name}`
- **THEN** it continues to type-check without change

#### Scenario: Accessibility is unchanged

- **WHEN** choropleth values are supplied
- **THEN** provinces keep their existing roles, accessible names, focus behavior, selection semantics, and number of keyboard tab stops

#### Scenario: No runtime dependency is added

- **WHEN** the package dependencies are inspected after the build
- **THEN** no color-scale or visualization dependency has been added
