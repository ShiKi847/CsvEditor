import React, { useState, useRef } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { getColumnLetter } from '../../utils/column';
import type { SortState } from '../../types';

interface GridHeaderProps {
  startCol: number;
  endCol: number;
  colOffsets: number[];
  getColWidth: (col: number) => number;
  leftOffset?: number;
  columnHeaders: string[];
  sortState: SortState | null;
  selectedCols: Set<number>;
  onSelectColumn: (colIndex: number, isMulti: boolean) => void;
  onResizeColumn: (colIndex: number, newWidth: number) => void;
  onAutoFitColumn: (colIndex: number) => void;
  onSortColumn: (colIndex: number) => void;
  onContextMenu: (e: React.MouseEvent, colIndex: number) => void;
}

export const GridHeader: React.FC<GridHeaderProps> = ({
  startCol,
  endCol,
  colOffsets,
  getColWidth,
  leftOffset = 48,
  columnHeaders,
  sortState,
  selectedCols,
  onSelectColumn,
  onResizeColumn,
  onAutoFitColumn,
  onSortColumn,
  onContextMenu,
}) => {
  const [resizingCol, setResizingCol] = useState<number | null>(null);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(0);

  const handleResizeStart = (e: React.MouseEvent, colIndex: number) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingCol(colIndex);
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = getColWidth(colIndex);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - resizeStartXRef.current;
      const newWidth = Math.max(30, resizeStartWidthRef.current + deltaX);
      onResizeColumn(colIndex, newWidth);
    };

    const handleMouseUp = () => {
      setResizingCol(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const visibleCols: number[] = [];
  for (let c = startCol; c <= endCol; c++) {
    visibleCols.push(c);
  }

  return (
    <div className="relative h-[26px] bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 select-none">
      {visibleCols.map(c => {
        const width = getColWidth(c);
        const left = leftOffset + colOffsets[c];
        const isSelected = selectedCols.has(c);
        const isSorted = sortState?.colIndex === c;
        const letter = getColumnLetter(c);
        const headerTitle = columnHeaders[c] !== undefined ? columnHeaders[c] : letter;

        return (
          <div
            key={c}
            style={{
              position: 'absolute',
              left: `${left}px`,
              width: `${width}px`,
              height: '26px',
            }}
            onClick={e => onSelectColumn(c, e.shiftKey || e.ctrlKey)}
            onContextMenu={e => {
              e.preventDefault();
              onContextMenu(e, c);
            }}
            className={`group relative flex items-center justify-between px-2 cursor-pointer border-r border-slate-300 dark:border-slate-700 transition-colors ${
              isSelected
                ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200'
                : 'hover:bg-slate-200 dark:hover:bg-slate-700/60'
            }`}
          >
            <div className="flex items-center gap-1 min-w-0 overflow-hidden pr-1">
              <span className="truncate font-semibold text-slate-800 dark:text-slate-100">
                {headerTitle}
              </span>
              {columnHeaders[c] && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  ({letter})
                </span>
              )}
            </div>

            {/* Sort Action Button (Prominent & Accessible) */}
            <button
              onClick={e => {
                e.stopPropagation();
                onSortColumn(c);
              }}
              title={
                isSorted
                  ? `Sorted ${sortState.direction === 'asc' ? 'Ascending (A-Z)' : 'Descending (Z-A)'}. Click to switch/clear.`
                  : 'Sort by this column'
              }
              className={`p-0.5 rounded cursor-pointer transition-colors flex items-center justify-center ${
                isSorted
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60'
                  : 'text-slate-400 opacity-0 group-hover:opacity-100 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-300/50 dark:hover:bg-slate-700'
              }`}
            >
              {isSorted ? (
                sortState.direction === 'asc' ? (
                  <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
                )
              ) : (
                <ArrowUpDown className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Resize handle */}
            <div
              onMouseDown={e => handleResizeStart(e, c)}
              onDoubleClick={e => {
                e.stopPropagation();
                onAutoFitColumn(c);
              }}
              className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-500 z-10 ${
                resizingCol === c ? 'bg-blue-500' : ''
              }`}
              title="Drag to resize, double-click to auto-fit"
            />
          </div>
        );
      })}
    </div>
  );
};
