# Turkey Map React

[![npm version](https://img.shields.io/npm/v/turkey-map-react?style=flat-square)](https://www.npmjs.com/package/turkey-map-react)
[![npm downloads](https://img.shields.io/npm/dm/turkey-map-react?style=flat-square)](https://www.npmjs.com/package/turkey-map-react)
[![license](https://img.shields.io/npm/l/turkey-map-react?style=flat-square)](https://github.com/erdigokce/turkey-map-react/blob/master/LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/turkey-map-react?style=flat-square&label=minified%2Bgzip)](https://bundlephobia.com/package/turkey-map-react)
[![CI](https://github.com/erdigokce/turkey-map-react/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/erdigokce/turkey-map-react/actions/workflows/ci.yml)
[![CodeQL](https://github.com/erdigokce/turkey-map-react/actions/workflows/codeql.yml/badge.svg?branch=master)](https://github.com/erdigokce/turkey-map-react/actions/workflows/codeql.yml)
[![React](https://img.shields.io/badge/React-16.8%2B-61dafb?style=flat-square&logo=react&logoColor=white)](https://www.npmjs.com/package/turkey-map-react)

An interactive SVG map of Turkey for React applications. Ships all 81 provinces, supports single and multiple selection, and is keyboard accessible by default.

**81 built-in provinces · Selection · Accessible navigation · Custom tooltips · Choropleth color scales · CSS-variable theming · React 16.8–19**

[**Live demo**](https://turkey-map-react-demo.netlify.app/) · [**npm package**](https://www.npmjs.com/package/turkey-map-react) · [**Changelog**](https://github.com/erdigokce/turkey-map-react/blob/master/CHANGELOG.md) · [**Issues**](https://github.com/erdigokce/turkey-map-react/issues)

## Installation

```bash
npm install turkey-map-react
```

or with Yarn:

```bash
yarn add turkey-map-react
```

React and React DOM >=16.8 are peer dependencies. React is not bundled; your application's copy is used at runtime. TypeScript definitions are included.

## Quick start

```jsx
import TurkeyMap from 'turkey-map-react';

export default function App() {
  return <TurkeyMap />;
}
```

The root entry includes the built-in 81-province dataset. See [Getting started][getting-started] for events, custom data, and all entry points.

## Choropleth

Color provinces by any metric with `values`, keyed by city id:

```jsx
const values = { istanbul: 92, ankara: 45, izmir: 61 };

<TurkeyMap
  values={values}
  colorScale={['#f7fbff', '#08306b']}
  scaleType="linear"
  noDataColor="#eeeeee"
/>;
```

Linear, quantize, quantile, and threshold scales are built in, with `getColor` as an escape hatch. Provinces without a value use `noDataColor`, hover and selection keep the metric fill, and `renderTooltip` receives the current value. See [Choropleth values and color scales][choropleth] for the data contract and examples.

## Entry points

| Entry point             | What it provides                                                       | Use it when                                                          |
| :---------------------- | :--------------------------------------------------------------------- | :------------------------------------------------------------------- |
| `turkey-map-react`      | The default `TurkeyMap` component plus the built-in 81-province dataset. | You want the one-line `<TurkeyMap />` map.                           |
| `turkey-map-react/core` | The same component without the built-in dataset. `data` is required.   | You supply your own `data` and want the dataset out of your bundle.  |
| `turkey-map-react/data` | The built-in dataset as a named `cities` export.                       | You want to read, filter, or extend the built-in provinces yourself. |

The root entry is roughly 85 kB gzipped, `core` is roughly 3 kB gzipped before your data, and `data` is roughly 81 kB gzipped. See [entry points and bundle size][entry-points] for examples and guidance.

## Documentation

Detailed guides live in [`docs/`](https://github.com/erdigokce/turkey-map-react/tree/master/docs).

| Guide                                                | What it covers                                                                                          |
| :--------------------------------------------------- | :------------------------------------------------------------------------------------------------------ |
| [Getting started][getting-started]                   | Installation, requirements, quick start, events, entry points, and bundle size.                         |
| [Selection and forms][selection]                     | Single and multiple selection, controlled and uncontrolled values, limits, and form integration.         |
| [Custom data and cities][custom-data]                | Custom datasets, disabled provinces, and city wrapping.                                                 |
| [Choropleth values][choropleth]                      | Numeric values, linear/quantize/quantile/threshold scales, no-data styling, and transitions.            |
| [Tooltips][tooltips]                                 | Custom content, positioning, portals, delays, keyboard focus, and reduced motion.                       |
| [Accessibility][accessibility]                       | Keyboard navigation, ARIA semantics, live regions, and the native select fallback.                      |
| [Styling and DOM ids][styling]                       | CSS custom properties, `customStyle`, `getCityStyle`, container props, and instance ids.                 |
| [API reference][api]                                 | Every prop and exported TypeScript type.                                                                |
| [Versioning and releases][versioning]                | Versioning scheme and the automated release process.                                                    |

## Contributing

Pull requests are welcome. See [CONTRIBUTING.md](https://github.com/erdigokce/turkey-map-react/blob/master/CONTRIBUTING.md) for the full workflow, and use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

## License

Released under the [MIT License](https://github.com/erdigokce/turkey-map-react/blob/master/LICENSE).

## Credits

Derived from **dnomak**'s [svg-turkiye-haritasi][dnomak-link] project.

[getting-started]: https://github.com/erdigokce/turkey-map-react/blob/master/docs/getting-started.md
[entry-points]: https://github.com/erdigokce/turkey-map-react/blob/master/docs/getting-started.md#entry-points-and-bundle-size
[selection]: https://github.com/erdigokce/turkey-map-react/blob/master/docs/selection.md
[custom-data]: https://github.com/erdigokce/turkey-map-react/blob/master/docs/custom-data.md
[choropleth]: https://github.com/erdigokce/turkey-map-react/blob/master/docs/choropleth.md
[tooltips]: https://github.com/erdigokce/turkey-map-react/blob/master/docs/tooltips.md
[accessibility]: https://github.com/erdigokce/turkey-map-react/blob/master/docs/accessibility.md
[styling]: https://github.com/erdigokce/turkey-map-react/blob/master/docs/styling.md
[api]: https://github.com/erdigokce/turkey-map-react/blob/master/docs/api.md
[versioning]: https://github.com/erdigokce/turkey-map-react/blob/master/docs/versioning.md
[dnomak-link]: https://github.com/dnomak/svg-turkiye-haritasi
