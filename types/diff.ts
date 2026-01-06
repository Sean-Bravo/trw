export interface DiffCell {
  original: string | null;
  fixed: string | null;
  hasChange: boolean;
}

export interface DiffRow {
  rowIndex: number;
  cells: Record<string, DiffCell>;
  hasChanges: boolean;
}

export interface DiffData {
  columns: string[];
  rows: DiffRow[];
  summary: {
    totalRows: number;
    changedRows: number;
    totalCellChanges: number;
  };
}

export type ViewMode = 'clean' | 'diff';
