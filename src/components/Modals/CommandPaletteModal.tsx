import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

export interface CommandItem {
  id: string;
  category: string;
  title: string;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  commands: CommandItem[];
  onClose: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  commands,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      if (!dialog.open) {
        setQuery('');
        setSelectedIndex(0);
        dialog.showModal();
      }
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isOpen]);

  const filtered = commands.filter(cmd => {
    const text = `${cmd.category} ${cmd.title}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="p-0 rounded-lg shadow-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 max-w-xl w-[90vw] flex flex-col overflow-hidden outline-none"
    >
      {/* Search Input */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          autoFocus
          placeholder="Type a command or search actions..."
          className="w-full bg-transparent text-xs font-mono outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
        />
        <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
          ESC
        </span>
      </div>

      {/* Commands List */}
      <div className="max-h-72 overflow-y-auto p-1 text-xs">
        {filtered.length > 0 ? (
          filtered.map((cmd, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={cmd.id}
                onClick={() => {
                  cmd.action();
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${
                      isSelected
                        ? 'bg-blue-700 text-blue-100'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {cmd.category}
                  </span>
                  <span className="truncate">{cmd.title}</span>
                </div>

                {cmd.shortcut && (
                  <span
                    className={`text-[10px] font-mono ${
                      isSelected ? 'text-blue-100' : 'text-slate-400'
                    }`}
                  >
                    {cmd.shortcut}
                  </span>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-4 text-center text-slate-400 text-xs">No matching commands found</div>
        )}
      </div>
    </dialog>
  );
};
