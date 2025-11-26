# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-XX

### Added
- Initial release of AI Chat Export browser extension
- Element selector with hover highlighting for chat bubbles and containers
- Multi-selection support for exporting multiple messages at once
- HTML export functionality with preserved styles
- PDF export via print functionality
- Support for Chrome, Edge, Brave, Opera, Vivaldi, Firefox, and Safari browsers
- Content script injection for element selection
- Popup interface for extension controls
- Local storage for user preferences

### Technical Details
- Built with React 18.2.0 and TypeScript
- Uses Vite for build tooling
- Manifest V3 compatible
- Uses html2canvas and jspdf for export functionality
- Tailwind CSS for styling

[1.0.0]: https://github.com/adriandarian/ai-chat-export/releases/tag/v1.0.0

