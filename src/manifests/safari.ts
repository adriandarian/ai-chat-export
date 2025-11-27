/**
 * Safari Manifest V3 Configuration
 *
 * Safari Web Extensions use a subset of the Chrome extension API
 * The extension needs to be wrapped in an Xcode project for distribution
 *
 * Safari supports MV3 since Safari 15.4
 */

import { defineManifest } from "@crxjs/vite-plugin";
import { baseManifest, basePermissions } from "./base";

export default defineManifest({
  ...baseManifest,
  manifest_version: 3,
  permissions: [...basePermissions],

  // Safari MV3 background - uses service_worker like Chrome
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },

  // Safari-specific settings (optional, but recommended)
  browser_specific_settings: {
    safari: {
      strict_min_version: "15.4",
    },
  },
} as any);
