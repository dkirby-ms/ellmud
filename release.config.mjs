const branch = process.env.GITHUB_REF_NAME || 'dev';
const isProd = branch === 'prod';

const plugins = [
  '@semantic-release/commit-analyzer',
  '@semantic-release/release-notes-generator',
  '@semantic-release/changelog',
  [
    '@semantic-release/npm',
    {
      npmPublish: false,
    },
  ],
  [
    '@semantic-release/exec',
    {
      prepareCmd: 'npm run version:sync',
    },
  ],
  [
    '@semantic-release/git',
    {
      assets: [
        'package.json',
        'package-lock.json',
        'packages/*/package.json',
        'CHANGELOG.md',
      ],
      message:
        'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
    },
  ],
];

// Only publish GitHub Releases for production
if (isProd) {
  plugins.push('@semantic-release/github');
}

export default {
  branches: [
    'prod',
    {
      name: 'dev',
      prerelease: 'dev',
    },
  ],
  plugins,
};
