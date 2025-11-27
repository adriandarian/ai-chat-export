/**
 * File download utilities with Chrome extension downloads API support
 * Uses chrome.downloads.download with saveAs: true to show file picker
 */

/**
 * Convert a Blob to base64 string for sending via message passing
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Remove the data URL prefix to get just the base64 data
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Check if Chrome extension APIs are available
 */
const isChromeExtensionContext = (): boolean => {
  try {
    return !!(
      typeof chrome !== 'undefined' && 
      chrome.runtime && 
      chrome.runtime.id && 
      chrome.runtime.sendMessage
    );
  } catch {
    return false;
  }
};

/**
 * Download a blob using Chrome's downloads API with saveAs dialog
 * @returns true if file was saved, false if user cancelled
 */
export const downloadBlobWithPicker = async (
  blob: Blob, 
  filename: string, 
  _description: string, 
  _accept: Record<string, string[]>
): Promise<boolean> => {
  // Use Chrome extension downloads API via background script
  if (isChromeExtensionContext()) {
    try {
      console.log('[Download] Converting blob to base64 for:', filename);
      const blobData = await blobToBase64(blob);
      console.log('[Download] Sending message to background script, blob size:', blobData.length);
      
      return new Promise((resolve) => {
        // Set a timeout in case the background script doesn't respond
        const timeoutId = setTimeout(() => {
          console.warn('[Download] Background script timeout, using fallback');
          fallbackDownload(blob, filename);
          resolve(true);
        }, 10000);
        
        chrome.runtime.sendMessage(
          {
            type: 'download',
            blobData,
            filename,
            mimeType: blob.type,
          },
          (response) => {
            clearTimeout(timeoutId);
            
            if (chrome.runtime.lastError) {
              console.warn('[Download] Message failed:', chrome.runtime.lastError.message);
              fallbackDownload(blob, filename);
              resolve(true);
              return;
            }
            
            if (response && response.success) {
              console.log('[Download] Success, downloadId:', response.downloadId);
              resolve(true);
            } else if (response && response.error) {
              console.warn('[Download] Failed:', response.error);
              fallbackDownload(blob, filename);
              resolve(true);
            } else {
              // No response or unexpected response - background may not be running
              console.warn('[Download] No valid response from background, using fallback');
              fallbackDownload(blob, filename);
              resolve(true);
            }
          }
        );
      });
    } catch (err) {
      console.warn('[Download] Chrome downloads API failed, falling back:', err);
      fallbackDownload(blob, filename);
      return true;
    }
  }
  
  // Not in extension context - use fallback
  console.log('[Download] Not in extension context, using fallback');
  fallbackDownload(blob, filename);
  return true;
};

/**
 * Fallback download using traditional anchor element
 * Note: This won't show a "Save As" dialog - file goes to default downloads folder
 */
const fallbackDownload = (blob: Blob, filename: string): void => {
  console.log('[Download] Using fallback download for:', filename);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Download content as a blob file
 */
export const downloadBlob = async (content: string, filename: string, contentType: string): Promise<void> => {
  console.log('[Download] downloadBlob called for:', filename, 'type:', contentType);
  const blob = new Blob([content], { type: contentType });
  await downloadBlobWithPicker(blob, filename, '', {});
};

