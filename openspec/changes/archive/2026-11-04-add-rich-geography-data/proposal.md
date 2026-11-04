## Why

`CityType` currently carries only `id`, `plateNumber`, `name`, and `path`, so every consumer re-encodes the same province facts — region, label position, adjacency, area, population, and official codes. That duplication blocks the planned labels, regions/neighbor highlighting, and marker overlays, and it makes consumer data inconsistent and error-prone. Issue #64 asks for one accurate, documented, backward-compatible geography model that those features can build on.

## What Changes

This change is **additive and non-breaking**. `<TurkeyMap />`, every existing prop, callback, public type, legacy DOM id, and default render keep working when the new fields and generics are not used. Existing custom `data` continues to compile and render unchanged because every new `CityType` field is optional.

- Extend `CityType` with optional `region`, `centroid`, `neighbors`, `areaKm2`, `population`, `isoCode`, `nutsCode`, `altNames`, and `meta` fields. Existing `disabled?: boolean` is preserved.
- Export the supporting public types `Region` and `Centroid` so consumers can type their own data without importing internals.
- Populate `region`, `centroid`, and `neighbors` for all 81 built-in provinces, and populate `areaKm2`, `population`, `isoCode`, and `nutsCode` for all 81 as well. `altNames` is populated where a province has a meaningful alternative name; `meta` stays consumer-defined and absent from the built-in dataset.
- Make the component, props, data container, and callbacks generic over `T extends CityType` (default `CityType`), so `meta` and any additional consumer fields are typed through `data`, `onHover`, `onClick`, selection callbacks, `getCityStyle`, `isCityDisabled`, `cityWrapper`, and `renderTooltip`. `TurkeyMap<MyCity>` and `CoreTurkeyMap<MyCity>` both work.
- Preserve the complete city object in interaction payloads. `onHover`, `onClick`, and the `"none"`-mode activation payload currently rebuild an object containing only `id`, `name`, `plateNumber`, and `path`; they must also carry the optional geography fields and any consumer metadata.
- Document the dataset: provenance for paths, regions, centroids, adjacency, area, population, ISO 3166-2, and NUTS3 codes, including reference years and the coordinate space used by `centroid`.
- Add data-integrity tests for the built-in dataset and the published `lib/data` bundle: 81 provinces, unique ids/plates/ISO/NUTS codes, valid regions, centroids inside the default viewBox, symmetric and valid adjacency, positive area/population, and correct code formats.
- Add generic TypeScript consumer coverage to `scripts/test-types.js` proving typed `meta` flows through the root and core entries while existing untyped `data` still compiles.
- Update `readme.md`, `docs/api.md`, and `docs/custom-data.md` with the new fields, generic usage, data sources, and the measured bundle-size impact.

**Explicitly out of scope:** province labels (#60), region and neighbor highlighting behavior (#62), markers and bubble overlays (#67), changing the `Data` wrapper shape or the default export, adding new runtime dependencies, a separate rich-data entry point, lat/long or GeoJSON conversion, runtime validation of consumer data, population time series or multiple reference years, and any change to selection, disabled, tooltip, theming, accessibility, or DOM-id behavior.

## Capabilities

### New Capabilities

- `geography-data`: the rich `CityType` geography model, its completeness and accuracy for the 81-province built-in dataset, generic typing of consumer metadata through the component API, full-city interaction payloads, data provenance, and integrity guarantees.

### Modified Capabilities

- `data-entry-points`: the root and core entries must expose the same new geography types and the same generic component/props/data/callback signatures, while the root and data entries keep returning the same 81-province dataset with the richer optional fields.

## Impact

- **Public API:** new optional `CityType` fields and supporting types (`Region`, `Centroid`); generic parameters on `TurkeyMap`, `CoreTurkeyMap`, `TurkeyMapProps`, `CoreProps`, `Data`, `CityStyleGetter`, `CityWrapper`, `IsCityDisabledCallback`, `OnSelectCallback`, `OnSelectionChangeCallback`, `OnMaxSelectionReachedCallback`, and `RenderTooltipCallback`, each defaulting to the existing non-generic shape. No existing prop, callback, or type is removed or made required.
- **Code:** `src/city-type.ts` and `src/types.ts` type changes; generic plumbing in `src/index.tsx` and `src/core.tsx`; full-city payload construction in `src/core.tsx`; rich fields added to `src/data/index.ts`; a one-off data-generation/verification script if centroids are derived rather than hand-entered.
- **Tests:** `src/__tests__/data.test.ts`, `tests/artifact/data.test.ts`, new or extended rendering/callback tests for payload completeness, `scripts/test-types.js`, and `scripts/check-bundle-size.js` if the measured root bundle needs a documented budget update.
- **Docs:** `readme.md`, `docs/api.md`, `docs/custom-data.md`, and the bundle-size figures in `readme.md`/`docs/getting-started.md`.
- **Dependencies:** none; zero runtime dependencies and React >=16.8 peer support are preserved. The data-free `core` entry stays within its 15 kB gzip budget; the root/data entries grow because the built-in dataset carries more fields, and the regression budget is updated only to the measured new size.
- **Compatibility:** custom datasets without any new fields remain valid and render identically. Consumers that pass richer fields now receive them back from interaction callbacks; consumers that ignore them see no change. Default markup, ids, selection, disabled, tooltip, and accessibility behavior are unchanged.
