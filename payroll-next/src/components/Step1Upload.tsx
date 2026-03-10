"use client";

import React from 'react';
import { FileUpload } from '@/components/common';
import { usePdfParser } from '@/hooks/usePdfParser';

interface Step1UploadProps {
  onFilesProcessed: (data: { staffId: string; fullName: string; timestamp: string; recordType: string }[]) => void;
  onError: (error: string) => void;
}

export default function Step1Upload({ onFilesProcessed, onError }: Step1UploadProps) {
  const {
    isParsing,
    error,
    parseResults,
    parseFiles,
    clearError,
  } = usePdfParser(onFilesProcessed, onError);

  return (
    <div className="space-y-6">
      <FileUpload
        onFilesProcessed={parseFiles}
        onError={onError}
        isProcessing={isParsing}
      />
      
      {/* Store parse results for parent component */}
      {parseResults.length > 0 && (
        <div className="hidden" data-parse-results={JSON.stringify(parseResults)} />
      )}
      
      {error && (
        <div className="hidden" data-parse-error={error} />
      )}
    </div>
  );
}
