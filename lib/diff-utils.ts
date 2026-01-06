import type { DiffCell, DiffRow, DiffData } from '@/types/diff';

/**
 * Compare two cell values and return a DiffCell
 */
export function compareCells(
  original: string | null | undefined,
  fixed: string | null | undefined
): DiffCell {
  const origStr = original?.toString().trim() ?? null;
  const fixedStr = fixed?.toString().trim() ?? null;

  return {
    original: origStr,
    fixed: fixedStr,
    hasChange: origStr !== fixedStr,
  };
}

/**
 * Generate diff data by comparing original and processed rows
 */
export function generateDiffData(
  originalRows: Record<string, unknown>[],
  processedRows: Record<string, unknown>[],
  columns: string[]
): DiffData {
  const rows: DiffRow[] = [];
  let totalCellChanges = 0;
  let changedRows = 0;

  // Use the longer array length to handle added/removed rows
  const maxLength = Math.max(originalRows.length, processedRows.length);

  for (let i = 0; i < maxLength; i++) {
    const original = originalRows[i] || {};
    const processed = processedRows[i] || {};

    const cells: Record<string, DiffCell> = {};
    let rowHasChanges = false;

    for (const col of columns) {
      const cell = compareCells(
        original[col] as string | null,
        processed[col] as string | null
      );
      cells[col] = cell;

      if (cell.hasChange) {
        totalCellChanges++;
        rowHasChanges = true;
      }
    }

    if (rowHasChanges) {
      changedRows++;
    }

    rows.push({
      rowIndex: i,
      cells,
      hasChanges: rowHasChanges,
    });
  }

  return {
    columns,
    rows,
    summary: {
      totalRows: maxLength,
      changedRows,
      totalCellChanges,
    },
  };
}

/**
 * Parse CSV string into headers and rows
 */
export function parseCSVData(csvString: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const lines = csvString.trim().split('\n');

  if (lines.length === 0 || !lines[0]) {
    return { headers: [], rows: [] };
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const values = parseCSVLine(line);
    const row: Record<string, string> = {};

    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });

    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else if (char === '"') {
        // End of quoted value
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        // Start of quoted value
        inQuotes = true;
      } else if (char === ',') {
        // End of field
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }

  // Don't forget the last value
  values.push(current.trim());

  return values;
}

/**
 * Get only the rows that have changes (for summary view)
 */
export function getChangedRows(diffData: DiffData): DiffRow[] {
  return diffData.rows.filter(row => row.hasChanges);
}

/**
 * Paginate diff rows
 */
export function paginateDiffRows(
  rows: DiffRow[],
  page: number,
  pageSize: number = 100
): {
  rows: DiffRow[];
  totalPages: number;
  currentPage: number;
  hasNext: boolean;
  hasPrev: boolean;
} {
  const totalPages = Math.ceil(rows.length / pageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;

  return {
    rows: rows.slice(start, end),
    totalPages,
    currentPage,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
  };
}
