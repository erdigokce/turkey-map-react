# Contributing

When contributing to this repository, please first discuss the change you wish to make via issue,
email, or any other method with the owners of this repository before making a change. 

Please note we have a code of conduct, please follow it in all your interactions with the project.

## Commit Message Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages. This enables automated changelog generation and semantic versioning.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: A new feature (triggers MINOR version bump)
- `fix`: A bug fix (triggers PATCH version bump)
- `docs`: Documentation only changes
- `style`: Changes that don't affect code meaning
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Changes to the build process or auxiliary tools

### Examples

```bash
feat: add custom tooltip support
fix: resolve rendering issue on mobile
docs: update installation instructions
test: add tests for tooltip component
```

For breaking changes, add `!` after type or `BREAKING CHANGE:` in footer:
```bash
feat!: remove deprecated API
```

## Pull Request Process

1. Ensure any install or build dependencies are removed before the end of the layer when doing a 
   build.
2. Update the README.md with details of changes to the interface, this includes new environment 
   variables, exposed ports, useful file locations and container parameters.
3. Follow the commit message convention described above. The versioning is handled automatically
   by the release script based on conventional commits. The versioning scheme we use is [SemVer](http://semver.org/).
4. Ensure all checks pass by running `npm run verify`
5. You may merge the Pull Request in once you have the sign-off of two other developers, or if you 
   do not have permission to do that, you may request the second reviewer to merge it for you.

### Test layers

`npm run verify` builds the package and runs every layer of the test suite:

- `npm run test:coverage` — source tests with enforced coverage thresholds.
- `npm run test:artifact` — renders the built `lib/index.js` bundle.
- `npm run test:package` — packs the package, verifies its contents, and installs
  it into a temporary consumer project.
- `npm run test:types` — compiles a TypeScript consumer against the published
  type declarations.
- `npm run test:compat` — optional local smoke test for a specific React version
  (`REACT_VERSION=16.8.6 npm run test:compat`). CI runs it for React 16.8, 17,
  18, and 19.

## Dependency Updates

Dependencies are kept up to date automatically:

- **Dependabot** (`.github/dependabot.yml`) checks npm packages and GitHub Actions
  daily and opens pull requests.
- Minor and patch npm updates are grouped into a single PR per day. Updates to
  `react`, `react-dom` and their type packages never cross a major version
  automatically.
- **CI** (`.github/workflows/ci.yml`) installs dependencies, runs the source test
  matrix on Node 22/24 and React 18/19, typechecks, builds the package, verifies
  the built artifact and packed package, and runs React 16.8/17/18/19
  compatibility smoke tests.
- **Auto-merge** (`.github/workflows/dependabot-auto-merge.yml`) squash-merges a
  Dependabot PR only after CI passes and only when the update is a patch or a
  minor (non-major) bump.

The artifact and package tests are the safety net for build-tool updates: a
Babel, webpack, or TypeScript update that breaks the published output fails CI
even if the source-level tests still pass.

Major version bumps are always opened individually and must be reviewed and
merged by a maintainer.

### Enabling security updates

Dependabot version updates are configured in this repository. To also receive
pull requests for known vulnerabilities, enable **Dependabot alerts** and
**Dependabot security updates** under
*Settings → Code security and analysis* in the GitHub repository.

## Code of Conduct

### Our Pledge

In the interest of fostering an open and welcoming environment, we as
contributors and maintainers pledge to making participation in our project and
our community a harassment-free experience for everyone, regardless of age, body
size, disability, ethnicity, gender identity and expression, level of experience,
nationality, personal appearance, race, religion, or sexual identity and
orientation.

### Our Standards

Examples of behavior that contributes to creating a positive environment
include:

* Using welcoming and inclusive language
* Being respectful of differing viewpoints and experiences
* Gracefully accepting constructive criticism
* Focusing on what is best for the community
* Showing empathy towards other community members

Examples of unacceptable behavior by participants include:

* The use of sexualized language or imagery and unwelcome sexual attention or
advances
* Trolling, insulting/derogatory comments, and personal or political attacks
* Public or private harassment
* Publishing others' private information, such as a physical or electronic
  address, without explicit permission
* Other conduct which could reasonably be considered inappropriate in a
  professional setting

### Our Responsibilities

Project maintainers are responsible for clarifying the standards of acceptable
behavior and are expected to take appropriate and fair corrective action in
response to any instances of unacceptable behavior.

Project maintainers have the right and responsibility to remove, edit, or
reject comments, commits, code, wiki edits, issues, and other contributions
that are not aligned to this Code of Conduct, or to ban temporarily or
permanently any contributor for other behaviors that they deem inappropriate,
threatening, offensive, or harmful.

### Scope

This Code of Conduct applies both within project spaces and in public spaces
when an individual is representing the project or its community. Examples of
representing a project or community include using an official project e-mail
address, posting via an official social media account, or acting as an appointed
representative at an online or offline event. Representation of a project may be
further defined and clarified by project maintainers.

### Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be
reported by contacting the project team at [INSERT EMAIL ADDRESS]. All
complaints will be reviewed and investigated and will result in a response that
is deemed necessary and appropriate to the circumstances. The project team is
obligated to maintain confidentiality with regard to the reporter of an incident.
Further details of specific enforcement policies may be posted separately.

Project maintainers who do not follow or enforce the Code of Conduct in good
faith may face temporary or permanent repercussions as determined by other
members of the project's leadership.

### Attribution

This Code of Conduct is adapted from the [Contributor Covenant][homepage], version 1.4,
available at [http://contributor-covenant.org/version/1/4][version]

[homepage]: http://contributor-covenant.org
[version]: http://contributor-covenant.org/version/1/4/
