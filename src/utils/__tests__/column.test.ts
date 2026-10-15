import { describe, it, expect } from 'vitest';
import { getColumnLetter, getColumnIndex, formatCellAddress } from '../column';

describe('Column conversion utilities', () => {
  it('converts 0-based column indices to letters', () => {
    expect(getColumnLetter(0)).toBe('A');
    expect(getColumnLetter(25)).toBe('Z');
    expect(getColumnLetter(26)).toBe('AA');
    expect(getColumnLetter(27)).toBe('AB');
    expect(getColumnLetter(51)).toBe('AZ');
    expect(getColumnLetter(52)).toBe('BA');
  });

  it('converts column letters back to 0-based index', () => {
    expect(getColumnIndex('A')).toBe(0);
    expect(getColumnIndex('Z')).toBe(25);
    expect(getColumnIndex('AA')).toBe(26);
    expect(getColumnIndex('AB')).toBe(27);
    expect(getColumnIndex('BA')).toBe(52);
  });

  it('formats cell addresses in spreadsheet notation', () => {
    expect(formatCellAddress(0, 0)).toBe('A1');
    expect(formatCellAddress(9, 1)).toBe('B10');
    expect(formatCellAddress(99, 26)).toBe('AA100');
  });
});
