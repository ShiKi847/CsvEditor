import React, { useRef, useEffect } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  X, 
  CaseSensitive, 
  WholeWord, 
  Regex,
  Replace,
  ReplaceAll
} from 'lucide-react';
import type { FindReplaceOptions } from '../../types';

interface FindReplaceBarProps {
  options: FindReplaceOptions;
  matchCount: number;
  currentMatchIndex: number;
  onUpdateOptions: (newOpts: Partial<FindReplaceOptions>) => void;
  onFindNext: () => void;
  onFindPrev: () => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
}

export const FindReplaceBar: React.FC<FindReplaceBarProps> = ({
  options,
  matchCount,
  currentMatchIndex,
  onUpdateOptions,
  onFindNext,
  onFindPrev,
  onReplace,
  onReplaceAll,
  onClose,
}) => {
  const findInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    findInputRef.current?.focus();
    findInputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) onFindPrev();
      else onFindNext();
    }
  };

  return (
    <div
      onKeyDown={handleKeyDown}
      className="absolute top-9 right-4 z-40 w-80 bg-white dark:bg-slate-800 rounded-md shadow-2xl border border-slate-300 dark:border-slate-700 p-2 text-xs flex flex-col gap-1.5 select-none animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {/* Find Row */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1 flex items-center">
          <input
            ref={findInputRef}
            type="text"
            value={options.findText}
            onChange={e => onUpdateOptions({ findText: e.target.value })}
            placeholder="Find..."
            className="w-full h-6 px-2 pr-16 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded focus:border-blue-500 focus:outline-none"
          />

          {/* Option toggles inside input */}
          <div className="absolute right-1 flex items-center gap-0.5">
            <button
              onClick={() => onUpdateOptions({ matchCase: !options.matchCase })}
              className={`p-0.5 rounded transition-colors ${
                options.matchCase
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="Match Case (Alt+C)"
            >
              <CaseSensitive className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onUpdateOptions({ matchEntireCell: !options.matchEntireCell })}
              className={`p-0.5 rounded transition-colors ${
                options.matchEntireCell
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="Match Entire Cell (Alt+W)"
            >
              <WholeWord className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onUpdateOptions({ useRegex: !options.useRegex })}
              className={`p-0.5 rounded transition-colors ${
                options.useRegex
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="Use Regular Expression (Alt+R)"
            >
              <Regex className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Counter */}
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap min-w-[50px] text-center">
          {options.findText ? (
            matchCount > 0 ? (
              `${currentMatchIndex + 1}/${matchCount}`
            ) : (
              'No match'
            )
          ) : (
            ''
          )}
        </span>

        {/* Navigation buttons */}
        <button
          onClick={onFindPrev}
          disabled={matchCount === 0}
          className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 rounded cursor-pointer"
          title="Previous Match (Shift+Enter)"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          onClick={onFindNext}
          disabled={matchCount === 0}
          className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 rounded cursor-pointer"
          title="Next Match (Enter)"
        >
          <ChevronDown className="w-4 h-4" />
        </button>

        {/* Close button */}
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer"
          title="Close (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Replace Row */}
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={options.replaceText}
          onChange={e => onUpdateOptions({ replaceText: e.target.value })}
          placeholder="Replace with..."
          className="flex-1 h-6 px-2 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded focus:border-blue-500 focus:outline-none"
        />

        <button
          onClick={onReplace}
          disabled={matchCount === 0}
          className="flex items-center gap-1 px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 disabled:opacity-40 rounded border border-slate-300 dark:border-slate-600 cursor-pointer"
          title="Replace Current Match"
        >
          <Replace className="w-3 h-3" />
          <span>Replace</span>
        </button>

        <button
          onClick={onReplaceAll}
          disabled={matchCount === 0}
          className="flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-300 disabled:opacity-40 rounded border border-blue-200 dark:border-blue-800 cursor-pointer font-medium"
          title="Replace All Occurrences"
        >
          <ReplaceAll className="w-3 h-3" />
          <span>All</span>
        </button>
      </div>
    </div>
  );
};
