import React, { useState, useEffect, useRef } from 'react';
import { Download, Copy, Check, X, FileSpreadsheet } from 'lucide-react';
import { stringifyCsv } from '../../utils/csv';
import type { CsvDialect, DelimiterType, LineEndingType, QuoteModeType } from '../../types';

interface ExportModalProps {
  isOpen: boolean;
  data: string[][];
  headers: string[];
  hasHeader: boolean;
  dialect: CsvDialect;
  onClose: () => void;
  onDownload: (content: string, fileName: string, mimeType: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  data,
  headers,
  hasHeader,
  dialect,
  onClose,
  onDownload,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [format, setFormat] = useState<'csv' | 'tsv' | 'markdown' | 'json' | 'html' | 'sql'>('csv');
  const [customDelimiter, setCustomDelimiter] = useState<DelimiterType>(dialect.delimiter);
  const [customLineEnding, setCustomLineEnding] = useState<LineEndingType>(dialect.lineEnding);
  const [customQuoteMode, setCustomQuoteMode] = useState<QuoteModeType>(dialect.quoteMode);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isOpen]);

  // Generate exported content based on selected format
  const generateExportContent = (): { content: string; ext: string; mime: string } => {
    const effectiveHeaders = headers;
    const bodyRows = hasHeader ? data.slice(1) : data;

    if (format === 'csv' || format === 'tsv') {
      const activeDelim = format === 'tsv' ? '\t' : customDelimiter;
      const csvStr = stringifyCsv(data, {
        ...dialect,
        delimiter: activeDelim,
        lineEnding: customLineEnding,
        quoteMode: customQuoteMode,
      });
      return {
        content: csvStr,
        ext: format === 'tsv' ? 'tsv' : 'csv',
        mime: format === 'tsv' ? 'text/tab-separated-values' : 'text/csv',
      };
    }

    if (format === 'markdown') {
      const headerLine = `| ${effectiveHeaders.join(' | ')} |`;
      const sepLine = `| ${effectiveHeaders.map(() => '---').join(' | ')} |`;
      const rows = bodyRows.map(r => `| ${r.map(c => c.replace(/\|/g, '\\|')).join(' | ')} |`);
      return {
        content: [headerLine, sepLine, ...rows].join('\n'),
        ext: 'md',
        mime: 'text/markdown',
      };
    }

    if (format === 'json') {
      const records = bodyRows.map(row => {
        const obj: Record<string, string> = {};
        effectiveHeaders.forEach((h, idx) => {
          obj[h || `col_${idx + 1}`] = row[idx] ?? '';
        });
        return obj;
      });
      return {
        content: JSON.stringify(records, null, 2),
        ext: 'json',
        mime: 'application/json',
      };
    }

    if (format === 'html') {
      const headerHtml = `  <thead>\n    <tr>\n${effectiveHeaders.map(h => `      <th>${h}</th>`).join('\n')}\n    </tr>\n  </thead>`;
      const bodyHtml = `  <tbody>\n${bodyRows.map(row => `    <tr>\n${row.map(c => `      <td>${c}</td>`).join('\n')}\n    </tr>`).join('\n')}\n  </tbody>`;
      return {
        content: `<table border="1">\n${headerHtml}\n${bodyHtml}\n</table>`,
        ext: 'html',
        mime: 'text/html',
      };
    }

    if (format === 'sql') {
      const tableName = 'exported_table';
      const colDefs = effectiveHeaders.map(h => `\`${h}\` TEXT`).join(', ');
      const createTable = `CREATE TABLE ${tableName} (${colDefs});\n\n`;

      const inserts = bodyRows
        .map(row => {
          const vals = row.map(v => `'${v.replace(/'/g, "''")}'`).join(', ');
          return `INSERT INTO ${tableName} VALUES (${vals});`;
        })
        .join('\n');

      return {
        content: createTable + inserts,
        ext: 'sql',
        mime: 'text/sql',
      };
    }

    return { content: '', ext: 'txt', mime: 'text/plain' };
  };

  const handleCopy = async () => {
    const { content } = generateExportContent();
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const { content, ext, mime } = generateExportContent();
    onDownload(content, `export_${Date.now()}.${ext}`, mime);
    onClose();
  };

  if (!isOpen) return null;

  const { content } = generateExportContent();

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="p-0 rounded-lg shadow-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 max-w-2xl w-[85vw] flex flex-col overflow-hidden outline-none"
    >
      <div className="flex items-center justify-between px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-sm">Export Data</h3>
        </div>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Format Selector */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
            Export Format:
          </label>
          <div className="grid grid-cols-6 gap-2">
            {[
              { id: 'csv', label: 'CSV' },
              { id: 'tsv', label: 'TSV' },
              { id: 'markdown', label: 'Markdown' },
              { id: 'json', label: 'JSON' },
              { id: 'html', label: 'HTML Table' },
              { id: 'sql', label: 'SQL Inserts' },
            ].map(fmt => (
              <button
                key={fmt.id}
                onClick={() => setFormat(fmt.id as typeof format)}
                className={`py-1.5 text-xs rounded border transition-all cursor-pointer font-medium ${
                  format === fmt.id
                    ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-500 text-blue-600 dark:text-blue-300 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                {fmt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Options for CSV / TSV */}
        {(format === 'csv' || format === 'tsv') && (
          <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Delimiter:</label>
              <select
                value={customDelimiter}
                onChange={e => setCustomDelimiter(e.target.value)}
                disabled={format === 'tsv'}
                className="w-full h-6 px-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs"
              >
                <option value=",">Comma (,)</option>
                <option value="&#9;">Tab (\t)</option>
                <option value=";">Semicolon (;)</option>
                <option value="|">Pipe (|)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Line Ending:</label>
              <select
                value={customLineEnding}
                onChange={e => setCustomLineEnding(e.target.value as LineEndingType)}
                className="w-full h-6 px-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs"
              >
                <option value="&#13;&#10;">CRLF (Windows)</option>
                <option value="&#10;">LF (Unix / Mac)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Quoting Rule:</label>
              <select
                value={customQuoteMode}
                onChange={e => setCustomQuoteMode(e.target.value as QuoteModeType)}
                className="w-full h-6 px-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs"
              >
                <option value="as-needed">Quote As Needed</option>
                <option value="all">Quote All Fields</option>
                <option value="non-numeric">Quote Non-Numeric</option>
                <option value="none">Quote None</option>
              </select>
            </div>
          </div>
        )}

        {/* Live Preview */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
            Preview (first 10 lines):
          </label>
          <pre className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded font-mono text-[11px] max-h-40 overflow-auto whitespace-pre leading-snug">
            {content.split('\n').slice(0, 10).join('\n')}
            {content.split('\n').length > 10 ? '\n... (truncated for preview)' : ''}
          </pre>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-medium shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download File</span>
          </button>
        </div>
      </div>
    </dialog>
  );
};
