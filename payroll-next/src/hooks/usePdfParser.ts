"use client";

import { useState, useCallback } from 'react';
import { parseMultiplePdfFiles, getValidRecords, PdfParseResult } from '@/lib/pdf-parser';

interface UsePdfParserReturn {
  isParsing: boolean;
  error: string | null;
  parseResults: { fileName: string; result: PdfParseResult }[];
  parseFiles: (files: File[]) => Promise<void>;
  clearError: () => void;
}

export function usePdfParser(
  onSuccess: (data: { staffId: string; fullName: string; timestamp: string; recordType: string }[]) => void,
  onError: (error: string) => void
): UsePdfParserReturn {
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseResults, setParseResults] = useState<{ fileName: string; result: PdfParseResult }[]>([]);

  const parseFiles = useCallback(async (files: File[]) => {
    const pdfFiles = files.filter(f => f.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
      onError('กรุณาเลือกไฟล์ PDF');
      return;
    }

    setIsParsing(true);
    setError(null);

    try {
      const { allData, totalStats, fileResults } = await parseMultiplePdfFiles(pdfFiles);
      setParseResults(fileResults);

      const totalErrors = fileResults.reduce((sum, r) => sum + r.result.errors.length, 0);
      const totalWarnings = fileResults.reduce((sum, r) => sum + r.result.warnings.length, 0);

      if (totalStats.validRecords === 0) {
        onError('ไม่พบข้อมูลแถวที่ถูกต้องในไฟล์');
        setParseResults([]);
        return;
      }

      const validRecords = getValidRecords(allData).map(r => ({
        staffId: r.staffId,
        fullName: r.fullName,
        timestamp: r.timestamp,
        recordType: r.recordType,
      }));

      onSuccess(validRecords);

      if (totalErrors > 0 || totalWarnings > 0) {
        setError(`พบข้อผิดพลาด ${totalErrors} รายการ และคำเตือน ${totalWarnings} รายการ`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการอ่านไฟล์';
      onError(errorMessage);
      setParseResults([]);
    } finally {
      setIsParsing(false);
    }
  }, [onSuccess, onError]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isParsing,
    error,
    parseResults,
    parseFiles,
    clearError,
  };
}
