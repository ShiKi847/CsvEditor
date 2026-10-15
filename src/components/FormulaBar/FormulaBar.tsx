import React, { useEffect, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { formatCellAddress } from '../../utils/column';
import type { SelectionRange } from '../../types';

interface FormulaBarProps {
  selection: SelectionRange;
  currentValue: string;
  hasHeader: boolean;
  onValueChange: (newValue: string) => void;
  onOpenMultiline: () => void;
}

export const FormulaBar: React.FC<FormulaBarProps> = ({
  selection,
  currentValue,
  hasHeader,
  onValueChange,
  onOpenMultiline,
}) => {
  const [val, setVal] = useState(currentValue);

  useEffect(() => {
    setVal(currentValue);
  }, [currentValue]);

  const displayRow = selection.activeRow;
  const address = formatCellAddress(hasHeader ? displayRow + 1 : displayRow, selection.activeCol);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVal(e.target.value);
    onValueChange(e.target.value);
  };

  return (
    <div className="flex items-center h-7 px-2 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 text-xs gap-2 select-none">
      {/* Cell Coordinate Pill */}
      <div className="min-w-[65px] px-1.5 py-0.5 text-center font-mono font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded border border-slate-300 dark:border-slate-600">
        {address}
      </div>

      <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />

      {/* Formula / Cell Content Input */}
      <div className="relative flex-1 flex items-center">
        <input
          type="text"
          value={val}
          onChange={handleChange}
          placeholder="Cell value..."
          className="w-full h-6 px-2 text-xs font-mono bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Length indicator */}
      <span className="text-[11px] text-slate-400 font-mono px-1">
        {val.length} chars
      </span>

      {/* Expand to multiline modal */}
      <button
        onClick={onOpenMultiline}
        title="Open in Multiline Inspector (Alt+Enter)"
        className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
