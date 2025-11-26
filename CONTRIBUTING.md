# Contributing to AI Chat Export

Thank you for your interest in contributing to AI Chat Export! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the [issue list](https://github.com/adriandarian/ai-chat-export/issues) to see if the problem has already been reported. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected behavior** vs **actual behavior**
- **Browser and version** (e.g., Chrome 120, Firefox 121)
- **Extension version**
- **Screenshots** if applicable
- **Console errors** (if any) - check DevTools console

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear title and description**
- **Use case** - why would this feature be useful?
- **Proposed solution** (if you have ideas)
- **Alternatives considered** (if any)

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following the coding standards below
3. **Test your changes** thoroughly
4. **Update documentation** if needed
5. **Submit a pull request** with a clear description

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/) (or Node.js 18+)
- A Chromium-based browser (Chrome, Edge, Brave) or Firefox for testing

### Getting Started

1. **Fork and clone** the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ai-chat-export.git
   cd ai-chat-export
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Build the extension**:
   ```bash
   bun run build
   ```

4. **Load the extension** in your browser:
   - **Chrome/Edge/Brave**: Go to `chrome://extensions`, enable "Developer mode", click "Load unpacked", select the `dist` folder
   - **Firefox**: Go to `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on...", select `dist/manifest.json`

5. **For development with hot reload**:
   ```bash
   bun run dev
   ```
   Then reload the extension in your browser after making changes.

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Follow existing code style and patterns
- Use meaningful variable and function names
- Add JSDoc comments for public functions

### React

- Use functional components with hooks
- Keep components small and focused
- Use TypeScript interfaces for props
- Follow React best practices (keys, memoization when needed)

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings (unless double quotes are needed)
- Add trailing commas in multi-line objects/arrays
- Use meaningful commit messages

### File Structure

```
src/
├── assets/          # Images and static assets
├── background/      # Service worker scripts
├── components/      # Reusable React components
├── content/         # Content scripts
├── popup/           # Popup UI
├── utils/           # Utility functions
└── manifest.ts      # Extension manifest
```

## Testing

Before submitting a pull request:

1. **Test in multiple browsers** (at least Chrome and Firefox)
2. **Test on different websites** - try various chat interfaces
3. **Test edge cases** - empty selections, very long messages, etc.
4. **Check console** for errors or warnings
5. **Verify exports** - ensure HTML/PDF exports work correctly

## Commit Messages

Write clear, descriptive commit messages:

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to end" not "Moves cursor to end")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally

Examples:
```
Add support for dark mode in popup
Fix element selection on dynamically loaded content
Update dependencies to latest versions
```

## Pull Request Process

1. **Update CHANGELOG.md** - Add an entry describing your changes
2. **Update documentation** - If you've changed functionality, update README.md
3. **Ensure tests pass** - Make sure your changes don't break existing functionality
4. **Request review** - Tag maintainers if needed
5. **Respond to feedback** - Be open to suggestions and make requested changes

## Questions?

If you have questions about contributing, feel free to:
- Open an issue with the `question` label
- Check existing issues and discussions

Thank you for contributing! 🎉



