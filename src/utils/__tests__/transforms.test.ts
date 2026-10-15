import { describe, it, expect } from 'vitest';
import { 
  naturalSortCompare, 
  sortDataByColumn, 
  trimWhitespace, 
  transformCase, 
  fillDown, 
  fillEmptyFromAbove,
  removeDuplicateRows,
  insertRow,
  deleteRows,
  insertColumn,
  deleteColumns
} from '../transforms';

describe('Data Transformations', () => {
  it('naturalSortCompare sorts numbers accurately', () => {
    expect(naturalSortCompare('2', '10', 'asc')).toBeLessThan(0);
    expect(naturalSortCompare('10', '2', 'desc')).toBeLessThan(0);
    expect(naturalSortCompare('100', '25', 'asc')).toBeGreaterThan(0);
  });

  it('sorts tabular data while preserving header row', () => {
    const data = [
      ['Name', 'Score'],
      ['Charlie', '80'],
      ['Alice', '95'],
      ['Bob', '100'],
    ];
    const sorted = sortDataByColumn(data, 1, 'desc', true);
    expect(sorted[0]).toEqual(['Name', 'Score']);
    expect(sorted[1]).toEqual(['Bob', '100']);
    expect(sorted[2]).toEqual(['Alice', '95']);
    expect(sorted[3]).toEqual(['Charlie', '80']);
  });

  it('trims leading and trailing whitespace', () => {
    const data = [
      ['  Alice ', ' Developer  '],
      ['Bob', '  Designer '],
    ];
    const trimmed = trimWhitespace(data);
    expect(trimmed).toEqual([
      ['Alice', 'Developer'],
      ['Bob', 'Designer'],
    ]);
  });

  it('converts case (upper, lower, title)', () => {
    const data = [['hello world', 'FOO BAR']];
    const upper = transformCase(data, 'upper', {
      startRow: 0,
      startCol: 0,
      endRow: 0,
      endCol: 1,
      activeRow: 0,
      activeCol: 0,
    });
    expect(upper[0][0]).toBe('HELLO WORLD');

    const title = transformCase(data, 'title', {
      startRow: 0,
      startCol: 0,
      endRow: 0,
      endCol: 0,
      activeRow: 0,
      activeCol: 0,
    });
    expect(title[0][0]).toBe('Hello World');
  });

  it('fills values downwards', () => {
    const data = [
      ['Category A', 'Active'],
      ['', ''],
      ['', ''],
    ];
    const filled = fillDown(data, {
      startRow: 0,
      startCol: 0,
      endRow: 2,
      endCol: 1,
      activeRow: 0,
      activeCol: 0,
    });
    expect(filled[1]).toEqual(['Category A', 'Active']);
    expect(filled[2]).toEqual(['Category A', 'Active']);
  });

  it('fills empty blanks from above', () => {
    const data = [
      ['Hardware', 'Laptop'],
      ['', 'Monitor'],
      ['Software', 'IDE'],
      ['', 'Compiler'],
    ];
    const filled = fillEmptyFromAbove(data);
    expect(filled[1][0]).toBe('Hardware');
    expect(filled[3][0]).toBe('Software');
  });

  it('removes duplicate rows while preserving header', () => {
    const data = [
      ['ID', 'City'],
      ['1', 'Tokyo'],
      ['2', 'Paris'],
      ['1', 'Tokyo'],
    ];
    const deduped = removeDuplicateRows(data, true);
    expect(deduped.length).toBe(3);
    expect(deduped[0]).toEqual(['ID', 'City']);
    expect(deduped[1]).toEqual(['1', 'Tokyo']);
    expect(deduped[2]).toEqual(['2', 'Paris']);
  });

  it('inserts and deletes rows and columns', () => {
    let data = [
      ['A', 'B'],
      ['1', '2'],
    ];
    data = insertRow(data, 1);
    expect(data.length).toBe(3);
    expect(data[1]).toEqual(['', '']);

    data = deleteRows(data, [1]);
    expect(data.length).toBe(2);

    data = insertColumn(data, 1);
    expect(data[0].length).toBe(3);
    expect(data[0]).toEqual(['A', '', 'B']);

    data = deleteColumns(data, [1]);
    expect(data[0]).toEqual(['A', 'B']);
  });
});
