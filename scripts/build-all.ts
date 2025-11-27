#!/usr/bin/env npx ts-node

/**
 * Build script for all browser targets
 * 
 * This script builds the extension for all supported browsers
 * and optionally creates zip packages for distribution
 * 
 * Usage:
 *   npx ts-node scripts/build-all.ts
 *   npx ts-node scripts/build-all.ts --zip
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, statSync, createWriteStream } from 'fs';
import { join } from 'path';
import { createGzip } from 'zlib';
import archiver from 'archiver';

// All supported browser targets
const BROWSERS = [
  'chrome',
  'firefox',
  'safari',
  'edge',
  'opera',
  'brave',
] as const;

// Chromium-based browsers that share the same build
const CHROMIUM_BROWSERS = ['chrome', 'edge', 'opera', 'brave', 'atlas', 'vivaldi', 'arc'];

type Browser = typeof BROWSERS[number];

interface BuildResult {
  browser: Browser;
  success: boolean;
  duration: number;
  error?: string;
}

async function buildForBrowser(browser: Browser): Promise<BuildResult> {
  const startTime = Date.now();
  
  console.log(`\n📦 Building for ${browser}...`);
  
  try {
    // Run the build command with the browser environment variable
    execSync(`BROWSER=${browser} npm run build:base`, {
      stdio: 'inherit',
      env: { ...process.env, BROWSER: browser },
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ ${browser} build completed in ${(duration / 1000).toFixed(2)}s`);
    
    return { browser, success: true, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ ${browser} build failed: ${errorMessage}`);
    
    return { browser, success: false, duration, error: errorMessage };
  }
}

async function createZipPackage(browser: Browser): Promise<boolean> {
  const distDir = join(process.cwd(), 'dist', browser);
  const packagesDir = join(process.cwd(), 'packages');
  
  if (!existsSync(distDir)) {
    console.error(`❌ No build found for ${browser}`);
    return false;
  }
  
  // Create packages directory if it doesn't exist
  if (!existsSync(packagesDir)) {
    mkdirSync(packagesDir, { recursive: true });
  }
  
  const zipPath = join(packagesDir, `ai-chat-export-${browser}.zip`);
  
  return new Promise((resolve) => {
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      const sizeKB = (archive.pointer() / 1024).toFixed(2);
      console.log(`📁 ${browser}: ${zipPath} (${sizeKB} KB)`);
      resolve(true);
    });
    
    archive.on('error', (err) => {
      console.error(`❌ Failed to create zip for ${browser}:`, err);
      resolve(false);
    });
    
    archive.pipe(output);
    archive.directory(distDir, false);
    archive.finalize();
  });
}

async function main() {
  const args = process.argv.slice(2);
  const shouldZip = args.includes('--zip');
  const selectedBrowsers = args.filter(arg => !arg.startsWith('--'));
  
  // Determine which browsers to build
  const browsersToBuild: Browser[] = selectedBrowsers.length > 0
    ? selectedBrowsers.filter(b => BROWSERS.includes(b as Browser)) as Browser[]
    : [...BROWSERS];
  
  // For Chromium browsers, we only need to build once (chrome) and copy
  // But for clarity, we'll build each separately (they use the same manifest)
  const uniqueBuilds = browsersToBuild.filter(b => 
    b === 'chrome' || b === 'firefox' || b === 'safari' ||
    !CHROMIUM_BROWSERS.includes(b) || !browsersToBuild.includes('chrome')
  );
  
  console.log('🚀 AI Chat Export - Multi-Browser Build');
  console.log('==========================================');
  console.log(`Building for: ${browsersToBuild.join(', ')}`);
  if (shouldZip) {
    console.log('📦 Will create zip packages after build');
  }
  
  const startTime = Date.now();
  const results: BuildResult[] = [];
  
  // Build each browser sequentially
  for (const browser of browsersToBuild) {
    const result = await buildForBrowser(browser);
    results.push(result);
  }
  
  // Create zip packages if requested
  if (shouldZip) {
    console.log('\n📦 Creating distribution packages...');
    for (const browser of browsersToBuild) {
      const result = results.find(r => r.browser === browser);
      if (result?.success) {
        await createZipPackage(browser);
      }
    }
  }
  
  // Summary
  const totalDuration = Date.now() - startTime;
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log('\n==========================================');
  console.log('📊 Build Summary');
  console.log('==========================================');
  console.log(`Total time: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`Successful: ${successful.length}/${results.length}`);
  
  if (failed.length > 0) {
    console.log('\n❌ Failed builds:');
    failed.forEach(r => console.log(`  - ${r.browser}: ${r.error}`));
    process.exit(1);
  }
  
  console.log('\n✅ All builds completed successfully!');
  console.log('\nBuild outputs:');
  browsersToBuild.forEach(browser => {
    console.log(`  - dist/${browser}/`);
  });
  
  if (shouldZip) {
    console.log('\nDistribution packages:');
    browsersToBuild.forEach(browser => {
      console.log(`  - packages/ai-chat-export-${browser}.zip`);
    });
  }
  
  console.log('\n📝 Next steps:');
  console.log('  Chrome/Edge/Opera/Brave: Load unpacked from dist/<browser>/');
  console.log('  Firefox: Load temporary add-on from dist/firefox/');
  console.log('  Safari: See SAFARI_SETUP.md for Xcode conversion');
}

main().catch(console.error);

