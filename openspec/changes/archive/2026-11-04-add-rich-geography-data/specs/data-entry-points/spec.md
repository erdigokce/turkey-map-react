## MODIFIED Requirements

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
