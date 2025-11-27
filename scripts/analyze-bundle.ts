import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface BundleSizeConfig {
  // Maximum total bundle size in KB
  maxTotalSizeKB: number;
  // Maximum size for individual chunks in KB
  maxChunkSizeKB: number;
  // Files/patterns to exclude from size calculation
  exclude: string[];
}

interface SizeResult {
  file: string;
  sizeBytes: number;
  sizeKB: number;
  sizeFormatted: string;
}

interface AnalysisResult {
  totalSizeBytes: number;
  totalSizeKB: number;
  totalSizeFormatted: string;
  files: SizeResult[];
  largestChunk: SizeResult | null;
  passed: boolean;
  errors: string[];
  warnings: string[];
}

// Bundle size limits - adjust these based on your requirements
const CONFIG: BundleSizeConfig = {
  maxTotalSizeKB: 500, // 500KB total limit
  maxChunkSizeKB: 250, // 250KB per chunk limit
  exclude: [
    '.map',
    '.html',
    'manifest.json',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.ico',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
  ],
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function shouldIncludeFile(filename: string): boolean {
  return !CONFIG.exclude.some(ext => filename.endsWith(ext));
}

function getFileSizes(dir: string, basePath: string = ''): SizeResult[] {
  const results: SizeResult[] = [];
  
  if (!existsSync(dir)) {
    return results;
  }

  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const relativePath = join(basePath, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      results.push(...getFileSizes(fullPath, relativePath));
    } else if (stat.isFile() && shouldIncludeFile(item)) {
      results.push({
        file: relativePath,
        sizeBytes: stat.size,
        sizeKB: stat.size / 1024,
        sizeFormatted: formatBytes(stat.size),
      });
    }
  }
  
  return results;
}

function analyzeBundleSize(distDir: string): AnalysisResult {
  const files = getFileSizes(distDir);
  const totalSizeBytes = files.reduce((sum, f) => sum + f.sizeBytes, 0);
  const totalSizeKB = totalSizeBytes / 1024;
  
  const sortedFiles = [...files].sort((a, b) => b.sizeBytes - a.sizeBytes);
  const largestChunk = sortedFiles.length > 0 ? sortedFiles[0] : null;
  
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check total size
  if (totalSizeKB > CONFIG.maxTotalSizeKB) {
    errors.push(
      `Total bundle size (${formatBytes(totalSizeBytes)}) exceeds limit of ${CONFIG.maxTotalSizeKB}KB`
    );
  } else if (totalSizeKB > CONFIG.maxTotalSizeKB * 0.8) {
    warnings.push(
      `Total bundle size (${formatBytes(totalSizeBytes)}) is approaching limit of ${CONFIG.maxTotalSizeKB}KB`
    );
  }
  
  // Check individual chunk sizes
  for (const file of files) {
    if (file.sizeKB > CONFIG.maxChunkSizeKB) {
      errors.push(
        `Chunk "${file.file}" (${file.sizeFormatted}) exceeds limit of ${CONFIG.maxChunkSizeKB}KB`
      );
    } else if (file.sizeKB > CONFIG.maxChunkSizeKB * 0.8) {
      warnings.push(
        `Chunk "${file.file}" (${file.sizeFormatted}) is approaching limit of ${CONFIG.maxChunkSizeKB}KB`
      );
    }
  }
  
  return {
    totalSizeBytes,
    totalSizeKB,
    totalSizeFormatted: formatBytes(totalSizeBytes),
    files: sortedFiles,
    largestChunk,
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

function generateReport(result: AnalysisResult, browser: string): string {
  let report = `\n📦 Bundle Size Analysis for ${browser}\n`;
  report += '='.repeat(50) + '\n\n';
  
  report += `📊 Total Size: ${result.totalSizeFormatted}\n`;
  report += `📁 Total Files: ${result.files.length}\n`;
  
  if (result.largestChunk) {
    report += `🔝 Largest Chunk: ${result.largestChunk.file} (${result.largestChunk.sizeFormatted})\n`;
  }
  
  report += '\n📋 File Breakdown:\n';
  report += '-'.repeat(50) + '\n';
  
  for (const file of result.files) {
    const bar = '█'.repeat(Math.min(20, Math.ceil(file.sizeKB / 10)));
    report += `  ${file.sizeFormatted.padStart(10)} │ ${bar} ${file.file}\n`;
  }
  
  if (result.warnings.length > 0) {
    report += '\n⚠️  Warnings:\n';
    for (const warning of result.warnings) {
      report += `  - ${warning}\n`;
    }
  }
  
  if (result.errors.length > 0) {
    report += '\n❌ Errors:\n';
    for (const error of result.errors) {
      report += `  - ${error}\n`;
    }
  }
  
  if (result.passed) {
    report += '\n✅ Bundle size check PASSED\n';
  } else {
    report += '\n❌ Bundle size check FAILED\n';
  }
  
  return report;
}

function generateJsonReport(results: Record<string, AnalysisResult>): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    config: CONFIG,
    results,
  }, null, 2);
}

async function main() {
  const args = process.argv.slice(2);
  const browser = args[0] || 'chrome';
  const outputJson = args.includes('--json');
  const ciMode = args.includes('--ci');
  
  const distDir = join(process.cwd(), 'dist', browser);
  
  if (!existsSync(distDir)) {
    console.error(`❌ Distribution directory not found: ${distDir}`);
    console.error('   Run "bun run build" first.');
    process.exit(1);
  }
  
  const result = analyzeBundleSize(distDir);
  const report = generateReport(result, browser);
  
  console.log(report);
  
  // Save reports
  const reportsDir = join(process.cwd(), 'bundle-reports');
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true });
  }
  
  if (outputJson) {
    const jsonReport = generateJsonReport({ [browser]: result });
    const jsonPath = join(reportsDir, `bundle-size-${browser}.json`);
    writeFileSync(jsonPath, jsonReport);
    console.log(`📄 JSON report saved to: ${jsonPath}`);
  }
  
  // In CI mode, exit with error code if check failed
  if (ciMode && !result.passed) {
    process.exit(1);
  }
  
  return result;
}

main().catch(console.error);
