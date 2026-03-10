/**
 * PDF parsing utility
 * Uses server-side Python parser with PyMuPDF for better Thai support
 * Backend deployed separately on Railway/Render
 */

// Configure your backend URL
// Set this in .env.local: NEXT_PUBLIC_PDF_BACKEND_URL=https://your-app.railway.app
const BACKEND_URL = process.env.NEXT_PUBLIC_PDF_BACKEND_URL || 'http://localhost:8000';

export interface ParsedPdfData {
  staffId: string;
  fullName: string;
  timestamp: string;
  recordType: string;
  _isValid: boolean;
  _parseErrors: string[];
}

export interface PdfParseResult {
  data: ParsedPdfData[];
  errors: ParseError[];
  warnings: ParseError[];
  stats: ParseStats;
}

export interface ParseError {
  line: number;
  content: string;
  error: string;
}

export interface ParseStats {
  totalLines: number;
  validRecords: number;
  invalidRecords: number;
  uniqueEmployees: number;
  dateRange: {
    earliest: string | null;
    latest: string | null;
  };
}

/**
 * Parse PDF using server-side Python API with PyMuPDF
 */
export async function parsePdfFile(file: File): Promise<PdfParseResult> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${BACKEND_URL}/parse-pdf`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to parse PDF');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error(`ไม่สามารถอ่านไฟล์ PDF ได้: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parse multiple PDF files
 */
export async function parseMultiplePdfFiles(files: File[]): Promise<{
  allData: ParsedPdfData[];
  totalStats: ParseStats;
  fileResults: { fileName: string; result: PdfParseResult }[];
}> {
  const fileResults = [];
  const allData: ParsedPdfData[] = [];

  let totalValid = 0;
  let totalInvalid = 0;
  const allEmployees = new Set<string>();
  let globalEarliest: string | null = null;
  let globalLatest: string | null = null;

  for (const file of files) {
    const result = await parsePdfFile(file);
    fileResults.push({ fileName: file.name, result });
    allData.push(...result.data);

    totalValid += result.stats.validRecords;
    totalInvalid += result.stats.invalidRecords;

    result.data.forEach(d => {
      if (d._isValid) {
        allEmployees.add(d.fullName);
      }
    });

    if (result.stats.dateRange.earliest) {
      if (!globalEarliest || result.stats.dateRange.earliest < globalEarliest) {
        globalEarliest = result.stats.dateRange.earliest;
      }
    }
    if (result.stats.dateRange.latest) {
      if (!globalLatest || result.stats.dateRange.latest > globalLatest) {
        globalLatest = result.stats.dateRange.latest;
      }
    }
  }

  return {
    allData,
    fileResults,
    totalStats: {
      totalLines: fileResults.reduce((sum, r) => sum + r.result.stats.totalLines, 0),
      validRecords: totalValid,
      invalidRecords: totalInvalid,
      uniqueEmployees: allEmployees.size,
      dateRange: {
        earliest: globalEarliest,
        latest: globalLatest,
      },
    },
  };
}

export function getValidRecords(data: ParsedPdfData[]): ParsedPdfData[] {
  return data.filter(record => record._isValid);
}
