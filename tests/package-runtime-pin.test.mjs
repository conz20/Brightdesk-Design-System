import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

const manifest = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const qualityWorkflow = read('.github/workflows/quality.yml');
const publishWorkflow = read('.github/workflows/publish-github-package.yml');
const readme = read('README.md');

test('package manifest and lockfile use the exact Brightdesk Node.js pin', () => {
  assert.equal(manifest.engines?.node, '24.22.2');
  assert.equal(lock.packages?.['']?.engines?.node, '24.22.2');
});

test('quality and publishing workflows use Node.js 24.22.2', () => {
  assert.match(qualityWorkflow, /node-version:\s*24\.22\.2/);
  assert.match(publishWorkflow, /node-version:\s*24\.22\.2/);
  assert.doesNotMatch(qualityWorkflow, /24\.22\.3/);
  assert.doesNotMatch(publishWorkflow, /24\.22\.3/);
});

test('README documents the approved Node.js runtime consistently', () => {
  assert.match(readme, /24\.22\.2/);
  assert.doesNotMatch(readme, /24\.22\.3/);
});
