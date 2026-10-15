import React, { useState, useRef } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { getColumnLetter } from '../../utils/column';
import type { SortState } from '../../types';

interface GridHeaderProps {
  startCol: number;
  endCol: number;
  colOffsets: number[];
  getColWidth: (col: number) => number;
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
    <div className="flex h-[26px] bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 select-none">
      {visibleCols.map(c => {
        const width = getColWidth(c);
        const left = colOffsets[c];
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
            <div className="flex items-center gap-1 min-w-0 overflow-hidden pr-2">
              <span className="truncate font-semibold">{headerTitle}</span>
              {columnHeaders[c] && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">({letter})</span>
              )}
            </div>

            <div className="flex items-center">
              {isSorted && (
                <span
                  onClick={e => {
                    e.stopPropagation();
                    onSortColumn(c);
                  }}
                  className="p-0.5 text-blue-600 dark:text-blue-400"
                >
                  {sortState.direction === 'asc' ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </span>
              )}
            </div>

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
            />
          </div>
        );
      })}
    </div>
  );
};
