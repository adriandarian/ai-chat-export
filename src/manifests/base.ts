/**
 * Base manifest configuration shared across all browsers
 */

export const baseManifest = {
  name: 'AI Chat Export',
  description: 'Select and export chat elements from any page',
  version: '1.0.0',
  icons: {
    16: 'src/assets/icon-16.png',
    32: 'src/assets/icon-32.png',
    48: 'src/assets/icon-48.png',
    128: 'src/assets/icon-128.png',
  },
  action: {
    default_popup: 'src/popup/index.html',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.tsx'],
      run_at: 'document_idle' as const,
      all_frames: false,
    },
  ],
};

// Permissions needed by the extension
export const basePermissions = ['activeTab', 'scripting', 'storage', 'downloads'] as const;

// Host permissions (MV3)
export const hostPermissions = ['<all_urls>'] as const;
