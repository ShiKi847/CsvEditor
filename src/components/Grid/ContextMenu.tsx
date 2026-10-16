import React, { useEffect, useRef } from 'react';
import { 
  Rows, 
  Columns, 
  Trash2, 
  Copy, 
  Scissors, 
  Clipboard, 
  FileCode, 
  Sparkles,
  Maximize2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

export interface ContextMenuPosition {
  x: number;
  y: number;
  targetType: 'cell' | 'rowHeader' | 'colHeader';
  rowIndex: number;
  colIndex: number;
}

interface ContextMenuProps {
  position: ContextMenuPosition | null;
  onClose: () => void;
  onInsertRowAbove: () => void;
  onInsertRowBelow: () => void;
  onDeleteRows: () => void;
  onInsertColLeft: () => void;
  onInsertColRight: () => void;
  onDeleteCols: () => void;
  onAutoFitCol: () => void;
  onSortAsc: () => void;
  onSortDesc: () => void;
  onCut: () => void;
  onCopy: () => void;
  onCopyMarkdown: () => void;
  onCopyJson: () => void;
  onPaste: () => void;
  onClear: () => void;
  onOpenMultiline: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  position,
  onClose,
  onInsertRowAbove,
  onInsertRowBelow,
  onDeleteRows,
  onInsertColLeft,
  onInsertColRight,
  onDeleteCols,
  onAutoFitCol,
  onSortAsc,
  onSortDesc,
  onCut,
  onCopy,
  onCopyMarkdown,
  onCopyJson,
  onPaste,
  onClear,
  onOpenMultiline,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!position) return null;

  // Ensure menu stays within window boundaries
  const menuWidth = 240;
  const menuHeight = 420;
  const x = Math.min(position.x, window.innerWidth - menuWidth - 8);
  const y = Math.min(position.y, window.innerHeight - menuHeight - 8);

  const Item = ({
    icon: Icon,
    label,
    shortcut,
    onClick,
    danger = false,
  }: {
    icon: React.ElementType;
    label: string;
    shortcut?: string;
    onClick: () => void;
    danger?: boolean;
  }) => (
    <button
      onClick={() => {
        onClick();
        onClose();
      }}
      className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors cursor-pointer rounded-sm ${
        danger
          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
          : 'text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/30'
      }`}
    >
      <span className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 opacity-70" />
        <span>{label}</span>
      </span>
      {shortcut && <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{shortcut}</span>}
    </button>
  );

  const Divider = () => <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />;

  return (
    <div
      ref={menuRef}
      style={{ left: `${x}px`, top: `${y}px` }}
      className="fixed z-50 min-w-[240px] bg-white dark:bg-slate-800 rounded-md shadow-xl border border-slate-200 dark:border-slate-700 py-1 select-none animate-in fade-in duration-100"
    >
      <Item icon={Scissors} label="Cut" shortcut="Ctrl+X" onClick={onCut} />
      <Item icon={Copy} label="Copy" shortcut="Ctrl+C" onClick={onCopy} />
      <Item icon={Clipboard} label="Paste" shortcut="Ctrl+V" onClick={onPaste} />
      <Item icon={Trash2} label="Clear Contents" shortcut="Del" onClick={onClear} />

      <Divider />

      {/* Sorting */}
      <Item icon={ArrowUp} label="Sort Ascending (A → Z, 0 → 9)" onClick={onSortAsc} />
      <Item icon={ArrowDown} label="Sort Descending (Z → A, 9 → 0)" onClick={onSortDesc} />

      <Divider />

      <Item icon={ArrowUp} label="Insert Row Above" onClick={onInsertRowAbove} />
      <Item icon={ArrowDown} label="Insert Row Below" onClick={onInsertRowBelow} />
      <Item icon={Rows} label="Delete Selected Row(s)" danger onClick={onDeleteRows} />

      <Divider />

      <Item icon={ArrowLeft} label="Insert Column Left" onClick={onInsertColLeft} />
      <Item icon={ArrowRight} label="Insert Column Right" onClick={onInsertColRight} />
      <Item icon={Columns} label="Delete Selected Column(s)" danger onClick={onDeleteCols} />
      <Item icon={Sparkles} label="Auto-fit Column Width" onClick={onAutoFitCol} />

      <Divider />

      <Item icon={Maximize2} label="Expand in Multiline Editor" shortcut="Alt+Enter" onClick={onOpenMultiline} />
      <Item icon={FileCode} label="Copy as Markdown Table" onClick={onCopyMarkdown} />
      <Item icon={FileCode} label="Copy as JSON" onClick={onCopyJson} />
    </div>
  );
};
