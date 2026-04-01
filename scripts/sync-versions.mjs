#!/usr/bin/env node

/**
 * Sync workspace package versions with the root package.json version.
 *
 * Usage:  node scripts/sync-versions.js
 *
 * Reads the version from the root package.json and writes it into
 * each workspace package.json listed below.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const rootPkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
const version = rootPkg.version;

const workspaces = ['packages/client', 'packages/server', 'packages/shared'];

for (const ws of workspaces) {
  const pkgPath = path.join(root, ws, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  pkg.version = version;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`  ${ws}/package.json → ${version}`);
}

console.log(`\nAll workspace versions synced to ${version}`);
