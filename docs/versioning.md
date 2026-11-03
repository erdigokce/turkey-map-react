# Versioning and releases

The versioning scheme and the automated release process.

[Back to README](../readme.md) · [Contributing](https://github.com/erdigokce/turkey-map-react/blob/master/CONTRIBUTING.md) · [Release process](https://github.com/erdigokce/turkey-map-react/blob/master/RELEASE.md)

## Versioning

Versioning follows the pattern `majorVersion.minorVersion.bugfixVersion`:

| Level           | Description                                                                                                                  |
| :-------------- | :--------------------------------------------------------------------------------------------------------------------------- |
| `majorVersion`  | Introduces breaking changes or features that may not be backward compatible.                                                 |
| `minorVersion`  | Introduces small changes that are backward compatible and fit existing uses.                                                 |
| `bugfixVersion` | Solves problems that appeared in the current major or minor versions.                                                        |

## Release process

This project has an automated build and release pipeline. For details on creating releases and publishing to npm, see [RELEASE.md](https://github.com/erdigokce/turkey-map-react/blob/master/RELEASE.md).

Quick reference:

- Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.
- Run `npm run release` to prepare a release (tests, build, changelog, version bump).
- Run `npm run publish:npm` to publish to npm.
- See [RELEASE.md](https://github.com/erdigokce/turkey-map-react/blob/master/RELEASE.md) for complete documentation.
