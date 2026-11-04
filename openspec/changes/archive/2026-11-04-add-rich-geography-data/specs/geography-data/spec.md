## Purpose

Defines the optional geography facts attached to each province and the generic typing that lets consumers carry their own typed metadata through the component, data, and callback APIs without forking the library.

## ADDED Requirements

### Requirement: City type exposes optional geography fields

`CityType` SHALL keep its existing required fields (`id`, `plateNumber`, `name`, `path`) and optional `disabled` field, and SHALL add the following optional fields:

- `region?: Region`, where `Region` is exactly `"marmara" | "ege" | "akdeniz" | "ic-anadolu" | "karadeniz" | "dogu-anadolu" | "guneydogu-anadolu"`.
- `centroid?: Centroid`, where `Centroid` is `{ x: number; y: number }`.
- `neighbors?: string[]` containing city `id` values.
- `areaKm2?: number` in square kilometres.
- `population?: number` as a whole-person count.
- `isoCode?: string` in ISO 3166-2:TR form, for example `TR-34`.
- `nutsCode?: string` in NUTS3 form, for example `TR100`.
- `altNames?: string[]` of alternative province names.
- `meta?: Record<string, unknown>` for consumer-defined metadata.

The `Region` and `Centroid` types MUST be exported from the package root and the core entry. A city object that supplies only the existing fields MUST remain assignable to `CityType`.

#### Scenario: Existing custom city stays valid

- **WHEN** a consumer defines a city with only `id`, `plateNumber`, `name`, and `path`
- **THEN** it is assignable to `CityType` and renders without changes

#### Scenario: Rich fields are typed

- **WHEN** a TypeScript consumer reads `city.region`, `city.centroid`, `city.neighbors`, `city.areaKm2`, `city.population`, `city.isoCode`, `city.nutsCode`, or `city.altNames`
- **THEN** each value has the documented optional type

#### Scenario: Region rejects unknown values

- **WHEN** a TypeScript consumer assigns a string outside the seven documented region values to `region`
- **THEN** type-checking fails

#### Scenario: Metadata accepts arbitrary records

- **WHEN** a consumer supplies `meta: { sales: 1200, tier: "gold" }` on a city
- **THEN** it is assignable to `CityType` without changing the built-in dataset or component behavior

### Requirement: Built-in dataset is complete and internally consistent

The built-in 81-province dataset SHALL populate `region`, `centroid`, `neighbors`, `areaKm2`, `population`, `isoCode`, and `nutsCode` for every province. `altNames`, when present, MUST contain non-empty alternative names distinct from `name`. `meta` MUST remain absent so consumers own that field. Existing `id`, `plateNumber`, `name`, and `path` values MUST NOT change.

The dataset MUST satisfy these invariants:

- Exactly 81 entries with unique `id` values and every plate number from 1 to 81 exactly once.
- Every `region` is one of the seven documented values.
- Every `centroid` has finite `x` and `y` coordinates inside the default viewBox (`0 80 1050 585`, so `x` from 0 to 1050 and `y` from 80 to 665) and uses the same coordinate space as `path`.
- Every `neighbors` list is non-empty, contains no duplicate ids, contains no self-reference, references only ids present in the dataset, and is symmetric: if A lists B, B lists A.
- Every `areaKm2` is a positive finite number.
- Every `population` is a positive integer.
- Every `isoCode` matches `TR-` followed by the two-digit plate number and is unique.
- Every `nutsCode` matches the NUTS3 pattern `TR` followed by three uppercase letters or digits and is unique.

#### Scenario: Every province has the required geography facts

- **WHEN** the built-in dataset is loaded
- **THEN** all 81 entries have `region`, `centroid`, `neighbors`, `areaKm2`, `population`, `isoCode`, and `nutsCode`

#### Scenario: Centroids are usable for labels

- **WHEN** a province centroid is used as an SVG label position
- **THEN** it lies inside the default map viewBox and in the same coordinate space as the province path

#### Scenario: Adjacency is symmetric and valid

- **WHEN** a province lists a neighbor id
- **THEN** the neighbor exists in the dataset and lists the province back

#### Scenario: Official codes are well formed and unique

- **WHEN** ISO and NUTS codes are inspected
- **THEN** every ISO code matches its plate number, every NUTS code matches the NUTS3 pattern, and no code is duplicated

#### Scenario: Existing dataset values are preserved

- **WHEN** the dataset is compared with the pre-change release
- **THEN** every province keeps its existing `id`, `plateNumber`, `name`, and `path`

### Requirement: Component API is generic over consumer city types

`TurkeyMap`, `CoreTurkeyMap`, `TurkeyMapProps`, `CoreProps`, `Data`, and the public callback and helper types SHALL be generic over `T extends CityType`, defaulting to `CityType`. When a consumer supplies `data` typed as `Data<MyCity>`, the component MUST accept `MyCity` throughout its API and expose `MyCity` to:

- `onHover` and `onClick`
- `onSelect`, `onSelectionChange`, and `onMaxSelectionReached`
- `isCityDisabled`, `getCityStyle`, `cityWrapper`, and `renderTooltip`

Using the component without a type argument MUST behave and type-check exactly as `TurkeyMap<CityType>` does today.

#### Scenario: Typed metadata flows through callbacks

- **WHEN** a consumer renders `<TurkeyMap<SalesCity> data={salesData} onHover={(city) => city.meta.sales} />`
- **THEN** `city.meta.sales` is typed as the consumer's metadata field and the component accepts the data

#### Scenario: Core entry supports the same generic

- **WHEN** a consumer renders `<CoreTurkeyMap<SalesCity> data={salesData} />`
- **THEN** the core entry accepts the generic city type and requires `data`

#### Scenario: Default generic keeps existing code compiling

- **WHEN** a consumer uses `<TurkeyMap data={customData} />` without a type argument and with the existing callback signatures
- **THEN** the code type-checks and behaves as before

#### Scenario: Untyped custom data still works

- **WHEN** a consumer supplies `Data` built from cities that omit all new fields
- **THEN** the component compiles and renders those cities

### Requirement: Interaction callbacks receive the complete city object

Every interaction callback and helper that receives a city SHALL receive the full city object from the supplied dataset, including the optional geography fields and any consumer metadata. This applies to `onHover`, `onClick`, `onSelect`, `onSelectionChange`, `onMaxSelectionReached`, `isCityDisabled`, `getCityStyle`, `cityWrapper`, and `renderTooltip`, and to keyboard activation when `selectionMode` is `"none"`.

The base fields (`id`, `name`, `plateNumber`, `path`) MUST remain present and unchanged for consumers that read only those fields. When `cityWrapper` is used, the base fields MUST continue to reflect the rendered DOM while the optional fields and consumer metadata from the dataset MUST be preserved.

#### Scenario: Hover payload includes geography

- **WHEN** a province with `region`, `centroid`, and `meta` is hovered
- **THEN** `onHover` receives those fields together with the existing base fields

#### Scenario: Click and selection payloads include geography

- **WHEN** a province is clicked or selected
- **THEN** `onClick`, `onSelect`, and `onSelectionChange` receive the complete city object for that province

#### Scenario: Wrapped cities preserve metadata

- **WHEN** `cityWrapper` is supplied and a province is hovered
- **THEN** the callback payload keeps the dataset's optional fields and metadata while its base fields still match the rendered province

#### Scenario: Keyboard activation includes geography

- **WHEN** `selectionMode` is `"none"` and a focused province is activated with Enter or Space
- **THEN** the `onClick` payload includes the province's optional geography fields

### Requirement: Geography data provenance is documented

The package documentation SHALL describe each optional geography field, its meaning, its coordinate space or units, its source, and its reference year where applicable. The documentation MUST identify the sources used for province regions, centroids, adjacency, area, population, ISO 3166-2 codes, and NUTS3 codes, and MUST explain how consumers can add typed `meta` with the generic API.

#### Scenario: Consumer can trace a value

- **WHEN** a consumer reads the geography data documentation
- **THEN** they can identify the source and reference year for population, area, ISO, and NUTS values, and the derivation of centroids

#### Scenario: API reference lists the new surface

- **WHEN** a consumer reads the API reference
- **THEN** the `CityType`, `Region`, and `Centroid` entries describe the new optional fields and the generic signatures

#### Scenario: Consumer can add typed metadata

- **WHEN** a consumer follows the custom-data documentation
- **THEN** they can define a city type with typed `meta` and pass it to the root or core component

### Requirement: Rich data preserves rendering and package constraints

Adding the optional fields MUST NOT change the default rendered markup, legacy DOM ids, `data-*` attributes, SSR output, selection, disabled, tooltip, theming, or accessibility behavior. The package MUST keep zero runtime dependencies, React and React DOM as peer dependencies supporting `>=16.8`, and the data-free core entry within its 15 kB gzip budget. The root and data entries grow only because the built-in dataset carries more fields; their documented sizes and regression budget MUST reflect the measured result.

#### Scenario: Default render is unchanged

- **WHEN** `<TurkeyMap />` renders on the server or client
- **THEN** it still produces 81 province groups with the existing ids, names, plate numbers, and `data-*` attributes

#### Scenario: Custom data without new fields is unchanged

- **WHEN** a consumer renders custom data that omits every new field
- **THEN** the rendered markup and interactions match the previous behavior

#### Scenario: Core budget still passes

- **WHEN** the package is built and the bundle-size check runs
- **THEN** the core entry remains within 15 kB gzip and the root entry remains within its documented regression budget

#### Scenario: Data entry exposes the rich fields

- **WHEN** a consumer imports `cities` from `turkey-map-react/data`
- **THEN** each entry includes the populated geography fields
