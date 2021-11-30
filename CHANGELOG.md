
# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [2.0.0] - 2021-11-29

This release introduces counties API.

### Added

- [County Map When A City is Clicked](https://github.com/erdigokce/turkey-map-react/issues/5)
  County Map is introduced.

### Changed

- 

### Fixed

- 

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
