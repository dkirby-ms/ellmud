# Contributing to Ellmud

Thanks for your interest in contributing to **Ellmud**, a PvPvE Extraction RPG! This guide will help you get started.

## Getting Started

### Prerequisites

- **Node.js** ≥ 20.0.0 (check `.nvmrc`)
- **Docker** (recommended for PostgreSQL and Redis)
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/dkirby-ms/ellmud.git
cd ellmud

# Use the correct Node version
nvm use

# Install dependencies
npm install

# Start services (PostgreSQL, Redis)
docker compose up -d

# Build all packages
npm run build

# Run the dev server
npm run dev
```

For detailed setup, see [Setup Guide](docs/setup.md).

## Workflow

1. **Pick an issue** or create one to discuss your idea first
2. **Create a branch** from `dev` with a descriptive name:
   ```bash
   git checkout -b feature/my-feature
   ```
3. **Make your changes** and test them:
   ```bash
   npm run build
   npm run test
   npm run lint
   ```
4. **Commit with a clear message** following [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   feat: add new creature type
   fix: resolve combat tick timing issue
   docs: update player guide
   chore: update dependencies
   ```
5. **Push and open a pull request** against `dev`
6. **Respond to feedback** and keep commits clean

## Code Style

- **TypeScript** — all code must be typed
- **ESLint** — automated linting via `npm run lint`
- **Formatting** — follow existing patterns; no enforced formatter
- **Comments** — only for complex logic; avoid obvious comments

## Testing

Before submitting a PR:

```bash
npm run test          # Run all tests
npm run lint          # Check for linting issues
npm run build         # Ensure code builds
```

If you add features, please add corresponding tests.

## Areas of Contribution

### Game Logic & Systems
- Creature AI and behaviors
- Combat mechanics and balance
- Item system and loot distribution
- Extraction mechanics
- New zone content (via GDD.md proposal)

### Client & UI
- Game client improvements
- Admin dashboard features
- Player guide and tutorials
- Accessibility improvements

### Backend & Infrastructure
- Performance optimizations
- Database schema improvements
- API enhancements
- DevOps and deployment

### Documentation
- Player guides and tutorials
- Architecture documentation
- API reference improvements
- Setup and troubleshooting

## Reporting Bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) when opening an issue. Include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Environment (OS, Node version, etc.)

## Feature Requests

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md). Describe:
- The problem you're solving
- Your proposed solution
- Any alternatives you've considered
- Why this feature matters

## Code Review

All PRs require review before merging. Reviewers will check for:
- ✅ Correctness and logic
- ✅ Test coverage
- ✅ Code style and TypeScript best practices
- ✅ Documentation updates
- ✅ No breaking changes (unless intended)

## Questions?

- **Discord:** Join our community server for discussion
- **Discussions:** Use GitHub Discussions for questions
- **Issues:** Open an issue to report bugs or suggest features

Thanks for contributing! 🎮
