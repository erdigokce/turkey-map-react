## ADDED Requirements

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
