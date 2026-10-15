import React from 'react';

interface GridRowNumbersProps {
  startRow: number;
  endRow: number;
  rowHeight: number;
  selectedRows: Set<number>;
  rowOffset: number; // if hasHeader is true, data rows might start at 2 or 1
  onSelectRow: (rowIndex: number, isMulti: boolean) => void;
  onContextMenu: (e: React.MouseEvent, rowIndex: number) => void;
}

export const GridRowNumbers: React.FC<GridRowNumbersProps> = ({
  startRow,
  endRow,
  rowHeight,
  selectedRows,
  rowOffset,
  onSelectRow,
  onContextMenu,
}) => {
  const visibleRows: number[] = [];
  for (let r = startRow; r <= endRow; r++) {
    visibleRows.push(r);
  }

  return (
    <div className="w-[48px] bg-slate-100 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-500 dark:text-slate-400 select-none">
      {visibleRows.map(r => {
        const top = r * rowHeight;
        const isSelected = selectedRows.has(r);
        const displayNumber = r + rowOffset;

        return (
          <div
            key={r}
            style={{
              position: 'absolute',
              top: `${top}px`,
              left: 0,
              width: '48px',
              height: `${rowHeight}px`,
            }}
            onClick={e => onSelectRow(r, e.shiftKey || e.ctrlKey)}
            onContextMenu={e => {
              e.preventDefault();
              onContextMenu(e, r);
            }}
            className={`flex items-center justify-center cursor-pointer border-b border-slate-200 dark:border-slate-700 transition-colors ${
              isSelected
                ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200 font-bold'
                : 'hover:bg-slate-200 dark:hover:bg-slate-700/60'
            }`}
          >
            {displayNumber}
          </div>
        );
      })}
    </div>
  );
};
