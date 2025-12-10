# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [2.0.0](https://github.com/erdigokce/turkey-map-react/compare/v1.2.2...v2.0.0) (2025-12-10)


### ⚠ BREAKING CHANGES

* Add automated release pipeline with conventional commits and standalone scripts (#23)

### Features

* Add automated release pipeline with conventional commits and standalone scripts ([#23](https://github.com/erdigokce/turkey-map-react/issues/23)) ([b9019e7](https://github.com/erdigokce/turkey-map-react/commit/b9019e7d3550e12fd6b0a8c097b6a721d323e498))

## [1.1.6] - 2023-01-26

### Fixed
- json5 and minimatch security fix

## [1.1.5] - 2022-08-27

This release brings **React 18** _(18.2.0)_ compatibility.

## [1.1.4] - 2022-07-31

### Added
- Live demo link has been added to Readme.

### Changed
- Style loaders has been removed from webpack config due to NextJS compatibility.
- Tooltip styles has been moved to inline styling.

### Fixed
- ReDOS security fix (Bump terser dependency)

## [1.1.3] - 2022-03-01

This release fixes minor security vulnerabilities caused by dependencies.

## [1.1.2] - 2022-03-01

This release fixes minor security vulnerabilities caused by dependencies.

### Fixed

- `css-loader` version has been upgraded to latest `6.6.0`.

## [1.1.1] - 2021-11-29

This release fixes peer dependency version range.

### Fixed

- `react` and `react-dom` peer dependency range is defined as `>= 16.13.1 < 18`.

## [1.1.0] - 2021-11-29

This release introduces default tooltip to display city names on hover.

### Added

- [Default Tooltip To Display City Names On Hover](https://github.com/erdigokce/turkey-map-react/issues/3)
  Default tooltip implementation. There are two props added which are **tooltipText** and **showTooltip**.

### Changed

- Babel versions have been updated.
- Build method is switched to webpack.
- css-loader and style-loader added as dev dependency.
- babel-plugin-react-css-modules added as dev dependency.
- Readme has been updated for default tooltip use cases.
- City datas has been moved to *data* directory.
- Typescript module configuration switched from *commonjs* to *es6*
- Webpack configuration for style loading.

### Fixed

- Typo fix in project description.
- Readme highlighting fixed.
