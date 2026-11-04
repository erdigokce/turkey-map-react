# data-entry-points Specification

## Purpose

Lets consumers choose between the data-backed default entry, a data-free component entry, and a standalone dataset entry, so applications with custom geography pay only for the component code they use.

## Requirements

### Requirement: Root entry remains data-backed and backward compatible

The package root entry `turkey-map-react` SHALL continue to export the existing default `TurkeyMap` component. When no `data` prop is supplied, that component MUST render all 81 built-in provinces. When a custom `data` prop is supplied, it MUST render only the supplied provinces and MUST NOT fall back to the built-in dataset. Existing props, callbacks, public types, and legacy DOM ids MUST keep working without consumer migration.

#### Scenario: Default root import keeps the one-liner

- **WHEN** a consumer imports the default export from `turkey-map-react` and renders `<TurkeyMap />`
- **THEN** the map renders 81 province groups with their existing `id` and `data-*` attributes

#### Scenario: Root import still accepts custom data

- **WHEN** a consumer imports from `turkey-map-react` and supplies custom `data`
- **THEN** only the supplied provinces render and the built-in dataset is not rendered

#### Scenario: Existing root API is unchanged

- **WHEN** an existing consumer keeps its root import and existing props
- **THEN** the component behaves and type-checks exactly as before this change

### Requirement: Built-in dataset has a separate entry point

The package SHALL expose `turkey-map-react/data` with a named `cities` export containing the built-in 81-province dataset. The exported entries MUST use the same `CityType` shape and values as the dataset used by the root component. The data entry MUST be usable without importing the component or React into a consumer's runtime graph.

#### Scenario: Importing the dataset

- **WHEN** a consumer writes `import { cities } from "turkey-map-react/data"`
- **THEN** `cities` is an array of 81 `CityType` objects with unique ids and the existing names, plate numbers, and paths

#### Scenario: Data entry is standalone

- **WHEN** a bundle includes only `turkey-map-react/data`
- **THEN** it includes the dataset but does not pull in the component implementation or React as a runtime dependency of that entry

#### Scenario: Dataset types are exported

- **WHEN** a TypeScript consumer imports `cities` from `turkey-map-react/data`
- **THEN** each item is assignable to `CityType` imported from the package root or the core entry

### Requirement: Data-free component entry point

The package SHALL expose `turkey-map-react/core` with the same default `TurkeyMap` component and the same public types as the root entry. The core entry MUST require a `data` prop at the type level and MUST NOT import, reference, or fall back to the built-in dataset. If `data` is omitted at runtime by untyped JavaScript, the core component MUST render no provinces rather than loading the built-in data.

#### Scenario: Custom-data consumer excludes the dataset

- **WHEN** a consumer imports the default export from `turkey-map-react/core` and supplies custom `data`
- **THEN** the map renders the custom provinces and the consumer's bundle does not include the built-in dataset from this package

#### Scenario: Core requires data in TypeScript

- **WHEN** a TypeScript consumer renders the core component without `data`
- **THEN** the consumer's type-check fails because `data` is required

#### Scenario: Core supports the full component API

- **WHEN** the core component is used with selection, disabled-city, tooltip, keyboard, and custom-style props
- **THEN** it behaves the same as the root component with the same props and supplied data

#### Scenario: Missing runtime data is empty, not built-in

- **WHEN** JavaScript code omits `data` on the core component
- **THEN** no province groups render and the built-in dataset is not used as a fallback

### Requirement: Entry points expose consistent public types

The root, core, and data entry points SHALL publish TypeScript declarations. The root and core entries MUST export the same public component and type names, including `CityType`, `Region`, `Centroid`, `Data`, `CustomStyleType`, `ViewBoxType`, `SelectionMode`, `SelectionValue`, and the public callback types. The root and core components, their props types, `Data`, and the public callback and helper types MUST be generic over `T extends CityType` with a default of `CityType`, so the same generic city type can be used with either entry. The data entry MUST export the built-in 81-province dataset with the optional geography fields populated, and each entry MUST remain assignable to `CityType`. Type resolution MUST work for both CommonJS and bundler-style module resolution.

#### Scenario: Root and core type imports match

- **WHEN** a TypeScript consumer imports a public type from either `turkey-map-react` or `turkey-map-react/core`
- **THEN** the imported type is available with the same shape from both entries, including `Region`, `Centroid`, and the generic parameters on `Data` and the component props

#### Scenario: Core and data declarations resolve

- **WHEN** a TypeScript consumer imports `turkey-map-react/core` or `turkey-map-react/data` with bundler or Node module resolution
- **THEN** the compiler resolves the matching declaration file instead of reporting a missing module

#### Scenario: Generic city types are consistent across entries

- **WHEN** a consumer defines a city type with typed `meta` and uses it with both the root and core components
- **THEN** both entries accept the same `Data<MyCity>` and expose `MyCity` to their callbacks

### Requirement: Package subpaths preserve existing imports

The package SHALL declare its public subpaths through the package `exports` map. The root, `./core`, `./data`, and `./package.json` subpaths MUST resolve. Existing deep imports under `./lib/*` MUST continue to resolve for consumers that already use them. `main` and `types` MUST remain present for tooling that does not read `exports`.

#### Scenario: Documented subpaths resolve

- **WHEN** a consumer imports `turkey-map-react`, `turkey-map-react/core`, or `turkey-map-react/data`
- **THEN** the import resolves to the matching built artifact

#### Scenario: Existing deep imports survive

- **WHEN** a consumer imports an existing file through `turkey-map-react/lib/...`
- **THEN** the import still resolves

#### Scenario: Older resolvers still find the root

- **WHEN** a tool reads `main` or `types` instead of `exports`
- **THEN** it finds the root JavaScript entry and root declarations

### Requirement: Entry-point guidance is documented

The readme SHALL document the root, `core`, and `data` entry points, when to use each, that the root entry includes the built-in dataset, that `core` requires `data`, and how the choices affect bundle size. The readme's API section MUST remain accurate for existing root usage.

#### Scenario: Consumer can choose an entry point

- **WHEN** a consumer reads the readme entry-point section
- **THEN** it explains that `turkey-map-react` is the data-backed default, `turkey-map-react/core` is for custom data without the built-in dataset, and `turkey-map-react/data` exposes the built-in dataset

#### Scenario: Existing examples remain valid

- **WHEN** a consumer follows the existing readme examples that import from `turkey-map-react`
- **THEN** the examples still work without changes

### Requirement: The headless hook is exported from the root and core entries

The package SHALL export a named `useTurkeyMap` hook and its public hook types from both `turkey-map-react` and `turkey-map-react/core`. Neither export MUST render map markup or import the built-in dataset, and the hook MUST require `data` even on the root entry so it never silently falls back to the built-in 81 provinces. The `core` entry MUST remain the dataset-free component and hook surface. Adding the hook MUST NOT require a new package subpath, and every existing root, `core`, `data`, and `./lib/*` import MUST keep resolving.

#### Scenario: Root and core expose the hook

- **WHEN** a consumer imports `{ useTurkeyMap }` from `turkey-map-react` or `turkey-map-react/core`
- **THEN** the import resolves to the same hook implementation and type declarations

#### Scenario: The hook is dataset-free on both entries

- **WHEN** a consumer calls the hook without `data` at the type level
- **THEN** the consumer's type-check fails
- **AND** no built-in province dataset is used as a fallback at runtime

#### Scenario: Custom data stays custom

- **WHEN** a consumer calls the hook with custom `data` from either entry
- **THEN** the hook result only contains those cities and the built-in dataset is not included by the root hook path

#### Scenario: Existing subpaths are unchanged

- **WHEN** a consumer imports `turkey-map-react`, `turkey-map-react/core`, `turkey-map-react/data`, or an existing `turkey-map-react/lib/*` path
- **THEN** the import still resolves as before this change

#### Scenario: Entry-point guidance includes the hook

- **WHEN** a consumer reads the readme entry-point or headless documentation
- **THEN** it explains that the hook is available from both entries, requires `data`, renders nothing, and is meant for consumers who own the markup

#### Scenario: Hook types resolve from both entries

- **WHEN** a TypeScript consumer imports the hook option, result, prop-getter, or generic city types from either entry
- **THEN** the compiler resolves the matching declaration file without a missing-module or missing-type error
