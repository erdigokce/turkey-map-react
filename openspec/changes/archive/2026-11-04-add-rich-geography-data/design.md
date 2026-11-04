## Context

The library currently ships a single non-generic `CityType` (`id`, `plateNumber`, `name`, `path`, optional `disabled`) and one built-in dataset in `src/data/index.ts`. `src/types.ts` types every prop and callback against `CityType`, `src/core.tsx` owns rendering and interaction payload construction, and `src/index.tsx` injects the built-in dataset into the core component. Three consumers already depend on this surface: the default root entry, the data-free `turkey-map-react/core` entry, and the standalone `turkey-map-react/data` entry. See `proposal.md` for motivation and `specs/geography-data/spec.md` for the behavior contract.

Relevant constraints:

- Backward compatibility is mandatory; every new field is optional and every new generic parameter defaults to today's shape.
- Zero runtime dependencies; React/React DOM are peer dependencies supporting `>=16.8`.
- The data-free core entry has a hard 15 kB gzip budget; the root entry is guarded at 90 kB gzip and includes the dataset.
- Jest + @testing-library coverage and API/readme updates are required.
- The built-in SVG paths use only absolute `M`, `L`, `C`, and `Z`/`z` commands, which makes centroid derivation from the existing geometry practical without a runtime parser.

## Goals / Non-Goals

**Goals:**

- Add the optional geography fields and export `Region`/`Centroid`.
- Make the component, props, data container, and callbacks generic over `T extends CityType` with `CityType` defaults.
- Deliver all 81 provinces with complete, internally consistent geography facts and documented provenance.
- Return the complete city object from every interaction callback.
- Keep default rendering, ids, and behavior byte-for-byte equivalent in observable terms.

**Non-Goals:**

- No labels, region highlighting, or marker UI (issues #60, #62, #67).
- No lat/long, GeoJSON, projection, or coordinate conversion API.
- No runtime validation of consumer data and no new entry point for geography.
- No population time series, multiple reference years, or user-selectable data sources.
- No changes to selection, disabled, tooltip, theming, or accessibility semantics.

## Decisions

### 1. Keep `CityType` non-generic; put generics on the API types

`CityType` stays a plain object type with `meta?: Record<string, unknown>`. `Data<T>`, `TurkeyMapProps<T>`, `CoreProps<T>`, and the callback/helper types become generic with a `CityType` default:

```ts
type Data<T extends CityType = CityType> = { cities: T[] };

type TurkeyMapProps<T extends CityType = CityType> = {
  data?: Data<T>;
  onHover?: (city: T) => void;
  onClick?: (city: T) => void;
  onSelect?: OnSelectCallback<T>;
  // ...remaining props unchanged
};

function TurkeyMap<T extends CityType = CityType>(
  props: TurkeyMapProps<T>,
): React.ReactElement;
```

Consumers type metadata with an `Omit` pattern, which preserves `T extends CityType` assignability:

```ts
type SalesCity = Omit<CityType, "meta"> & { meta: { sales: number } };
<TurkeyMap<SalesCity> data={salesData} onHover={(city) => city.meta.sales} />
```

**Why not make `CityType` itself generic (`CityType<TMeta>`)?** It would force a type argument through every existing signature and every re-export, and would make the common `CityType` default interact awkwardly with assignability. Generics on the API types give the same consumer benefit with a much smaller public change.

**Why `Omit` rather than an intersection (`CityType & { meta: ... }`)?** Both type-check, but `Omit` replaces the wide `Record<string, unknown>` instead of intersecting it, so `city.meta.sales` is unambiguously `number` and the intent is clearer in docs.

**Known limitation:** the root component falls back to the built-in dataset when `data` is omitted. If a consumer explicitly selects a custom `T` but omits `data`, the fallback is cast to `Data<T>` and cannot actually contain that consumer's metadata. The docs state that a custom `T` requires matching `data`; the core entry already enforces `data` at the type level.

### 2. Generic plumbing stays at the component boundary

- `src/index.tsx`: replace `React.FC<TurkeyMapProps>` with a generic function declaration that forwards to `<CoreTurkeyMap<T>>` and casts the built-in fallback once.
- `src/core.tsx`: `CoreTurkeyMap<T>`, `CoreProps<T>`, `LatestValues<T>`, `cityById: Map<string, T>`, and selection/tooltip helpers become generic. Internal `Province` becomes generic so province-facing handlers can accept `T`; `React.memo` is cast back to the generic function signature.
- DOM-only helpers (`getCityPayloadFromEvent`, style resolution) continue to operate on base `CityType` fields, because they only read `id`, `name`, `plateNumber`, and `path`.
- The data entry keeps `export const cities: CityType[]`; no generic is needed there.

This keeps the generic surface honest without rewriting rendering logic or introducing a second city abstraction.

### 3. Merge curated geography into the existing path dataset

Keep the existing path array in `src/data/index.ts` as `baseCities` and add `src/data/geography.ts`, an internal `Record<cityId, GeographyFields>` keyed by id. `src/data/index.ts` composes:

```ts
export const cities: CityType[] = baseCities.map((city) => ({
  ...city,
  ...geography[city.id],
}));
```

`GeographyFields` is `Omit<CityType, "id" | "plateNumber" | "name" | "path" | "disabled" | "meta">`. This keeps the large path diff untouched, makes the new facts reviewable in one table, and adds only a trivial merge at module load.

**Alternative considered:** inline every new field into each of the 81 existing objects. Rejected because it produces a huge, conflict-prone diff and makes the provenance table hard to audit.

### 4. Centroid derivation from existing SVG geometry

Add a committed one-off script, `scripts/compute-centroids.js`, that parses the built-in `M`/`L`/`C`/`Z` paths, flattens cubic Béziers, computes the polygon area centroid, and verifies the point is inside the polygon. When the area centroid falls outside a concave province, the script samples a grid inside the bounding box and picks the interior point farthest from the boundary (an approximate pole of inaccessibility). The script prints the centroid table; the values are reviewed and checked into `src/data/geography.ts`.

Centroids use SVG user units, the same coordinate space as `path` and the default viewBox string `0 80 1050 585`. They are not latitude/longitude and are not projected at runtime.

**Why not fetch centroids from an external GeoJSON?** The built-in paths use a custom projection; external lat/long centroids would require calibration and could drift from the rendered shapes. Deriving from the same paths guarantees labels sit on the drawn provinces.

### 5. Dataset provenance

Document the following in `docs/custom-data.md` and summarize in `readme.md`:

| Field | Source / method | Reference |
| :--- | :--- | :--- |
| `id`, `plateNumber`, `name`, `path` | Existing package dataset, unchanged | Current release |
| `region` | Conventional seven-region province assignment (Marmara, Ege, Akdeniz, İç Anadolu, Karadeniz, Doğu Anadolu, Güneydoğu Anadolu), stored as lowercase ASCII keys | Turkish geographical regions |
| `centroid` | Derived from the built-in SVG path geometry by `scripts/compute-centroids.js` | Generated from the checked-in paths |
| `neighbors` | Curated from official provincial boundary data (HGK), validated for symmetry and referential integrity | HGK provincial boundaries |
| `areaKm2` | TÜİK provincial surface-area figures (HGK-derived) | TÜİK "İl ve İlçe Yüz Ölçümleri", 2022 |
| `population` | TÜİK Address-Based Population Registration System (ADNKS) | 31 December 2025, released February 2026 |
| `isoCode` | ISO 3166-2:TR; equals `TR-` plus the zero-padded plate number | ISO 3166-2:TR |
| `nutsCode` | NUTS3 province codes | NUTS 2021 (Eurostat/TÜİK) |
| `altNames` | Common alternative or historical province names, only where meaningful | Curated |

The docs also state the units, the centroid coordinate space, and that `meta` is intentionally absent from the built-in dataset.

### 6. Interaction payloads spread the source city

Replace the base-only payload reconstruction with a merge:

```ts
const getCityPayload = (event, city: T): T => {
  if (!latest.current.cityWrapper) {
    return city;
  }
  return { ...city, ...getCityPayloadFromEvent(event) } as T;
};
```

The `"none"`-mode keyboard activation path passes `city` directly instead of rebuilding `{ id, name, plateNumber, path }`. This preserves the existing contract that a wrapped city's base fields reflect the rendered DOM, while optional geography and consumer metadata survive. No consumer reading only base fields sees a change.

### 7. Validation lives in tests, not runtime

- `src/__tests__/data.test.ts` validates the source dataset: 81 entries, unique ids/plates/ISO/NUTS, all seven regions valid, centroids finite and inside the default viewBox, adjacency symmetric and referentially valid, positive area/population, code formats, and unchanged base fields.
- `tests/artifact/data.test.ts` validates the published `lib/data/index.js`: rich fields survive the build, counts and codes are intact, and adjacency remains symmetric.
- `scripts/test-types.js` adds a `SalesCity` consumer for both root and core entries, `Region`/`Centroid` imports, an invalid-region `@ts-expect-error`, and keeps the existing untyped custom-data cases.

Tests are the integrity gate; runtime stays dependency-free and does not validate consumer data.

### 8. Bundle budget is measured, then documented

The core entry is unaffected and must stay under 15 kB gzip. The root/data entries grow with the new fields. After implementation, run `npm run build && npm run test:bundle-size`, record the new gzip sizes, update `ROOT_BUDGET` in `scripts/check-bundle-size.js` only to the measured size plus the same small headroom used today, and update the bundle-size figures in `readme.md` and `docs/getting-started.md`.

**Alternative considered:** move rich fields into a separate entry point to keep the root size flat. Rejected because the issue requires the default dataset to carry the data for labels/regions, and a second dataset would create two sources of truth.

## Risks / Trade-offs

- **Root bundle budget is exceeded** → Measure first; update the regression budget only to the measured value with a comment. If growth is unexpectedly large, compact the encoded fields (shorter `altNames`, omit empty arrays) before touching the budget.
- **Curated adjacency is incomplete or asymmetric** → Symmetry, self-reference, duplicate, and unknown-id tests run in both source and artifact suites; a review task cross-checks the table against HGK boundaries.
- **Centroid falls outside a concave province** → The generator tests point-in-polygon and falls back to an interior point; the data test re-verifies every centroid against the path.
- **Population/area figures drift from official releases** → Pin the reference year in docs; treat a refresh as a separate data-only change.
- **Generic inference surprises** → The `Omit<CityType, "meta"> & { meta: ... }` pattern is documented and covered by `scripts/test-types.js`; default usage stays `CityType`.
- **Custom `T` without `data` on the root entry is unsound** → Document that a custom `T` requires matching `data`; the core entry enforces `data` statically.
- **Callback payloads now carry more fields** → Additive only; base fields and callback timing are unchanged, and tests assert both old and new payload shapes.

## Migration Plan

No migration is required. The change ships as a minor release: existing imports, props, data, and callbacks continue to work. Consumers opt in by adding optional fields to their own data or by supplying a generic city type. Rollback is a normal revert; the built-in dataset can be restored to base fields without changing the public type because every new field is optional.

## Open Questions

None. The population reference year (ADNKS 2025), area source (TÜİK/HGK 2022), region key naming (lowercase ASCII Turkish), and centroid coordinate space are fixed by this design and recorded in the docs.
