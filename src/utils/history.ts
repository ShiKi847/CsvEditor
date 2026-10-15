export interface HistoryState {
  data: string[][];
  description?: string;
}

export class HistoryManager {
  private undoStack: HistoryState[] = [];
  private redoStack: HistoryState[] = [];
  private maxHistory: number;

  constructor(maxHistory = 50) {
    this.maxHistory = maxHistory;
  }

  public pushState(data: string[][], description?: string): void {
    // Clone data for safety
    const cloned = data.map(row => [...row]);
    this.undoStack.push({ data: cloned, description });
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    // Clear redo on new action
    this.redoStack = [];
  }

  public undo(currentData: string[][]): HistoryState | null {
    if (this.undoStack.length === 0) return null;
    const previous = this.undoStack.pop()!;
    // Save current to redo stack
    this.redoStack.push({ data: currentData.map(row => [...row]) });
    return previous;
  }

  public redo(currentData: string[][]): HistoryState | null {
    if (this.redoStack.length === 0) return null;
    const next = this.redoStack.pop()!;
    // Save current to undo stack
    this.undoStack.push({ data: currentData.map(row => [...row]) });
    return next;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
