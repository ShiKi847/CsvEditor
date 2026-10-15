export interface OpenFileResult {
  content: string;
  fileName: string;
  fileHandle?: FileSystemFileHandle;
}

export function useFileSystem() {
  /**
   * Open file using File System Access API or HTML file input fallback
   */
  const openFile = async (): Promise<OpenFileResult | null> => {
    if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await (window as unknown as { showOpenFilePicker: (options: unknown) => Promise<FileSystemFileHandle[]> }).showOpenFilePicker({
          types: [
            {
              description: 'Delimited Data Files (*.csv, *.tsv, *.txt)',
              accept: {
                'text/csv': ['.csv'],
                'text/tab-separated-values': ['.tsv'],
                'text/plain': ['.txt'],
              },
            },
          ],
          multiple: false,
        });

        const file = await handle.getFile();
        const content = await file.text();
        return {
          content,
          fileName: file.name,
          fileHandle: handle,
        };
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') return null;
        console.warn('File picker error, falling back to input', err);
      }
    }

    // Fallback using invisible input element
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv,.tsv,.txt,.tab';
      input.onchange = async () => {
        if (input.files && input.files[0]) {
          const file = input.files[0];
          const content = await file.text();
          resolve({
            content,
            fileName: file.name,
          });
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  };

  /**
   * Save content directly to existing file handle (Ctrl+S) or prompt Save As
   */
  const saveFile = async (
    content: string,
    suggestedName: string,
    existingHandle?: FileSystemFileHandle
  ): Promise<{ fileName: string; fileHandle?: FileSystemFileHandle } | null> => {
    // Direct in-place save if handle is available
    if (existingHandle && 'createWritable' in existingHandle) {
      try {
        const writable = await (existingHandle as unknown as { createWritable: () => Promise<FileSystemWritableFileStream> }).createWritable();
        await writable.write(content);
        await writable.close();
        return {
          fileName: suggestedName,
          fileHandle: existingHandle,
        };
      } catch (err) {
        console.warn('Failed to write directly to file handle, prompting Save As', err);
      }
    }

    // Modern Save As dialog
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as unknown as { showSaveFilePicker: (options: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
          suggestedName,
          types: [
            {
              description: 'CSV File (*.csv)',
              accept: { 'text/csv': ['.csv'] },
            },
            {
              description: 'TSV File (*.tsv)',
              accept: { 'text/tab-separated-values': ['.tsv'] },
            },
          ],
        });

        const writable = await (handle as unknown as { createWritable: () => Promise<FileSystemWritableFileStream> }).createWritable();
        await writable.write(content);
        await writable.close();

        return {
          fileName: handle.name,
          fileHandle: handle,
        };
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') return null;
        console.warn('Save picker cancelled or failed', err);
      }
    }

    // Fallback download
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', suggestedName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { fileName: suggestedName };
  };

  /**
   * Quick export to various formats (Markdown, JSON, HTML, SQL)
   */
  const exportBlob = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return {
    openFile,
    saveFile,
    exportBlob,
  };
}
