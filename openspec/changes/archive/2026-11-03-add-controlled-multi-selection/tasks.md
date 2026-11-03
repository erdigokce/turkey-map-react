## 1. Public API and types

- [x] 1.1 Extend `CustomStyleType` with optional `selectedColor`, `selectedStroke`, and `selectedStrokeWidth`, and export `SelectionMode`, `SelectionValue`, and the `onSelect` / `onSelectionChange` / `onMaxSelectionReached` callback types from `src/index.tsx`
- [x] 1.2 Add `selectionMode`, `selectedCity`, `defaultSelectedCity`, `selectedCities`, `defaultSelectedCities`, `maxSelection`, `onSelect`, `onSelectionChange`, and `onMaxSelectionReached` to `IProps` with the documented defaults
- [x] 1.3 Add a development-only warning helper guarded by `typeof process !== "undefined"` and `NODE_ENV !== "production"`, plus a style merge that keeps existing `{ idleColor, hoverColor }` objects valid

## 2. Selection engine

- [x] 2.1 Implement controlled detection (`!== undefined`, with `null`/`[]` as clearing values), id normalization/deduplication, and `CityType` mapping that ignores unknown ids
- [x] 2.2 Initialize uncontrolled state once from `defaultSelectedCity` / `defaultSelectedCities`; derive effective ids per mode and keep single mode at most one id
- [x] 2.3 Implement the shared activation helper for single replace/re-select, multiple add/remove, change detection, uncontrolled state writes, and `onSelectionChange`
- [x] 2.4 Implement `maxSelection` validation and enforcement: ignore overflow attempts, allow removal at the cap, call `onMaxSelectionReached`, and fall back to a development `console.warn`
- [x] 2.5 Wire `onSelect` to select actions only and `onSelectionChange` to actual selection changes, preserving latest callback references and full `CityType` objects from `data`
- [x] 2.6 Add development warnings for controlled+default conflicts, selection props with `selectionMode="none"`, props from the unused mode, invalid `maxSelection`, and controlled values exceeding the limit

## 3. Rendering and keyboard

- [x] 3.1 Replace direct `path.style.fill` hover mutation with `hoveredCityId` state and derive `fill` as selected > hovered > idle
- [x] 3.2 Apply `selectedColor`, `selectedStroke`, and `selectedStrokeWidth` to selected paths and leave default rendering byte-for-byte compatible when nothing is selected
- [x] 3.3 In selection modes only, add `tabIndex={0}`, Enter/Space activation, and focus/blur state with a visible focus outline; add no keyboard stops in `"none"` mode
- [x] 3.4 Keep pointer selection restricted to path targets and keep `onClick` / `onHover` firing through the existing extraction helper unchanged

## 4. Tests

- [x] 4.1 Add selection interaction tests for single replace, single idempotency, multiple toggle on/off, controlled updates, uncontrolled persistence across re-renders, and defaults applying only on mount
- [x] 4.2 Add `maxSelection` tests for overflow ignored, `onSelectionChange` not firing on overflow, custom `onMaxSelectionReached` suppressing the warning, removal at the cap, and invalid limits
- [x] 4.3 Add callback tests for full `CityType` payloads, `onSelectionChange` array shape in both modes, `onSelect` not firing on deselection, unknown-id filtering, and latest callback references after re-render
- [x] 4.4 Add rendering tests for selected vs hover precedence, selection surviving re-render and `customStyle` changes, deselect restoring idle styling, custom selected styles, and unchanged default output
- [x] 4.5 Add keyboard tests for Enter, Space, focus visibility, and absence of added tab stops when `selectionMode="none"`
- [x] 4.6 Add diagnostic tests for development warnings and confirm production builds emit no selection warnings (mock `NODE_ENV` in isolation)
- [x] 4.7 Update `tests/helpers.ts` / fixtures as needed and refresh snapshots only for additive selected/keyboard markup

## 5. Documentation and verification

- [x] 5.1 Update the readme API tables for the new props, `CustomStyleType` fields, and exported types, and add single/multiple controlled/uncontrolled examples
- [x] 5.2 Add a form-integration example showing the primitive value shape for react-hook-form/Formik/server actions and document the `maxSelection` overflow behavior
- [x] 5.3 Extend `scripts/test-types.js` with controlled/uncontrolled single and multiple usage and the new callbacks
- [x] 5.4 Run `npm test`, `npm run test:coverage`, `npm run build`, `npm run test:artifact`, and `npm run test:types`; confirm the gzip bundle stays under 15 kB
