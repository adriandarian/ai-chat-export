# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible
for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

Please report (suspected) security vulnerabilities to **[GitHub Security Advisories](https://github.com/adriandarian/ai-chat-export/security/advisories/new)**. You can also email security concerns directly if you prefer not to use GitHub.

**Please do not report security vulnerabilities through public GitHub issues.**

### What to Include

When reporting a vulnerability, please include:

- Type of vulnerability (e.g., XSS, CSRF, data leakage, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

This information will help us triage your report more quickly.

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution**: Depends on severity and complexity

### Security Considerations for Browser Extensions

This extension operates with the following security considerations:

- **Permissions**: The extension requests minimal permissions (`activeTab`, `scripting`, `storage`, `downloads`) to function properly
- **Content Scripts**: Content scripts run in isolated contexts and cannot directly access page JavaScript
- **Data Handling**: All data processing happens locally in the browser; no data is sent to external servers
- **Storage**: Uses browser storage APIs for local preferences only

### Known Security Considerations

- The extension injects content scripts into web pages (`<all_urls>`). This is necessary for functionality but means the extension has access to page content.
- The extension can download files to your system. Only use trusted sources for the extension.
- HTML exports preserve original page styles, which may include external resources. Review exported files before sharing.

### Best Practices for Users

1. **Installation**: Only install the extension from trusted sources (Chrome Web Store, Firefox Add-ons, or directly from this repository)
2. **Updates**: Keep the extension updated to the latest version
3. **Exports**: Review exported files before sharing, as they may contain sensitive information
4. **Permissions**: Review the extension's permissions before installation

### Disclosure Policy

When the security team receives a security bug report, they will assign it to a primary handler. This person will coordinate the fix and release process, involving the following steps:

1. Confirm the problem and determine the affected versions
2. Audit code to find any potential similar problems
3. Prepare fixes for all releases still under support
4. Release a security update as soon as possible

We appreciate your efforts to responsibly disclose your findings and will make every effort to acknowledge your contributions.


