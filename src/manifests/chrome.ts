/**
 * Chrome Manifest V3 Configuration
 * 
 * Also works for: Edge, Opera, Brave, Atlas, Vivaldi, and other Chromium-based browsers
 */

import { defineManifest } from '@crxjs/vite-plugin';
import { baseManifest, basePermissions } from './base';

export default defineManifest({
  ...baseManifest,
  manifest_version: 3,
  permissions: [...basePermissions],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  // Chrome-specific: Minimum Chrome version for MV3 support
  minimum_chrome_version: '88',
} as any);
