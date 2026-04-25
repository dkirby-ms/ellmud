import { readFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const sharedPath = path.join(repoRoot, 'packages/shared/src/index.ts');
const unityPath = path.join(repoRoot, 'ellmud-client/Assets/Scripts/Messages/MessageTypes.cs');

function extractSharedMessageTypes(source) {
  const blockMatch = source.match(/export const MessageTypes = \{([\s\S]*?)\}\s*as const;/m);
  if (!blockMatch) {
    throw new Error('Unable to locate MessageTypes in shared index.ts');
  }

  const map = new Map();
  const entryRegex = /^\s*([A-Z_]+):\s*'([^']+)'/gm;
  let match;
  while ((match = entryRegex.exec(blockMatch[1])) !== null) {
    map.set(match[1], match[2]);
  }
  return map;
}

function extractUnityMessageTypes(source) {
  const map = new Map();
  const entryRegex = /^\s*public\s+const\s+string\s+([A-Z_]+)\s*=\s*"([^"]+)";/gm;
  let match;
  while ((match = entryRegex.exec(source)) !== null) {
    map.set(match[1], match[2]);
  }
  return map;
}

function compare(unity, shared) {
  const failures = [];

  for (const [key, value] of unity.entries()) {
    if (!shared.has(key)) {
      failures.push(`Unity key ${key} is not present in shared MessageTypes`);
      continue;
    }

    const sharedValue = shared.get(key);
    if (sharedValue !== value) {
      failures.push(`Value mismatch for ${key}: unity='${value}' shared='${sharedValue}'`);
    }
  }

  return failures;
}

async function main() {
  const [sharedSource, unitySource] = await Promise.all([
    readFile(sharedPath, 'utf8'),
    readFile(unityPath, 'utf8'),
  ]);

  const shared = extractSharedMessageTypes(sharedSource);
  const unity = extractUnityMessageTypes(unitySource);
  const failures = compare(unity, shared);

  if (failures.length > 0) {
    console.error('Unity protocol drift check failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(`Unity protocol drift check passed (${unity.size} constants validated).`);
}

main().catch((err) => {
  console.error(`Unity protocol drift check error: ${err.message}`);
  process.exit(1);
});
