/**
 * Convert 0-based column index to spreadsheet column letter (0 -> 'A', 25 -> 'Z', 26 -> 'AA', ...)
 */
export function getColumnLetter(colIndex: number): string {
  let letter = '';
  let temp = colIndex;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Convert spreadsheet column letter to 0-based column index ('A' -> 0, 'AA' -> 26, ...)
 */
export function getColumnIndex(colLetter: string): number {
  let index = 0;
  const upper = colLetter.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }
  return index - 1;
}

/**
 * Format cell coordinates into Excel notation (e.g. row 0, col 1 -> 'B1')
 */
export function formatCellAddress(row: number, col: number): string {
  return `${getColumnLetter(col)}${row + 1}`;
}
