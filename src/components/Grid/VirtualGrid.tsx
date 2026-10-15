import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useVirtualGrid } from '../../hooks/useVirtualGrid';
import { GridHeader } from './GridHeader';
import { GridRowNumbers } from './GridRowNumbers';
import { CellEditor } from './CellEditor';
import { ContextMenu, type ContextMenuPosition } from './ContextMenu';
import { formatDataAsTsv, parseClipboardText } from '../../utils/csv';
import { 
  insertRow, 
  deleteRows, 
  insertColumn, 
  deleteColumns, 
  fillDown 
} from '../../utils/transforms';
import type { 
  SelectionRange, 
  SortState, 
  FindMatch 
} from '../../types';

interface VirtualGridProps {
  data: string[][];
  headers: string[];
  hasHeader: boolean;
  sortState: SortState | null;
  customColWidths: Record<number, number>;
  selection: SelectionRange;
  findMatches?: FindMatch[];
  currentMatchIndex?: number;
  onDataChange: (newData: string[][], description?: string) => void;
  onSelectionChange: (newSelection: SelectionRange) => void;
  onColumnWidthsChange: (newWidths: Record<number, number>) => void;
  onSortColumn: (colIndex: number) => void;
  onOpenMultilineModal: (row: number, col: number) => void;
  onUndo: () => void;
  onRedo: () => void;
}

export const VirtualGrid: React.FC<VirtualGridProps> = ({
  data,
  headers,
  hasHeader,
  sortState,
  customColWidths,
  selection,
  findMatches = [],
  currentMatchIndex = -1,
  onDataChange,
  onSelectionChange,
  onColumnWidthsChange,
  onSortColumn,
  onOpenMultilineModal,
  onUndo,
  onRedo,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rowHeight = 26;
  const headerHeight = 26;
  const rowNumberWidth = 48;

  // We display rows from 0 to data.length - 1 (or excluding row 0 if hasHeader is displayed in header)
  const displayRows = hasHeader ? Math.max(0, data.length - 1) : data.length;
  const displayCols = data[0]?.length || 5;

  const dataRowOffset = hasHeader ? 1 : 0;

  // Get virtual range
  const {
    startRow,
    endRow,
    startCol,
    endCol,
    totalWidth,
    totalHeight,
    colOffsets,
    getColWidth,
  } = useVirtualGrid(containerRef, {
    totalRows: displayRows,
    totalCols: displayCols,
    rowHeight,
    defaultColWidth: 110,
    customColWidths,
  });

  // Cell editing state
  const [editingCell, setEditingCell] = useState<{
    row: number; // in display space
    col: number;
    initialValue: string;
  } | null>(null);

  // Mouse drag selection state
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingFillHandle, setIsDraggingFillHandle] = useState(false);
  const dragStartRef = useRef<{ row: number; col: number } | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null);

  // Bounds for selection
  const minRow = Math.min(selection.startRow, selection.endRow);
  const maxRow = Math.max(selection.startRow, selection.endRow);
  const minCol = Math.min(selection.startCol, selection.endCol);
  const maxCol = Math.max(selection.startCol, selection.endCol);

  // Helper to get real data index from display index
  const toDataRow = useCallback((r: number) => r + dataRowOffset, [dataRowOffset]);
  const toDisplayRow = useCallback((r: number) => r - dataRowOffset, [dataRowOffset]);

  // Set of selected rows & cols for header highlight
  const selectedRows = useMemo(() => {
    const set = new Set<number>();
    for (let r = minRow; r <= maxRow; r++) set.add(r);
    return set;
  }, [minRow, maxRow]);

  const selectedCols = useMemo(() => {
    const set = new Set<number>();
    for (let c = minCol; c <= maxCol; c++) set.add(c);
    return set;
  }, [minCol, maxCol]);

  // Map of find matches for quick lookup
  const matchMap = useMemo(() => {
    const map = new Map<string, boolean>();
    findMatches.forEach(m => {
      const displayR = toDisplayRow(m.row);
      if (displayR >= 0) {
        map.set(`${displayR},${m.col}`, true);
      }
    });
    return map;
  }, [findMatches, toDisplayRow]);

  const currentMatchKey = useMemo(() => {
    if (currentMatchIndex >= 0 && findMatches[currentMatchIndex]) {
      const m = findMatches[currentMatchIndex];
      return `${toDisplayRow(m.row)},${m.col}`;
    }
    return '';
  }, [currentMatchIndex, findMatches, toDisplayRow]);

  // Auto-scroll into view when selection changes via keyboard
  const scrollToCell = useCallback((displayRow: number, col: number) => {
    const container = containerRef.current;
    if (!container) return;

    const cellTop = displayRow * rowHeight;
    const cellBottom = cellTop + rowHeight;
    const cellLeft = colOffsets[col];
    const cellRight = cellLeft + getColWidth(col);

    const scrollTop = container.scrollTop;
    const scrollBottom = scrollTop + container.clientHeight - headerHeight;
    const scrollLeft = container.scrollLeft;
    const scrollRight = scrollLeft + container.clientWidth - rowNumberWidth;

    if (cellTop < scrollTop) {
      container.scrollTop = cellTop;
    } else if (cellBottom > scrollBottom) {
      container.scrollTop = cellBottom - (container.clientHeight - headerHeight);
    }

    if (cellLeft < scrollLeft) {
      container.scrollLeft = cellLeft;
    } else if (cellRight > scrollRight) {
      container.scrollLeft = cellRight - (container.clientWidth - rowNumberWidth);
    }
  }, [colOffsets, getColWidth, headerHeight, rowHeight]);

  // Start editing active cell
  const startEditing = useCallback((initialChar?: string) => {
    const dRow = toDataRow(selection.activeRow);
    const currentVal = data[dRow]?.[selection.activeCol] || '';
    setEditingCell({
      row: selection.activeRow,
      col: selection.activeCol,
      initialValue: initialChar !== undefined ? initialChar : currentVal,
    });
  }, [data, selection.activeRow, selection.activeCol, toDataRow]);

  // Commit editing
  const commitEditing = useCallback((newValue: string, direction: 'down' | 'right' | 'up' | 'left' | 'stay' = 'down') => {
    if (!editingCell) return;
    const { row: dRow, col } = editingCell;
    const realRow = toDataRow(dRow);

    const oldVal = data[realRow]?.[col] || '';
    if (oldVal !== newValue) {
      const newData = data.map(r => [...r]);
      if (!newData[realRow]) newData[realRow] = new Array(displayCols).fill('');
      newData[realRow][col] = newValue;
      onDataChange(newData, `Edit cell (${realRow}, ${col})`);
    }

    setEditingCell(null);

    // Move selection based on direction
    if (direction !== 'stay') {
      let nextRow = dRow;
      let nextCol = col;
      if (direction === 'down') nextRow = Math.min(displayRows - 1, dRow + 1);
      if (direction === 'up') nextRow = Math.max(0, dRow - 1);
      if (direction === 'right') nextCol = Math.min(displayCols - 1, col + 1);
      if (direction === 'left') nextCol = Math.max(0, col - 1);

      const newSel: SelectionRange = {
        startRow: nextRow,
        startCol: nextCol,
        endRow: nextRow,
        endCol: nextCol,
        activeRow: nextRow,
        activeCol: nextCol,
      };
      onSelectionChange(newSel);
      scrollToCell(nextRow, nextCol);
    }
  }, [editingCell, toDataRow, data, displayCols, onDataChange, displayRows, onSelectionChange, scrollToCell]);

  // Clipboard operations
  const copySelection = useCallback(async () => {
    const rowsToCopy: string[][] = [];
    for (let r = minRow; r <= maxRow; r++) {
      const realR = toDataRow(r);
      const rowSlice: string[] = [];
      for (let c = minCol; c <= maxCol; c++) {
        rowSlice.push(data[realR]?.[c] || '');
      }
      rowsToCopy.push(rowSlice);
    }
    const tsvText = formatDataAsTsv(rowsToCopy);
    try {
      await navigator.clipboard.writeText(tsvText);
    } catch {
      // Fallback
    }
  }, [minRow, maxRow, minCol, maxCol, toDataRow, data]);

  const cutSelection = useCallback(async () => {
    await copySelection();
    const newData = data.map(r => [...r]);
    for (let r = minRow; r <= maxRow; r++) {
      const realR = toDataRow(r);
      for (let c = minCol; c <= maxCol; c++) {
        if (newData[realR]) newData[realR][c] = '';
      }
    }
    onDataChange(newData, 'Cut cells');
  }, [copySelection, data, minRow, maxRow, minCol, maxCol, toDataRow, onDataChange]);

  const pasteClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const parsedRows = parseClipboardText(text);
      if (parsedRows.length === 0) return;

      const pasteStartRow = toDataRow(selection.activeRow);
      const pasteStartCol = selection.activeCol;

      const neededRows = pasteStartRow + parsedRows.length;
      const neededCols = Math.max(
        displayCols,
        pasteStartCol + Math.max(...parsedRows.map(r => r.length))
      );

      const newData = data.map(row => {
        if (row.length < neededCols) {
          return [...row, ...new Array(neededCols - row.length).fill('')];
        }
        return [...row];
      });

      while (newData.length < neededRows) {
        newData.push(new Array(neededCols).fill(''));
      }

      for (let r = 0; r < parsedRows.length; r++) {
        for (let c = 0; c < parsedRows[r].length; c++) {
          newData[pasteStartRow + r][pasteStartCol + c] = parsedRows[r][c];
        }
      }

      onDataChange(newData, 'Paste');

      // Update selection to cover pasted range
      const endD = selection.activeRow + parsedRows.length - 1;
      const endC = selection.activeCol + (parsedRows[0]?.length || 1) - 1;
      onSelectionChange({
        startRow: selection.activeRow,
        startCol: selection.activeCol,
        endRow: endD,
        endCol: endC,
        activeRow: selection.activeRow,
        activeCol: selection.activeCol,
      });
    } catch (err) {
      console.warn('Failed to paste from clipboard', err);
    }
  }, [data, displayCols, onDataChange, onSelectionChange, selection.activeCol, selection.activeRow, toDataRow]);

  const clearSelection = useCallback(() => {
    const newData = data.map(r => [...r]);
    for (let r = minRow; r <= maxRow; r++) {
      const realR = toDataRow(r);
      for (let c = minCol; c <= maxCol; c++) {
        if (newData[realR]) newData[realR][c] = '';
      }
    }
    onDataChange(newData, 'Clear cell contents');
  }, [data, minRow, maxRow, minCol, maxCol, toDataRow, onDataChange]);

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If currently editing inline, let CellEditor handle keys
      if (editingCell) return;

      // Ignore if focus is in another input/modal
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA' ||
          (document.activeElement as HTMLElement).isContentEditable)
      ) {
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) onRedo();
        else onUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        onRedo();
        return;
      }

      // Copy / Cut / Paste
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        copySelection();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        cutSelection();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        pasteClipboard();
        return;
      }

      // Select All
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        onSelectionChange({
          startRow: 0,
          startCol: 0,
          endRow: Math.max(0, displayRows - 1),
          endCol: Math.max(0, displayCols - 1),
          activeRow: 0,
          activeCol: 0,
        });
        return;
      }

      // F2 to start editing
      if (e.key === 'F2') {
        e.preventDefault();
        startEditing();
        return;
      }

      // Enter to start editing or move
      if (e.key === 'Enter') {
        e.preventDefault();
        startEditing();
        return;
      }

      // Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        clearSelection();
        return;
      }

      // Arrow navigation
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
        e.preventDefault();

        let targetRow = selection.activeRow;
        let targetCol = selection.activeCol;

        if (e.key === 'ArrowUp') targetRow = Math.max(0, targetRow - 1);
        if (e.key === 'ArrowDown') targetRow = Math.min(displayRows - 1, targetRow + 1);
        if (e.key === 'ArrowLeft') targetCol = Math.max(0, targetCol - 1);
        if (e.key === 'ArrowRight') targetCol = Math.min(displayCols - 1, targetCol + 1);
        if (e.key === 'Home') targetCol = 0;
        if (e.key === 'End') targetCol = displayCols - 1;
        if (e.key === 'PageUp') targetRow = Math.max(0, targetRow - 15);
        if (e.key === 'PageDown') targetRow = Math.min(displayRows - 1, targetRow + 15);

        if (e.shiftKey) {
          // Extend range
          onSelectionChange({
            startRow: selection.startRow,
            startCol: selection.startCol,
            endRow: targetRow,
            endCol: targetCol,
            activeRow: targetRow,
            activeCol: targetCol,
          });
        } else {
          // Single cell selection
          onSelectionChange({
            startRow: targetRow,
            startCol: targetCol,
            endRow: targetRow,
            endCol: targetCol,
            activeRow: targetRow,
            activeCol: targetCol,
          });
        }

        scrollToCell(targetRow, targetCol);
        return;
      }

      // Tab navigation
      if (e.key === 'Tab') {
        e.preventDefault();
        const nextCol = e.shiftKey
          ? Math.max(0, selection.activeCol - 1)
          : Math.min(displayCols - 1, selection.activeCol + 1);
        onSelectionChange({
          startRow: selection.activeRow,
          startCol: nextCol,
          endRow: selection.activeRow,
          endCol: nextCol,
          activeRow: selection.activeRow,
          activeCol: nextCol,
        });
        scrollToCell(selection.activeRow, nextCol);
        return;
      }

      // Directly typing letters/numbers enters edit mode immediately
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        startEditing(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    editingCell,
    selection,
    displayRows,
    displayCols,
    onUndo,
    onRedo,
    copySelection,
    cutSelection,
    pasteClipboard,
    clearSelection,
    startEditing,
    onSelectionChange,
    scrollToCell,
  ]);

  // Mouse handlers for cell selection
  const handleCellMouseDown = (e: React.MouseEvent, row: number, col: number) => {
    if (e.button !== 0) return; // Only primary mouse button

    if (e.shiftKey) {
      // Extend selection
      onSelectionChange({
        ...selection,
        endRow: row,
        endCol: col,
        activeRow: row,
        activeCol: col,
      });
    } else {
      // New selection
      setIsDragging(true);
      dragStartRef.current = { row, col };
      onSelectionChange({
        startRow: row,
        startCol: col,
        endRow: row,
        endCol: col,
        activeRow: row,
        activeCol: col,
      });
    }
  };

  const handleCellMouseEnter = (row: number, col: number) => {
    if (isDragging && dragStartRef.current) {
      onSelectionChange({
        startRow: dragStartRef.current.row,
        startCol: dragStartRef.current.col,
        endRow: row,
        endCol: col,
        activeRow: row,
        activeCol: col,
      });
    } else if (isDraggingFillHandle) {
      onSelectionChange({
        startRow: minRow,
        startCol: minCol,
        endRow: Math.max(maxRow, row),
        endCol: maxCol,
        activeRow: selection.activeRow,
        activeCol: selection.activeCol,
      });
    }
  };

  const handleCellDoubleClick = (row: number, col: number) => {
    onSelectionChange({
      startRow: row,
      startCol: col,
      endRow: row,
      endCol: col,
      activeRow: row,
      activeCol: col,
    });
    startEditing();
  };

  const handleCellContextMenu = (e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault();
    if (row < minRow || row > maxRow || col < minCol || col > maxCol) {
      onSelectionChange({
        startRow: row,
        startCol: col,
        endRow: row,
        endCol: col,
        activeRow: row,
        activeCol: col,
      });
    }
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      targetType: 'cell',
      rowIndex: row,
      colIndex: col,
    });
  };

  // Header handlers
  const handleSelectColumn = (colIndex: number, isMulti: boolean) => {
    if (isMulti) {
      onSelectionChange({
        startRow: 0,
        startCol: minCol,
        endRow: displayRows - 1,
        endCol: colIndex,
        activeRow: 0,
        activeCol: colIndex,
      });
    } else {
      onSelectionChange({
        startRow: 0,
        startCol: colIndex,
        endRow: displayRows - 1,
        endCol: colIndex,
        activeRow: 0,
        activeCol: colIndex,
      });
    }
  };

  const handleSelectRow = (rowIndex: number, isMulti: boolean) => {
    if (isMulti) {
      onSelectionChange({
        startRow: minRow,
        startCol: 0,
        endRow: rowIndex,
        endCol: displayCols - 1,
        activeRow: rowIndex,
        activeCol: 0,
      });
    } else {
      onSelectionChange({
        startRow: rowIndex,
        startCol: 0,
        endRow: rowIndex,
        endCol: displayCols - 1,
        activeRow: rowIndex,
        activeCol: 0,
      });
    }
  };

  const handleResizeColumn = (colIndex: number, newWidth: number) => {
    onColumnWidthsChange({
      ...customColWidths,
      [colIndex]: newWidth,
    });
  };

  const handleAutoFitColumn = (colIndex: number) => {
    // Measure content width by finding maximum string length in column
    let maxLen = 4;
    for (let r = 0; r < data.length; r++) {
      const cell = data[r]?.[colIndex] || '';
      if (cell.length > maxLen) maxLen = Math.min(60, cell.length);
    }
    const computedWidth = Math.max(60, Math.min(450, maxLen * 8.5 + 24));
    handleResizeColumn(colIndex, computedWidth);
  };

  // Stop dragging on window mouseup
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging) setIsDragging(false);
      if (isDraggingFillHandle) {
        setIsDraggingFillHandle(false);
        // Apply fill down transform!
        const filled = fillDown(data, {
          startRow: toDataRow(minRow),
          startCol: minCol,
          endRow: toDataRow(maxRow),
          endCol: maxCol,
          activeRow: toDataRow(selection.activeRow),
          activeCol: selection.activeCol,
        });
        onDataChange(filled, 'Fill Down');
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [isDragging, isDraggingFillHandle, data, minRow, minCol, maxRow, maxCol, toDataRow, selection.activeRow, selection.activeCol, onDataChange]);

  // Active cell and selection geometry
  const activeLeft = colOffsets[selection.activeCol] || 0;
  const activeTop = selection.activeRow * rowHeight;
  const activeWidth = getColWidth(selection.activeCol);

  const selLeft = colOffsets[minCol] || 0;
  const selTop = minRow * rowHeight;
  const selWidth = (colOffsets[maxCol + 1] || totalWidth) - selLeft;
  const selHeight = (maxRow - minRow + 1) * rowHeight;

  // Render visible rows and cells
  const visibleRowIndices: number[] = [];
  for (let r = startRow; r <= endRow; r++) visibleRowIndices.push(r);

  const visibleColIndices: number[] = [];
  for (let c = startCol; c <= endCol; c++) visibleColIndices.push(c);

  return (
    <div className="relative flex-1 w-full h-full overflow-hidden bg-white dark:bg-slate-900 select-none">
      {/* Pinned Top-Left Corner Button */}
      <div
        onClick={() => {
          onSelectionChange({
            startRow: 0,
            startCol: 0,
            endRow: Math.max(0, displayRows - 1),
            endCol: Math.max(0, displayCols - 1),
            activeRow: 0,
            activeCol: 0,
          });
        }}
        style={{ width: `${rowNumberWidth}px`, height: `${headerHeight}px` }}
        className="absolute top-0 left-0 z-30 flex items-center justify-center bg-slate-200 dark:bg-slate-800 border-r border-b border-slate-300 dark:border-slate-700 cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
        title="Select All (Ctrl+A)"
      >
        <div className="w-2.5 h-2.5 border-t-2 border-l-2 border-slate-400 dark:border-slate-500" />
      </div>

      {/* Main Scrollable Viewport */}
      <div
        ref={containerRef}
        className="table-viewport w-full h-full overflow-auto"
        style={{
          paddingTop: `${headerHeight}px`,
          paddingLeft: `${rowNumberWidth}px`,
        }}
      >
        {/* Pinned Column Headers (Horizontally scrolled with viewport) */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            left: 0,
            width: `${totalWidth}px`,
            height: `${headerHeight}px`,
            zIndex: 20,
          }}
        >
          <GridHeader
            startCol={startCol}
            endCol={endCol}
            colOffsets={colOffsets}
            getColWidth={getColWidth}
            columnHeaders={headers}
            sortState={sortState}
            selectedCols={selectedCols}
            onSelectColumn={handleSelectColumn}
            onResizeColumn={handleResizeColumn}
            onAutoFitColumn={handleAutoFitColumn}
            onSortColumn={onSortColumn}
            onContextMenu={(e, c) => {
              setContextMenu({
                x: e.clientX,
                y: e.clientY,
                targetType: 'colHeader',
                rowIndex: 0,
                colIndex: c,
              });
            }}
          />
        </div>

        {/* Pinned Row Numbers (Vertically scrolled with viewport) */}
        <div
          style={{
            position: 'sticky',
            left: 0,
            top: `${headerHeight}px`,
            width: `${rowNumberWidth}px`,
            height: `${totalHeight}px`,
            zIndex: 10,
          }}
        >
          <GridRowNumbers
            startRow={startRow}
            endRow={endRow}
            rowHeight={rowHeight}
            selectedRows={selectedRows}
            rowOffset={hasHeader ? 2 : 1}
            onSelectRow={handleSelectRow}
            onContextMenu={(e, r) => {
              setContextMenu({
                x: e.clientX,
                y: e.clientY,
                targetType: 'rowHeader',
                rowIndex: r,
                colIndex: 0,
              });
            }}
          />
        </div>

        {/* Grid Canvas / Virtualized Cell Container */}
        <div
          style={{
            position: 'relative',
            width: `${totalWidth}px`,
            height: `${totalHeight}px`,
            marginTop: `-${totalHeight}px`,
          }}
        >
          {/* Selected Range Highlight Overlay */}
          {(minRow !== maxRow || minCol !== maxCol) && (
            <div
              style={{
                position: 'absolute',
                top: `${selTop}px`,
                left: `${selLeft}px`,
                width: `${selWidth}px`,
                height: `${selHeight}px`,
                pointerEvents: 'none',
                zIndex: 5,
              }}
              className="bg-blue-500/15 border border-blue-500 dark:bg-blue-400/20 dark:border-blue-400"
            />
          )}

          {/* Active Cell Focus Border & Fill Handle */}
          <div
            style={{
              position: 'absolute',
              top: `${activeTop}px`,
              left: `${activeLeft}px`,
              width: `${activeWidth}px`,
              height: `${rowHeight}px`,
              pointerEvents: 'none',
              zIndex: 15,
            }}
            className="border-2 border-blue-600 dark:border-blue-400"
          >
            {/* Auto-fill handle */}
            <div
              onMouseDown={e => {
                e.stopPropagation();
                e.preventDefault();
                setIsDraggingFillHandle(true);
              }}
              className="absolute -right-1.5 -bottom-1.5 w-2.5 h-2.5 bg-blue-600 dark:bg-blue-400 border border-white cursor-crosshair pointer-events-auto"
              title="Drag down to fill series"
            />
          </div>

          {/* Inline Cell Editor Overlay */}
          {editingCell && (
            <CellEditor
              initialValue={editingCell.initialValue}
              position={{
                top: editingCell.row * rowHeight,
                left: colOffsets[editingCell.col],
                width: getColWidth(editingCell.col),
                height: rowHeight,
              }}
              onCommit={commitEditing}
              onCancel={() => setEditingCell(null)}
            />
          )}

          {/* Visible Grid Cells */}
          {visibleRowIndices.map(r => {
            const top = r * rowHeight;
            const realR = toDataRow(r);
            const rowData = data[realR] || [];

            return visibleColIndices.map(c => {
              const left = colOffsets[c];
              const width = getColWidth(c);
              const cellValue = rowData[c] ?? '';
              const isMatch = matchMap.has(`${r},${c}`);
              const isCurrentMatch = currentMatchKey === `${r},${c}`;
              const hasNewline = cellValue.includes('\n');

              return (
                <div
                  key={`${r}-${c}`}
                  style={{
                    position: 'absolute',
                    top: `${top}px`,
                    left: `${left}px`,
                    width: `${width}px`,
                    height: `${rowHeight}px`,
                  }}
                  onMouseDown={e => handleCellMouseDown(e, r, c)}
                  onMouseEnter={() => handleCellMouseEnter(r, c)}
                  onDoubleClick={() => handleCellDoubleClick(r, c)}
                  onContextMenu={e => handleCellContextMenu(e, r, c)}
                  className={`flex items-center px-1.5 text-xs font-mono border-r border-b border-slate-200 dark:border-slate-800 transition-colors truncate overflow-hidden ${
                    isCurrentMatch
                      ? 'bg-amber-300 dark:bg-amber-600 text-slate-900 font-semibold ring-2 ring-amber-500 z-10'
                      : isMatch
                      ? 'bg-amber-100 dark:bg-amber-900/60 text-slate-900 dark:text-amber-100'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span className="truncate w-full text-slate-800 dark:text-slate-200">
                    {hasNewline ? cellValue.replace(/\n/g, ' ↵ ') : cellValue}
                  </span>
                </div>
              );
            });
          })}
        </div>
      </div>

      {/* Context Menu */}
      <ContextMenu
        position={contextMenu}
        onClose={() => setContextMenu(null)}
        onInsertRowAbove={() => {
          if (!contextMenu) return;
          const targetIndex = toDataRow(contextMenu.rowIndex);
          const updated = insertRow(data, targetIndex);
          onDataChange(updated, 'Insert Row Above');
        }}
        onInsertRowBelow={() => {
          if (!contextMenu) return;
          const targetIndex = toDataRow(contextMenu.rowIndex) + 1;
          const updated = insertRow(data, targetIndex);
          onDataChange(updated, 'Insert Row Below');
        }}
        onDeleteRows={() => {
          const rowSet = new Set<number>();
          for (let r = minRow; r <= maxRow; r++) rowSet.add(toDataRow(r));
          const updated = deleteRows(data, Array.from(rowSet));
          onDataChange(updated, 'Delete Row(s)');
        }}
        onInsertColLeft={() => {
          if (!contextMenu) return;
          const updated = insertColumn(data, contextMenu.colIndex);
          onDataChange(updated, 'Insert Column Left');
        }}
        onInsertColRight={() => {
          if (!contextMenu) return;
          const updated = insertColumn(data, contextMenu.colIndex + 1);
          onDataChange(updated, 'Insert Column Right');
        }}
        onDeleteCols={() => {
          const colSet = new Set<number>();
          for (let c = minCol; c <= maxCol; c++) colSet.add(c);
          const updated = deleteColumns(data, Array.from(colSet));
          onDataChange(updated, 'Delete Column(s)');
        }}
        onAutoFitCol={() => {
          if (contextMenu) handleAutoFitColumn(contextMenu.colIndex);
        }}
        onCut={cutSelection}
        onCopy={copySelection}
        onCopyMarkdown={async () => {
          // Format as Markdown table
          const rows: string[][] = [];
          for (let r = minRow; r <= maxRow; r++) {
            const realR = toDataRow(r);
            rows.push(data[realR]?.slice(minCol, maxCol + 1) || []);
          }
          if (rows.length === 0) return;
          const headerLine = `| ${rows[0].join(' | ')} |`;
          const separatorLine = `| ${rows[0].map(() => '---').join(' | ')} |`;
          const bodyLines = rows.slice(1).map(r => `| ${r.join(' | ')} |`);
          const md = [headerLine, separatorLine, ...bodyLines].join('\n');
          await navigator.clipboard.writeText(md);
        }}
        onCopyJson={async () => {
          const rows: string[][] = [];
          for (let r = minRow; r <= maxRow; r++) {
            const realR = toDataRow(r);
            rows.push(data[realR]?.slice(minCol, maxCol + 1) || []);
          }
          await navigator.clipboard.writeText(JSON.stringify(rows, null, 2));
        }}
        onPaste={pasteClipboard}
        onClear={clearSelection}
        onOpenMultiline={() => {
          if (contextMenu) {
            onOpenMultilineModal(toDataRow(contextMenu.rowIndex), contextMenu.colIndex);
          }
        }}
      />
    </div>
  );
};
