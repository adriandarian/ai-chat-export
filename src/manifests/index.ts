/**
 * Manifest exports for different browsers
 *
 * Usage in vite.config.ts:
 * import { chromeManifest, firefoxManifest, safariManifest } from './src/manifests'
 */

export { default as chromeManifest } from "./chrome";
export { default as firefoxManifest } from "./firefox";
export { default as safariManifest } from "./safari";
export { baseManifest, basePermissions, hostPermissions } from "./base";

// Browser target type
export type BrowserTarget = "chrome" | "firefox" | "safari" | "edge" | "opera" | "brave";
