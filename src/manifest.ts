/**
 * Default manifest - Chrome/Chromium
 *
 * This file is kept for backward compatibility.
 * For browser-specific manifests, see ./manifests/
 */

import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  name: "AI Chat Export",
  description: "Select and export chat elements from any page",
  version: "1.0.0",
  manifest_version: 3,
  icons: {
    16: "src/assets/icon-16.png",
    32: "src/assets/icon-32.png",
    48: "src/assets/icon-48.png",
    128: "src/assets/icon-128.png",
  },
  permissions: ["activeTab", "scripting", "storage", "downloads"],
  action: {
    default_popup: "src/popup/index.html",
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/index.tsx"],
      run_at: "document_idle",
      all_frames: false,
    },
  ],
});
