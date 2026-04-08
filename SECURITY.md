# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Ellmud, please report it responsibly. **Do not** open a public GitHub issue.

Instead, please email the maintainers directly with:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (if available)

We will acknowledge your report within 48 hours and work with you to resolve the issue before public disclosure.

## Supported Versions

Security updates will be provided for the latest stable release. Please keep your installation up to date.

| Version | Status |
|---------|--------|
| Latest  | Supported |
| Older   | Not supported |

## Security Best Practices

When running Ellmud:

1. **Environment Variables:** Never commit `.env` files with secrets to version control. Use `.env.example` as a template.
2. **Authentication:** If using Microsoft Entra External ID, ensure your credentials are kept secure.
3. **Database:** Always use strong credentials for PostgreSQL and Redis in production.
4. **API Keys:** Protect your Azure AI Foundry API key and admin token.
5. **Dependency Updates:** Keep Node.js and npm dependencies up to date.

## Thank You

We appreciate security researchers who responsibly disclose vulnerabilities. Your efforts help keep the community safe.
