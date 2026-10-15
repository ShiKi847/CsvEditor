import React, { useState, useEffect, useRef } from 'react';

interface CellEditorProps {
  initialValue: string;
  position: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  onCommit: (newValue: string, direction?: 'down' | 'right' | 'up' | 'left' | 'stay') => void;
  onCancel: () => void;
}

export const CellEditor: React.FC<CellEditorProps> = ({
  initialValue,
  position,
  onCommit,
  onCancel,
}) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isComposingRef = useRef(false);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      // Position cursor at end
      inputRef.current.setSelectionRange(initialValue.length, initialValue.length);
    }
  }, [initialValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If user is currently composing with IME (Chinese/Japanese), do not handle Enter
    if (e.nativeEvent.isComposing || isComposingRef.current) {
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
      return;
    }

    if (e.key === 'Enter') {
      if (e.altKey || e.ctrlKey) {
        // Insert newline inside cell!
        e.preventDefault();
        const textarea = inputRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newVal = value.substring(0, start) + '\n' + value.substring(end);
        setValue(newVal);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1;
        }, 0);
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      onCommit(value, e.shiftKey ? 'up' : 'down');
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      onCommit(value, e.shiftKey ? 'left' : 'right');
      return;
    }
  };

  const handleBlur = () => {
    // Check if blur was triggered by clicking outside
    onCommit(value, 'stay');
  };

  // Dynamically expand height if text contains newlines
  const lineCount = (value.match(/\n/g) || []).length + 1;
  const dynamicHeight = Math.max(position.height, Math.min(200, lineCount * 22 + 8));

  return (
    <div
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
        minHeight: `${dynamicHeight}px`,
        zIndex: 40,
      }}
      className="shadow-lg rounded-none"
    >
      <textarea
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onCompositionStart={() => {
          isComposingRef.current = true;
        }}
        onCompositionEnd={() => {
          isComposingRef.current = false;
        }}
        className="w-full h-full min-h-[26px] p-1 text-[13px] font-mono leading-tight bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-2 border-blue-600 outline-none resize-none overflow-hidden"
        style={{
          boxSizing: 'border-box',
          minWidth: '100%',
        }}
        rows={lineCount}
      />
    </div>
  );
};
