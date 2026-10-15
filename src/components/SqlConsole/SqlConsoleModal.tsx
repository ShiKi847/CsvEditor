import React, { useState, useEffect, useRef } from 'react';
import alasql from 'alasql';
import { Database, Play, Download, Plus, X, AlertCircle } from 'lucide-react';

interface SqlConsoleModalProps {
  isOpen: boolean;
  data: string[][];
  headers: string[];
  hasHeader: boolean;
  onClose: () => void;
  onOpenInNewTab: (queryResultData: string[][], tabTitle: string) => void;
  onExportCsv: (csvContent: string, fileName: string) => void;
}

export const SqlConsoleModal: React.FC<SqlConsoleModalProps> = ({
  isOpen,
  data,
  headers,
  hasHeader,
  onClose,
  onOpenInNewTab,
  onExportCsv,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('SELECT * FROM csv LIMIT 50');
  const [results, setResults] = useState<Record<string, unknown>[] | null>(null);
  const [resultColumns, setResultColumns] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [execTime, setExecTime] = useState<number | null>(null);

  // Manage native <dialog> element
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  // Prepare table records for AlaSQL
  const prepareRecords = () => {
    const effectiveHeaders = headers.map((h, i) => (h && h.trim() ? h.trim() : `col_${i + 1}`));
    const dataRows = hasHeader ? data.slice(1) : data;

    return dataRows.map(row => {
      const record: Record<string, unknown> = {};
      effectiveHeaders.forEach((colName, idx) => {
        const val = row[idx] ?? '';
        // If numeric, cast to number for AlaSQL arithmetic
        const num = Number(val);
        record[colName] = !isNaN(num) && val.trim() !== '' ? num : val;
      });
      return record;
    });
  };

  const handleRunQuery = () => {
    setError(null);
    const startTime = performance.now();

    try {
      const records = prepareRecords();
      // Register temporary table with AlaSQL
      alasql.tables = {};
      const res = alasql(query, [records]);

      const endTime = performance.now();
      setExecTime(Number((endTime - startTime).toFixed(2)));

      if (Array.isArray(res)) {
        setResults(res as Record<string, unknown>[]);
        if (res.length > 0 && typeof res[0] === 'object' && res[0] !== null) {
          setResultColumns(Object.keys(res[0]));
        } else {
          setResultColumns(['value']);
        }
      } else {
        setResults([{ result: res }]);
        setResultColumns(['result']);
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to execute SQL query');
      setResults(null);
    }
  };

  // Convert results to 2D string array
  const formatResultsAsGrid = (): string[][] => {
    if (!results || results.length === 0) return [resultColumns];
    const grid: string[][] = [resultColumns];
    results.forEach(row => {
      const rowArr = resultColumns.map(col => {
        const val = row[col];
        return val === null || val === undefined ? '' : String(val);
      });
      grid.push(rowArr);
    });
    return grid;
  };

  const handleOpenInNewTab = () => {
    if (!results || results.length === 0) return;
    const grid = formatResultsAsGrid();
    onOpenInNewTab(grid, 'SQL Query Result');
    onClose();
  };

  const handleExportCsv = () => {
    if (!results || results.length === 0) return;
    const grid = formatResultsAsGrid();
    const csvStr = grid
      .map(row =>
        row
          .map(cell => (cell.includes(',') || cell.includes('"') || cell.includes('\n') ? `"${cell.replace(/"/g, '""')}"` : cell))
          .join(',')
      )
      .join('\r\n');
    onExportCsv(csvStr, 'query_result.csv');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunQuery();
    }
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="p-0 rounded-lg shadow-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 max-w-4xl w-[90vw] max-h-[85vh] flex flex-col overflow-hidden outline-none"
    >
      {/* Modal Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-sm">SQL Console (Query CSV Data)</h3>
          <span className="text-[11px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-mono">
            Table: `csv`
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Editor & Templates */}
      <div className="p-4 flex flex-col gap-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Write SQL queries against the active CSV dataset:</span>
          <div className="flex items-center gap-2">
            <span className="text-[11px]">Templates:</span>
            <button
              onClick={() => setQuery('SELECT * FROM csv LIMIT 20')}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
            >
              Select First 20
            </button>
            <span>•</span>
            <button
              onClick={() => {
                const firstCol = headers[0] || 'col_1';
                setQuery(`SELECT [${firstCol}], COUNT(*) as count FROM csv GROUP BY [${firstCol}] ORDER BY count DESC`);
              }}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
            >
              Group By &amp; Count
            </button>
          </div>
        </div>

        <div className="relative">
          <textarea
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            placeholder="SELECT * FROM csv WHERE ..."
            className="w-full p-2.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded focus:border-blue-500 focus:outline-none resize-none leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunQuery}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium shadow-sm transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Run Query (Ctrl+Enter)</span>
            </button>
            {execTime !== null && (
              <span className="text-[11px] text-slate-400 font-mono">
                Executed in {execTime} ms
              </span>
            )}
          </div>

          {results && results.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenInNewTab}
                className="flex items-center gap-1 px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Open in New Tab</span>
              </button>
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1 px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded text-red-600 dark:text-red-300 text-xs font-mono">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Results Viewport */}
      <div className="flex-1 overflow-auto p-4 min-h-[200px] max-h-[340px] bg-slate-50/50 dark:bg-slate-950/50">
        {results ? (
          results.length > 0 ? (
            <div className="border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                  <tr>
                    <th className="p-2 w-10 text-slate-400 font-normal border-r border-slate-200 dark:border-slate-700 text-center">
                      #
                    </th>
                    {resultColumns.map(col => (
                      <th
                        key={col}
                        className="p-2 font-semibold text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 truncate"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {results.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-1.5 text-center text-slate-400 border-r border-slate-200 dark:border-slate-800">
                        {rIdx + 1}
                      </td>
                      {resultColumns.map(col => (
                        <td
                          key={col}
                          className="p-1.5 border-r border-slate-200 dark:border-slate-800 truncate max-w-[200px]"
                        >
                          {String(row[col] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-slate-400 text-xs">
              Query executed successfully (0 rows returned)
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-xs gap-1">
            <Database className="w-8 h-8 opacity-30" />
            <span>Click &quot;Run Query&quot; to execute SQL on your CSV data</span>
          </div>
        )}
      </div>
    </dialog>
  );
};
