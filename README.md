# <img src="src/assets/logo.svg" width="32" height="32" align="center" /> AI Chat Export Extension

[![CI](https://github.com/adriandarian/ai-chat-export/actions/workflows/ci.yml/badge.svg)](https://github.com/adriandarian/ai-chat-export/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/adriandarian/ai-chat-export?style=flat-square)](https://github.com/adriandarian/ai-chat-export/releases/latest)
[![License](https://img.shields.io/github/license/adriandarian/ai-chat-export?style=flat-square)](LICENSE)
[![Semantic Release](https://img.shields.io/badge/semantic--release-conventionalcommits-e10079?style=flat-square&logo=semantic-release)](https://github.com/semantic-release/semantic-release)

A browser extension to export AI chat conversations from various platforms. Supports multiple export formats including HTML, PDF, Markdown, and JSON.

## Features
- **Element Selector**: Hover to highlight specific chat bubbles or containers.
- **Multi-Selection**: Select multiple messages to export at once.
- **Smart Export**: Generates a self-contained HTML file including the page's styles, ensuring the export looks like the original.
- **Multiple Export Formats**: HTML, PDF, Markdown, and JSON
- **Syntax Highlighting**: Preserves code block formatting in exports
- **Dark/Light Theme**: Adapts to your system preferences

## Supported Browsers

| Browser | Engine | Status |
|---------|--------|--------|
| Chrome | Chromium | ✅ Full Support |
| Edge | Chromium | ✅ Full Support |
| Opera | Chromium | ✅ Full Support |
| Brave | Chromium | ✅ Full Support |
| Vivaldi | Chromium | ✅ Full Support |
| Arc | Chromium | ✅ Full Support |
| Atlas | Chromium | ✅ Full Support |
| Firefox | Gecko | ✅ Full Support |
| Safari | WebKit | ✅ Full Support* |

*Safari requires Xcode for building. See [SAFARI_SETUP.md](./SAFARI_SETUP.md).

## Quick Start

```bash
# Install dependencies
npm install

# Build for all browsers
npm run build:all

# Build for specific browser
npm run build:chrome   # Chrome, Edge, Brave, Opera, etc.
npm run build:firefox  # Firefox
npm run build:safari   # Safari
```

## Installation (Developer Mode)

### Chrome / Edge / Brave / Opera / Vivaldi

1. Build: `npm run build:chrome`
2. Open your browser's Extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
   - Opera: `opera://extensions`
   - Vivaldi: `vivaldi://extensions`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `dist/chrome` folder

### Firefox

1. Build: `npm run build:firefox`
2. Open `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on..."
4. Select any file in the `dist/firefox` folder (e.g., `manifest.json`)

### Safari

Safari requires additional setup. See [SAFARI_SETUP.md](./SAFARI_SETUP.md) for detailed instructions.

Quick overview:
1. Build: `npm run build:safari`
2. Convert: `xcrun safari-web-extension-converter dist/safari`
3. Build & run in Xcode
4. Enable in Safari preferences

## Development

```bash
# Development with hot reload
npm run dev           # Chrome (default)
npm run dev:firefox   # Firefox
npm run dev:safari    # Safari

# Production builds
npm run build:chrome
npm run build:firefox
npm run build:safari
npm run build:edge
npm run build:opera
npm run build:brave

# Build all browsers
npm run build:all

# Build and create zip packages for distribution
npm run package
```

## Project Structure

```
dist/
├── chrome/      # Chrome, Edge, Opera, Brave, etc.
├── firefox/     # Firefox
├── safari/      # Safari (before Xcode conversion)
├── edge/        # Edge (identical to Chrome)
├── opera/       # Opera (identical to Chrome)
└── brave/       # Brave (identical to Chrome)

packages/
├── ai-chat-export-chrome.zip
├── ai-chat-export-firefox.zip
└── ...
```

## Releases

This project uses [semantic-release](https://github.com/semantic-release/semantic-release) for automated versioning and releases. Each release includes pre-built extension packages for all supported browsers.

### Download Pre-built Extensions

Visit the [Releases page](https://github.com/adriandarian/ai-chat-export/releases/latest) to download the latest version for your browser.

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

| Type | Description | Release |
|------|-------------|---------|
| `feat:` | A new feature | Minor |
| `fix:` | A bug fix | Patch |
| `perf:` | Performance improvement | Patch |
| `docs:` | Documentation only | None |
| `style:` | Code style changes | None |
| `refactor:` | Code refactoring | Patch |
| `test:` | Adding tests | None |
| `build:` | Build system changes | Patch |
| `ci:` | CI configuration | None |
| `chore:` | Other changes | None |

Breaking changes should include `BREAKING CHANGE:` in the commit body.

## Documentation

- [Browser Support Guide](./BROWSER_SUPPORT.md) - Detailed installation & submission guides
- [Safari Setup Guide](./SAFARI_SETUP.md) - Safari-specific instructions
- [Changelog](./CHANGELOG.md) - Version history and changes

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

ISC License - See [LICENSE](./LICENSE) for details.
