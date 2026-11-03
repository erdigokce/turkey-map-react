## Context

See `proposal.md` for motivation. The relevant current state:

- `.github/workflows/ci.yml` runs the full validation matrix on pushes and PRs to `master`.
- `.github/workflows/dependabot-auto-merge.yml` listens to completed `CI` runs on `dependabot/**` branches, resolves the PR with `gh`, decides safety from the PR title, and squash-merges.
- `.github/dependabot.yml` groups minor/patch npm updates and GitHub Actions updates, and excludes React majors.
- `package.json` has no runtime dependencies and an exact `"overrides": { "brace-expansion": "5.0.9" }` pin. A local audit at planning time reports 23 advisories (3 low, 18 moderate, 2 high); 21 have a non-forced fix, while `commit-and-tag-version` / `dotgitignore` have none. The two high findings are `brace-expansion` and `minimatch`; the exact override prevents `npm audit fix` from moving `brace-expansion` to the patched `5.0.12`.
- The repository is public, so GitHub-hosted runners, CodeQL, and code scanning are free. `CONTRIBUTING.md` already documents Dependabot behavior and points maintainers at repository security settings.

## Goals / Non-Goals

**Goals:**

- One scheduled dependency audit that is idempotent, produces one reviewable PR, and reports both fixed and remaining advisories.
- A safe merge path that reuses the existing CI and auto-merge machinery instead of adding another merge mechanism.
- CodeQL coverage on PRs, `master`, and a weekly schedule without adding a build step or a paid service.
- Deterministic, least-privilege workflows that are easy to reason about and to roll back.

**Non-Goals:**

- Fixing source-code findings automatically. CodeQL alerts are reported in the Security tab and triaged by maintainers.
- Replacing Dependabot version updates or changing its grouping/ignore rules.
- Auto-fixing findings that require a semver-major upgrade or a downgrade.
- Adding runtime dependencies, changing the published package, or touching the component API.
- Enabling Dependabot security updates or secret scanning as repository settings.

## Decisions

### Decision: A separate scheduled audit workflow, not a job in `ci.yml`

`security-audit.yml` runs on a schedule and on `workflow_dispatch` with `contents: write` and `pull-requests: write`. Keeping it separate from `ci.yml` avoids granting write permissions to PR-triggered CI, keeps the audit out of the critical path of every push, and lets the audit use its own concurrency group.

Alternatives considered:
- A scheduled job inside `ci.yml` — rejected because `ci.yml` is triggered by untrusted PRs and is intentionally read-only.
- A standalone script run by a maintainer — rejected because it is not scheduled and can be forgotten.

The schedule is `30 5 * * *` UTC. Dependabot runs at 06:00 Europe/Istanbul (03:00 UTC) and Release at 04:30 UTC, so the audit starts after both and its PR lands before the next daily release. It checks out `${{ github.event.repository.default_branch }}` explicitly so a manual dispatch from another branch cannot scan or push untrusted code with a write token.

GitHub suppresses `pull_request` workflow runs for events created with the repository `GITHUB_TOKEN`, so a PR created by the audit workflow would not trigger CI by itself. After pushing the automation branch, the audit workflow therefore dispatches `ci.yml` on that branch (`actions: write`). `workflow_run` is also suppressed for a CI run dispatched with `GITHUB_TOKEN`, so the audit waits for that run and sends a `repository_dispatch` event (`security-audit-ci-complete`) once it succeeds. The auto-merge workflow accepts that event, and keeps the existing `workflow_run` path for pull-request and user-dispatched CI runs. This keeps the no-new-secrets constraint while preserving CI as the validation gate; the trade-off is one additional token permission and a few minutes of audit runtime.

### Decision: `npm audit fix` without `--force`, with a one-time override widening

The workflow runs `npm ci`, records `npm audit --json`, then `npm audit fix` (no `--force`). This keeps every change inside declared semver ranges and avoids npm's forced path, which can downgrade direct dependencies (for `brace-expansion`, npm proposes `jest@25.1.0`, a major downgrade).

The exact override pin is the one blocker the fixer cannot move. This change widens it to `^5.0.12`, which resolves the two high findings while still allowing future compatible patches; the lockfile remains the source of truth and CI validates the result. Leaving the exact pin and bumping it by hand for every advisory was rejected because it defeats the automation.

### Decision: Generate the report in a testable Node helper, keep git/PR operations in the workflow

`scripts/security-audit.js` reads the before/after `npm audit --json` reports plus a production-only report (`npm audit --omit=dev --json`) and writes the markdown PR body/summary. It also emits counts used by the failure policy. Unit tests in `scripts/security-audit.test.js` use the built-in `node:test` runner, so no dependency is added; `package.json` gains a `test:security-audit` script and `ci.yml` gains one step for it.

Alternatives considered:
- Inline Node/`jq` in the workflow — rejected because report formatting and severity counting are the most error-prone part and would have no tests.
- A third-party audit reporter — rejected because it adds a dependency and a supply-chain surface for a zero-dependency project.

The helper never runs git commands, never handles the token, and only writes local report files.

### Decision: One deterministic automation branch, force-pushed

The workflow uses `security/npm-audit-fix`, rebuilds it from the current default branch on every run, commits only `package.json` and `package-lock.json`, and force-pushes with an explicit refspec. It then looks up an open PR by head branch: if one exists it edits the body; otherwise it creates one against the default branch with the existing `dependencies` label (no new label is required).

Alternatives considered:
- A unique branch per run — rejected because it would accumulate stale PRs and duplicate advisories.
- Rebasing the existing branch — rejected because resolving conflicts with a moving `package-lock.json` is fragile; a fresh branch is deterministic. The branch is documented as automation-owned.

The workflow does not run the test suite before opening the PR. CI is the validation gate, and a dependency resolution that breaks CI should still be visible as a PR with a failing check rather than silently disappearing. Because `scripts/release.sh` treats `package-lock.json` as release-affecting, merging an audit PR will trigger the next daily release, exactly as a Dependabot lockfile update does today.

### Decision: Extend `dependabot-auto-merge.yml` with a guarded audit path

The `workflow_run` trigger adds `security/npm-audit-fix` to its branch list. The existing title-based version parsing stays for Dependabot. For the audit branch, the workflow marks the PR safe only after all of these checks pass:

1. The PR is open and its head branch is exactly `security/npm-audit-fix`.
2. The PR is not from a fork (`isCrossRepository == false`) and its head repository is this repository.
3. The author is `github-actions[bot]` (the REST spelling; `gh` may expose `app/github-actions`, so both are accepted).
4. The changed file list is non-empty and contains only `package.json` and/or `package-lock.json`.
5. CI for that branch concluded successfully, and the completed run's head SHA matches the pull request's current head SHA so a force-push cannot merge an unvalidated commit. The audit workflow confirms this through its `repository_dispatch` handoff after waiting for the dispatched CI run; a failed CI run never sends the handoff.

If any check fails, the workflow exits without merging and leaves a note in the log. A separate workflow was considered and rejected: the existing workflow already owns the "CI passed, then merge" decision, and duplicating it would create two merge paths to audit.

### Decision: CodeQL as an advanced workflow with `build-mode: none`

`codeql.yml` uses `github/codeql-action/init@v4` and `analyze@v4` for `javascript-typescript` with `build-mode: none`, on pushes and PRs to `master` plus `0 5 * * 1` (weekly, Monday 05:00 UTC). Results upload to code scanning with `security-events: write`; `actions: read` is included for compatibility and `contents: read` is the only repository access. The workflow has a concurrency group and a 20-minute timeout.

Alternatives considered:
- GitHub's default CodeQL setup — convenient but configured outside the repository, so changes are not reviewable in a PR and behavior varies by settings. The advanced workflow keeps the configuration versioned with the code.
- `build-mode: autobuild` — unnecessary for this TypeScript project and slower; `none` is the supported mode for JavaScript/TypeScript.
- Enabling Copilot Autofix — out of scope; alerts and suggestions are reviewed by maintainers, and no workflow pushes source fixes.

### Decision: Failure policy distinguishes production from development findings

After remediation, the workflow reads the production-only report. Any production advisory fails the run with an `::error::` annotation. Development-only advisories produce `::warning::` annotations and a summary entry but exit 0. This avoids a permanently red daily run for unfixable build-tool advisories (currently `commit-and-tag-version` / `dotgitignore`, plus `minimatch` if it cannot move without a major) while still failing loudly for anything that could reach consumers. The published package has zero runtime dependencies, so the production check is expected to be clean.

## Risks / Trade-offs

- **`npm audit fix` silently breaks a build** → The full CI matrix, artifact tests, packed-package tests, and React compatibility jobs already validate dependency changes; auto-merge only happens after CI succeeds.
- **A force-push overwrites manual work on the automation branch** → The branch is documented as automation-owned; the PR is regenerated from the default branch, and manual changes belong on a separate branch.
- **A malicious PR spoofs the automation branch name** → Auto-merge additionally requires the same-repository head, the automation author identity, a manifest-only diff, and a successful CI run. Fork PRs and human authors are excluded.
- **Daily noise from dev-only advisories** → Warnings only, with a summary table; the alternative (failing daily) trains maintainers to ignore the workflow.
- **Exact overrides block future fixes** → Widening the override to `^5.0.12` restores compatible resolution; future exact pins should be avoided for transitive dev dependencies.
- **npm registry or audit endpoint outage** → The run fails visibly; `workflow_dispatch` allows a retry without waiting for the next schedule.
- **CodeQL false positives or runtime cost** → Default queries, weekly plus PR runs, and a 20-minute timeout; alerts can be dismissed with a documented reason.
- **Code scanning upload permissions on fork PRs** → The repository is public and the workflow uses the standard `pull_request` event, never `pull_request_target`; fork runs remain read-only for repository contents and cannot use secrets.

## Migration Plan

1. Merge the workflow, helper, test, override, and documentation changes.
2. Run the audit workflow manually (`workflow_dispatch`) on `master` to generate the first audit PR.
3. Confirm CI succeeds, the guards allow the merge, and the next daily release picks up the lockfile change.
4. Open the Security → Code scanning tab and confirm the CodeQL analysis ran for the merge commit and the weekly schedule is queued.
5. Rollback: revert the workflow/helper commit, close the automation PR, and delete the `security/npm-audit-fix` branch. No repository data or package output is migrated.

## Open Questions

None. The remaining choices (exact schedule minute, helper file names) do not change the specs, approach, or task breakdown.
