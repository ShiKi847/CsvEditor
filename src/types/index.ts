export type DelimiterType = ',' | '\t' | ';' | '|' | ':' | string;
export type LineEndingType = '\r\n' | '\n';
export type EncodingType = 'UTF-8' | 'UTF-8 with BOM' | 'GBK' | 'Shift-JIS' | 'ISO-8859-1';
export type QuoteModeType = 'as-needed' | 'all' | 'non-numeric' | 'none';

export interface CsvDialect {
  delimiter: DelimiterType;
  quoteChar: string;
  escapeChar: string;
  lineEnding: LineEndingType;
  encoding: EncodingType;
  hasHeader: boolean;
  quoteMode: QuoteModeType;
}

export interface CellPosition {
  row: number;
  col: number;
}

export interface SelectionRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  activeRow: number;
  activeCol: number;
}

export interface ColumnMeta {
  index: number;
  name: string;
  width: number;
  type?: 'text' | 'number' | 'date';
}

export interface FilterCondition {
  colIndex: number;
  operator: 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'regex' | 'is_empty' | 'is_not_empty';
  value: string;
}

export interface SortState {
  colIndex: number;
  direction: 'asc' | 'desc';
}

export interface FindReplaceOptions {
  findText: string;
  replaceText: string;
  matchCase: boolean;
  matchEntireCell: boolean;
  useRegex: boolean;
  scope: 'all' | 'column' | 'selection';
  selectedColumn?: number;
}

export interface FindMatch {
  row: number;
  col: number;
}

export interface SelectionStats {
  cellCount: number;
  nonEmptyCount: number;
  numericCount: number;
  sum: number | null;
  average: number | null;
  min: number | null;
  max: number | null;
}

export interface TabDocument {
  id: string;
  title: string;
  data: string[][];
  headers: string[]; // Column titles (from row 0 if hasHeader is true, else A, B, C...)
  dialect: CsvDialect;
  columnWidths: Record<number, number>;
  isDirty: boolean;
  filePath?: string;
  fileHandle?: FileSystemFileHandle;
  sortState: SortState | null;
  filters: FilterCondition[];
  selection: SelectionRange;
}

export interface HistoryEntry {
  data: string[][];
  description: string;
}
