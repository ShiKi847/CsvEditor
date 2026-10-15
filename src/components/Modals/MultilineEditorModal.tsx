import React, { useState, useEffect, useRef } from 'react';
import { X, Check, FileText } from 'lucide-react';
import { formatCellAddress } from '../../utils/column';

interface MultilineEditorModalProps {
  isOpen: boolean;
  row: number;
  col: number;
  initialValue: string;
  onSave: (newValue: string) => void;
  onClose: () => void;
}

export const MultilineEditorModal: React.FC<MultilineEditorModalProps> = ({
  isOpen,
  row,
  col,
  initialValue,
  onSave,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isOpen]);

  const handleSave = () => {
    onSave(value);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  if (!isOpen) return null;

  const charCount = value.length;
  const lineCount = (value.match(/\n/g) || []).length + 1;
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="p-0 rounded-lg shadow-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 max-w-2xl w-[80vw] flex flex-col overflow-hidden outline-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-sm">
            Multiline Cell Editor &mdash; {formatCellAddress(row, col)}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Textarea Body */}
      <div className="p-4 flex flex-col gap-2">
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={12}
          autoFocus
          placeholder="Enter multiline text..."
          className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded focus:border-blue-500 focus:outline-none resize-y leading-relaxed"
        />

        {/* Stats */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>
            {lineCount} lines &bull; {wordCount} words &bull; {charCount} chars
          </span>
          <span className="text-[10px]">Tip: Press Ctrl+Enter to save</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-medium shadow-sm transition-colors cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Apply Changes</span>
        </button>
      </div>
    </dialog>
  );
};
