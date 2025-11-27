# <img src="src/assets/logo.svg" width="32" height="32" align="center" /> AI Chat Export Extension

This browser extension allows you to highlight and export chat messages or any other elements from a webpage into a clean HTML file (preserving styles) or PDF (via print).

## Features
- **Element Selector**: Hover to highlight specific chat bubbles or containers.
- **Multi-Selection**: Select multiple messages to export at once.
- **Smart Export**: Generates a self-contained HTML file including the page's styles, ensuring the export looks like the original.

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

## Documentation

- [Browser Support Guide](./BROWSER_SUPPORT.md) - Detailed installation & submission guides
- [Safari Setup Guide](./SAFARI_SETUP.md) - Safari-specific instructions

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

ISC License - See [LICENSE](./LICENSE) for details.
