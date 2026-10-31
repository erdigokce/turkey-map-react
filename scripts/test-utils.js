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

  const jsonStart = output.indexOf('[');
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
