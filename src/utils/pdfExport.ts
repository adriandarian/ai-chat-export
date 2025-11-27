/**
 * PDF generation via browser's native print functionality
 *
 * This approach is much more reliable than html2canvas because:
 * - Browser handles fonts, pagination, and complex CSS correctly
 * - Better text selection and accessibility in resulting PDF
 * - Proper handling of code blocks and syntax highlighting
 * - No canvas size limits or rendering artifacts
 */

import { SelectedElement } from "../types";
import { getPageStyles, getDocumentBackgroundColor } from "./styles";
import { enhanceElementWithStyles } from "./elementProcessing";

/**
 * Print-optimized CSS styles with CSS variables for theming
 */
const getPrintStyles = (bgColor: string): string => `
  /* Google Fonts */
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Merriweather:wght@400;700&family=Fira+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Source+Sans+Pro:wght@400;600;700&family=Lato:wght@400;700&display=swap');

  :root {
    --pdf-bg-color: ${bgColor};
    --pdf-text-color: #e0e0e0;
    --pdf-user-bubble-bg: #2f2f2f;
    --pdf-user-bubble-text: #ffffff;
    --pdf-assistant-bubble-bg: transparent;
    --pdf-assistant-bubble-text: #e0e0e0;
    --pdf-code-bg: #1e1e1e;
    --pdf-code-text: #d4d4d4;
    --pdf-accent-color: #58a6ff;
    --pdf-font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --pdf-content-width: 900px;
    --pdf-font-size: 14px;
  }

  @page {
    size: A4;
    margin: 20mm 15mm;
  }
  
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  
  html, body {
    margin: 0;
    padding: 0;
    background-color: var(--pdf-bg-color) !important;
    font-family: var(--pdf-font-family);
    font-size: var(--pdf-font-size);
    line-height: 1.6;
    color: var(--pdf-text-color);
    transition: all 0.3s ease;
  }
  
  body {
    padding: 0;
    max-width: 100%;
  }
  
  .pdf-export-container {
    padding: 0;
    max-width: 100%;
  }
  
  .pdf-export-item {
    margin-bottom: 24px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  /* Allow page breaks within long messages */
  .pdf-export-item > * {
    page-break-inside: auto;
    break-inside: auto;
  }
  
  /* Message styling with role-based colors */
  [data-message-author-role] {
    margin-bottom: 20px;
    padding: 16px;
    border-radius: 8px;
  }
  
  [data-message-author-role="user"] {
    background-color: var(--pdf-user-bubble-bg) !important;
    color: var(--pdf-user-bubble-text) !important;
  }
  
  [data-message-author-role="assistant"] {
    background-color: var(--pdf-assistant-bubble-bg) !important;
    color: var(--pdf-assistant-bubble-text) !important;
  }
  
  /* Headers */
  h1, h2, h3, h4, h5, h6 {
    margin: 16px 0 8px 0;
    font-weight: 600;
    page-break-after: avoid;
    break-after: avoid;
    color: var(--pdf-text-color);
  }
  
  h1 { font-size: 1.8em; }
  h2 { font-size: 1.5em; }
  h3 { font-size: 1.3em; }
  h4 { font-size: 1.1em; }
  
  /* Paragraphs */
  p {
    margin: 10px 0;
    orphans: 3;
    widows: 3;
  }
  
  /* Lists */
  ul, ol {
    padding-left: 24px;
    margin: 10px 0;
  }
  
  li {
    margin: 4px 0;
  }
  
  /* Code blocks - critical for chat exports */
  pre {
    background-color: var(--pdf-code-bg) !important;
    color: var(--pdf-code-text) !important;
    padding: 14px !important;
    border-radius: 6px !important;
    margin: 12px 0 !important;
    font-family: 'SF Mono', SFMono-Regular, ui-monospace, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace !important;
    font-size: 12px !important;
    line-height: 1.5 !important;
    white-space: pre-wrap !important;
    word-wrap: break-word !important;
    word-break: break-word !important;
    overflow: visible !important;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  code {
    font-family: 'SF Mono', SFMono-Regular, ui-monospace, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace !important;
    font-size: inherit !important;
  }
  
  /* Inline code */
  :not(pre) > code {
    background-color: var(--pdf-code-bg) !important;
    color: var(--pdf-code-text) !important;
    padding: 2px 6px !important;
    border-radius: 4px !important;
    font-size: 0.9em !important;
  }
  
  /* Preserve syntax highlighting colors */
  pre span, code span {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  
  /* Tables */
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 12px 0;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  th, td {
    border: 1px solid color-mix(in srgb, var(--pdf-text-color) 30%, transparent);
    padding: 8px 12px;
    text-align: left;
  }
  
  th {
    background-color: color-mix(in srgb, var(--pdf-text-color) 5%, transparent);
  }
  
  /* Blockquotes */
  blockquote {
    border-left: 3px solid var(--pdf-accent-color);
    padding-left: 14px;
    margin: 12px 0;
    opacity: 0.9;
  }
  
  /* Links */
  a {
    color: var(--pdf-accent-color);
    text-decoration: none;
  }
  
  /* Images */
  img {
    max-width: 100%;
    height: auto;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  /* Code block wrapper styling */
  .exported-code-wrapper {
    margin: 12px 0 !important;
    border-radius: 6px !important;
    overflow: hidden !important;
    page-break-inside: avoid;
    break-inside: avoid;
    background-color: var(--pdf-code-bg) !important;
  }
  
  .exported-code-lang {
    font-size: 10px !important;
    color: color-mix(in srgb, var(--pdf-code-text) 60%, transparent) !important;
    padding: 4px 12px !important;
  }
  
  /* ============ TOOLBAR STYLES ============ */
  .pdf-toolbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    color: white;
    padding: 0;
    font-size: 13px;
    z-index: 10000;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  .toolbar-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }
  
  .toolbar-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
    font-size: 15px;
  }
  
  .toolbar-brand svg {
    width: 24px;
    height: 24px;
  }
  
  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .toolbar-controls {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 10px 20px;
    background: rgba(0,0,0,0.2);
    flex-wrap: wrap;
  }
  
  .control-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .control-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: rgba(255,255,255,0.6);
    font-weight: 500;
  }
  
  .control-select {
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.2);
    color: white;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
    min-width: 100px;
  }
  
  .control-select:hover {
    background: rgba(255,255,255,0.15);
    border-color: rgba(255,255,255,0.3);
  }
  
  .control-select:focus {
    outline: none;
    border-color: #58a6ff;
    box-shadow: 0 0 0 2px rgba(88, 166, 255, 0.2);
  }
  
  .control-select option {
    background: #1a1a2e;
    color: white;
  }
  
  .color-picker-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .color-picker {
    width: 28px;
    height: 28px;
    border: 2px solid rgba(255,255,255,0.3);
    border-radius: 6px;
    cursor: pointer;
    padding: 0;
    background: none;
    transition: all 0.2s;
  }
  
  .color-picker:hover {
    border-color: rgba(255,255,255,0.5);
    transform: scale(1.05);
  }
  
  .color-picker::-webkit-color-swatch-wrapper {
    padding: 2px;
  }
  
  .color-picker::-webkit-color-swatch {
    border-radius: 3px;
    border: none;
  }
  
  .slider-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .control-slider {
    -webkit-appearance: none;
    width: 100px;
    height: 6px;
    border-radius: 3px;
    background: rgba(255,255,255,0.2);
    cursor: pointer;
  }
  
  .control-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #58a6ff;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .control-slider::-webkit-slider-thumb:hover {
    background: #79b8ff;
    transform: scale(1.1);
  }
  
  .slider-value {
    font-size: 11px;
    color: rgba(255,255,255,0.7);
    min-width: 45px;
    text-align: right;
  }
  
  .print-btn {
    display: inline-flex !important;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #58a6ff 0%, #2563eb 100%) !important;
    color: white !important;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(88, 166, 255, 0.3);
  }
  
  .print-btn:hover {
    background: linear-gradient(135deg, #79b8ff 0%, #3b82f6 100%) !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(88, 166, 255, 0.4);
  }
  
  .print-btn:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(88, 166, 255, 0.2);
  }
  
  .toolbar-divider {
    width: 1px;
    height: 24px;
    background: rgba(255,255,255,0.2);
    margin: 0 4px;
  }
  
  .reset-btn {
    display: inline-flex !important;
    align-items: center;
    gap: 6px;
    background: rgba(255,255,255,0.1) !important;
    color: rgba(255,255,255,0.8) !important;
    border: 1px solid rgba(255,255,255,0.2);
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .reset-btn:hover {
    background: rgba(255,255,255,0.15) !important;
    color: white !important;
  }
  
  .toolbar-tip {
    font-size: 11px;
    color: rgba(255,255,255,0.5);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .toolbar-tip kbd {
    background: rgba(255,255,255,0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'SF Mono', monospace;
    font-size: 10px;
  }
  
  /* Hide toolbar controls in print */
  @media print {
    .pdf-toolbar {
      display: none !important;
    }
    
    body {
      padding: 0 !important;
    }
    
    .pdf-export-container {
      padding: 0 !important;
      max-width: 100% !important;
    }
    
    /* Hide any interactive elements */
    button, select, input {
      display: none !important;
    }
  }
  
  @media screen {
    body {
      padding-top: 120px;
      padding-left: 40px;
      padding-right: 40px;
      padding-bottom: 40px;
    }
    
    .pdf-export-container {
      max-width: var(--pdf-content-width);
      margin: 0 auto;
      transition: max-width 0.3s ease;
    }
  }
`;

/**
 * Generate the toolbar HTML with all controls
 */
const generateToolbarHTML = (): string => `
  <div class="pdf-toolbar">
    <div class="toolbar-main">
      <div class="toolbar-brand">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        Chat Export
      </div>
      <div class="toolbar-actions">
        <div class="toolbar-tip">
          <kbd>⌘P</kbd> or <kbd>Ctrl+P</kbd> to print
        </div>
        <div class="toolbar-divider"></div>
        <button class="reset-btn" id="resetBtn" title="Reset to defaults">
          ↺ Reset
        </button>
        <button class="print-btn" id="printBtn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          Save as PDF
        </button>
      </div>
    </div>
    <div class="toolbar-controls">
      <div class="control-group">
        <span class="control-label">Theme</span>
        <select class="control-select" id="themeSelect">
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="sepia">Sepia</option>
          <option value="nord">Nord</option>
          <option value="dracula">Dracula</option>
          <option value="github">GitHub</option>
          <option value="solarized">Solarized</option>
          <option value="monokai">Monokai</option>
          <option value="custom">Custom...</option>
        </select>
      </div>
      
      <div class="toolbar-divider"></div>
      
      <div class="control-group">
        <span class="control-label">Font</span>
        <select class="control-select" id="fontSelect">
          <option value="system">System Default</option>
          <option value="inter">Inter</option>
          <option value="georgia">Georgia</option>
          <option value="merriweather">Merriweather</option>
          <option value="fira">Fira Sans</option>
          <option value="jetbrains">JetBrains Mono</option>
          <option value="source">Source Sans Pro</option>
          <option value="lato">Lato</option>
        </select>
      </div>
      
      <div class="control-group">
        <span class="control-label">Size</span>
        <div class="slider-wrapper">
          <input type="range" class="control-slider" id="fontSizeSlider" min="10" max="20" value="14" step="1">
          <span class="slider-value" id="fontSizeValue">14px</span>
        </div>
      </div>
      
      <div class="toolbar-divider"></div>
      
      <div class="control-group">
        <span class="control-label">Width</span>
        <div class="slider-wrapper">
          <input type="range" class="control-slider" id="widthSlider" min="600" max="1600" value="900" step="50">
          <span class="slider-value" id="widthValue">900px</span>
        </div>
      </div>
      
      <div class="toolbar-divider"></div>
      
      <div class="control-group" id="customColors" style="display: none;">
        <span class="control-label">Background</span>
        <input type="color" class="color-picker" id="bgColorPicker" value="#212121" title="Background color">
      </div>
      
      <div class="control-group" id="customUserColor" style="display: none;">
        <span class="control-label">User Bubble</span>
        <input type="color" class="color-picker" id="userBubbleColorPicker" value="#2f2f2f" title="User message background">
      </div>
      
      <div class="control-group" id="customCodeColor" style="display: none;">
        <span class="control-label">Code Block</span>
        <input type="color" class="color-picker" id="codeColorPicker" value="#1e1e1e" title="Code block background">
      </div>
      
      <div class="control-group" id="customAccentColor" style="display: none;">
        <span class="control-label">Accent</span>
        <input type="color" class="color-picker" id="accentColorPicker" value="#58a6ff" title="Accent/link color">
      </div>
    </div>
  </div>
`;

/**
 * Generate the JavaScript for toolbar interactivity
 */
const generateToolbarScript = (): string => {
  // Using a separate function to build the script to avoid template literal issues
  return `<script>
console.log("Script starting...");

var THEMES = {
  dark: { bgColor: "#212121", textColor: "#e0e0e0", userBubbleBg: "#2f2f2f", userBubbleText: "#ffffff", codeBg: "#1e1e1e", codeText: "#d4d4d4", accentColor: "#58a6ff" },
  light: { bgColor: "#ffffff", textColor: "#1f2937", userBubbleBg: "#e5e7eb", userBubbleText: "#1f2937", codeBg: "#f3f4f6", codeText: "#1f2937", accentColor: "#2563eb" },
  sepia: { bgColor: "#f4ecd8", textColor: "#5c4b37", userBubbleBg: "#e8dcc8", userBubbleText: "#5c4b37", codeBg: "#efe6d5", codeText: "#5c4b37", accentColor: "#8b6914" },
  nord: { bgColor: "#2e3440", textColor: "#eceff4", userBubbleBg: "#3b4252", userBubbleText: "#eceff4", codeBg: "#3b4252", codeText: "#d8dee9", accentColor: "#88c0d0" },
  dracula: { bgColor: "#282a36", textColor: "#f8f8f2", userBubbleBg: "#44475a", userBubbleText: "#f8f8f2", codeBg: "#1e1f29", codeText: "#f8f8f2", accentColor: "#bd93f9" },
  github: { bgColor: "#0d1117", textColor: "#c9d1d9", userBubbleBg: "#161b22", userBubbleText: "#c9d1d9", codeBg: "#161b22", codeText: "#c9d1d9", accentColor: "#58a6ff" },
  solarized: { bgColor: "#002b36", textColor: "#839496", userBubbleBg: "#073642", userBubbleText: "#93a1a1", codeBg: "#073642", codeText: "#839496", accentColor: "#268bd2" },
  monokai: { bgColor: "#272822", textColor: "#f8f8f2", userBubbleBg: "#3e3d32", userBubbleText: "#f8f8f2", codeBg: "#1e1f1c", codeText: "#f8f8f2", accentColor: "#a6e22e" }
};

var FONTS = {
  system: "system-ui, -apple-system, sans-serif",
  inter: "Inter, system-ui, sans-serif",
  georgia: "Georgia, Times New Roman, serif",
  merriweather: "Merriweather, Georgia, serif",
  fira: "Fira Sans, system-ui, sans-serif",
  jetbrains: "JetBrains Mono, monospace",
  source: "Source Sans Pro, system-ui, sans-serif",
  lato: "Lato, system-ui, sans-serif"
};

var currentTheme = THEMES.dark;
var currentFont = FONTS.system;
var currentFontSize = "14px";

function applyFont() {
  console.log("Applying font:", currentFont);
  document.body.style.fontFamily = currentFont;
  var container = document.querySelector(".pdf-export-container");
  if (container) {
    var els = container.querySelectorAll("p, div, span, li, h1, h2, h3, h4, h5, h6, td, th, blockquote, a");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (!el.closest("pre") && !el.closest("code")) {
        el.style.fontFamily = currentFont;
      }
    }
  }
}

function applyTheme(theme) {
  console.log("Applying theme:", theme.bgColor);
  currentTheme = theme;
  document.body.style.backgroundColor = theme.bgColor;
  document.body.style.color = theme.textColor;
  
  var container = document.querySelector(".pdf-export-container");
  if (!container) return;
  
  // Update all elements
  var els = container.querySelectorAll("*");
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    var tag = el.tagName;
    
    if (tag === "PRE" || el.classList.contains("exported-code-wrapper")) {
      el.style.backgroundColor = theme.codeBg;
      el.style.color = theme.codeText;
    } else if (tag === "CODE") {
      el.style.backgroundColor = theme.codeBg;
      el.style.color = theme.codeText;
    } else if (el.closest("pre") || el.closest("code")) {
      // Skip spans in code
    } else if (el.matches && el.matches("[data-message-author-role=user]")) {
      el.style.backgroundColor = theme.userBubbleBg;
      el.style.color = theme.userBubbleText;
    } else if (el.classList.contains("user-message-bubble-color")) {
      el.style.backgroundColor = theme.userBubbleBg;
      el.style.color = theme.userBubbleText;
    } else if (el.closest("[data-message-author-role=user]") || el.closest(".user-message-bubble-color")) {
      el.style.color = theme.userBubbleText;
    } else if (tag === "A") {
      el.style.color = theme.accentColor;
    } else if (tag === "BLOCKQUOTE") {
      el.style.borderLeftColor = theme.accentColor;
      el.style.color = theme.textColor;
    } else {
      el.style.color = theme.textColor;
    }
  }
  
  // Update color pickers
  var bgPicker = document.getElementById("bgColorPicker");
  var userPicker = document.getElementById("userBubbleColorPicker");
  var codePicker = document.getElementById("codeColorPicker");
  var accentPicker = document.getElementById("accentColorPicker");
  if (bgPicker) bgPicker.value = theme.bgColor;
  if (userPicker) userPicker.value = theme.userBubbleBg;
  if (codePicker) codePicker.value = theme.codeBg;
  if (accentPicker) accentPicker.value = theme.accentColor;
}

function init() {
  console.log("PDF toolbar init starting...");
  
  // Print button
  var printBtn = document.getElementById("printBtn");
  if (printBtn) {
    printBtn.onclick = function() { window.print(); };
    console.log("Print button ready");
  }
  
  // Theme select
  var themeSelect = document.getElementById("themeSelect");
  if (themeSelect) {
    themeSelect.onchange = function() {
      console.log("Theme changed to:", this.value);
      var customGroups = ["customColors", "customUserColor", "customCodeColor", "customAccentColor"];
      if (this.value === "custom") {
        for (var i = 0; i < customGroups.length; i++) {
          var g = document.getElementById(customGroups[i]);
          if (g) g.style.display = "flex";
        }
      } else {
        for (var i = 0; i < customGroups.length; i++) {
          var g = document.getElementById(customGroups[i]);
          if (g) g.style.display = "none";
        }
        if (THEMES[this.value]) {
          applyTheme(THEMES[this.value]);
        }
      }
    };
    console.log("Theme select ready");
  }
  
  // Font select
  var fontSelect = document.getElementById("fontSelect");
  if (fontSelect) {
    fontSelect.onchange = function() {
      console.log("Font changed to:", this.value);
      if (FONTS[this.value]) {
        currentFont = FONTS[this.value];
        applyFont();
      }
    };
    console.log("Font select ready");
  }
  
  // Font size slider
  var fontSizeSlider = document.getElementById("fontSizeSlider");
  var fontSizeValue = document.getElementById("fontSizeValue");
  if (fontSizeSlider) {
    fontSizeSlider.oninput = function() {
      currentFontSize = this.value + "px";
      if (fontSizeValue) fontSizeValue.textContent = currentFontSize;
      document.body.style.fontSize = currentFontSize;
      var container = document.querySelector(".pdf-export-container");
      if (container) {
        var els = container.querySelectorAll("p, li, span, div");
        for (var i = 0; i < els.length; i++) {
          if (!els[i].closest("pre") && !els[i].closest("code")) {
            els[i].style.fontSize = currentFontSize;
          }
        }
      }
    };
    console.log("Font size slider ready");
  }
  
  // Width slider
  var widthSlider = document.getElementById("widthSlider");
  var widthValue = document.getElementById("widthValue");
  if (widthSlider) {
    widthSlider.oninput = function() {
      if (widthValue) widthValue.textContent = this.value + "px";
      var container = document.querySelector(".pdf-export-container");
      if (container) container.style.maxWidth = this.value + "px";
    };
    console.log("Width slider ready");
  }
  
  // Color pickers
  var bgColorPicker = document.getElementById("bgColorPicker");
  if (bgColorPicker) {
    bgColorPicker.oninput = function() {
      document.body.style.backgroundColor = this.value;
    };
  }
  
  var userBubbleColorPicker = document.getElementById("userBubbleColorPicker");
  if (userBubbleColorPicker) {
    userBubbleColorPicker.oninput = function() {
      var els = document.querySelectorAll("[data-message-author-role=user], .user-message-bubble-color");
      for (var i = 0; i < els.length; i++) {
        els[i].style.backgroundColor = this.value;
      }
    };
  }
  
  var codeColorPicker = document.getElementById("codeColorPicker");
  if (codeColorPicker) {
    codeColorPicker.oninput = function() {
      var els = document.querySelectorAll("pre, code, .exported-code-wrapper");
      for (var i = 0; i < els.length; i++) {
        els[i].style.backgroundColor = this.value;
      }
    };
  }
  
  var accentColorPicker = document.getElementById("accentColorPicker");
  if (accentColorPicker) {
    accentColorPicker.oninput = function() {
      var els = document.querySelectorAll(".pdf-export-container a");
      for (var i = 0; i < els.length; i++) {
        els[i].style.color = this.value;
      }
    };
  }
  
  // Reset button
  var resetBtn = document.getElementById("resetBtn");
  if (resetBtn) {
    resetBtn.onclick = function() {
      if (themeSelect) themeSelect.value = "dark";
      if (fontSelect) fontSelect.value = "system";
      if (fontSizeSlider) { fontSizeSlider.value = 14; }
      if (fontSizeValue) fontSizeValue.textContent = "14px";
      if (widthSlider) { widthSlider.value = 900; }
      if (widthValue) widthValue.textContent = "900px";
      currentFont = FONTS.system;
      currentFontSize = "14px";
      var customGroups = ["customColors", "customUserColor", "customCodeColor", "customAccentColor"];
      for (var i = 0; i < customGroups.length; i++) {
        var g = document.getElementById(customGroups[i]);
        if (g) g.style.display = "none";
      }
      applyTheme(THEMES.dark);
      applyFont();
      var container = document.querySelector(".pdf-export-container");
      if (container) container.style.maxWidth = "900px";
    };
  }
  
  console.log("PDF toolbar initialized!");
}

// Run when ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

console.log("Script parsed successfully!");
<\/script>`;
};

/**
 * Generate printable HTML for PDF export
 * Note: Blob URLs have their own document context and don't inherit CSP
 * from the parent page, so inline scripts work correctly here.
 */
const generatePrintableHTML = (elements: SelectedElement[]): string => {
  const pageStyles = getPageStyles();
  const bgColor = getDocumentBackgroundColor();

  // Enhance elements with computed styles
  const enhancedContent = elements
    .map((el, index) => {
      try {
        const content = enhanceElementWithStyles(el);
        return `<div class="pdf-export-item" data-index="${index}">${content}</div>`;
      } catch (err) {
        console.warn("Error enhancing element:", err);
        return `<div class="pdf-export-item" data-index="${index}">${el.content}</div>`;
      }
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chat Export - PDF</title>
  ${pageStyles}
  <style>${getPrintStyles(bgColor)}</style>
</head>
<body>
  ${generateToolbarHTML()}
  ${generateToolbarScript()}
  <div class="pdf-export-container">
    ${enhancedContent}
  </div>
</body>
</html>`;
};

/**
 * Open printable HTML in a new window for PDF export
 */
export const downloadPDF = async (elements: SelectedElement[], filename: string): Promise<void> => {
  if (!elements || elements.length === 0) {
    throw new Error("No elements selected");
  }

  console.log("PDF: Generating printable view with", elements.length, "elements");

  try {
    const html = generatePrintableHTML(elements);

    // Create a blob URL for the HTML
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);

    // Open in a new window/tab
    const printWindow = window.open(url, "_blank", "width=900,height=700");

    if (!printWindow) {
      // Popup blocked - fallback to download
      console.warn("PDF: Popup blocked, falling back to HTML download");
      const a = document.createElement("a");
      a.href = url;
      a.download = filename.replace(".pdf", ".html");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      alert(
        "Popup was blocked. HTML file downloaded instead.\n\nOpen the file and use Print > Save as PDF.",
      );

      // Clean up after download
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }

    // Clean up the blob URL when the window closes
    printWindow.onbeforeunload = () => {
      URL.revokeObjectURL(url);
    };

    // Also clean up after a timeout in case onbeforeunload doesn't fire
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000);

    console.log("PDF: Opened print preview window");
  } catch (error) {
    console.error("PDF export failed:", error);
    throw error;
  }
};

/**
 * Legacy function for compatibility - generates blob (not used in new flow)
 * Kept for potential future use with different PDF libraries
 */
export const generateExportPDF = async (elements: SelectedElement[]): Promise<Blob> => {
  // Generate HTML and return as blob
  const html = generatePrintableHTML(elements);
  return new Blob([html], { type: "text/html" });
};
