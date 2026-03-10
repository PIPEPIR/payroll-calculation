"use client";

import * as XLSX from 'xlsx';

export interface FortuneSheetData {
  name: string;
  status: string;
  order: string;
  data: any[][];
  config: any;
  index: string;
  row: number;
  column: number;
}

/**
 * Parse Excel file (base64) and convert to FortuneSheet format
 */
export function parseExcelToFortuneSheet(base64Data: string): FortuneSheetData[] {
  // Decode base64
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  // Parse with xlsx
  const workbook = XLSX.read(bytes, { type: 'array' });
  const sheets: FortuneSheetData[] = [];

  workbook.SheetNames.forEach((sheetName, index) => {
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to 2D array
    const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    
    // Convert to FortuneSheet cell format
    const data: any[][] = [];
    let maxCols = 0;

    jsonData.forEach((row, rowIndex) => {
      const fortuneRow: any[] = [];
      row.forEach((cell, colIndex) => {
        if (cell !== null && cell !== undefined) {
          fortuneRow[colIndex] = {
            v: cell,
            ct: { fa: 'General' },
          };
          maxCols = Math.max(maxCols, colIndex + 1);
        }
      });
      if (fortuneRow.length > 0) {
        data.push(fortuneRow);
      }
    });

    sheets.push({
      name: sheetName,
      status: '1',
      order: index.toString(),
      data,
      config: {},
      index: index.toString(),
      row: data.length + 10,
      column: Math.max(maxCols, 9),
    });
  });

  return sheets;
}

/**
 * Convert FortuneSheet data back to Excel base64
 */
export async function fortuneSheetToExcel(workbookData: any[]): Promise<string> {
  const wb: any = XLSX.utils.book_new();
  
  workbookData.forEach((sheet: any) => {
    // Convert FortuneSheet cells to 2D array
    const data: any[][] = [];
    sheet.data.forEach((row: any[]) => {
      const jsRow: any[] = [];
      row.forEach((cell: any) => {
        if (cell && cell.v !== undefined) {
          jsRow.push(cell.v);
        } else {
          jsRow.push(null);
        }
      });
      if (jsRow.length > 0) {
        data.push(jsRow);
      }
    });

    // Create sheet
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });

  // Convert to base64
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
  return wbout;
}
