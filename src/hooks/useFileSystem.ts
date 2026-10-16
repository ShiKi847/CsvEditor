export interface OpenFileResult {
  content: string;
  fileName: string;
  filePath?: string;
  fileHandle?: FileSystemFileHandle;
}

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      openFile: () => Promise<{ filePath: string; fileName: string; content: string } | null>;
      saveFile: (
        content: string,
        suggestedName: string,
        existingPath?: string
      ) => Promise<{ filePath: string; fileName: string } | null>;
      writeFile: (filePath: string, content: string) => Promise<boolean>;
      setZoomFactor?: (factor: number) => void;
      getZoomFactor?: () => number;
      onFileOpenedFromCli: (callback: (data: { filePath: string; fileName: string; content: string }) => void) => void;
    };
  }
}

export function useFileSystem() {
  /**
   * Open file using native Electron dialog or File System Access API or HTML file input fallback
   */
  const openFile = async (): Promise<OpenFileResult | null> => {
    // 1. Native Electron Dialog
    if (window.electronAPI?.openFile) {
      try {
        const res = await window.electronAPI.openFile();
        if (res) {
          return {
            content: res.content,
            fileName: res.fileName,
            filePath: res.filePath,
          };
        }
        return null;
      } catch (err) {
        console.warn('Electron openFile failed', err);
      }
    }

    // 2. Modern Web File System Access API
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
          filePath: file.name,
          fileHandle: handle,
        };
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') return null;
        console.warn('File picker error, falling back to input', err);
      }
    }

    // 3. Fallback using invisible input element
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
            filePath: file.name,
          });
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  };

  /**
   * Save content directly to disk or prompt Save As dialog
   */
  const saveFile = async (
    content: string,
    suggestedName: string,
    existingHandle?: FileSystemFileHandle,
    existingPath?: string
  ): Promise<{ fileName: string; filePath?: string; fileHandle?: FileSystemFileHandle } | null> => {
    // 1. Native Electron File Save
    if (window.electronAPI?.saveFile) {
      try {
        const res = await window.electronAPI.saveFile(content, suggestedName, existingPath);
        if (res) {
          return {
            fileName: res.fileName,
            filePath: res.filePath,
          };
        }
        return null;
      } catch (err) {
        console.warn('Electron saveFile failed', err);
      }
    }

    // 2. Direct in-place save if Web file handle is available
    if (existingHandle && 'createWritable' in existingHandle) {
      try {
        const writable = await (existingHandle as unknown as { createWritable: () => Promise<FileSystemWritableFileStream> }).createWritable();
        await writable.write(content);
        await writable.close();
        return {
          fileName: suggestedName,
          filePath: suggestedName,
          fileHandle: existingHandle,
        };
      } catch (err) {
        console.warn('Failed to write directly to file handle, prompting Save As', err);
      }
    }

    // 3. Modern Web Save As dialog
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
          filePath: handle.name,
          fileHandle: handle,
        };
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') return null;
        console.warn('Save picker cancelled or failed', err);
      }
    }

    // 4. Fallback download
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', suggestedName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { fileName: suggestedName, filePath: suggestedName };
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
