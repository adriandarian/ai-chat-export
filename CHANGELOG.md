# Changelog

All notable changes to the AI Chat Export browser extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.0 (2025-11-28)

### 🚀 Features

* add bundle size analysis tools and configuration ([05428a5](https://github.com/adriandarian/ai-chat-export/commit/05428a567575bccfa61aae42c80e5c0522b5326b))
* add GitHub Actions workflow for release automation and Lighthouse CI configuration ([f5dfcd3](https://github.com/adriandarian/ai-chat-export/commit/f5dfcd30f7defe2f0ba8de46bcf34d46c877927d))
* add linting, formatting, and testing scripts to package.json ([bf00509](https://github.com/adriandarian/ai-chat-export/commit/bf00509467280db4d437841d425618a8c4601820))

### 🐛 Bug Fixes

* add missing CI badge to README ([ba1018a](https://github.com/adriandarian/ai-chat-export/commit/ba1018a78bc3cfdfc9f5b3aaeca71f4dace8aa5b))
* enhance JSON export functionality by improving language detection and message parsing ([ed8768d](https://github.com/adriandarian/ai-chat-export/commit/ed8768d1fe56f0039b829ceea0018f546b5c5fa8))
* lower coverage thresholds for CI ([543ee99](https://github.com/adriandarian/ai-chat-export/commit/543ee99b9d500a2d1a7e49547805efcfca8d228f))
* remove unused imports in elementProcessing tests ([7a5c74c](https://github.com/adriandarian/ai-chat-export/commit/7a5c74cbba81b618838a87e39669e1841bf98d4a))
* resolve lint warnings and format issues for CI ([1471921](https://github.com/adriandarian/ai-chat-export/commit/14719219384c707ae7888cd6f583e7128fb735e4))
* standardize code formatting and remove trailing commas in test files ([c7104cc](https://github.com/adriandarian/ai-chat-export/commit/c7104cc0a407a94f4407468c1ccb126afc22f092))

## [1.0.0] - 2024-01-15

### 🚀 Features

- Initial release of AI Chat Export browser extension
- Element selector with hover highlighting for chat bubbles and containers
- Multi-selection support for exporting multiple messages at once
- HTML export functionality with preserved styles
- PDF export via print functionality
- Markdown export with proper formatting
- JSON export for structured data
- Support for multiple browsers:
  - Chrome (Chromium)
  - Edge (Chromium)
  - Brave (Chromium)
  - Opera (Chromium)
  - Vivaldi (Chromium)
  - Firefox (Gecko)
  - Safari (WebKit)
- Content script injection for element selection
- Popup interface for extension controls
- Local storage for user preferences
- Smart conversation detection for AI chat platforms
- Syntax highlighting for code blocks in exports
- Dark/Light theme support

### 📦 Build System

- Built with React 18.2.0 and TypeScript
- Uses Vite for build tooling
- Manifest V3 compatible
- Tailwind CSS for styling
- Cross-browser build scripts

### 📚 Documentation

- Comprehensive README with installation instructions
- Browser-specific setup guides
- Safari setup guide for Xcode conversion
- Contributing guidelines
- Security policy

[1.0.0]: https://github.com/adriandarian/ai-chat-export/releases/tag/v1.0.0
