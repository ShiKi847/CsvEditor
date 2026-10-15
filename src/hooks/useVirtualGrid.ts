import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

export interface VirtualGridOptions {
  totalRows: number;
  totalCols: number;
  rowHeight?: number;
  defaultColWidth?: number;
  customColWidths?: Record<number, number>;
  overscanRows?: number;
  overscanCols?: number;
}

export interface VirtualRange {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
  totalWidth: number;
  totalHeight: number;
  colOffsets: number[];
  getColWidth: (col: number) => number;
}

export function useVirtualGrid(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: VirtualGridOptions
): VirtualRange {
  const {
    totalRows,
    totalCols,
    rowHeight = 26,
    defaultColWidth = 110,
    customColWidths = {},
    overscanRows = 12,
    overscanCols = 5,
  } = options;

  const [scrollState, setScrollState] = useState({
    scrollTop: 0,
    scrollLeft: 0,
    viewportWidth: 1000,
    viewportHeight: 600,
  });

  const getColWidth = useCallback(
    (col: number): number => {
      return customColWidths[col] ?? defaultColWidth;
    },
    [customColWidths, defaultColWidth]
  );

  // Compute column offsets (prefix sums)
  const { colOffsets, totalWidth } = useMemo(() => {
    const offsets: number[] = new Array(totalCols + 1);
    offsets[0] = 0;
    for (let c = 0; c < totalCols; c++) {
      offsets[c + 1] = offsets[c] + getColWidth(c);
    }
    return {
      colOffsets: offsets,
      totalWidth: offsets[totalCols] || 0,
    };
  }, [totalCols, getColWidth]);

  const totalHeight = totalRows * rowHeight;

  // Listen to scroll events on container with requestAnimationFrame throttling
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      setScrollState(prev => ({
        ...prev,
        viewportWidth: container.clientWidth,
        viewportHeight: container.clientHeight,
        scrollTop: container.scrollTop,
        scrollLeft: container.scrollLeft,
      }));
    };

    updateDimensions();

    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setScrollState({
          scrollTop: container.scrollTop,
          scrollLeft: container.scrollLeft,
          viewportWidth: container.clientWidth,
          viewportHeight: container.clientHeight,
        });
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateDimensions);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateDimensions);
    };
  }, [containerRef]);

  // Calculate visible range
  const { startRow, endRow, startCol, endCol } = useMemo(() => {
    const { scrollTop, scrollLeft, viewportWidth, viewportHeight } = scrollState;

    // Rows
    const rawStartRow = Math.floor(scrollTop / rowHeight);
    const rawEndRow = Math.ceil((scrollTop + viewportHeight) / rowHeight);

    const sRow = Math.max(0, rawStartRow - overscanRows);
    const eRow = Math.min(Math.max(0, totalRows - 1), rawEndRow + overscanRows);

    // Columns
    let sCol = 0;
    while (sCol < totalCols && colOffsets[sCol + 1] <= scrollLeft) {
      sCol++;
    }
    sCol = Math.max(0, sCol - overscanCols);

    let eCol = sCol;
    const rightEdge = scrollLeft + viewportWidth;
    while (eCol < totalCols && colOffsets[eCol] < rightEdge) {
      eCol++;
    }
    eCol = Math.min(Math.max(0, totalCols - 1), eCol + overscanCols);

    return {
      startRow: sRow,
      endRow: eRow,
      startCol: sCol,
      endCol: eCol,
    };
  }, [scrollState, rowHeight, totalRows, totalCols, colOffsets, overscanRows, overscanCols]);

  return {
    startRow,
    endRow,
    startCol,
    endCol,
    totalWidth,
    totalHeight,
    colOffsets,
    getColWidth,
  };
}
