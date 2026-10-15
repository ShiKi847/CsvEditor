import type { SelectionRange, SelectionStats } from '../types';

/**
 * Calculate statistical summary for the selected cell range
 */
export function calculateSelectionStats(
  data: string[][],
  selection: SelectionRange
): SelectionStats {
  const minRow = Math.min(selection.startRow, selection.endRow);
  const maxRow = Math.max(selection.startRow, selection.endRow);
  const minCol = Math.min(selection.startCol, selection.endCol);
  const maxCol = Math.max(selection.startCol, selection.endCol);

  let cellCount = 0;
  let nonEmptyCount = 0;
  let numericCount = 0;
  let sum = 0;
  let min: number | null = null;
  let max: number | null = null;

  for (let r = minRow; r <= maxRow; r++) {
    if (!data[r]) continue;
    for (let c = minCol; c <= maxCol; c++) {
      cellCount++;
      const val = data[r][c];
      if (val !== undefined && val !== null && val.trim() !== '') {
        nonEmptyCount++;

        // Clean currency or commas (e.g. "$1,234.50" or "10%")
        const cleanVal = val.replace(/[$€¥£,%\s]/g, '');
        const num = Number(cleanVal);
        if (!isNaN(num) && cleanVal !== '') {
          numericCount++;
          sum += num;
          if (min === null || num < min) min = num;
          if (max === null || num > max) max = num;
        }
      }
    }
  }

  const average = numericCount > 0 ? sum / numericCount : null;

  return {
    cellCount,
    nonEmptyCount,
    numericCount,
    sum: numericCount > 0 ? Number(sum.toFixed(4)) : null,
    average: average !== null ? Number(average.toFixed(4)) : null,
    min,
    max,
  };
}
