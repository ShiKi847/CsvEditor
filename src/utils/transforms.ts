import type { SelectionRange } from '../types';

/**
 * Natural sort comparator that properly orders numbers, dates, and strings
 */
export function naturalSortCompare(a: string, b: string, direction: 'asc' | 'desc'): number {
  const mult = direction === 'asc' ? 1 : -1;
  const numA = Number(a);
  const numB = Number(b);

  if (!isNaN(numA) && !isNaN(numB) && a.trim() !== '' && b.trim() !== '') {
    return (numA - numB) * mult;
  }

  // Try date parse
  const dateA = Date.parse(a);
  const dateB = Date.parse(b);
  if (!isNaN(dateA) && !isNaN(dateB) && a.length > 5 && b.length > 5) {
    return (dateA - dateB) * mult;
  }

  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }) * mult;
}

/**
 * Sort table rows by column index, optionally keeping header row in place
 */
export function sortDataByColumn(
  data: string[][],
  colIndex: number,
  direction: 'asc' | 'desc',
  hasHeader: boolean
): string[][] {
  if (data.length <= 1) return data;

  const header = hasHeader ? data[0] : null;
  const body = hasHeader ? data.slice(1) : [...data];

  body.sort((rowA, rowB) => {
    const valA = rowA[colIndex] ?? '';
    const valB = rowB[colIndex] ?? '';
    return naturalSortCompare(valA, valB, direction);
  });

  return header ? [header, ...body] : body;
}

/**
 * Remove duplicate rows from dataset, optionally preserving header
 */
export function removeDuplicateRows(data: string[][], hasHeader: boolean): string[][] {
  if (data.length <= 1) return data;

  const header = hasHeader ? data[0] : null;
  const body = hasHeader ? data.slice(1) : [...data];

  const seen = new Set<string>();
  const uniqueBody: string[][] = [];

  for (const row of body) {
    const key = JSON.stringify(row);
    if (!seen.has(key)) {
      seen.add(key);
      uniqueBody.push(row);
    }
  }

  return header ? [header, ...uniqueBody] : uniqueBody;
}

/**
 * Trim whitespace on selected cells or entire table
 */
export function trimWhitespace(
  data: string[][],
  selection?: SelectionRange
): string[][] {
  const newData = data.map(row => [...row]);
  const minRow = selection ? Math.min(selection.startRow, selection.endRow) : 0;
  const maxRow = selection ? Math.max(selection.startRow, selection.endRow) : data.length - 1;
  const minCol = selection ? Math.min(selection.startCol, selection.endCol) : 0;
  const maxCol = selection ? Math.max(selection.startCol, selection.endCol) : (data[0]?.length ?? 1) - 1;

  for (let r = minRow; r <= maxRow; r++) {
    if (!newData[r]) continue;
    for (let c = minCol; c <= maxCol; c++) {
      if (newData[r][c]) {
        newData[r][c] = newData[r][c].trim();
      }
    }
  }

  return newData;
}

/**
 * Transform text casing (uppercase, lowercase, titlecase) for selection
 */
export function transformCase(
  data: string[][],
  mode: 'upper' | 'lower' | 'title',
  selection: SelectionRange
): string[][] {
  const newData = data.map(row => [...row]);
  const minRow = Math.min(selection.startRow, selection.endRow);
  const maxRow = Math.max(selection.startRow, selection.endRow);
  const minCol = Math.min(selection.startCol, selection.endCol);
  const maxCol = Math.max(selection.startCol, selection.endCol);

  for (let r = minRow; r <= maxRow; r++) {
    if (!newData[r]) continue;
    for (let c = minCol; c <= maxCol; c++) {
      const val = newData[r][c];
      if (val) {
        if (mode === 'upper') {
          newData[r][c] = val.toUpperCase();
        } else if (mode === 'lower') {
          newData[r][c] = val.toLowerCase();
        } else if (mode === 'title') {
          newData[r][c] = val.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
        }
      }
    }
  }

  return newData;
}

/**
 * Fill down: copy top row of selection downwards
 */
export function fillDown(data: string[][], selection: SelectionRange): string[][] {
  const newData = data.map(row => [...row]);
  const minRow = Math.min(selection.startRow, selection.endRow);
  const maxRow = Math.max(selection.startRow, selection.endRow);
  const minCol = Math.min(selection.startCol, selection.endCol);
  const maxCol = Math.max(selection.startCol, selection.endCol);

  if (minRow === maxRow) return data;

  for (let r = minRow + 1; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      newData[r][c] = newData[minRow][c];
    }
  }

  return newData;
}

/**
 * Fill blank cells with the previous non-blank cell in each column
 */
export function fillEmptyFromAbove(data: string[][], selection?: SelectionRange): string[][] {
  const newData = data.map(row => [...row]);
  const minRow = selection ? Math.min(selection.startRow, selection.endRow) : 0;
  const maxRow = selection ? Math.max(selection.startRow, selection.endRow) : data.length - 1;
  const minCol = selection ? Math.min(selection.startCol, selection.endCol) : 0;
  const maxCol = selection ? Math.max(selection.startCol, selection.endCol) : (data[0]?.length ?? 1) - 1;

  for (let c = minCol; c <= maxCol; c++) {
    let lastNonEmpty = '';
    for (let r = minRow; r <= maxRow; r++) {
      if (newData[r] && newData[r][c] !== undefined) {
        if (newData[r][c].trim() !== '') {
          lastNonEmpty = newData[r][c];
        } else if (lastNonEmpty !== '') {
          newData[r][c] = lastNonEmpty;
        }
      }
    }
  }

  return newData;
}

/**
 * Insert new row at index
 */
export function insertRow(data: string[][], atIndex: number): string[][] {
  const colCount = data[0]?.length || 5;
  const newRow = new Array(colCount).fill('');
  const newData = [...data];
  newData.splice(atIndex, 0, newRow);
  return newData;
}

/**
 * Delete row at index
 */
export function deleteRows(data: string[][], rowIndices: number[]): string[][] {
  if (data.length <= 1) return data;
  const toDelete = new Set(rowIndices);
  const newData = data.filter((_, idx) => !toDelete.has(idx));
  return newData.length > 0 ? newData : [new Array(data[0]?.length || 5).fill('')];
}

/**
 * Insert new column at index
 */
export function insertColumn(data: string[][], atIndex: number): string[][] {
  return data.map(row => {
    const newRow = [...row];
    newRow.splice(atIndex, 0, '');
    return newRow;
  });
}

/**
 * Delete columns at indices
 */
export function deleteColumns(data: string[][], colIndices: number[]): string[][] {
  const toDelete = new Set(colIndices);
  return data.map(row => {
    const newRow = row.filter((_, idx) => !toDelete.has(idx));
    return newRow.length > 0 ? newRow : [''];
  });
}
