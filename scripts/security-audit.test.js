'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  readAuditReport,
  severityCounts,
  summarize,
  renderMarkdown,
} = require('./security-audit');

const scriptPath = path.join(__dirname, 'security-audit.js');

const createTempDir = (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'security-audit-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
};

const makeReport = (vulnerabilities = {}) => {
  const counts = { critical: 0, high: 0, moderate: 0, low: 0, info: 0 };

  for (const entry of Object.values(vulnerabilities)) {
    counts[entry.severity] += 1;
  }

  return {
    auditReportVersion: 2,
    vulnerabilities,
    metadata: {
      vulnerabilities: {
        ...counts,
        total: Object.keys(vulnerabilities).length,
      },
    },
  };
};

const makeVulnerability = (
  name,
  severity,
  { isDirect = false, via = [], fixAvailable = true, range = '<1.0.0' } = {},
) => ({
  name,
  severity,
  isDirect,
  via,
  effects: [],
  range,
  nodes: [`node_modules/${name}`],
  fixAvailable,
});

const makeAdvisory = (name, severity, title = `${name} advisory`) => ({
  source: 1000,
  name,
  dependency: name,
  title,
  url: `https://example.test/advisories/${name}`,
  severity,
  range: '<2.0.0',
});

const writeJson = (directory, name, value) => {
  const filePath = path.join(directory, name);
  fs.writeFileSync(filePath, JSON.stringify(value));
  return filePath;
};

test('readAuditReport treats missing and empty reports as clean', (t) => {
  const directory = createTempDir(t);
  const emptyPath = path.join(directory, 'empty.json');
  fs.writeFileSync(emptyPath, '   \n');

  assert.deepEqual(severityCounts(readAuditReport(path.join(directory, 'missing.json'))), {
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
    info: 0,
    total: 0,
  });
  assert.equal(severityCounts(readAuditReport(emptyPath)).total, 0);
  assert.equal(severityCounts(readAuditReport('')).total, 0);
});

test('readAuditReport rejects malformed reports and npm audit errors', (t) => {
  const directory = createTempDir(t);
  const malformedPath = path.join(directory, 'malformed.json');
  const errorPath = path.join(directory, 'error.json');
  fs.writeFileSync(malformedPath, '{not json');
  fs.writeFileSync(
    errorPath,
    JSON.stringify({ error: { summary: 'audit endpoint unavailable', code: 'ENETDOWN' } }),
  );

  assert.throws(() => readAuditReport(malformedPath), /Could not parse/);
  assert.throws(() => readAuditReport(errorPath), /audit endpoint unavailable/);
});

test('a clean report renders zero counts and a clean outcome', () => {
  const summary = summarize({
    before: makeReport(),
    after: makeReport(),
    production: makeReport(),
  });
  const markdown = renderMarkdown(summary);

  assert.equal(summary.clean, true);
  assert.equal(summary.before.total, 0);
  assert.equal(summary.after.total, 0);
  assert.deepEqual(summary.fixed, []);
  assert.deepEqual(summary.remaining, []);
  assert.equal(summary.hasProductionFindings, false);
  assert.match(markdown, /no known vulnerabilities/i);
  assert.match(markdown, /Fixed advisories \(0\)/);
  assert.match(markdown, /Remaining advisories \(0\)/);
});

test('fixable findings are counted before the fix and reported as fixed', () => {
  const before = makeReport({
    'brace-expansion': makeVulnerability('brace-expansion', 'high', {
      via: [
        makeAdvisory('brace-expansion', 'moderate', 'brace-expansion CPU denial of service'),
        makeAdvisory('brace-expansion', 'high', 'brace-expansion stack exhaustion'),
      ],
      fixAvailable: true,
    }),
  });
  const summary = summarize({
    before,
    after: makeReport(),
    production: makeReport(),
  });
  const markdown = renderMarkdown(summary);

  assert.equal(summary.before.high, 1);
  assert.equal(summary.after.total, 0);
  assert.equal(summary.fixed.length, 1);
  assert.equal(summary.fixed[0].name, 'brace-expansion');
  assert.equal(summary.fixed[0].severity, 'high');
  assert.equal(summary.fixed[0].advisories.length, 2);
  assert.equal(summary.remaining.length, 0);
  assert.match(markdown, /Fixed advisories \(1\)/);
  assert.match(markdown, /brace-expansion CPU denial of service/);
});

test('unfixable findings remain with their fix availability', () => {
  const unfixable = makeVulnerability('commit-and-tag-version', 'moderate', {
    isDirect: true,
    via: ['dotgitignore'],
    fixAvailable: false,
  });
  const majorOnly = makeVulnerability('minimatch', 'high', {
    via: [makeAdvisory('minimatch', 'moderate', 'minimatch ReDoS')],
    fixAvailable: { name: 'jest', version: '25.1.0', isSemVerMajor: true },
  });
  const summary = summarize({
    before: makeReport({ 'commit-and-tag-version': unfixable, minimatch: majorOnly }),
    after: makeReport({ 'commit-and-tag-version': unfixable, minimatch: majorOnly }),
    production: makeReport(),
  });
  const markdown = renderMarkdown(summary);

  assert.equal(summary.fixed.length, 0);
  assert.equal(summary.remaining.length, 2);
  assert.equal(summary.remaining[0].name, 'commit-and-tag-version');
  assert.deepEqual(summary.remaining[0].fix, {
    available: false,
    major: false,
    package: null,
    version: null,
  });
  assert.equal(summary.remaining[1].name, 'minimatch');
  assert.equal(summary.remaining[1].fix.available, true);
  assert.equal(summary.remaining[1].fix.major, true);
  assert.match(markdown, /Only with a major upgrade \(jest@25\.1\.0\)/);
  assert.match(markdown, /\| No \|/);
});

test('mixed production and development findings are separated', () => {
  const productionFinding = makeVulnerability('lodash', 'high', {
    isDirect: true,
    via: [makeAdvisory('lodash', 'high', 'lodash prototype pollution')],
    fixAvailable: true,
  });
  const developmentFinding = makeVulnerability('commit-and-tag-version', 'moderate', {
    isDirect: true,
    via: ['dotgitignore'],
    fixAvailable: false,
  });
  const after = makeReport({
    'commit-and-tag-version': developmentFinding,
    lodash: productionFinding,
  });
  const production = makeReport({ lodash: productionFinding });

  const summary = summarize({ before: after, after, production });
  const markdown = renderMarkdown(summary);

  assert.equal(summary.remaining.length, 2);
  assert.deepEqual(
    summary.productionRemaining.map((vulnerability) => vulnerability.name),
    ['lodash'],
  );
  assert.deepEqual(
    summary.developmentRemaining.map((vulnerability) => vulnerability.name),
    ['commit-and-tag-version'],
  );
  assert.equal(summary.hasProductionFindings, true);
  assert.equal(summary.hasDevelopmentOnlyFindings, false);
  assert.match(markdown, /Production dependency findings/);
  assert.match(markdown, /Production dependency advisories remain/);
});

test('development-only findings are warnings, not failures', () => {
  const developmentFinding = makeVulnerability('commit-and-tag-version', 'moderate', {
    isDirect: true,
    fixAvailable: false,
  });
  const after = makeReport({ 'commit-and-tag-version': developmentFinding });
  const summary = summarize({
    before: after,
    after,
    production: makeReport(),
  });
  const markdown = renderMarkdown(summary);

  assert.equal(summary.hasProductionFindings, false);
  assert.equal(summary.hasDevelopmentOnlyFindings, true);
  assert.match(markdown, /Only development dependency advisories remain/);
});

test('the CLI writes the markdown report and the JSON summary', (t) => {
  const directory = createTempDir(t);
  const beforePath = writeJson(
    directory,
    'before.json',
    makeReport({
      'brace-expansion': makeVulnerability('brace-expansion', 'high', {
        via: [makeAdvisory('brace-expansion', 'high')],
        fixAvailable: true,
      }),
    }),
  );
  const afterPath = writeJson(directory, 'after.json', makeReport());
  const productionPath = writeJson(directory, 'production.json', makeReport());
  const outputPath = path.join(directory, 'report.md');
  const summaryPath = path.join(directory, 'summary.json');

  execFileSync(process.execPath, [
    scriptPath,
    '--before',
    beforePath,
    '--after',
    afterPath,
    '--production',
    productionPath,
    '--output',
    outputPath,
    '--summary',
    summaryPath,
  ]);

  const markdown = fs.readFileSync(outputPath, 'utf8');
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));

  assert.match(markdown, /## Dependency security audit/);
  assert.match(markdown, /Fixed advisories \(1\)/);
  assert.equal(summary.before.high, 1);
  assert.equal(summary.fixed[0].name, 'brace-expansion');
  assert.equal(summary.clean, true);
});
