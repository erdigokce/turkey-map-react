'use strict';

const fs = require('node:fs');

const SEVERITIES = ['critical', 'high', 'moderate', 'low', 'info'];

const SEVERITY_LABELS = {
  critical: 'Critical',
  high: 'High',
  moderate: 'Moderate',
  low: 'Low',
  info: 'Info',
};

const emptyCounts = () => ({
  critical: 0,
  high: 0,
  moderate: 0,
  low: 0,
  info: 0,
  total: 0,
});

const emptyReport = () => ({
  vulnerabilities: {},
  metadata: { vulnerabilities: emptyCounts() },
});

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const severityOf = (entry) =>
  SEVERITIES.includes(entry && entry.severity) ? entry.severity : 'info';

const readAuditReport = (filePath) => {
  if (!filePath) {
    return emptyReport();
  }

  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return emptyReport();
    }
    throw error;
  }

  if (raw.trim() === '') {
    return emptyReport();
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Could not parse npm audit report "${filePath}": ${error.message}`);
  }

  if (!isPlainObject(parsed)) {
    throw new Error(`Unexpected npm audit report "${filePath}": expected a JSON object.`);
  }

  if (parsed.error) {
    const detail =
      parsed.error.summary ||
      parsed.error.message ||
      parsed.error.code ||
      'unknown npm audit error';
    throw new Error(`npm audit failed for "${filePath}": ${detail}`);
  }

  return parsed;
};

const severityCounts = (report) => {
  const counts = emptyCounts();
  const metadata = report && report.metadata && report.metadata.vulnerabilities;

  if (isPlainObject(metadata)) {
    for (const severity of SEVERITIES) {
      counts[severity] = Number(metadata[severity]) || 0;
    }
    counts.total = Number(metadata.total);
    if (!Number.isFinite(counts.total)) {
      counts.total = SEVERITIES.reduce((sum, severity) => sum + counts[severity], 0);
    }
    return counts;
  }

  const vulnerabilities = isPlainObject(report && report.vulnerabilities)
    ? Object.values(report.vulnerabilities)
    : [];

  for (const entry of vulnerabilities) {
    counts[severityOf(entry)] += 1;
  }
  counts.total = vulnerabilities.length;
  return counts;
};

const fixDescription = (fixAvailable) => {
  if (fixAvailable === true) {
    return { available: true, major: false, package: null, version: null };
  }
  if (isPlainObject(fixAvailable)) {
    return {
      available: true,
      major: Boolean(fixAvailable.isSemVerMajor),
      package: fixAvailable.name || null,
      version: fixAvailable.version || null,
    };
  }
  return { available: false, major: false, package: null, version: null };
};

const advisoryDetails = (entry) => {
  const advisories = [];

  for (const via of Array.isArray(entry.via) ? entry.via : []) {
    if (!isPlainObject(via)) {
      continue;
    }
    advisories.push({
      source: via.source === undefined ? null : via.source,
      title: via.title || via.name || entry.name,
      url: via.url || null,
      severity: SEVERITIES.includes(via.severity) ? via.severity : severityOf(entry),
      range: via.range || null,
    });
  }

  return advisories;
};

const normalizeVulnerability = (name, entry, productionNames) => ({
  name,
  severity: severityOf(entry),
  isDirect: Boolean(entry.isDirect),
  range: entry.range || null,
  nodes: Array.isArray(entry.nodes) ? entry.nodes : [],
  advisories: advisoryDetails(entry),
  fix: fixDescription(entry.fixAvailable),
  production: productionNames ? productionNames.has(name) : undefined,
});

const listVulnerabilities = (report, productionNames) => {
  const vulnerabilities = isPlainObject(report && report.vulnerabilities)
    ? report.vulnerabilities
    : {};

  return Object.keys(vulnerabilities)
    .sort()
    .map((name) => normalizeVulnerability(name, vulnerabilities[name], productionNames));
};

const summarize = ({ before, after, production } = {}) => {
  const beforeReport = before || emptyReport();
  const afterReport = after || emptyReport();
  const productionReport = production || emptyReport();
  const productionNames = new Set(
    Object.keys(
      isPlainObject(productionReport.vulnerabilities) ? productionReport.vulnerabilities : {},
    ),
  );

  const afterVulnerabilities = isPlainObject(afterReport.vulnerabilities)
    ? afterReport.vulnerabilities
    : {};

  const fixed = listVulnerabilities(beforeReport).filter(
    (vulnerability) => !Object.prototype.hasOwnProperty.call(afterVulnerabilities, vulnerability.name),
  );
  const remaining = listVulnerabilities(afterReport, productionNames);
  const productionRemaining = remaining.filter((vulnerability) => vulnerability.production);
  const developmentRemaining = remaining.filter((vulnerability) => !vulnerability.production);
  const afterCounts = severityCounts(afterReport);

  return {
    before: severityCounts(beforeReport),
    after: afterCounts,
    production: severityCounts(productionReport),
    fixed,
    remaining,
    productionRemaining,
    developmentRemaining,
    clean: afterCounts.total === 0,
    hasProductionFindings: productionRemaining.length > 0,
    hasDevelopmentOnlyFindings: remaining.length > 0 && productionRemaining.length === 0,
  };
};

const escapeCell = (value) => String(value === undefined || value === null ? '' : value)
  .replace(/\|/g, '\\|')
  .replace(/\r?\n/g, ' ');

const formatAdvisoryLinks = (vulnerability) => {
  if (vulnerability.advisories.length === 0) {
    return '—';
  }

  return vulnerability.advisories
    .map((advisory) => {
      const title = escapeCell(advisory.title);
      return advisory.url ? `[${title}](${advisory.url})` : title;
    })
    .join('<br>');
};

const formatFix = (fix) => {
  if (!fix.available) {
    return 'No';
  }
  if (!fix.major) {
    return 'Yes';
  }
  const target = fix.package
    ? `${fix.package}${fix.version ? `@${fix.version}` : ''}`
    : 'major upgrade';
  return `Only with a major upgrade (${target})`;
};

const countsRow = (label, counts) => {
  const cells = SEVERITIES.map((severity) => counts[severity]);
  return `| ${label} | ${cells.join(' | ')} | ${counts.total} |`;
};

const renderFixedSection = (fixed) => {
  if (fixed.length === 0) {
    return ['### Fixed advisories (0)', '', 'No advisories were fixed by this run.'];
  }

  return [
    `### Fixed advisories (${fixed.length})`,
    '',
    '| Package | Severity | Direct | Advisories |',
    '| --- | --- | --- | --- |',
    ...fixed.map(
      (vulnerability) =>
        `| \`${escapeCell(vulnerability.name)}\` | ${SEVERITY_LABELS[vulnerability.severity]} | ${
          vulnerability.isDirect ? 'Yes' : 'No'
        } | ${formatAdvisoryLinks(vulnerability)} |`,
    ),
  ];
};

const renderRemainingSection = (remaining) => {
  if (remaining.length === 0) {
    return ['### Remaining advisories (0)', '', 'No advisories remain after the fix pass.'];
  }

  return [
    `### Remaining advisories (${remaining.length})`,
    '',
    '| Package | Severity | Direct | Production | Fix available |',
    '| --- | --- | --- | --- | --- |',
    ...remaining.map(
      (vulnerability) =>
        `| \`${escapeCell(vulnerability.name)}\` | ${SEVERITY_LABELS[vulnerability.severity]} | ${
          vulnerability.isDirect ? 'Yes' : 'No'
        } | ${vulnerability.production ? 'Yes' : 'No'} | ${formatFix(vulnerability.fix)} |`,
    ),
  ];
};

const renderProductionSection = (summary) => {
  if (!summary.hasProductionFindings) {
    return [];
  }

  return [
    '### Production dependency findings',
    '',
    'These production advisories remain and require attention:',
    '',
    ...summary.productionRemaining.map(
      (vulnerability) =>
        `- \`${escapeCell(vulnerability.name)}\` (${SEVERITY_LABELS[vulnerability.severity]})`,
    ),
  ];
};

const renderOutcome = (summary) => {
  if (summary.clean) {
    return ['✅ The post-fix audit reports no known vulnerabilities.'];
  }
  if (summary.hasProductionFindings) {
    return [
      '❌ Production dependency advisories remain. The workflow fails so maintainers are notified.',
    ];
  }
  return [
    '⚠️ Only development dependency advisories remain. They are reported as warnings and do not fail the run.',
  ];
};

const renderMarkdown = (summary) => {
  const lines = [
    '<!-- security-audit-report -->',
    '## Dependency security audit',
    '',
    'Automated `npm audit` remediation run against the default branch.',
    '',
    '### Severity summary',
    '',
    `| Report | ${SEVERITIES.map((severity) => SEVERITY_LABELS[severity]).join(' | ')} | Total |`,
    `| --- | ${SEVERITIES.map(() => '---:').join(' | ')} | ---: |`,
    countsRow('Before', summary.before),
    countsRow('After', summary.after),
    countsRow('Production (after)', summary.production),
    '',
    ...renderFixedSection(summary.fixed),
    '',
    ...renderRemainingSection(summary.remaining),
    '',
    ...renderProductionSection(summary),
    ...(summary.hasProductionFindings ? [''] : []),
    ...renderOutcome(summary),
  ];

  return `${lines.join('\n')}\n`;
};

const parseArgs = (argv) => {
  const options = {};
  const flags = {
    '--before': 'before',
    '--after': 'after',
    '--production': 'production',
    '--output': 'output',
    '--summary': 'summary',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }

    const key = flags[argument];
    if (!key) {
      throw new Error(`Unknown argument "${argument}".`);
    }

    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for "${argument}".`);
    }

    options[key] = value;
    index += 1;
  }

  return options;
};

const usage = () =>
  [
    'Usage: node scripts/security-audit.js [options]',
    '',
    'Options:',
    '  --before <file>      npm audit --json report from before the fix pass',
    '  --after <file>       npm audit --json report from after the fix pass',
    '  --production <file>  npm audit --omit=dev --json report',
    '  --output <file>      Write the markdown report to this file (default: stdout)',
    '  --summary <file>     Write the machine-readable JSON summary to this file',
    '  -h, --help           Show this help',
  ].join('\n');

const main = (argv = process.argv.slice(2)) => {
  const options = parseArgs(argv);

  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return null;
  }

  const summary = summarize({
    before: readAuditReport(options.before),
    after: readAuditReport(options.after),
    production: readAuditReport(options.production),
  });
  const markdown = renderMarkdown(summary);

  if (options.output) {
    fs.writeFileSync(options.output, markdown);
  } else {
    process.stdout.write(markdown);
  }

  if (options.summary) {
    fs.writeFileSync(options.summary, `${JSON.stringify(summary, null, 2)}\n`);
  }

  return summary;
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`security-audit: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  SEVERITIES,
  SEVERITY_LABELS,
  emptyReport,
  readAuditReport,
  severityCounts,
  listVulnerabilities,
  summarize,
  renderMarkdown,
  parseArgs,
  main,
};
