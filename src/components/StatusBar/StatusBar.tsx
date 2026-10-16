import React from 'react';
import type { SelectionRange, SelectionStats, CsvDialect } from '../../types';
import { formatCellAddress } from '../../utils/column';

interface StatusBarProps {
  selection: SelectionRange;
  stats: SelectionStats;
  totalRows: number;
  totalCols: number;
  hasHeader: boolean;
  dialect: CsvDialect;
  isDirty: boolean;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  selection,
  stats,
  totalRows,
  totalCols,
  hasHeader,
  dialect,
  isDirty,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}) => {
  const minRow = Math.min(selection.startRow, selection.endRow);
  const maxRow = Math.max(selection.startRow, selection.endRow);
  const minCol = Math.min(selection.startCol, selection.endCol);
  const maxCol = Math.max(selection.startCol, selection.endCol);

  const selectedRowCount = maxRow - minRow + 1;
  const selectedColCount = maxCol - minCol + 1;
  const isMultiple = selectedRowCount > 1 || selectedColCount > 1;

  const displayRow = selection.activeRow;
  const cellAddress = formatCellAddress(hasHeader ? displayRow + 1 : displayRow, selection.activeCol);

  const getDelimiterName = (d: string) => {
    if (d === ',') return 'Comma (,)';
    if (d === '\t') return 'Tab (\\t)';
    if (d === ';') return 'Semicolon (;)';
    if (d === '|') return 'Pipe (|)';
    return `Custom (${d})`;
  };

  return (
    <div className="flex items-center justify-between h-6 min-h-[24px] px-3 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400 select-none whitespace-nowrap gap-2 overflow-hidden">
      {/* Left Selection & Statistics */}
      <div className="shrink-0 flex items-center gap-3 overflow-hidden text-ellipsis whitespace-nowrap">
        {/* Active Cell */}
        <span className="font-semibold text-slate-800 dark:text-slate-200 shrink-0">
          {cellAddress}
        </span>

        {/* Selection Dimensions */}
        {isMultiple && (
          <span className="text-slate-500 dark:text-slate-400 shrink-0">
            {selectedRowCount}R &times; {selectedColCount}C ({stats.cellCount} cells)
          </span>
        )}

        <div className="h-3 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />

        {/* Live Calculation Stats (Excel / SmoothCSV style) */}
        <div className="flex items-center gap-2.5 shrink-0 whitespace-nowrap">
          <span>
            Count: <strong className="text-slate-700 dark:text-slate-200">{stats.nonEmptyCount}</strong>
          </span>

          {stats.sum !== null && (
            <span>
              Sum: <strong className="text-slate-700 dark:text-slate-200">{stats.sum.toLocaleString()}</strong>
            </span>
          )}

          {stats.average !== null && (
            <span>
              Avg: <strong className="text-slate-700 dark:text-slate-200">{stats.average.toLocaleString()}</strong>
            </span>
          )}

          {stats.min !== null && stats.max !== null && stats.numericCount > 1 && (
            <span>
              Min: <strong className="text-slate-700 dark:text-slate-200">{stats.min}</strong> &bull; Max: <strong className="text-slate-700 dark:text-slate-200">{stats.max}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Right File & Dialect Specs */}
      <div className="shrink-0 flex items-center gap-3 whitespace-nowrap">
        {/* Dirty State */}
        <span className={isDirty ? 'text-blue-600 dark:text-blue-400 font-semibold shrink-0' : 'text-slate-400 shrink-0'}>
          {isDirty ? '● Modified' : 'Saved'}
        </span>

        <div className="h-3 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />

        {/* Dataset Shape */}
        <span className="shrink-0">
          {totalRows.toLocaleString()} rows, {totalCols} cols
        </span>

        <div className="h-3 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />

        {/* Delimiter */}
        <span className="shrink-0">{getDelimiterName(dialect.delimiter)}</span>

        <div className="h-3 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />

        {/* Line Ending */}
        <span className="shrink-0">{dialect.lineEnding === '\r\n' ? 'CRLF' : 'LF'}</span>

        <div className="h-3 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />

        {/* Encoding */}
        <span className="shrink-0">{dialect.encoding}</span>

        <div className="h-3 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 font-mono shrink-0 whitespace-nowrap">
          <button
            onClick={onZoomOut}
            className="w-4 h-4 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 rounded cursor-pointer font-bold"
            title="Zoom Out (Ctrl -)"
          >
            -
          </button>
          <button
            onClick={onZoomReset}
            className="px-1 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded cursor-pointer hover:underline text-[11px]"
            title="Click to reset zoom to 100% (Ctrl 0)"
          >
            {Math.round(zoomLevel * 100)}%
          </button>
          <button
            onClick={onZoomIn}
            className="w-4 h-4 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 rounded cursor-pointer font-bold"
            title="Zoom In (Ctrl + / Ctrl Wheel)"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};
