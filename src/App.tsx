import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TabBar } from './components/Header/TabBar';
import { MainToolbar } from './components/Toolbar/MainToolbar';
import { FormulaBar } from './components/FormulaBar/FormulaBar';
import { VirtualGrid } from './components/Grid/VirtualGrid';
import { FindReplaceBar } from './components/FindReplace/FindReplaceBar';
import { FilterBar } from './components/FilterBar/FilterBar';
import { StatusBar } from './components/StatusBar/StatusBar';
import { SqlConsoleModal } from './components/SqlConsole/SqlConsoleModal';
import { MultilineEditorModal } from './components/Modals/MultilineEditorModal';
import { ExportModal } from './components/Modals/ExportModal';
import { CommandPaletteModal, type CommandItem } from './components/Modals/CommandPaletteModal';
import { useFileSystem } from './hooks/useFileSystem';
import { HistoryManager } from './utils/history';
import { 
  parseCsv, 
  stringifyCsv, 
  createEmptyGrid, 
  DEFAULT_DIALECT 
} from './utils/csv';
import { 
  SAMPLE_SALES_CSV, 
  SAMPLE_MULTILINE_CSV, 
  generateLargeDataset 
} from './utils/sampleData';
import { 
  sortDataByColumn, 
  removeDuplicateRows, 
  trimWhitespace, 
  transformCase, 
  fillDown,
  fillEmptyFromAbove,
  insertRow,
  deleteRows,
  insertColumn,
  deleteColumns 
} from './utils/transforms';
import { calculateSelectionStats } from './utils/statistics';
import type { 
  TabDocument, 
  FindReplaceOptions, 
  FindMatch 
} from './types';

export const App: React.FC = () => {
  const { openFile, saveFile, exportBlob } = useFileSystem();

  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('csveditor_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('csveditor_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('csveditor_theme', 'light');
    }
  }, [isDarkMode]);

  // History managers per tab
  const historyManagersRef = useRef<Map<string, HistoryManager>>(new Map());

  const getHistoryManager = (tabId: string): HistoryManager => {
    if (!historyManagersRef.current.has(tabId)) {
      historyManagersRef.current.set(tabId, new HistoryManager(60));
    }
    return historyManagersRef.current.get(tabId)!;
  };

  // Initial Sample Tab
  const initialParse = parseCsv(SAMPLE_SALES_CSV);
  const initialTab: TabDocument = {
    id: 'tab-1',
    title: 'Sales_Orders.csv',
    data: initialParse.data,
    headers: initialParse.data[0] || [],
    dialect: initialParse.dialect,
    columnWidths: {
      0: 100, // Order ID
      1: 150, // Customer Name
      2: 120, // Region
      3: 130, // Category
      4: 90,  // Units Sold
      5: 100, // Unit Price
      6: 110, // Total Revenue
      7: 120, // Payment Method
      8: 100, // Status
      9: 110, // Order Date
    },
    isDirty: false,
    sortState: null,
    filters: [],
    selection: {
      startRow: 0,
      startCol: 0,
      endRow: 0,
      endCol: 0,
      activeRow: 0,
      activeCol: 0,
    },
  };

  const [tabs, setTabs] = useState<TabDocument[]>([initialTab]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');

  // UI Panels / Modals state
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [multilineModal, setMultilineModal] = useState<{
    isOpen: boolean;
    row: number;
    col: number;
    value: string;
  }>({
    isOpen: false,
    row: 0,
    col: 0,
    value: '',
  });

  // Find & Replace options
  const [findOptions, setFindOptions] = useState<FindReplaceOptions>({
    findText: '',
    replaceText: '',
    matchCase: false,
    matchEntireCell: false,
    useRegex: false,
    scope: 'all',
  });
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Zoom state
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  const applyZoom = useCallback((newZoom: number) => {
    const clamped = Math.min(2.5, Math.max(0.5, Number(newZoom.toFixed(2))));
    setZoomLevel(clamped);

    // Apply native electron zoom
    if (window.electronAPI?.setZoomFactor) {
      window.electronAPI.setZoomFactor(clamped);
    } else {
      // Fallback CSS zoom
      (document.body.style as unknown as { zoom: string }).zoom = String(clamped);
    }
  }, []);

  const handleZoomIn = useCallback(() => {
    applyZoom(zoomLevel + 0.1);
  }, [applyZoom, zoomLevel]);

  const handleZoomOut = useCallback(() => {
    applyZoom(zoomLevel - 0.1);
  }, [applyZoom, zoomLevel]);

  const handleZoomReset = useCallback(() => {
    applyZoom(1.0);
  }, [applyZoom]);

  // Mouse wheel zoom (Ctrl + Mouse Wheel)
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          applyZoom(zoomLevel + 0.1);
        } else if (e.deltaY > 0) {
          applyZoom(zoomLevel - 0.1);
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [applyZoom, zoomLevel]);

  // Active tab reference
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  // Helper to update active tab document
  const updateActiveTab = useCallback(
    (updater: (prev: TabDocument) => TabDocument) => {
      setTabs(prevTabs =>
        prevTabs.map(t => (t.id === activeTabId ? updater(t) : t))
      );
    },
    [activeTabId]
  );

  // Handle data change with undo history tracking
  const handleDataChange = useCallback(
    (newData: string[][], description?: string) => {
      const hm = getHistoryManager(activeTabId);
      hm.pushState(activeTab.data, description);

      updateActiveTab(tab => {
        const newHeaders = tab.dialect.hasHeader ? newData[0] || [] : tab.headers;
        return {
          ...tab,
          data: newData,
          headers: newHeaders,
          isDirty: true,
        };
      });
    },
    [activeTab.data, activeTabId, updateActiveTab]
  );

  // Undo / Redo
  const handleUndo = useCallback(() => {
    const hm = getHistoryManager(activeTabId);
    const prev = hm.undo(activeTab.data);
    if (prev) {
      updateActiveTab(tab => ({
        ...tab,
        data: prev.data,
        headers: tab.dialect.hasHeader ? prev.data[0] || [] : tab.headers,
        isDirty: true,
      }));
    }
  }, [activeTab.data, activeTabId, updateActiveTab]);

  const handleRedo = useCallback(() => {
    const hm = getHistoryManager(activeTabId);
    const next = hm.redo(activeTab.data);
    if (next) {
      updateActiveTab(tab => ({
        ...tab,
        data: next.data,
        headers: tab.dialect.hasHeader ? next.data[0] || [] : tab.headers,
        isDirty: true,
      }));
    }
  }, [activeTab.data, activeTabId, updateActiveTab]);

  // Tab management
  const handleNewTab = useCallback(() => {
    const newId = `tab-${Date.now()}`;
    const newDoc: TabDocument = {
      id: newId,
      title: `Untitled_${tabs.length + 1}.csv`,
      data: createEmptyGrid(25, 8),
      headers: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
      dialect: { ...DEFAULT_DIALECT, hasHeader: false },
      columnWidths: {},
      isDirty: false,
      sortState: null,
      filters: [],
      selection: {
        startRow: 0,
        startCol: 0,
        endRow: 0,
        endCol: 0,
        activeRow: 0,
        activeCol: 0,
      },
    };
    setTabs(prev => [...prev, newDoc]);
    setActiveTabId(newId);
  }, [tabs.length]);

  const handleCloseTab = useCallback(
    (idToClose: string) => {
      if (tabs.length === 1) {
        // Reset the single tab to clean empty state
        handleNewTab();
      }
      setTabs(prev => prev.filter(t => t.id !== idToClose));
      if (activeTabId === idToClose) {
        const remaining = tabs.filter(t => t.id !== idToClose);
        if (remaining[0]) setActiveTabId(remaining[0].id);
      }
    },
    [tabs, activeTabId, handleNewTab]
  );

  // File loading
  const loadContentIntoTab = useCallback(
    (content: string, fileName: string, fileHandle?: FileSystemFileHandle, filePath?: string) => {
      const parsed = parseCsv(content);
      const newId = `tab-${Date.now()}`;
      const newDoc: TabDocument = {
        id: newId,
        title: fileName,
        filePath: filePath || fileName,
        fileHandle,
        data: parsed.data,
        headers: parsed.dialect.hasHeader ? parsed.data[0] || [] : [],
        dialect: parsed.dialect,
        columnWidths: {},
        isDirty: false,
        sortState: null,
        filters: [],
        selection: {
          startRow: 0,
          startCol: 0,
          endRow: 0,
          endCol: 0,
          activeRow: 0,
          activeCol: 0,
        },
      };
      setTabs(prev => [...prev, newDoc]);
      setActiveTabId(newId);
    },
    []
  );

  // Listen to file opened via Windows CLI / Open With in Electron
  useEffect(() => {
    if (window.electronAPI?.onFileOpenedFromCli) {
      window.electronAPI.onFileOpenedFromCli(data => {
        loadContentIntoTab(data.content, data.fileName, undefined, data.filePath);
      });
    }
  }, [loadContentIntoTab]);

  const handleOpenFile = async () => {
    const res = await openFile();
    if (res) {
      loadContentIntoTab(res.content, res.fileName, res.fileHandle, res.filePath);
    }
  };

  const handleSaveFile = async () => {
    const csvContent = stringifyCsv(activeTab.data, activeTab.dialect);
    const res = await saveFile(csvContent, activeTab.title, activeTab.fileHandle, activeTab.filePath);
    if (res) {
      updateActiveTab(tab => ({
        ...tab,
        title: res.fileName,
        filePath: res.filePath || res.fileName,
        fileHandle: res.fileHandle,
        isDirty: false,
      }));
    }
  };

  const handleSaveAsFile = async () => {
    const csvContent = stringifyCsv(activeTab.data, activeTab.dialect);
    const res = await saveFile(csvContent, activeTab.title);
    if (res) {
      updateActiveTab(tab => ({
        ...tab,
        title: res.fileName,
        filePath: res.filePath || res.fileName,
        fileHandle: res.fileHandle,
        isDirty: false,
      }));
    }
  };

  // Sample data loaders
  const handleLoadSample = (type: 'sales' | 'multiline' | 'large') => {
    if (type === 'sales') {
      loadContentIntoTab(SAMPLE_SALES_CSV, 'Sales_Orders.csv');
    } else if (type === 'multiline') {
      loadContentIntoTab(SAMPLE_MULTILINE_CSV, 'Multiline_Products.csv');
    } else if (type === 'large') {
      const grid = generateLargeDataset(500);
      const csvStr = grid.map(r => r.join(',')).join('\r\n');
      loadContentIntoTab(csvStr, 'Large_Tickets_500.csv');
    }
  };

  // Drag and drop file support anywhere on window
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'copy';
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        const text = await file.text();
        loadContentIntoTab(text, file.name);
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [loadContentIntoTab]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleOpenFile();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (e.shiftKey) handleSaveAsFile();
        else handleSaveFile();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewTab();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        handleCloseTab(activeTabId);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsFindOpen(true);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

      // Zoom In (handles Ctrl+=, Ctrl++, NumpadAdd, etc. even with Chinese IME)
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === '=' || e.key === '+' || e.code === 'Equal' || e.code === 'NumpadAdd' || e.keyCode === 187 || e.keyCode === 107)
      ) {
        e.preventDefault();
        handleZoomIn();
        return;
      }

      // Zoom Out (handles Ctrl+-, NumpadSubtract)
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === '-' || e.key === '_' || e.code === 'Minus' || e.code === 'NumpadSubtract' || e.keyCode === 189 || e.keyCode === 109)
      ) {
        e.preventDefault();
        handleZoomOut();
        return;
      }

      // Zoom Reset (Ctrl+0, Numpad0)
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === '0' || e.code === 'Digit0' || e.code === 'Numpad0' || e.keyCode === 48 || e.keyCode === 96)
      ) {
        e.preventDefault();
        handleZoomReset();
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeTabId, handleCloseTab, handleNewTab, handleOpenFile, handleSaveAsFile, handleSaveFile, handleZoomIn, handleZoomOut, handleZoomReset]);

  // Search Engine & Matching logic
  const findMatches: FindMatch[] = useMemo(() => {
    if (!findOptions.findText || !isFindOpen) return [];

    const matches: FindMatch[] = [];
    const query = findOptions.findText;
    const { matchCase, matchEntireCell, useRegex } = findOptions;

    let regex: RegExp | null = null;
    if (useRegex) {
      try {
        regex = new RegExp(query, matchCase ? 'g' : 'gi');
      } catch {
        return [];
      }
    }

    const lowerQuery = query.toLowerCase();

    for (let r = 0; r < activeTab.data.length; r++) {
      const row = activeTab.data[r];
      for (let c = 0; c < row.length; c++) {
        const cell = row[c] ?? '';
        let isMatch = false;

        if (regex) {
          isMatch = regex.test(cell);
        } else if (matchEntireCell) {
          isMatch = matchCase ? cell === query : cell.toLowerCase() === lowerQuery;
        } else {
          isMatch = matchCase ? cell.includes(query) : cell.toLowerCase().includes(lowerQuery);
        }

        if (isMatch) {
          matches.push({ row: r, col: c });
        }
      }
    }

    return matches;
  }, [findOptions, isFindOpen, activeTab.data]);

  // Navigate to current match
  useEffect(() => {
    if (findMatches.length > 0 && currentMatchIndex < findMatches.length) {
      const target = findMatches[currentMatchIndex];
      const offset = activeTab.dialect.hasHeader ? 1 : 0;
      const displayRow = Math.max(0, target.row - offset);
      updateActiveTab(tab => ({
        ...tab,
        selection: {
          startRow: displayRow,
          startCol: target.col,
          endRow: displayRow,
          endCol: target.col,
          activeRow: displayRow,
          activeCol: target.col,
        },
      }));
    }
  }, [currentMatchIndex, findMatches, activeTab.dialect.hasHeader, updateActiveTab]);

  const handleFindNext = () => {
    if (findMatches.length === 0) return;
    setCurrentMatchIndex(prev => (prev + 1) % findMatches.length);
  };

  const handleFindPrev = () => {
    if (findMatches.length === 0) return;
    setCurrentMatchIndex(prev => (prev - 1 + findMatches.length) % findMatches.length);
  };

  const handleReplaceCurrent = () => {
    if (findMatches.length === 0 || !findMatches[currentMatchIndex]) return;
    const match = findMatches[currentMatchIndex];
    const { row, col } = match;
    const currentVal = activeTab.data[row]?.[col] || '';

    let newVal = '';
    if (findOptions.useRegex) {
      try {
        const regex = new RegExp(findOptions.findText, findOptions.matchCase ? 'g' : 'gi');
        newVal = currentVal.replace(regex, findOptions.replaceText);
      } catch {
        return;
      }
    } else if (findOptions.matchEntireCell) {
      newVal = findOptions.replaceText;
    } else {
      const regex = new RegExp(
        findOptions.findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        findOptions.matchCase ? 'g' : 'gi'
      );
      newVal = currentVal.replace(regex, findOptions.replaceText);
    }

    const newData = activeTab.data.map(r => [...r]);
    newData[row][col] = newVal;
    handleDataChange(newData, 'Replace Text');
  };

  const handleReplaceAll = () => {
    if (findMatches.length === 0) return;
    const newData = activeTab.data.map(r => [...r]);

    findMatches.forEach(m => {
      const currentVal = newData[m.row]?.[m.col] || '';
      let newVal = '';
      if (findOptions.useRegex) {
        try {
          const regex = new RegExp(findOptions.findText, findOptions.matchCase ? 'g' : 'gi');
          newVal = currentVal.replace(regex, findOptions.replaceText);
        } catch {
          return;
        }
      } else if (findOptions.matchEntireCell) {
        newVal = findOptions.replaceText;
      } else {
        const regex = new RegExp(
          findOptions.findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          findOptions.matchCase ? 'g' : 'gi'
        );
        newVal = currentVal.replace(regex, findOptions.replaceText);
      }
      newData[m.row][m.col] = newVal;
    });

    handleDataChange(newData, 'Replace All');
  };

  // Sorting
  const handleSortColumn = (colIndex: number, forcedDirection?: 'asc' | 'desc') => {
    let nextDirection: 'asc' | 'desc' = 'asc';
    if (forcedDirection) {
      nextDirection = forcedDirection;
    } else {
      const currentSort = activeTab.sortState;
      if (currentSort && currentSort.colIndex === colIndex) {
        if (currentSort.direction === 'asc') nextDirection = 'desc';
        else {
          // Clear sort
          updateActiveTab(tab => ({ ...tab, sortState: null }));
          return;
        }
      }
    }

    const sortedData = sortDataByColumn(
      activeTab.data,
      colIndex,
      nextDirection,
      activeTab.dialect.hasHeader
    );
    updateActiveTab(tab => ({
      ...tab,
      data: sortedData,
      sortState: { colIndex, direction: nextDirection },
      isDirty: true,
    }));
  };

  // Filtering
  const activeFilter = activeTab.filters[0] || null;

  const filteredData = useMemo(() => {
    if (!activeFilter || !isFilterOpen) return activeTab.data;
    const { colIndex, operator, value } = activeFilter;
    const headerRow = activeTab.dialect.hasHeader ? activeTab.data[0] : null;
    const bodyRows = activeTab.dialect.hasHeader ? activeTab.data.slice(1) : activeTab.data;

    const lowerVal = value.toLowerCase();

    const matches = bodyRows.filter(row => {
      const cell = (row[colIndex] ?? '').toLowerCase();
      const rawCell = row[colIndex] ?? '';

      switch (operator) {
        case 'contains':
          return cell.includes(lowerVal);
        case 'equals':
          return cell === lowerVal;
        case 'starts_with':
          return cell.startsWith(lowerVal);
        case 'ends_with':
          return cell.endsWith(lowerVal);
        case 'greater_than':
          return Number(rawCell) > Number(value);
        case 'less_than':
          return Number(rawCell) < Number(value);
        case 'regex':
          try {
            return new RegExp(value, 'i').test(rawCell);
          } catch {
            return true;
          }
        case 'is_empty':
          return rawCell.trim() === '';
        case 'is_not_empty':
          return rawCell.trim() !== '';
        default:
          return true;
      }
    });

    return headerRow ? [headerRow, ...matches] : matches;
  }, [activeFilter, isFilterOpen, activeTab.data, activeTab.dialect.hasHeader]);

  // Statistics calculation for selection
  const selectionStats = useMemo(() => {
    return calculateSelectionStats(activeTab.data, activeTab.selection);
  }, [activeTab.data, activeTab.selection]);

  // Command palette command list
  const commandList: CommandItem[] = useMemo(
    () => [
      { id: 'new-file', category: 'File', title: 'New File', shortcut: 'Ctrl+N', action: handleNewTab },
      { id: 'open-file', category: 'File', title: 'Open File...', shortcut: 'Ctrl+O', action: handleOpenFile },
      { id: 'save-file', category: 'File', title: 'Save File', shortcut: 'Ctrl+S', action: handleSaveFile },
      { id: 'save-as', category: 'File', title: 'Save File As...', shortcut: 'Ctrl+Shift+S', action: handleSaveAsFile },
      { id: 'export-data', category: 'File', title: 'Export Data (CSV, TSV, Markdown, JSON, SQL)...', action: () => setIsExportModalOpen(true) },
      { id: 'sample-sales', category: 'File', title: 'Load Sample: Sales Orders', action: () => handleLoadSample('sales') },
      { id: 'sample-multi', category: 'File', title: 'Load Sample: Multiline Notes & Quotes', action: () => handleLoadSample('multiline') },
      { id: 'sample-large', category: 'File', title: 'Load Sample: 500-Row Performance Test', action: () => handleLoadSample('large') },
      { id: 'undo', category: 'Edit', title: 'Undo', shortcut: 'Ctrl+Z', action: handleUndo },
      { id: 'redo', category: 'Edit', title: 'Redo', shortcut: 'Ctrl+Y', action: handleRedo },
      { id: 'find-replace', category: 'Edit', title: 'Find & Replace', shortcut: 'Ctrl+F', action: () => setIsFindOpen(true) },
      { id: 'sql-console', category: 'Tools', title: 'Open SQL Console (AlaSQL Query)', action: () => setIsSqlModalOpen(true) },
      { id: 'filter-bar', category: 'View', title: 'Toggle Filter Bar', action: () => setIsFilterOpen(!isFilterOpen) },
      { id: 'trim-spaces', category: 'Transform', title: 'Trim Leading and Trailing Whitespace', action: () => handleDataChange(trimWhitespace(activeTab.data), 'Trim Whitespace') },
      { id: 'case-upper', category: 'Transform', title: 'Convert Selection to UPPERCASE', action: () => handleDataChange(transformCase(activeTab.data, 'upper', activeTab.selection), 'Uppercase') },
      { id: 'case-lower', category: 'Transform', title: 'Convert Selection to lowercase', action: () => handleDataChange(transformCase(activeTab.data, 'lower', activeTab.selection), 'Lowercase') },
      { id: 'case-title', category: 'Transform', title: 'Convert Selection to Title Case', action: () => handleDataChange(transformCase(activeTab.data, 'title', activeTab.selection), 'Title Case') },
      { id: 'fill-down', category: 'Transform', title: 'Fill Down Selection', action: () => handleDataChange(fillDown(activeTab.data, activeTab.selection), 'Fill Down') },
      { id: 'fill-empty', category: 'Transform', title: 'Fill Empty Cells From Above', action: () => handleDataChange(fillEmptyFromAbove(activeTab.data), 'Fill Empty From Above') },
      { id: 'dedup', category: 'Transform', title: 'Remove Duplicate Rows', action: () => handleDataChange(removeDuplicateRows(activeTab.data, activeTab.dialect.hasHeader), 'Remove Duplicates') },
      { id: 'theme-toggle', category: 'View', title: 'Toggle Dark / Light Theme', action: () => setIsDarkMode(!isDarkMode) },
      { id: 'zoom-in', category: 'View', title: 'Zoom In', shortcut: 'Ctrl + / Ctrl Wheel', action: handleZoomIn },
      { id: 'zoom-out', category: 'View', title: 'Zoom Out', shortcut: 'Ctrl - / Ctrl Wheel', action: handleZoomOut },
      { id: 'zoom-reset', category: 'View', title: 'Reset Zoom (100%)', shortcut: 'Ctrl 0', action: handleZoomReset },
    ],
    [
      handleNewTab,
      handleOpenFile,
      handleSaveFile,
      handleSaveAsFile,
      handleUndo,
      handleRedo,
      handleZoomIn,
      handleZoomOut,
      handleZoomReset,
      isFilterOpen,
      handleDataChange,
      activeTab.data,
      activeTab.selection,
      activeTab.dialect.hasHeader,
      isDarkMode,
    ]
  );

  const activeCellVal = useMemo(() => {
    const r = activeTab.dialect.hasHeader ? activeTab.selection.activeRow + 1 : activeTab.selection.activeRow;
    return activeTab.data[r]?.[activeTab.selection.activeCol] || '';
  }, [activeTab.data, activeTab.dialect.hasHeader, activeTab.selection.activeCol, activeTab.selection.activeRow]);

  const effectiveHeaders = useMemo(() => {
    if (activeTab.dialect.hasHeader && activeTab.data[0]) {
      return activeTab.data[0];
    }
    return activeTab.headers;
  }, [activeTab.data, activeTab.dialect.hasHeader, activeTab.headers]);

  return (
    <div className="flex flex-col w-full h-full overflow-hidden bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans">
      {/* Tab Bar */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onCloseTab={handleCloseTab}
        onNewTab={handleNewTab}
      />

      {/* Main Toolbar */}
      <MainToolbar
        dialect={activeTab.dialect}
        hasHeader={activeTab.dialect.hasHeader}
        canUndo={getHistoryManager(activeTabId).canUndo()}
        canRedo={getHistoryManager(activeTabId).canRedo()}
        isDarkMode={isDarkMode}
        isFilterOpen={isFilterOpen}
        isFindOpen={isFindOpen}
        onNewFile={handleNewTab}
        onOpenFile={handleOpenFile}
        onSaveFile={handleSaveFile}
        onSaveAsFile={handleSaveAsFile}
        onExport={() => setIsExportModalOpen(true)}
        onLoadSample={handleLoadSample}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onCut={() => {}}
        onCopy={() => {}}
        onPaste={() => {}}
        onToggleFind={() => setIsFindOpen(!isFindOpen)}
        onToggleFilter={() => setIsFilterOpen(!isFilterOpen)}
        onOpenSqlConsole={() => setIsSqlModalOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onToggleHasHeader={() => {
          updateActiveTab(tab => ({
            ...tab,
            dialect: { ...tab.dialect, hasHeader: !tab.dialect.hasHeader },
          }));
        }}
        onUpdateDialect={partial => {
          updateActiveTab(tab => ({
            ...tab,
            dialect: { ...tab.dialect, ...partial },
            isDirty: true,
          }));
        }}
        onInsertRow={() => {
          const insertIdx = activeTab.dialect.hasHeader
            ? activeTab.selection.activeRow + 1
            : activeTab.selection.activeRow;
          handleDataChange(insertRow(activeTab.data, insertIdx), 'Insert Row');
        }}
        onDeleteRow={() => {
          const minR = Math.min(activeTab.selection.startRow, activeTab.selection.endRow);
          const maxR = Math.max(activeTab.selection.startRow, activeTab.selection.endRow);
          const rowsToDelete: number[] = [];
          for (let r = minR; r <= maxR; r++) {
            rowsToDelete.push(activeTab.dialect.hasHeader ? r + 1 : r);
          }
          handleDataChange(deleteRows(activeTab.data, rowsToDelete), 'Delete Rows');
        }}
        onInsertCol={() => {
          handleDataChange(
            insertColumn(activeTab.data, activeTab.selection.activeCol + 1),
            'Insert Column'
          );
        }}
        onDeleteCol={() => {
          const minC = Math.min(activeTab.selection.startCol, activeTab.selection.endCol);
          const maxC = Math.max(activeTab.selection.startCol, activeTab.selection.endCol);
          const colsToDelete: number[] = [];
          for (let c = minC; c <= maxC; c++) colsToDelete.push(c);
          handleDataChange(deleteColumns(activeTab.data, colsToDelete), 'Delete Columns');
        }}
        onSortAsc={() => handleSortColumn(activeTab.selection.activeCol, 'asc')}
        onSortDesc={() => handleSortColumn(activeTab.selection.activeCol, 'desc')}
        onTrimWhitespace={() => handleDataChange(trimWhitespace(activeTab.data), 'Trim Whitespace')}
        onTransformCase={mode =>
          handleDataChange(transformCase(activeTab.data, mode, activeTab.selection), `Case ${mode}`)
        }
        onFillDown={() => handleDataChange(fillDown(activeTab.data, activeTab.selection), 'Fill Down')}
        onDeduplicate={() =>
          handleDataChange(
            removeDuplicateRows(activeTab.data, activeTab.dialect.hasHeader),
            'Remove Duplicates'
          )
        }
      />

      {/* Formula / Cell Bar */}
      <FormulaBar
        selection={activeTab.selection}
        currentValue={activeCellVal}
        hasHeader={activeTab.dialect.hasHeader}
        onValueChange={newVal => {
          const r = activeTab.dialect.hasHeader
            ? activeTab.selection.activeRow + 1
            : activeTab.selection.activeRow;
          const c = activeTab.selection.activeCol;
          const newData = activeTab.data.map(row => [...row]);
          if (!newData[r]) newData[r] = new Array(activeTab.data[0]?.length || 5).fill('');
          newData[r][c] = newVal;
          handleDataChange(newData, 'Formula Bar Edit');
        }}
        onOpenMultiline={() => {
          const r = activeTab.dialect.hasHeader
            ? activeTab.selection.activeRow + 1
            : activeTab.selection.activeRow;
          const c = activeTab.selection.activeCol;
          setMultilineModal({
            isOpen: true,
            row: r,
            col: c,
            value: activeTab.data[r]?.[c] || '',
          });
        }}
      />

      {/* Filter Bar (Conditional) */}
      {isFilterOpen && (
        <FilterBar
          headers={effectiveHeaders}
          filter={activeFilter}
          totalRows={activeTab.dialect.hasHeader ? activeTab.data.length - 1 : activeTab.data.length}
          filteredCount={
            activeTab.dialect.hasHeader ? filteredData.length - 1 : filteredData.length
          }
          onUpdateFilter={newFilter => {
            updateActiveTab(tab => ({
              ...tab,
              filters: newFilter ? [newFilter] : [],
            }));
          }}
          onClose={() => setIsFilterOpen(false)}
        />
      )}

      {/* Main Virtual Grid Viewport */}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden flex flex-col">
        <VirtualGrid
          data={filteredData}
          headers={effectiveHeaders}
          hasHeader={activeTab.dialect.hasHeader}
          sortState={activeTab.sortState}
          customColWidths={activeTab.columnWidths}
          selection={activeTab.selection}
          findMatches={findMatches}
          currentMatchIndex={currentMatchIndex}
          onDataChange={handleDataChange}
          onSelectionChange={sel => updateActiveTab(tab => ({ ...tab, selection: sel }))}
          onColumnWidthsChange={newWidths =>
            updateActiveTab(tab => ({ ...tab, columnWidths: newWidths }))
          }
          onSortColumn={handleSortColumn}
          onOpenMultilineModal={(r, c) => {
            setMultilineModal({
              isOpen: true,
              row: r,
              col: c,
              value: activeTab.data[r]?.[c] || '',
            });
          }}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />

        {/* Floating Find & Replace Bar */}
        {isFindOpen && (
          <FindReplaceBar
            options={findOptions}
            matchCount={findMatches.length}
            currentMatchIndex={currentMatchIndex}
            onUpdateOptions={partial => setFindOptions(prev => ({ ...prev, ...partial }))}
            onFindNext={handleFindNext}
            onFindPrev={handleFindPrev}
            onReplace={handleReplaceCurrent}
            onReplaceAll={handleReplaceAll}
            onClose={() => setIsFindOpen(false)}
          />
        )}
      </div>

      {/* Status Bar */}
      <StatusBar
        selection={activeTab.selection}
        stats={selectionStats}
        totalRows={activeTab.data.length}
        totalCols={activeTab.data[0]?.length || 0}
        hasHeader={activeTab.dialect.hasHeader}
        dialect={activeTab.dialect}
        isDirty={activeTab.isDirty}
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
      />

      {/* Modals */}
      <SqlConsoleModal
        isOpen={isSqlModalOpen}
        data={activeTab.data}
        headers={effectiveHeaders}
        hasHeader={activeTab.dialect.hasHeader}
        onClose={() => setIsSqlModalOpen(false)}
        onOpenInNewTab={(queryData, tabTitle) => {
          loadContentIntoTab(queryData.map(r => r.join(',')).join('\r\n'), tabTitle);
        }}
        onExportCsv={(csvContent, fileName) => {
          exportBlob(csvContent, fileName, 'text/csv');
        }}
      />

      <MultilineEditorModal
        isOpen={multilineModal.isOpen}
        row={multilineModal.row}
        col={multilineModal.col}
        initialValue={multilineModal.value}
        onSave={newVal => {
          const newData = activeTab.data.map(r => [...r]);
          if (!newData[multilineModal.row]) {
            newData[multilineModal.row] = new Array(activeTab.data[0]?.length || 5).fill('');
          }
          newData[multilineModal.row][multilineModal.col] = newVal;
          handleDataChange(newData, 'Multiline Cell Edit');
        }}
        onClose={() => setMultilineModal(prev => ({ ...prev, isOpen: false }))}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        data={activeTab.data}
        headers={effectiveHeaders}
        hasHeader={activeTab.dialect.hasHeader}
        dialect={activeTab.dialect}
        onClose={() => setIsExportModalOpen(false)}
        onDownload={(content, fileName, mimeType) => {
          exportBlob(content, fileName, mimeType);
        }}
      />

      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        commands={commandList}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
};

export default App;
