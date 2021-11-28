
# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

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
