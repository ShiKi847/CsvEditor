import { describe, it, expect } from 'vitest';
import { 
  parseCsv, 
  stringifyCsv, 
  detectDelimiter, 
  detectLineEnding, 
  formatDataAsTsv, 
  parseClipboardText,
  DEFAULT_DIALECT 
} from '../csv';

describe('CSV Parser and Serializer', () => {
  it('parses basic comma separated data', () => {
    const raw = `Name,Age,City\r\nAlice,30,New York\r\nBob,25,San Francisco`;
    const result = parseCsv(raw);
    expect(result.data.length).toBe(3);
    expect(result.data[0]).toEqual(['Name', 'Age', 'City']);
    expect(result.data[1]).toEqual(['Alice', '30', 'New York']);
    expect(result.dialect.delimiter).toBe(',');
    expect(result.dialect.lineEnding).toBe('\r\n');
  });

  it('handles multiline values inside quotes', () => {
    const raw = `Item,Description\r\n1,"Line 1\nLine 2\nLine 3"`;
    const result = parseCsv(raw);
    expect(result.data.length).toBe(2);
    expect(result.data[1][1]).toBe('Line 1\nLine 2\nLine 3');
  });

  it('handles escaped quotes inside quoted values ("")', () => {
    const raw = `Title,Text\r\nBook,"A ""classic"" novel"`;
    const result = parseCsv(raw);
    expect(result.data[1][1]).toBe('A "classic" novel');
  });

  it('auto-detects tab, semicolon, and pipe delimiters', () => {
    const tsv = `ID\tName\tScore\n1\tJohn\t95\n2\tSarah\t98`;
    expect(detectDelimiter(tsv)).toBe('\t');

    const ssv = `A;B;C\r\n1;2;3\r\n4;5;6`;
    expect(detectDelimiter(ssv)).toBe(';');

    const psv = `col1|col2|col3\nval1|val2|val3`;
    expect(detectDelimiter(psv)).toBe('|');
  });

  it('detects CRLF and LF line endings', () => {
    expect(detectLineEnding('a,b\r\nc,d')).toBe('\r\n');
    expect(detectLineEnding('a,b\nc,d')).toBe('\n');
  });

  it('stringifies with RFC 4180 minimal quoting (as-needed)', () => {
    const data = [
      ['Name', 'Details', 'Age'],
      ['Smith, John', 'Special "notes"', '42'],
      ['Jane', 'Normal text', '30'],
    ];
    const out = stringifyCsv(data, {
      ...DEFAULT_DIALECT,
      delimiter: ',',
      lineEnding: '\n',
      quoteMode: 'as-needed',
    });
    expect(out).toContain('"Smith, John"');
    expect(out).toContain('"Special ""notes"""');
    expect(out).toContain('Jane,Normal text,30');
  });

  it('formats rectangular data for clipboard TSV compatibility', () => {
    const grid = [
      ['Product', 'Qty'],
      ['Keyboard\tPro', '5'],
    ];
    const tsv = formatDataAsTsv(grid);
    expect(tsv).toContain('Product\tQty');
    expect(tsv).toContain('"Keyboard\tPro"\t5');
  });

  it('parses clipboard TSV cleanly', () => {
    const clip = `Apple\t10\nBanana\t20`;
    const parsed = parseClipboardText(clip);
    expect(parsed).toEqual([
      ['Apple', '10'],
      ['Banana', '20'],
    ]);
  });
});
