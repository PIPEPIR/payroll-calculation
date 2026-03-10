/**
 * Shared types for the Payroll application
 */

// Raw data from PDF parsing
export interface RawDataItem {
  staffId: string;
  fullName: string;
  timestamp: string;
  recordType: string;
}

// Employee wage settings
export interface EmployeeSetting {
  key: string;
  name: string;
  dailyRate: number;
}

// Daily payroll record
export interface DailyRecord {
  staffId: string;
  name: string;
  date: string;
  checkInTime: string;
  basePay: number;
  tip: number;
  totalPay: number;
  advance: string;
  netPay: number;
  lateMinutes: number;
  penalty: number;
  totalHours: number;
  note: string;
}

// Employee summary for display
export interface EmployeeSummary {
  name: string;
  totalDays: number;
  totalHours: number;
  basePay: number;
  totalPenalty: number;
  netPay: number;
}

// Employee detail with records
export interface EmployeeDetail {
  empName: string;
  staffId: string;
  records: DailyRecord[];
  totalDays: number;
  totalHours: number;
  totalPenalty: number;
  basePay: number;
  netPay: number;
  autoCheckoutDays: string[];
  forgotCheckinDays: string[];
}

// PDF parsing results
export interface ParsedPdfData {
  staffId: string;
  fullName: string;
  timestamp: string;
  recordType: string;
  _isValid: boolean;
  _parseErrors: string[];
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

export interface PdfParseResult {
  data: ParsedPdfData[];
  errors: ParseError[];
  warnings: ParseError[];
  stats: ParseStats;
}

// Step workflow state
export type WorkflowStep = 1 | 2 | 3;

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
