import React, { useState, useRef, useEffect } from 'react';
import { 
  FilePlus, 
  FolderOpen, 
  Save, 
  Download, 
  Undo2, 
  Redo2, 
  Scissors, 
  Copy, 
  Clipboard, 
  Search, 
  Filter, 
  Database, 
  Sun, 
  Moon, 
  Command, 
  Trash2, 
  Sparkles,
  Rows,
  Columns,
  ChevronDown,
  Layers,
  Check,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import type { CsvDialect, DelimiterType, LineEndingType } from '../../types';

interface MainToolbarProps {
  dialect: CsvDialect;
  hasHeader: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isDarkMode: boolean;
  isFilterOpen: boolean;
  isFindOpen: boolean;
  onNewFile: () => void;
  onOpenFile: () => void;
  onSaveFile: () => void;
  onSaveAsFile: () => void;
  onExport: () => void;
  onLoadSample: (type: 'sales' | 'multiline' | 'large') => void;
  onUndo: () => void;
  onRedo: () => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onToggleFind: () => void;
  onToggleFilter: () => void;
  onOpenSqlConsole: () => void;
  onOpenCommandPalette: () => void;
  onToggleDarkMode: () => void;
  onToggleHasHeader: () => void;
  onUpdateDialect: (partial: Partial<CsvDialect>) => void;
  onInsertRow: () => void;
  onDeleteRow: () => void;
  onInsertCol: () => void;
  onDeleteCol: () => void;
  onSortAsc: () => void;
  onSortDesc: () => void;
  onTrimWhitespace: () => void;
  onTransformCase: (mode: 'upper' | 'lower' | 'title') => void;
  onFillDown: () => void;
  onDeduplicate: () => void;
}

export const MainToolbar: React.FC<MainToolbarProps> = ({
  dialect,
  hasHeader,
  canUndo,
  canRedo,
  isDarkMode,
  isFilterOpen,
  isFindOpen,
  onNewFile,
  onOpenFile,
  onSaveFile,
  onSaveAsFile,
  onExport,
  onLoadSample,
  onUndo,
  onRedo,
  onCut,
  onCopy,
  onPaste,
  onToggleFind,
  onToggleFilter,
  onOpenSqlConsole,
  onOpenCommandPalette,
  onToggleDarkMode,
  onToggleHasHeader,
  onUpdateDialect,
  onInsertRow,
  onDeleteRow,
  onInsertCol,
  onDeleteCol,
  onSortAsc,
  onSortDesc,
  onTrimWhitespace,
  onTransformCase,
  onFillDown,
  onDeduplicate,
}) => {
  const [sampleMenuOpen, setSampleMenuOpen] = useState(false);
  const [transformMenuOpen, setTransformMenuOpen] = useState(false);
  const sampleRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (sampleRef.current && !sampleRef.current.contains(e.target as Node)) {
        setSampleMenuOpen(false);
      }
      if (transformRef.current && !transformRef.current.contains(e.target as Node)) {
        setTransformMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, []);

  const Button = ({
    icon: Icon,
    label,
    shortcut,
    onClick,
    disabled = false,
    active = false,
  }: {
    icon: React.ElementType;
    label?: string;
    shortcut?: string;
    onClick: () => void;
    disabled?: boolean;
    active?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={shortcut ? `${label || ''} (${shortcut})` : label}
      className={`shrink-0 flex items-center gap-1 px-1.5 py-1 text-xs rounded transition-colors select-none cursor-pointer whitespace-nowrap ${
        active
          ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold'
          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/60 disabled:opacity-40 disabled:cursor-not-allowed'
      }`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {label && <span className="whitespace-nowrap">{label}</span>}
    </button>
  );

  const Separator = () => <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5 shrink-0" />;

  return (
    <div className="flex items-center justify-between min-h-[36px] py-1 px-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs select-none gap-2 whitespace-nowrap">
      {/* Left Operations Group with visible horizontal scrollbar & mouse wheel scroll support */}
      <div 
        className="flex-1 min-w-0 flex items-center gap-0.5 overflow-x-auto overflow-y-hidden pb-0.5 toolbar-scroll"
        onWheel={(e) => {
          if (!e.ctrlKey && !e.metaKey && e.deltaY !== 0) {
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
      >
        <Button icon={FilePlus} label="New" shortcut="Ctrl+N" onClick={onNewFile} />
        <Button icon={FolderOpen} label="Open" shortcut="Ctrl+O" onClick={onOpenFile} />
        <Button icon={Save} label="Save" shortcut="Ctrl+S" onClick={onSaveFile} />
        <Button icon={Save} label="Save As" shortcut="Ctrl+Shift+S" onClick={onSaveAsFile} />
        <Button icon={Download} label="Export" onClick={onExport} />

        {/* Samples Menu */}
        <div ref={sampleRef} className="relative shrink-0">
          <button
            onClick={() => setSampleMenuOpen(!sampleMenuOpen)}
            className="shrink-0 flex items-center gap-1 px-1.5 py-1 text-xs rounded text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/60 whitespace-nowrap cursor-pointer"
            title="Load sample CSV data"
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Samples</span>
            <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
          </button>
          {sampleMenuOpen && (
            <div className="absolute left-0 top-full mt-1 z-50 w-44 bg-white dark:bg-slate-800 rounded shadow-xl border border-slate-200 dark:border-slate-700 py-1">
              <button
                onClick={() => {
                  onLoadSample('sales');
                  setSampleMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Sales Orders (Standard)
              </button>
              <button
                onClick={() => {
                  onLoadSample('multiline');
                  setSampleMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Multiline Notes &amp; Quotes
              </button>
              <button
                onClick={() => {
                  onLoadSample('large');
                  setSampleMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                500-Row Performance Test
              </button>
            </div>
          )}
        </div>

        <Separator />

        {/* Edit Operations */}
        <Button icon={Undo2} shortcut="Ctrl+Z" onClick={onUndo} disabled={!canUndo} />
        <Button icon={Redo2} shortcut="Ctrl+Y" onClick={onRedo} disabled={!canRedo} />
        <Button icon={Scissors} shortcut="Ctrl+X" onClick={onCut} />
        <Button icon={Copy} shortcut="Ctrl+C" onClick={onCopy} />
        <Button icon={Clipboard} shortcut="Ctrl+V" onClick={onPaste} />

        <Separator />

        {/* Search, Filter & SQL */}
        <Button icon={Search} label="Find" shortcut="Ctrl+F" active={isFindOpen} onClick={onToggleFind} />
        <Button icon={Filter} label="Filter" active={isFilterOpen} onClick={onToggleFilter} />
        <Button icon={Database} label="SQL Console" onClick={onOpenSqlConsole} />

        <Separator />

        {/* Rows & Columns */}
        <Button icon={Rows} label="+Row" onClick={onInsertRow} />
        <Button icon={Trash2} label="-Row" onClick={onDeleteRow} />
        <Button icon={Columns} label="+Col" onClick={onInsertCol} />
        <Button icon={Trash2} label="-Col" onClick={onDeleteCol} />

        <Separator />

        {/* Sort Buttons */}
        <Button icon={ArrowUp} label="Sort A-Z" onClick={onSortAsc} />
        <Button icon={ArrowDown} label="Sort Z-A" onClick={onSortDesc} />

        <Separator />

        {/* Data Transformations Dropdown */}
        <div ref={transformRef} className="relative shrink-0">
          <button
            onClick={() => setTransformMenuOpen(!transformMenuOpen)}
            className="shrink-0 flex items-center gap-1 px-1.5 py-1 text-xs rounded text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/60 whitespace-nowrap cursor-pointer"
            title="Clean & transform data"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="whitespace-nowrap">Transform</span>
            <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
          </button>
          {transformMenuOpen && (
            <div className="absolute left-0 top-full mt-1 z-50 w-48 bg-white dark:bg-slate-800 rounded shadow-xl border border-slate-200 dark:border-slate-700 py-1">
              <button
                onClick={() => {
                  onTrimWhitespace();
                  setTransformMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Trim Leading &amp; Trailing Spaces
              </button>
              <button
                onClick={() => {
                  onTransformCase('upper');
                  setTransformMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Convert to UPPERCASE
              </button>
              <button
                onClick={() => {
                  onTransformCase('lower');
                  setTransformMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Convert to lowercase
              </button>
              <button
                onClick={() => {
                  onTransformCase('title');
                  setTransformMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Convert to Title Case
              </button>
              <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
              <button
                onClick={() => {
                  onFillDown();
                  setTransformMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Fill Down
              </button>
              <button
                onClick={() => {
                  onDeduplicate();
                  setTransformMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 text-red-600 dark:text-red-400"
              >
                Remove Duplicate Rows
              </button>
            </div>
          )}
        </div>

        {/* First Row is Header Toggle */}
        <button
          onClick={onToggleHasHeader}
          className={`shrink-0 flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors ml-1 whitespace-nowrap cursor-pointer ${
            hasHeader
              ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 font-medium'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent'
          }`}
          title="Toggle whether Row 1 acts as Table Headers"
        >
          <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${hasHeader ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-400'}`}>
            {hasHeader && <Check className="w-2.5 h-2.5" />}
          </div>
          <span className="whitespace-nowrap font-medium">Header Row</span>
        </button>
      </div>

      {/* Right Dialect & Settings Group */}
      <div className="shrink-0 flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700/60">
        {/* Delimiter Selector */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[11px] text-slate-500 whitespace-nowrap">Delim:</span>
          <select
            value={dialect.delimiter}
            onChange={e => onUpdateDialect({ delimiter: e.target.value as DelimiterType })}
            className="h-6 px-1 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:outline-none cursor-pointer shrink-0"
          >
            <option value=",">Comma (,)</option>
            <option value="&#9;">Tab (\t)</option>
            <option value=";">Semicolon (;)</option>
            <option value="|">Pipe (|)</option>
          </select>
        </div>

        {/* Line Endings */}
        <select
          value={dialect.lineEnding}
          onChange={e => onUpdateDialect({ lineEnding: e.target.value as LineEndingType })}
          className="shrink-0 h-6 px-1 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:outline-none cursor-pointer"
          title="Line Endings"
        >
          <option value="&#13;&#10;">CRLF</option>
          <option value="&#10;">LF</option>
        </select>

        {/* Command Palette Button */}
        <button
          onClick={onOpenCommandPalette}
          className="shrink-0 flex items-center gap-1 px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap cursor-pointer"
          title="Command Palette (Ctrl+Shift+P)"
        >
          <Command className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[10px] font-mono opacity-80 whitespace-nowrap">Ctrl+Shift+P</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleDarkMode}
          className="shrink-0 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
          title="Toggle Dark / Light Theme"
        >
          {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" /> : <Moon className="w-3.5 h-3.5 shrink-0" />}
        </button>
      </div>
    </div>
  );
};
