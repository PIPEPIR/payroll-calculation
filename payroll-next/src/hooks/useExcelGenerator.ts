"use client";

import { useState, useCallback } from 'react';
import { EmployeeDetail } from '@/types';

interface UseExcelGeneratorReturn {
  isGenerating: boolean;
  error: string | null;
  generateExcel: (
    command: 'summary' | 'individual' | 'all',
    data: any
  ) => Promise<string>;
  downloadExcel: (base64Data: string, filename: string) => void;
  clearError: () => void;
}

export function useExcelGenerator(): UseExcelGeneratorReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateExcel = useCallback(async (
    command: 'summary' | 'individual' | 'all',
    data: any
  ): Promise<string> => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, data }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate Excel');
      }

      const result = await response.json();
      return result.excelBase64;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate Excel';
      setError(errorMessage);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const downloadExcel = useCallback((base64Data: string, filename: string) => {
    const link = document.createElement('a');
    link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64Data}`;
    link.download = filename;
    link.click();
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isGenerating,
    error,
    generateExcel,
    downloadExcel,
    clearError,
  };
}
