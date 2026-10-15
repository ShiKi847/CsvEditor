import React from 'react';
import { Filter, X, RotateCcw } from 'lucide-react';
import type { FilterCondition } from '../../types';

interface FilterBarProps {
  headers: string[];
  filter: FilterCondition | null;
  totalRows: number;
  filteredCount: number;
  onUpdateFilter: (filter: FilterCondition | null) => void;
  onClose: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  headers,
  filter,
  totalRows,
  filteredCount,
  onUpdateFilter,
  onClose,
}) => {
  const currentCol = filter?.colIndex ?? 0;
  const currentOp = filter?.operator ?? 'contains';
  const currentVal = filter?.value ?? '';

  const handleColChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const colIndex = Number(e.target.value);
    onUpdateFilter({
      colIndex,
      operator: currentOp,
      value: currentVal,
    });
  };

  const handleOpChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const operator = e.target.value as FilterCondition['operator'];
    onUpdateFilter({
      colIndex: currentCol,
      operator,
      value: currentVal,
    });
  };

  const handleValChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateFilter({
      colIndex: currentCol,
      operator: currentOp,
      value: e.target.value,
    });
  };

  const handleClear = () => {
    onUpdateFilter(null);
  };

  return (
    <div className="flex items-center h-8 px-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/60 text-xs gap-2 select-none">
      <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
        <Filter className="w-3.5 h-3.5" />
        <span>Filter:</span>
      </div>

      {/* Column selector */}
      <select
        value={currentCol}
        onChange={handleColChange}
        className="h-6 px-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded text-xs focus:outline-none"
      >
        {headers.map((h, idx) => (
          <option key={idx} value={idx}>
            {h || `Column ${idx + 1}`}
          </option>
        ))}
      </select>

      {/* Operator */}
      <select
        value={currentOp}
        onChange={handleOpChange}
        className="h-6 px-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded text-xs focus:outline-none"
      >
        <option value="contains">contains</option>
        <option value="equals">equals</option>
        <option value="starts_with">starts with</option>
        <option value="ends_with">ends with</option>
        <option value="greater_than">&gt; greater than</option>
        <option value="less_than">&lt; less than</option>
        <option value="regex">regex</option>
        <option value="is_empty">is empty</option>
        <option value="is_not_empty">is not empty</option>
      </select>

      {/* Value input (hidden for is_empty and is_not_empty) */}
      {!['is_empty', 'is_not_empty'].includes(currentOp) && (
        <input
          type="text"
          value={currentVal}
          onChange={handleValChange}
          placeholder="Filter value..."
          className="h-6 px-2 w-48 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded text-xs focus:outline-none"
        />
      )}

      {/* Status */}
      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 ml-1">
        Showing {filteredCount} / {totalRows} rows
      </span>

      {filter && (
        <button
          onClick={handleClear}
          className="flex items-center gap-1 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      )}

      <div className="flex-1" />

      {/* Close button */}
      <button
        onClick={onClose}
        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
        title="Close Filter"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
