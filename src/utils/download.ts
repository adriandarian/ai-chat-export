/**
 * File download utilities with native save picker support
 */

/**
 * Map file extensions to descriptions and accept types for save dialog
 */
const getFileTypeInfo = (filename: string): { description: string; accept: Record<string, string[]> } => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  switch (ext) {
    case 'html':
      return { description: 'HTML Document', accept: { 'text/html': ['.html', '.htm'] } };
    case 'json':
      return { description: 'JSON File', accept: { 'application/json': ['.json'] } };
    case 'md':
      return { description: 'Markdown Document', accept: { 'text/markdown': ['.md', '.markdown'] } };
    case 'pdf':
      return { description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } };
    default:
      return { description: 'Text File', accept: { 'text/plain': ['.txt'] } };
  }
};

/**
 * Download a blob using the File System Access API (save picker) when available
 * @returns true if file was saved, false if user cancelled
 */
export const downloadBlobWithPicker = async (
  blob: Blob, 
  filename: string, 
  description: string, 
  accept: Record<string, string[]>
): Promise<boolean> => {
  // Try to use the File System Access API for "Save As" dialog
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description,
          accept,
        }],
      });
      
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (err: any) {
      // User cancelled the save dialog
      if (err.name === 'AbortError') {
        return false; // Indicate user cancelled
      }
      // For other errors, fall back to traditional download
      console.warn('File System Access API failed, falling back to download:', err);
    }
  }
  
  // Fallback: traditional download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
};

/**
 * Download content as a blob file
 */
export const downloadBlob = async (content: string, filename: string, contentType: string): Promise<void> => {
  const blob = new Blob([content], { type: contentType });
  
  // Try to use the File System Access API for "Save As" dialog
  if ('showSaveFilePicker' in window) {
    try {
      const fileTypeInfo = getFileTypeInfo(filename);
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: fileTypeInfo.description,
          accept: fileTypeInfo.accept,
        }],
      });
      
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err: any) {
      // User cancelled the save dialog or API not fully supported
      if (err.name === 'AbortError') {
        // User cancelled - don't fall back, just return
        return;
      }
      // For other errors, fall back to traditional download
      console.warn('File System Access API failed, falling back to download:', err);
    }
  }
  
  // Fallback: traditional download (for browsers without File System Access API)
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

