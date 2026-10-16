# CsvEditor (Desktop & Web Edition)

A professional, high-performance CSV/TSV spreadsheet editor. Designed to feel like the *"VS Code of tabular editors"*, it combines Excel-like spreadsheet editing convenience with robust handling of RFC 4180 CSV edge cases (multiline cells, escaped quotes, custom delimiters, encodings, and large files).

---

## ✨ Features & Capabilities

### 1. ⚡ High-Performance Virtualized Grid
- **Buttery Smooth 60FPS Virtual Scrolling**: Renders only the currently visible cells in both dimensions (horizontal and vertical), smoothly handling 100,000+ rows without browser lag.
- **Excel-Style Keyboard & Mouse Navigation**:
  - `Arrow keys` to move active cell.
  - `Shift + Arrow keys` or mouse dragging to extend rectangular range selections.
  - `Enter` / `F2` or direct character typing to start inline editing.
  - `Tab` / `Shift+Tab` to move right/left; `Enter` / `Shift+Enter` to move down/up.
  - `Alt+Enter` to insert line breaks inside a cell.
  - `Delete` / `Backspace` to clear selected cell contents.
  - `Ctrl+A` to select all cells.
  - Auto-fill handle at bottom-right of selection (drag down to copy series).
- **Column Customization**:
  - Drag column borders in header to resize width.
  - Double-click column border to **auto-fit width** to maximum content length.
  - Click column header to select entire column (`Ctrl+Space` compatible).
  - Click row header to select entire row (`Shift+Space` compatible).
  - Pinned header row & pinned row number column.

### 2. 🗂 Multi-Tab Document Management & File Safety
- **Multi-Tab Interface**: Open and edit multiple CSV/TSV files simultaneously.
- **Unsaved Changes Indicator**: Distinct `●` dirty badge on tabs with unsaved edits.
- **Direct Disk Save (File System Access API)**:
  - `Ctrl+S` writes directly back in-place to the opened disk file.
  - `Ctrl+Shift+S` opens the "Save As" picker.
- **Drag & Drop**: Drag any `.csv` or `.tsv` file into the editor window to open it instantly.
- **Sample Datasets Included**:
  - Sales Orders (standard e-commerce dataset).
  - Multiline Notes & Quotes (complex RFC 4180 edge cases with internal newlines).
  - 500-Row Performance Test.

### 3. 🔍 Search & Replace
- Floating / dockable search panel (`Ctrl+F`).
- **Real-Time Match Highlighting**: Highlights matching cells dynamically across the entire virtual grid.
- **Options**:
  - Match Case (`Aa`)
  - Match Entire Cell (`" "`)
  - Regular Expressions (`.*`)
- Next / Previous match navigation with live index counter (`Match 3 of 24`).
- Single Replace & Replace All in one click.

### 4. 🧮 AlaSQL SQL Console
- Direct SQL querying against tabular CSV data using [AlaSQL](https://github.com/AlaSQL/alasql).
- Query table `csv` with SQL:
  ```sql
  SELECT [Category], COUNT(*) as count, SUM([Total Revenue]) as total
  FROM csv
  GROUP BY [Category]
  ORDER BY total DESC
  ```
- **One-Click Actions**:
  - Load query results directly into a **New Tab**.
  - Export query results directly to CSV.

### 5. 🛠 Advanced Data Manipulation & Transforms
- **First Row as Header Toggle**: Switch row 1 between pinned column titles and regular data row.
- **Trim Whitespace**: Strip unwanted leading and trailing whitespace.
- **Case Conversion**: Convert selection to `UPPERCASE`, `lowercase`, or `Title Case`.
- **Fill Tools**: Fill down values, or fill blank cells from the previous non-empty row above.
- **Deduplication**: Remove duplicate rows while preserving the header row.
- **Row & Column Tools**: Insert/Delete rows above/below, insert/delete columns left/right.

### 6. 📋 Live Status Bar & Statistics
- Active cell coordinates (`B4`, `AA12`).
- Selection dimensions (`5R × 3C (15 cells)`).
- Instant automatic calculation for numeric selections:
  - **Count** (non-empty cells)
  - **Sum**
  - **Average**
  - **Min** & **Max**
- File dialect badges: Total rows & columns, Delimiter (`Comma`, `Tab`, `Semicolon`, `Pipe`), Line Endings (`CRLF` / `LF`), Encoding (`UTF-8`).

### 7. 📤 Flexible Export & Copy Options
- **Multi-Format Export**:
  - CSV (custom delimiter, quote mode, line endings)
  - TSV (tab-separated values)
  - Markdown Tables
  - JSON (array of objects)
  - HTML Tables
  - SQL `INSERT` statements
- **Clipboard TSV Compatibility**: Rectangular copy-paste is 100% compatible with Microsoft Excel and Google Sheets.
- **Right-Click Context Menu**: Copy as Markdown table, copy as JSON, inspect in multiline editor.

### 8. ⌨️ Command Palette (`Ctrl+Shift+P`)
- VS Code style command palette for lightning-fast keyboard-first productivity.

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action |
| :--- | :--- |
| `Arrow Keys` | Move active cell |
| `Shift + Arrow Keys` | Extend rectangular selection |
| `Enter` / `F2` | Start inline editing |
| `Alt + Enter` | Insert newline inside cell |
| `Tab` / `Shift + Tab` | Move right / left |
| `Ctrl + A` | Select entire sheet |
| `Ctrl + C` / `Ctrl + X` | Copy / Cut selection (TSV format) |
| `Ctrl + V` | Paste clipboard into selection (auto-expands grid) |
| `Delete` / `Backspace` | Clear cell contents |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Redo |
| `Ctrl + S` | Save file directly to disk |
| `Ctrl + Shift + S` | Save As |
| `Ctrl + O` | Open file |
| `Ctrl + N` | New blank tab |
| `Ctrl + W` | Close active tab |
| `Ctrl + F` | Find & Replace |
| `Ctrl + Shift + P` | Command Palette |

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- npm or pnpm

### Development
```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

### Run Tests
```bash
# Run Vitest test suite
npm test
```

### Production Build
```bash
# Compile TypeScript and bundle production assets
npm run build
```

---

## 🏛 Architecture

```
src/
├── types/                # TypeScript interfaces (TabDocument, CsvDialect, SelectionRange, etc.)
├── utils/
│   ├── csv.ts            # RFC 4180 parser/serializer, delimiter/line ending detector
│   ├── column.ts         # Excel column letter & coordinate helpers
│   ├── transforms.ts     # Natural sorting, trim, casing, fill down, deduplication
│   ├── statistics.ts     # Live selection math (Sum, Avg, Min, Max, Count)
│   └── sampleData.ts     # Pre-bundled sales, multiline, and stress-test datasets
├── hooks/
│   ├── useVirtualGrid.ts # 2D virtualized scroll window calculator (60fps)
│   └── useFileSystem.ts  # File System Access API with in-place saving & fallback
├── components/
│   ├── Grid/             # VirtualGrid, GridHeader, GridRowNumbers, CellEditor, ContextMenu
│   ├── Header/           # TabBar
│   ├── Toolbar/          # MainToolbar
│   ├── FormulaBar/       # FormulaBar (Cell address, value input, multiline trigger)
│   ├── FindReplace/      # FindReplaceBar (Floating, regex, match counter)
│   ├── FilterBar/        # FilterBar (Column condition filters)
│   ├── SqlConsole/       # SqlConsoleModal (AlaSQL engine & results preview)
│   ├── Modals/           # MultilineEditorModal, ExportModal, CommandPaletteModal
│   └── StatusBar/        # StatusBar (Selection stats, encoding, delimiter)
├── App.tsx               # Top-level state coordination
└── main.tsx              # Entry point
```
