# Browser Support Guide

AI Chat Export supports multiple browsers. This document explains how to build, install, and use the extension in each browser.

## Supported Browsers

| Browser | Engine | Manifest Version | Status |
|---------|--------|-----------------|--------|
| Chrome | Chromium | MV3 | ✅ Full Support |
| Edge | Chromium | MV3 | ✅ Full Support |
| Opera | Chromium | MV3 | ✅ Full Support |
| Brave | Chromium | MV3 | ✅ Full Support |
| Vivaldi | Chromium | MV3 | ✅ Full Support |
| Arc | Chromium | MV3 | ✅ Full Support |
| Atlas | Chromium | MV3 | ✅ Full Support |
| Firefox | Gecko | MV3 | ✅ Full Support |
| Safari | WebKit | MV3 | ✅ Full Support (requires Xcode) |

## Quick Start

### Build for All Browsers

```bash
# Install dependencies
npm install

# Build for all browsers
npm run build:all

# Build and create zip packages
npm run package
```

### Build for Specific Browser

```bash
# Chrome (also works for Edge, Opera, Brave, etc.)
npm run build:chrome

# Firefox
npm run build:firefox

# Safari
npm run build:safari
```

## Installation Instructions

### Chrome

1. Build: `npm run build:chrome`
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `dist/chrome` folder

### Microsoft Edge

1. Build: `npm run build:edge`
2. Open Edge and navigate to `edge://extensions`
3. Enable "Developer mode" (toggle in left sidebar)
4. Click "Load unpacked"
5. Select the `dist/edge` folder

### Firefox

1. Build: `npm run build:firefox`
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select any file in the `dist/firefox` folder (e.g., `manifest.json`)

**Note:** Temporary add-ons are removed when Firefox closes. For permanent installation, submit to [Firefox Add-ons](https://addons.mozilla.org).

### Opera

1. Build: `npm run build:opera`
2. Open Opera and navigate to `opera://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist/opera` folder

### Brave

1. Build: `npm run build:brave`
2. Open Brave and navigate to `brave://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist/brave` folder

### Safari

Safari requires additional steps. See [SAFARI_SETUP.md](./SAFARI_SETUP.md) for detailed instructions.

Quick overview:
1. Build: `npm run build:safari`
2. Convert with Xcode: `xcrun safari-web-extension-converter dist/safari`
3. Build and run in Xcode
4. Enable in Safari preferences

### Vivaldi

1. Build: `npm run build:chrome` (uses Chrome build)
2. Open Vivaldi and navigate to `vivaldi://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist/chrome` folder

### Arc

1. Build: `npm run build:chrome` (uses Chrome build)
2. Open Arc and press `Cmd+Shift+E` or navigate to Extensions
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist/chrome` folder

## Development

### Development Server

```bash
# Chrome development with hot reload
npm run dev:chrome

# Firefox development
npm run dev:firefox

# Safari development
npm run dev:safari
```

### Project Structure

```
dist/
├── chrome/      # Chrome, Edge, Opera, Brave, Vivaldi, Arc
├── firefox/     # Firefox
├── safari/      # Safari (before Xcode conversion)
├── edge/        # Edge (identical to Chrome)
├── opera/       # Opera (identical to Chrome)
└── brave/       # Brave (identical to Chrome)

packages/
├── ai-chat-export-chrome.zip
├── ai-chat-export-firefox.zip
├── ai-chat-export-safari.zip
└── ...
```

## Browser-Specific Notes

### Chrome & Chromium Browsers

- All Chromium browsers share the same codebase
- Uses Manifest V3 with service workers
- Full support for all extension APIs

### Firefox

- Uses Manifest V3 (supported since Firefox 109)
- Uses background scripts instead of service workers
- Some API differences handled by the browser polyfill
- `browser.*` namespace with Promise-based APIs

### Safari

- Requires macOS and Xcode for development
- Must be wrapped in a native app
- Supports most Chrome extension APIs
- See [SAFARI_SETUP.md](./SAFARI_SETUP.md) for details

## Store Submission

### Chrome Web Store

1. Create a [Chrome Web Store Developer account](https://chrome.google.com/webstore/developer/dashboard) ($5 one-time fee)
2. Package: `npm run zip:chrome`
3. Upload `packages/ai-chat-export-chrome.zip`
4. Fill in store listing details
5. Submit for review

### Firefox Add-ons

1. Create a [Firefox Add-ons Developer account](https://addons.mozilla.org/developers/) (free)
2. Package: `npm run zip:firefox`
3. Upload `packages/ai-chat-export-firefox.zip`
4. Fill in store listing details
5. Submit for review

### Microsoft Edge Add-ons

1. Create a [Microsoft Partner Center account](https://partner.microsoft.com/) (free)
2. Package: `npm run zip:edge`
3. Upload `packages/ai-chat-export-edge.zip`
4. Fill in store listing details
5. Submit for review

### Opera Add-ons

1. Create an [Opera Add-ons account](https://addons.opera.com/developer/) (free)
2. Package: `npm run zip:opera`
3. Upload `packages/ai-chat-export-opera.zip`
4. Submit for review

### Safari (Mac App Store)

1. Requires Apple Developer Program membership ($99/year)
2. See [SAFARI_SETUP.md](./SAFARI_SETUP.md) for detailed submission process

## Troubleshooting

### Extension Not Loading

- Ensure all build files are present in the dist folder
- Check browser console for errors
- Verify manifest.json is valid

### API Errors

- Check browser compatibility of the API being used
- Use the browser polyfill for cross-browser compatibility
- Test in multiple browsers during development

### Firefox-Specific Issues

- Ensure `browser_specific_settings.gecko.id` is set in manifest
- Use `about:debugging` to inspect extension errors
- Check for Promise-based API usage

### Safari-Specific Issues

- Enable "Allow Unsigned Extensions" in Develop menu
- Check Xcode build logs for errors
- Verify all permissions are granted in Safari settings

