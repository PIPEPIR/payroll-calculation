"use client";

import React, { useState, useCallback } from 'react';
import { calculateEmployeePayroll } from '@/lib/payroll';
import {
  exportSummaryToExcel,
  exportIndividualExcel,
  exportAllEmployeesExcel,
  EmployeeSummary,
  DailyRecord,
} from '@/lib/excel-export';
import StepIndicator from '@/components/StepIndicator';
import Sidebar from '@/components/Sidebar';
import Step1Upload from '@/components/Step1Upload';
import Step2Settings from '@/components/Step2Settings';
import Step3Results from '@/components/Step3Results';
import { RawDataItem, EmployeeDetail } from '@/types';
import { AlertCircle } from 'lucide-react';

interface EmployeeSetting {
  name: string;
  dailyRate: number;
}

export default function Home() {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<RawDataItem[]>([]);
  const [settings, setSettings] = useState<EmployeeSetting[]>([]);
  const [summaries, setSummaries] = useState<EmployeeSummary[]>([]);
  const [details, setDetails] = useState<EmployeeDetail[]>([]);
  const [periodText, setPeriodText] = useState('');

  // Handle step 1 completion
  const handleFilesProcessed = useCallback((data: { staffId: string; fullName: string; timestamp: string; recordType: string }[]) => {
    setRawData(data);
    const names = Array.from(new Set(data.map(d => d.fullName))).sort();
    setSettings(names.map(name => ({ name, dailyRate: 300 })));
    setStep(2);
    setError(null);
  }, []);

  // Handle step 2 completion
  const handleConfirmSettings = useCallback(async (newSettings: { name: string; dailyRate: number }[]) => {
    setSettings(newSettings);
    
    const rateLookup = new Map(newSettings.map(s => [s.name, s.dailyRate]));
    const newSummaries: EmployeeSummary[] = [];
    const newDetails: EmployeeDetail[] = [];

    // Group data by employee
    const byEmployee = new Map<string, RawDataItem[]>();
    for (const item of rawData) {
      if (!byEmployee.has(item.fullName)) {
        byEmployee.set(item.fullName, []);
      }
      byEmployee.get(item.fullName)!.push(item);
    }

    for (const [empName, empData] of Array.from(byEmployee.entries())) {
      const dailyRate = rateLookup.get(empName);
      if (dailyRate === undefined) continue;

      const staffId = empData[0]?.staffId || '';
      const timestamps = empData
        .map(d => new Date(d.timestamp))
        .filter(d => !isNaN(d.getTime()));

      const result = calculateEmployeePayroll(timestamps, dailyRate, staffId, empName);
      const basePay = result.totalDays * dailyRate;
      const netPay = basePay - result.totalPenalty;

      newSummaries.push({
        name: empName,
        totalDays: result.totalDays,
        totalHours: result.totalHours,
        basePay,
        totalPenalty: result.totalPenalty,
        netPay,
      });

      newDetails.push({
        empName,
        staffId,
        records: result.records,
        totalDays: result.totalDays,
        totalHours: result.totalHours,
        totalPenalty: result.totalPenalty,
        basePay,
        netPay,
        autoCheckoutDays: result.autoCheckoutDays,
        forgotCheckinDays: result.forgotCheckinDays,
      });
    }

    setSummaries(newSummaries);
    setDetails(newDetails);
    setStep(3);
  }, [rawData]);

  // Handle exports
  const handleExportSummary = useCallback(async () => {
    try {
      const blob = await exportSummaryToExcel(summaries);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `สรุปยอดจ่ายเงิน_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`ส่งออก Excel ไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [summaries]);

  const handleExportIndividual = useCallback(async (empName: string) => {
    try {
      const detail = details.find(d => d.empName === empName);
      if (!detail) return;

      const blob = await exportIndividualExcel(empName, detail.records, periodText);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `เงินเดือน_${empName.replace(/[\/\\]/g, '-')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`ส่งออก Excel ไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [details, periodText]);

  const handleExportAll = useCallback(async () => {
    try {
      const employeesData = details.map(d => ({ empName: d.empName, records: d.records }));
      const blob = await exportAllEmployeesExcel(employeesData, periodText);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `เงินเดือนพนักงานทุกคน_${periodText || new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`ส่งออก Excel ไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [details, periodText]);

  // Handle back navigation
  const handleBackToUpload = useCallback(() => {
    setStep(1);
    setRawData([]);
    setSettings([]);
    setSummaries([]);
    setDetails([]);
    setError(null);
  }, []);

  const handleBackToSettings = useCallback(() => {
    setStep(2);
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      
      <main className="ml-72 p-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">📝 ระบบคิดเงินเดือน</h1>
          
          <StepIndicator currentStep={step} />

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 flex-1">
                {error}
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          )}

          {step === 1 && (
            <Step1Upload
              onFilesProcessed={handleFilesProcessed}
              onError={setError}
            />
          )}

          {step === 2 && (
            <Step2Settings
              rawData={rawData}
              initialSettings={settings.map((s, i) => ({ key: `emp-${i}`, name: s.name, dailyRate: s.dailyRate }))}
              onConfirm={handleConfirmSettings}
              onBack={handleBackToUpload}
            />
          )}

          {step === 3 && (
            <Step3Results
              summaries={summaries}
              details={details}
              onBack={handleBackToSettings}
              onExportSummary={handleExportSummary}
              onExportIndividual={handleExportIndividual}
              onExportAll={handleExportAll}
            />
          )}
        </div>
      </main>
    </div>
  );
}
