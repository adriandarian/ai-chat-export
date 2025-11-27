/// <reference types="vite/client" />

// Browser target defined at build time
declare const __BROWSER_TARGET__:
  | "chrome"
  | "firefox"
  | "safari"
  | "edge"
  | "opera"
  | "brave"
  | "atlas"
  | "vivaldi"
  | "arc";

declare module "*?inline" {
  const content: string;
  export default content;
}
