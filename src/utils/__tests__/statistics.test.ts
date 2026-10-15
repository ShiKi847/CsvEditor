import { describe, it, expect } from 'vitest';
import { calculateSelectionStats } from '../statistics';

describe('Selection Statistics', () => {
  it('calculates sum, average, min, max, count on numeric selections', () => {
    const data = [
      ['10', '20'],
      ['30', '40'],
    ];
    const stats = calculateSelectionStats(data, {
      startRow: 0,
      startCol: 0,
      endRow: 1,
      endCol: 1,
      activeRow: 0,
      activeCol: 0,
    });

    expect(stats.cellCount).toBe(4);
    expect(stats.nonEmptyCount).toBe(4);
    expect(stats.numericCount).toBe(4);
    expect(stats.sum).toBe(100);
    expect(stats.average).toBe(25);
    expect(stats.min).toBe(10);
    expect(stats.max).toBe(40);
  });

  it('handles formatted currencies and mixed text without errors', () => {
    const data = [
      ['$1,200', 'Active'],
      ['$800', ''],
    ];
    const stats = calculateSelectionStats(data, {
      startRow: 0,
      startCol: 0,
      endRow: 1,
      endCol: 1,
      activeRow: 0,
      activeCol: 0,
    });

    expect(stats.cellCount).toBe(4);
    expect(stats.nonEmptyCount).toBe(3);
    expect(stats.numericCount).toBe(2);
    expect(stats.sum).toBe(2000);
    expect(stats.average).toBe(1000);
    expect(stats.min).toBe(800);
    expect(stats.max).toBe(1200);
  });
});
