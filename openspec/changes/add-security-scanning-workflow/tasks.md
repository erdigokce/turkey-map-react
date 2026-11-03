## 1. Audit report helper

- [x] 1.1 Add `scripts/security-audit.js` that reads before/after `npm audit --json` reports and a production-only report, exposes severity counts, fixed advisories, remaining advisories, and renders the markdown PR body and job summary
- [x] 1.2 Add `scripts/security-audit.test.js` using the built-in `node:test` runner with fixtures for a clean report, fixable findings, unfixable findings, missing/empty reports, and mixed production/development findings
- [x] 1.3 Add a `test:security-audit` npm script and run it in the `ci.yml` typecheck job so report regressions fail CI

## 2. One-time remediation of current findings

- [x] 2.1 Widen the `brace-expansion` override in `package.json` from the exact `5.0.9` pin to a patched 5.x range (`^5.0.12`), refresh `package-lock.json` with `npm install`, and confirm the diff contains no unrelated dependency changes
- [x] 2.2 Re-run `npm audit` and record which advisories are resolved and which remain (expected remaining: the dev-only `commit-and-tag-version` / `dotgitignore` advisories, plus any advisory that needs a major upgrade)

## 3. Scheduled dependency audit workflow

- [x] 3.1 Add `.github/workflows/security-audit.yml` with the daily `30 5 * * *` schedule, `workflow_dispatch`, `contents: write` / `pull-requests: write`, a `security-audit` concurrency group, and an explicit checkout of the default branch
- [x] 3.2 Add steps for Node setup, `npm ci`, baseline `npm audit --json`, `npm audit fix` without `--force`, post-fix audit, and production-only `npm audit --omit=dev --json`; pass the reports to `scripts/security-audit.js` and write the markdown summary to `$GITHUB_STEP_SUMMARY`
- [x] 3.3 Exit successfully without a PR when there is no manifest/lockfile diff, while still reporting remaining findings
- [x] 3.4 On a diff, configure the bot git identity, rebuild `security/npm-audit-fix` from the default branch, commit only `package.json` and `package-lock.json`, and force-push the branch
- [x] 3.5 Create the audit PR when none exists or update the open PR body otherwise, using the report file, the `dependencies` label, and the default branch as base
- [x] 3.6 Add the failure policy after the PR/no-change decision: fail with an error annotation when production advisories remain, warn without failing for development-only advisories, and succeed on a clean audit

## 4. Guarded auto-merge for audit PRs

- [x] 4.1 Add `security/npm-audit-fix` to the `workflow_run` branch filter in `.github/workflows/dependabot-auto-merge.yml` without changing the existing Dependabot behavior
- [x] 4.2 Resolve the PR by exact head branch and require `isCrossRepository == false`, a head repository matching this repository, and an author of `github-actions[bot]` or `app/github-actions` for the audit branch
- [x] 4.3 Enforce a non-empty changed-file list limited to `package.json` and `package-lock.json`, merge only when those checks pass, and leave a log note for manual review otherwise
- [x] 4.4 Verify the audit branch skips the Dependabot title/version parser and that major updates still cannot be auto-merged through either path

## 5. CodeQL code scanning

- [x] 5.1 Add `.github/workflows/codeql.yml` for pushes and PRs to `master`, a weekly `0 5 * * 1` schedule, and optional manual dispatch; set `contents: read`, `actions: read`, `security-events: write`, a concurrency group, and a 20-minute timeout
- [x] 5.2 Configure `github/codeql-action/init@v4` for `javascript-typescript` with `build-mode: none` and add the matching `github/codeql-action/analyze@v4` step
- [x] 5.3 Confirm the workflow uploads results to code scanning, does not run `pull_request_target`, and does not push or create source-code fix commits

## 6. Documentation

- [x] 6.1 Update the `CONTRIBUTING.md` dependency-update and security-updates sections with the scan cadence, the automation branch and PR contents, the auto-merge guards, and the manual path for findings that need a major upgrade
- [x] 6.2 Document that CodeQL findings are triaged from code scanning and are not fixed by automatic PRs, and remove wording that implies security updates require manually enabling Dependabot security updates
- [x] 6.3 Confirm `readme.md` needs no API table change because this change does not alter component behavior, and note that in the PR description

## 7. Verification

- [x] 7.1 Validate the new and edited workflow YAML (YAML parser plus `actionlint` if available) and run the report helper tests with `npm run test:security-audit`
- [x] 7.2 Run `npm run typecheck`, `npm test`, `npm run build`, `npm run test:artifact`, `npm run test:package`, and `npm run test:types` after the override change
- [x] 7.3 Open the change as a PR and confirm CodeQL analysis runs and uploads results, and that the existing CI matrix still passes

## 8. Post-merge verification

- [ ] 8.1 After the workflows land on `master`, dispatch `Security Audit` manually and verify it opens one PR with the expected summary; re-dispatch to confirm it updates the same PR instead of creating a duplicate
- [ ] 8.2 Confirm the audit PR auto-merges only after CI succeeds and leaves the PR open when the branch, author, repository, or file-list guard fails
