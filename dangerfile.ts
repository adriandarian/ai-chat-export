import { danger, warn, fail, message, markdown } from 'danger'
import { readFileSync, existsSync } from 'fs'

// Configuration
const BIG_PR_THRESHOLD = 500
const BUNDLE_SIZE_INCREASE_THRESHOLD = 10 // percent

// Get PR info
const pr = danger.github.pr
const modified = danger.git.modified_files
const created = danger.git.created_files
const deleted = danger.git.deleted_files
const allFiles = [...modified, ...created]

// ============================================
// PR Size Check
// ============================================
const changedLines = pr.additions + pr.deletions
if (changedLines > BIG_PR_THRESHOLD) {
  warn(
    `🐘 This PR is quite large (${changedLines} lines changed). Consider breaking it into smaller PRs for easier review.`
  )
}

// ============================================
// Check for test files
// ============================================
const sourceChanges = allFiles.filter(
  (file) =>
    file.startsWith('src/') &&
    !file.includes('.test.') &&
    !file.includes('.spec.') &&
    !file.includes('test/') &&
    (file.endsWith('.ts') || file.endsWith('.tsx'))
)

const testChanges = allFiles.filter(
  (file) => file.includes('.test.') || file.includes('.spec.') || file.includes('test/')
)

if (sourceChanges.length > 0 && testChanges.length === 0) {
  warn(
    `🧪 This PR modifies source files but doesn't include any test changes. Consider adding tests for new functionality.`
  )
}

// ============================================
// Check for console.log statements
// ============================================
const jsFiles = allFiles.filter(
  (file) =>
    (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) &&
    !file.includes('test') &&
    !file.includes('spec')
)

for (const file of jsFiles) {
  const diff = await danger.git.diffForFile(file)
  if (diff?.added?.includes('console.log')) {
    warn(`📝 \`${file}\` contains \`console.log\` statements. Please remove before merging.`)
  }
}

// ============================================
// Package.json changes
// ============================================
const packageChanged = modified.includes('package.json')
const lockfileChanged =
  modified.includes('bun.lock') ||
  modified.includes('package-lock.json') ||
  modified.includes('yarn.lock')

if (packageChanged && !lockfileChanged) {
  warn(
    `📦 \`package.json\` was modified but no lockfile was updated. Run \`bun install\` to update the lockfile.`
  )
}

// ============================================
// Bundle Size Comparison
// ============================================
if (existsSync('bundle-reports/bundle-size-chrome.json')) {
  try {
    const report = JSON.parse(readFileSync('bundle-reports/bundle-size-chrome.json', 'utf8'))
    const totalKB = report.results?.chrome?.totalSizeKB

    if (totalKB) {
      message(`📦 **Bundle Size (Chrome):** ${totalKB.toFixed(2)} KB`)

      // Check against limits
      const maxSize = report.config?.maxTotalSizeKB || 500
      const percentUsed = (totalKB / maxSize) * 100

      if (percentUsed > 90) {
        warn(`⚠️ Bundle size is at ${percentUsed.toFixed(1)}% of the ${maxSize}KB limit!`)
      } else if (percentUsed > 75) {
        message(`📊 Bundle size is at ${percentUsed.toFixed(1)}% of the ${maxSize}KB limit.`)
      }
    }
  } catch (e) {
    // Bundle report not available
  }
}

// ============================================
// Coverage Report
// ============================================
if (existsSync('coverage/coverage-summary.json')) {
  try {
    const coverage = JSON.parse(readFileSync('coverage/coverage-summary.json', 'utf8'))
    const total = coverage.total

    const lines = total.lines.pct
    const functions = total.functions.pct
    const branches = total.branches.pct
    const statements = total.statements.pct

    markdown(`
## 📊 Code Coverage

| Metric | Coverage |
|--------|----------|
| Lines | ${lines}% |
| Functions | ${functions}% |
| Branches | ${branches}% |
| Statements | ${statements}% |
`)

    if (lines < 50 || functions < 50 || branches < 50) {
      warn('⚠️ Code coverage is below 50%. Consider adding more tests.')
    }
  } catch (e) {
    // Coverage report not available
  }
}

// ============================================
// Manifest Changes
// ============================================
const manifestChanged = allFiles.some((file) => file.includes('manifest'))
if (manifestChanged) {
  message(
    '🔧 Manifest files were changed. Make sure to test the extension in all target browsers.'
  )
}

// ============================================
// PR Description Check
// ============================================
if (!pr.body || pr.body.length < 50) {
  warn(
    '📝 Please provide a more detailed PR description explaining the changes and their motivation.'
  )
}

// ============================================
// WIP Check
// ============================================
if (pr.title.toLowerCase().includes('wip') || pr.title.toLowerCase().includes('work in progress')) {
  fail('🚧 This PR is marked as Work In Progress. Please remove WIP from the title when ready.')
}
