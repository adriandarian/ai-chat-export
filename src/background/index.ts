console.log('[Background] AI Chat Export service worker loaded');

// Handle download requests from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Received message:', message.type, 'from tab:', sender.tab?.id);
  
  if (message.type === 'download') {
    const { blobData, filename, mimeType } = message;
    
    console.log('[Background] Processing download request for:', filename, 'mimeType:', mimeType);
    
    try {
      // Convert base64 back to blob URL
      const byteCharacters = atob(blobData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      console.log('[Background] Created blob URL, initiating download with saveAs dialog');
      
      // Use Chrome downloads API with saveAs: true to show file picker
      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true, // This shows the "Save As" dialog!
      }, (downloadId) => {
        // Clean up the blob URL after download completes or is cancelled
        setTimeout(() => {
          URL.revokeObjectURL(url);
          console.log('[Background] Cleaned up blob URL');
        }, 5000);
        
        if (chrome.runtime.lastError) {
          console.error('[Background] Download failed:', chrome.runtime.lastError.message);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('[Background] Download initiated successfully, downloadId:', downloadId);
          sendResponse({ success: true, downloadId });
        }
      });
    } catch (error) {
      console.error('[Background] Error processing download:', error);
      sendResponse({ success: false, error: String(error) });
    }
    
    // Return true to indicate we'll call sendResponse asynchronously
    return true;
  }
  
  // For unhandled message types, return false to indicate no async response
  return false;
});
