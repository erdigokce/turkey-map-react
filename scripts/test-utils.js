'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

const assertLibBuilt = () => {
  if (!fs.existsSync(path.join(root, 'lib', 'index.js'))) {
    throw new Error('lib/index.js is missing. Run `npm run build` first.');
  }
};

const createTempDir = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), prefix));

const packPackage = (destination) => {
  assertLibBuilt();
  fs.mkdirSync(destination, { recursive: true });

  const output = execFileSync(
    'npm',
    ['pack', '--ignore-scripts', '--json', '--pack-destination', destination],
    { cwd: root, encoding: 'utf8' },
  );

  // `npm pack` can run the `prepare` script (and therefore the webpack build)
  // before printing the JSON result. The build output contains bracketed words
  // such as `[emitted]`, so find the start of the actual JSON array instead of
  // the first `[` in the output.
  const jsonStart = output.search(/\[\s*\{/);
  if (jsonStart === -1) {
    throw new Error(`Could not parse npm pack output:\n${output}`);
  }

  const [result] = JSON.parse(output.slice(jsonStart));
  return {
    tarball: path.join(destination, result.filename),
    files: result.files.map((file) => file.path),
    result,
  };
};

const createConsumer = (directory, dependencies) => {
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, 'package.json'),
    JSON.stringify(
      {
        name: 'turkey-map-react-consumer',
        version: '1.0.0',
        private: true,
      },
      null,
      2,
    ),
  );

  execFileSync(
    'npm',
    [
      'install',
      '--no-save',
      '--ignore-scripts',
      '--no-package-lock',
      '--no-audit',
      '--no-fund',
      '--prefer-offline',
      ...dependencies,
    ],
    { cwd: directory, stdio: 'inherit' },
  );
};

const writeFile = (directory, name, content) => {
  fs.writeFileSync(path.join(directory, name), content);
};

const runNode = (directory, name) => {
  execFileSync(process.execPath, [name], { cwd: directory, stdio: 'inherit' });
};

module.exports = {
  root,
  assertLibBuilt,
  createTempDir,
  packPackage,
  createConsumer,
  writeFile,
  runNode,
};
