## Purpose

Keeps the repository's dependency and source code free of known vulnerabilities using only free GitHub-native automation, and turns fixable dependency findings into reviewable pull requests instead of silent nightly failures.

## ADDED Requirements

### Requirement: Vulnerability scans run on a schedule without paid services

The repository SHALL run a dependency vulnerability scan at least once per day against the default branch and SHALL allow maintainers to trigger the same scan manually. The scan MUST use the repository's existing lockfile, MUST execute on GitHub-hosted runners, and MUST authenticate only with the automatically provided `GITHUB_TOKEN`. It MUST NOT require a paid service, a third-party security account, or a stored secret.

#### Scenario: Daily scheduled scan

- **WHEN** the daily schedule fires on `master`
- **THEN** the dependency scan runs against the committed manifest and lockfile and publishes its result in the workflow summary

#### Scenario: Manual scan

- **WHEN** a maintainer dispatches the scan workflow manually from the default branch
- **THEN** the scan runs with the same steps and reporting as the scheduled run

#### Scenario: No paid credentials required

- **WHEN** the workflow is configured and executed using only the repository token
- **THEN** the scan completes without any other secret or external subscription

### Requirement: Remediation is limited to non-breaking updates

The scan SHALL attempt only fixes that stay within the dependency ranges declared in the project manifest. It MUST NOT force a fix that crosses a major version, MUST NOT rewrite the manifest to a vulnerable or incompatible version, and MUST NOT apply fixes that require downgrading a direct dependency.

#### Scenario: Compatible fix is applied

- **WHEN** a vulnerable transitive dependency has a patched version reachable from the declared ranges
- **THEN** the lockfile is updated to the patched version and the corresponding advisories disappear from the post-fix audit

#### Scenario: Major upgrade is not forced

- **WHEN** the only available fix requires a major version change or a downgrade
- **THEN** the workflow leaves the dependency untouched and reports the advisory as remaining

#### Scenario: Production dependency ranges are preserved

- **WHEN** the scan changes a dependency manifest entry
- **THEN** the resulting range still satisfies the previously declared minimum version and no published runtime dependency is added

### Requirement: Fixable findings produce a single reviewable pull request

When a scan changes the dependency manifest or lockfile, the workflow SHALL create or update exactly one pull request on a deterministic automation branch. Re-running the scan with the same fixes MUST update that existing pull request rather than opening a duplicate. The pull request MUST describe the pre-scan and post-scan finding counts by severity, list the advisories that were fixed, and list any advisories that remain.

#### Scenario: First run opens a pull request

- **WHEN** compatible fixes change the lockfile and no automation pull request is open
- **THEN** the workflow pushes the automation branch and opens a pull request containing the dependency changes

#### Scenario: Later run reuses the pull request

- **WHEN** the automation pull request is already open and a later scan produces additional compatible fixes
- **THEN** the workflow updates the same branch and pull request instead of opening a second one

#### Scenario: No changes means no pull request

- **WHEN** the audit finds nothing fixable or the fix pass produces no manifest or lockfile diff
- **THEN** the workflow exits successfully without opening or modifying a pull request

#### Scenario: Pull request reports remaining findings

- **WHEN** the post-fix audit still reports advisories
- **THEN** the pull request body and workflow summary list them with their severity and whether a fix is available

### Requirement: Unfixable findings have an explicit failure policy

The scan SHALL fail the workflow run when a production dependency vulnerability remains after remediation, so maintainers are notified automatically. Findings limited to development dependencies MUST be reported as warnings and MUST NOT fail the run by themselves.

#### Scenario: Remaining production vulnerability fails the run

- **WHEN** the post-fix production audit reports at least one vulnerability
- **THEN** the workflow completes with a failing conclusion and the summary identifies the affected packages

#### Scenario: Development-only advisory does not fail the run

- **WHEN** the post-fix audit reports only development dependency advisories
- **THEN** the workflow succeeds, emits a warning annotation, and lists the advisories in the summary

#### Scenario: Clean audit succeeds

- **WHEN** the post-fix audit reports zero vulnerabilities
- **THEN** the workflow succeeds and the summary records the clean result

### Requirement: Automated audit pull requests merge only under strict guards

The existing auto-merge automation SHALL auto-merge a security-audit pull request only when all of the following hold: the pull request originates from the known automation branch, its author is the repository automation identity, CI has completed successfully for that branch, and the diff is limited to dependency manifests and lockfiles. Any other audit pull request MUST remain open for maintainer review. Major dependency changes MUST never be auto-merged.

#### Scenario: Guarded audit pull request auto-merges

- **WHEN** the audit pull request is on the automation branch, authored by the automation identity, changes only dependency manifests or lockfiles, and its CI run succeeds for the pull request's current head commit
- **THEN** the auto-merge automation merges it and deletes the branch

#### Scenario: Unexpected files block auto-merge

- **WHEN** an audit pull request contains a change outside dependency manifests or lockfiles
- **THEN** the auto-merge automation leaves the pull request open with a note that manual review is required

#### Scenario: Failed CI blocks auto-merge

- **WHEN** CI fails or has not completed for the audit pull request
- **THEN** the pull request is not merged

#### Scenario: Unknown authors are not auto-merged

- **WHEN** a pull request uses the automation branch name but was not authored by the expected automation identity
- **THEN** the workflow does not merge it

### Requirement: Source code is scanned with CodeQL

The repository SHALL run CodeQL analysis for its JavaScript and TypeScript sources on pushes and pull requests targeting `master`, and on a recurring schedule. Analysis results MUST be uploaded to GitHub code scanning. The scan MUST NOT require a compiled build step, and it MUST NOT automatically push source-code fixes.

#### Scenario: Pull request analysis

- **WHEN** a pull request targets `master`
- **THEN** CodeQL analyzes the changed code and uploads the results to code scanning before the pull request is considered ready

#### Scenario: Default branch analysis

- **WHEN** a commit lands on `master`
- **THEN** CodeQL analyzes the default branch and refreshes the code-scanning alerts

#### Scenario: Scheduled analysis catches new advisories

- **WHEN** the recurring CodeQL schedule fires
- **THEN** the current default branch is analyzed even if no new commit has landed

#### Scenario: Findings surface without automatic code changes

- **WHEN** CodeQL reports a source-code finding
- **THEN** the alert appears in the repository's code-scanning results and no source commit or pull request is created automatically by this change

### Requirement: Security automation uses least privilege and trusted triggers

The security workflows SHALL request only the permissions they need, SHALL run write-capable steps only from trusted default-branch events, and MUST NOT execute untrusted pull request code in a privileged context. The audit workflow MUST use concurrency control so overlapping runs cannot race on the same automation branch.

#### Scenario: Minimal token permissions

- **WHEN** the audit and CodeQL workflows are inspected
- **THEN** their declared permissions are limited to reading repository contents, writing the audit pull request, dispatching the CI validation run, and uploading code-scanning results as applicable

#### Scenario: Untrusted pull request code stays unprivileged

- **WHEN** a pull request from a fork runs CI or CodeQL
- **THEN** it does not receive a write-capable token and no privileged workflow executes its code

#### Scenario: Overlapping scans do not race

- **WHEN** a scheduled run and a manual run start at the same time
- **THEN** concurrency control serializes them so only one run updates the automation branch

### Requirement: Security findings are documented for maintainers

Maintainer documentation SHALL explain how the scheduled scan works, what its pull request contains, when that pull request merges automatically, and what a maintainer must do when a finding requires a manual major upgrade. The documentation MUST NOT promise automatic fixes for CodeQL findings.

#### Scenario: Maintainer can find the process

- **WHEN** a maintainer reads the contributor documentation
- **THEN** they find the scan cadence, the automation branch and PR behavior, the auto-merge guards, and the manual escalation path

#### Scenario: Code findings are not misrepresented

- **WHEN** the documentation describes CodeQL behavior
- **THEN** it states that findings are triaged from code scanning and are not fixed by automatic pull requests
