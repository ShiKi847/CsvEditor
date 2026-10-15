import Papa from 'papaparse';
import type { CsvDialect, DelimiterType, LineEndingType, EncodingType } from '../types';

export const DEFAULT_DIALECT: CsvDialect = {
  delimiter: ',',
  quoteChar: '"',
  escapeChar: '"',
  lineEnding: '\r\n',
  encoding: 'UTF-8',
  hasHeader: true,
  quoteMode: 'as-needed',
};

export interface ParseResult {
  data: string[][];
  dialect: CsvDialect;
  totalRows: number;
  totalCols: number;
}

/**
 * Detect delimiter by counting frequency of candidates in initial lines
 */
export function detectDelimiter(rawText: string): DelimiterType {
  const candidates: DelimiterType[] = [',', '\t', ';', '|'];
  const sampleLines = rawText.slice(0, 5000).split(/\r\n|\n|\r/).filter(l => l.trim().length > 0).slice(0, 5);
  
  if (sampleLines.length === 0) return ',';

  let bestDelimiter: DelimiterType = ',';
  let maxScore = -1;

  for (const delim of candidates) {
    const counts = sampleLines.map(line => {
      let count = 0;
      let inQuote = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') inQuote = !inQuote;
        else if (!inQuote && line[i] === delim) count++;
      }
      return count;
    });

    const firstCount = counts[0];
    const isConsistent = firstCount > 0 && counts.every(c => c === firstCount);
    const score = isConsistent ? firstCount * 10 : counts.reduce((a, b) => a + b, 0);

    if (score > maxScore) {
      maxScore = score;
      bestDelimiter = delim;
    }
  }

  return bestDelimiter;
}

/**
 * Detect line ending from raw text
 */
export function detectLineEnding(rawText: string): LineEndingType {
  const crlfIndex = rawText.indexOf('\r\n');
  const lfIndex = rawText.indexOf('\n');
  if (crlfIndex !== -1 && (lfIndex === -1 || crlfIndex <= lfIndex)) {
    return '\r\n';
  }
  return '\n';
}

/**
 * Parse raw CSV/TSV text into rectangular 2D array with detected dialect
 */
export function parseCsv(rawText: string, customDialect?: Partial<CsvDialect>): ParseResult {
  // Check for UTF-8 BOM
  let text = rawText;
  let detectedEncoding: EncodingType = 'UTF-8';
  if (text.charCodeAt(0) === 0xFEFF) {
    detectedEncoding = 'UTF-8 with BOM';
    text = text.slice(1);
  }

  const detectedDelim = customDialect?.delimiter || detectDelimiter(text);
  const detectedLineEnding = customDialect?.lineEnding || detectLineEnding(text);

  const parsed = Papa.parse<string[]>(text, {
    delimiter: detectedDelim,
    quoteChar: customDialect?.quoteChar || '"',
    escapeChar: customDialect?.escapeChar || '"',
    skipEmptyLines: false,
    header: false,
    dynamicTyping: false,
  });

  const rawRows: string[][] = (parsed.data as string[][]).map(row => 
    row.map(cell => (cell === null || cell === undefined ? '' : String(cell)))
  );

  // If parsed data is completely empty, provide an initial 5x5 grid
  if (rawRows.length === 0 || (rawRows.length === 1 && rawRows[0].length === 0)) {
    return {
      data: createEmptyGrid(10, 5),
      dialect: {
        ...DEFAULT_DIALECT,
        ...customDialect,
        delimiter: detectedDelim,
        lineEnding: detectedLineEnding,
        encoding: detectedEncoding,
      },
      totalRows: 10,
      totalCols: 5,
    };
  }

  // Ensure uniform rectangular grid
  let maxCols = 0;
  for (const row of rawRows) {
    if (row.length > maxCols) maxCols = row.length;
  }
  if (maxCols === 0) maxCols = 5;

  const normalizedData = rawRows.map(row => {
    if (row.length < maxCols) {
      return [...row, ...new Array(maxCols - row.length).fill('')];
    }
    return row;
  });

  return {
    data: normalizedData,
    dialect: {
      ...DEFAULT_DIALECT,
      ...customDialect,
      delimiter: detectedDelim,
      lineEnding: detectedLineEnding,
      encoding: detectedEncoding,
    },
    totalRows: normalizedData.length,
    totalCols: maxCols,
  };
}

/**
 * Stringify 2D array data to CSV text using the specified dialect
 */
export function stringifyCsv(data: string[][], dialect: CsvDialect): string {
  const { delimiter, quoteChar, escapeChar, lineEnding, quoteMode, encoding } = dialect;

  const quoteFunction = (val: string): string => {
    const stringVal = val === null || val === undefined ? '' : String(val);
    const escaped = stringVal.split(quoteChar).join(escapeChar + quoteChar);

    if (quoteMode === 'all') {
      return `${quoteChar}${escaped}${quoteChar}`;
    }
    if (quoteMode === 'none') {
      return stringVal;
    }
    if (quoteMode === 'non-numeric') {
      const isNum = !isNaN(Number(stringVal)) && stringVal.trim() !== '';
      return isNum ? stringVal : `${quoteChar}${escaped}${quoteChar}`;
    }

    // Default 'as-needed' (RFC 4180)
    const needsQuote =
      stringVal.includes(delimiter) ||
      stringVal.includes(quoteChar) ||
      stringVal.includes('\n') ||
      stringVal.includes('\r');

    return needsQuote ? `${quoteChar}${escaped}${quoteChar}` : stringVal;
  };

  const lines = data.map(row => row.map(quoteFunction).join(delimiter));
  let result = lines.join(lineEnding);

  if (encoding === 'UTF-8 with BOM') {
    result = '\uFEFF' + result;
  }

  return result;
}

/**
 * Create a new blank grid of rows x cols
 */
export function createEmptyGrid(rows: number = 20, cols: number = 8): string[][] {
  const grid: string[][] = [];
  for (let r = 0; r < rows; r++) {
    grid.push(new Array(cols).fill(''));
  }
  return grid;
}

/**
 * Format data for clipboard export (TSV format so Excel, Google Sheets, and SmoothCSV can paste cleanly)
 */
export function formatDataAsTsv(data: string[][]): string {
  return data
    .map(row =>
      row
        .map(cell => {
          // If cell contains newline or tab, quote it
          if (cell.includes('\t') || cell.includes('\n') || cell.includes('\r') || cell.includes('"')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join('\t')
    )
    .join('\r\n');
}

/**
 * Parse clipboard text (auto detects TSV or CSV)
 */
export function parseClipboardText(text: string): string[][] {
  // Try parsing with PapaParse
  const parsed = Papa.parse<string[]>(text, {
    delimiter: text.includes('\t') ? '\t' : ',',
    skipEmptyLines: false,
    header: false,
  });
  if (parsed.data && parsed.data.length > 0) {
    return parsed.data;
  }
  return text.split(/\r\n|\n/).map(line => line.split(text.includes('\t') ? '\t' : ','));
}
