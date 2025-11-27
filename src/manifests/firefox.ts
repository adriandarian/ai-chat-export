/**
 * Firefox Manifest V3 Configuration
 *
 * Firefox has full MV3 support since Firefox 109
 * Some differences from Chrome's implementation are handled here
 */

import { defineManifest } from "@crxjs/vite-plugin";
import { baseManifest, basePermissions } from "./base";

export default defineManifest({
  ...baseManifest,
  manifest_version: 3,
  permissions: [...basePermissions],

  // Firefox MV3 background scripts
  // Firefox supports service_worker since v121, but background.scripts is more compatible
  background: {
    scripts: ["src/background/index.ts"],
    type: "module",
  },

  // Firefox-specific settings
  browser_specific_settings: {
    gecko: {
      // Use a unique ID for your extension
      // For development, you can use a temporary ID
      // For production, register at addons.mozilla.org to get a permanent ID
      id: "ai-chat-export@example.com",
      strict_min_version: "109.0",
    },
  },
} as any);
