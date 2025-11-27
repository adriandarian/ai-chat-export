module.exports = {
  ci: {
    collect: {
      // Use static HTML file for testing (the popup)
      staticDistDir: './dist/chrome',
      url: ['file://' + process.cwd() + '/dist/chrome/src/popup/index.html'],
      numberOfRuns: 3,
      settings: {
        // Chrome extension popups are small, adjust viewport
        formFactor: 'desktop',
        screenEmulation: {
          mobile: false,
          width: 400,
          height: 600,
          deviceScaleFactor: 1,
          disabled: false,
        },
        // Skip some audits that don't apply to extensions
        skipAudits: [
          'installable-manifest',
          'splash-screen',
          'themed-omnibox',
          'maskable-icon',
          'service-worker',
          'works-offline',
          'offline-start-url',
          'is-on-https',
          'redirects-http',
          'uses-http2',
        ],
      },
    },
    assert: {
      assertions: {
        // Performance budgets
        'categories:performance': ['warn', { minScore: 0.7 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],

        // Specific metrics
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],

        // Accessibility specific
        'color-contrast': 'error',
        'document-title': 'warn',
        'html-has-lang': 'warn',
        'meta-viewport': 'warn',
      },
    },
    upload: {
      // Upload to temporary public storage (for CI)
      target: 'temporary-public-storage',
    },
  },
}
