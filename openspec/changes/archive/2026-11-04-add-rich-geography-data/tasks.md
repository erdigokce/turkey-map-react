## 1. Types and public API

- [x] 1.1 Add `Region` and `Centroid` types and the optional `region`, `centroid`, `neighbors`, `areaKm2`, `population`, `isoCode`, `nutsCode`, `altNames`, and `meta` fields to `CityType` in `src/city-type.ts`, keeping existing fields and `disabled` unchanged.
- [x] 1.2 Make `Data`, `TurkeyMapProps`, `CoreProps`, `CityStyleGetter`, `CityWrapper`, `IsCityDisabledCallback`, `OnSelectCallback`, `OnSelectionChangeCallback`, `OnMaxSelectionReachedCallback`, and `RenderTooltipCallback` generic over `T extends CityType = CityType` in `src/types.ts` and `src/core.tsx`.
- [x] 1.3 Export `Region` and `Centroid` from both the root and core entries, and confirm the generic types keep their `CityType` defaults so existing imports still resolve.
- [x] 1.4 Replace the `React.FC` root component in `src/index.tsx` with a generic function declaration that forwards `T` to `CoreTurkeyMap` and injects the built-in dataset with a single documented cast.
- [x] 1.5 Make `CoreTurkeyMap`, `LatestValues`, `cityById`, `mapIdsToCities`, selection helpers, and the internal `Province` component generic over `T`, keeping DOM-only helpers on base `CityType` fields.

## 2. Geography dataset

- [x] 2.1 Add `scripts/compute-centroids.js` to parse the built-in `M`/`L`/`C`/`Z` paths, flatten curves, compute an area centroid, and fall back to an interior point when the centroid is outside the polygon.
- [x] 2.2 Generate and review centroids for all 81 provinces in the default viewBox coordinate space (`0 80 1050 585`).
- [x] 2.3 Add `src/data/geography.ts` with `region`, `centroid`, `neighbors`, `areaKm2`, `population`, `isoCode`, `nutsCode`, and optional `altNames` for all 81 provinces, using lowercase ASCII region keys and leaving `meta` absent.
- [x] 2.4 Compose `baseCities` with the geography table in `src/data/index.ts` so the exported `cities` array keeps the existing `CityType[]` shape with the new optional fields populated.
- [x] 2.5 Cross-check the curated region, adjacency, area, population, ISO, and NUTS values against the documented sources, and fix any mismatch before testing.

## 3. Interaction payloads

- [x] 3.1 Update `getCityPayload` in `src/core.tsx` to return the source city unchanged when no `cityWrapper` is used, and to merge DOM base fields over the source city when a wrapper is used so optional fields and metadata survive.
- [x] 3.2 Update the `"none"`-mode keyboard activation path to pass the full city object to `onClick` instead of rebuilding a base-only payload.
- [x] 3.3 Confirm `onHover`, `onClick`, `onSelect`, `onSelectionChange`, `onMaxSelectionReached`, `isCityDisabled`, `getCityStyle`, `cityWrapper`, and `renderTooltip` all receive the generic `T` city with its optional fields intact.

## 4. Tests

- [x] 4.1 Extend `src/__tests__/data.test.ts` with integrity checks for 81 entries, unique ids/plates/ISO/NUTS codes, valid regions, finite centroids inside the default viewBox, symmetric and referentially valid adjacency, positive area/population, code formats, and unchanged base fields.
- [x] 4.2 Extend `tests/artifact/data.test.ts` so the published `lib/data` bundle exposes the rich fields with the same counts, codes, and adjacency invariants.
- [x] 4.3 Add Jest tests for full-city callback payloads: hover, click, selection callbacks, `getCityStyle`, `isCityDisabled`, wrapped cities, and `"none"`-mode keyboard activation.
- [x] 4.4 Add a regression test that `<TurkeyMap />` and custom data without new fields render the same province groups, ids, names, plates, and `data-*` attributes as before.
- [x] 4.5 Extend `scripts/test-types.js` with a `SalesCity` generic consumer for both root and core entries, `Region`/`Centroid` imports, an invalid-region `@ts-expect-error`, and the existing untyped custom-data cases.
- [x] 4.6 Run `npm run typecheck`, the Jest suite, and `npm run test:artifact`, and fix all failures.

## 5. Documentation and release checks

- [x] 5.1 Update `docs/api.md` with the new `CityType` fields, `Region` and `Centroid` types, generic signatures, and generic metadata example.
- [x] 5.2 Add a geography-data section to `docs/custom-data.md` documenting each field, units, centroid coordinate space, sources and reference years, and the `Omit<CityType, "meta">` pattern for typed metadata.
- [x] 5.3 Update `readme.md` and `docs/getting-started.md` with the rich-data summary, a short generic example, and the measured root/data bundle sizes.
- [x] 5.4 Build the package, run `npm run test:bundle-size`, and update `ROOT_BUDGET` in `scripts/check-bundle-size.js` only to the measured root size plus the existing small headroom if the new dataset exceeds the current budget; confirm the core entry stays under 15 kB gzip.
- [x] 5.5 Run `npm run verify` end to end and confirm the default render, selection, disabled, tooltip, theming, accessibility, SSR, and package/type smoke tests all pass.
