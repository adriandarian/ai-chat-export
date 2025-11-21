import { SelectedElement } from '../types';

const getPageStyles = () => {
  const styles: string[] = [];
  // Get external stylesheets
  document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    styles.push(link.outerHTML);
  });
  // Get inline styles
  document.querySelectorAll('style').forEach((style) => {
    styles.push(style.outerHTML);
  });
  return styles.join('\n');
};

export const generateExportHTML = (elements: SelectedElement[]) => {
  const styles = getPageStyles();
  const content = elements.map(el => `
    <div class="ai-chat-export-item" style="margin-bottom: 20px; padding: 10px; border: 1px dashed #ccc;">
      ${el.content}
    </div>
  `).join('\n');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Chat Export</title>
      <base href="${window.location.origin}">
      ${styles}
      <style>
        body { 
          padding: 40px; 
          max-width: 1000px; 
          margin: 0 auto; 
          background-color: white !important;
          color: black !important;
        }
        .ai-chat-export-item {
          position: relative;
        }
        @media print {
          .ai-chat-export-item {
            break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <h1 style="font-family: system-ui, -apple-system, sans-serif; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 10px;">
        Chat Export - ${new Date().toLocaleDateString()}
      </h1>
      ${content}
      <script>
        // Auto-print option could be added here
      </script>
    </body>
    </html>
  `;
};

export const downloadBlob = (content: string, filename: string, contentType: string) => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

