"use client";

import React, { useState, useCallback } from "react";
import { calculateEmployeePayroll } from "@/lib/payroll";
import {
  exportSummaryToExcel,
  exportIndividualExcel,
  exportAllEmployeesExcel,
  EmployeeSummary,
  DailyRecord,
} from "@/lib/excel-export";
import StepIndicator from "@/components/StepIndicator";
import Step1Upload from "@/components/Step1Upload";
import Step2Settings from "@/components/Step2Settings";
import Step3Results from "@/components/Step3Results";
import { RawDataItem, EmployeeDetail } from "@/types";
import { AlertCircle } from "lucide-react";
import { Button, Modal, Typography, Divider, Spin, message } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface EmployeeSetting {
  name: string;
  dailyRate: number;
}

export default function Home() {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [messageApi, messageContextHolder] = message.useMessage();
  const [rawData, setRawData] = useState<RawDataItem[]>([]);
  const [settings, setSettings] = useState<EmployeeSetting[]>([]);
  const [summaries, setSummaries] = useState<EmployeeSummary[]>([]);
  const [details, setDetails] = useState<EmployeeDetail[]>([]);
  const [periodText, setPeriodText] = useState("");

  // Handle step 1 completion
  const handleFilesProcessed = useCallback(
    (
      data: {
        staffId: string;
        fullName: string;
        timestamp: string;
        recordType: string;
      }[],
    ) => {
      setRawData(data);
      const names = Array.from(new Set(data.map((d) => d.fullName))).sort();
      setSettings(names.map((name) => ({ name, dailyRate: 300 })));
      setStep(2);
      setError(null);
      messageApi.success(`อ่านข้อมูลสำเร็จ — พบพนักงาน ${names.length} คน`);
    },
    [messageApi],
  );

  // Handle step 2 completion
  const handleConfirmSettings = useCallback(
    async (newSettings: { name: string; dailyRate: number }[]) => {
      setSettings(newSettings);
      setIsCalculating(true);
      // Yield to let React render the loading state before synchronous calculation
      await new Promise((resolve) => setTimeout(resolve, 0));

      const rateLookup = new Map(newSettings.map((s) => [s.name, s.dailyRate]));
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

        const staffId = empData[0]?.staffId || "";
        const timestamps = empData
          .map((d) => new Date(d.timestamp))
          .filter((d) => !isNaN(d.getTime()));

        const result = calculateEmployeePayroll(
          timestamps,
          dailyRate,
          staffId,
          empName,
        );
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
      setIsCalculating(false);
      setStep(3);
    },
    [rawData],
  );

  // Handle exports
  const handleExportSummary = useCallback(async () => {
    try {
      const blob = await exportSummaryToExcel(summaries);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `สรุปยอดจ่ายเงิน_${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        `ส่งออก Excel ไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }, [summaries]);

  const handleExportIndividual = useCallback(
    async (empName: string) => {
      try {
        const detail = details.find((d) => d.empName === empName);
        if (!detail) return;

        const blob = await exportIndividualExcel(
          empName,
          detail.records,
          periodText,
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `เงินเดือน_${empName.replace(/[\/\\]/g, "-")}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        setError(
          `ส่งออก Excel ไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
    [details, periodText],
  );

  const handleExportAll = useCallback(async () => {
    try {
      const employeesData = details.map((d) => ({
        empName: d.empName,
        records: d.records,
      }));
      const blob = await exportAllEmployeesExcel(employeesData, periodText);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `เงินเดือนพนักงานทุกคน_${periodText || new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        `ส่งออก Excel ไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`,
      );
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
    <div className="min-h-screen bg-gray-50">
      {messageContextHolder}
      <main className="py-10 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Page title row */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              ระบบคิดเงินเดือน
            </h1>
            <Button
              type="text"
              icon={<QuestionCircleOutlined />}
              onClick={() => setShowHelp(true)}
              className="text-gray-500 hover:text-gray-700"
            >
              วิธีใช้งาน
            </Button>
          </div>

          <StepIndicator currentStep={step} />

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 flex-1">{error}</div>
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
            <Spin spinning={isCalculating} size="large">
              <Step2Settings
                rawData={rawData}
                initialSettings={settings.map((s, i) => ({
                  key: `emp-${i}`,
                  name: s.name,
                  dailyRate: s.dailyRate,
                }))}
                onConfirm={handleConfirmSettings}
                onBack={handleBackToUpload}
              />
            </Spin>
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

      {/* Help modal */}
      <Modal
        title="วิธีใช้งานระบบ"
        open={showHelp}
        onCancel={() => setShowHelp(false)}
        footer={null}
        width={480}
      >
        <div className="space-y-4 py-2">
          <div>
            <Text strong className="block mb-2">
              ขั้นตอนการใช้งาน
            </Text>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
              <li>
                <strong>อัปโหลด PDF</strong> — ไฟล์จากเครื่องตอกบัตรมาตรฐาน
                (รองรับหลายไฟล์)
              </li>
              <li>
                <strong>ตั้งค่าค่าจ้าง</strong> —
                ระบุอัตราค่าจ้างพื้นฐานรายวันของแต่ละคน
              </li>
              <li>
                <strong>ตรวจสอบ & ส่งออก</strong> — ดูผลลัพธ์และดาวน์โหลด Excel
              </li>
            </ol>
          </div>
          <Divider className="my-3" />
          <div>
            <Text strong className="block mb-2">
              รูปแบบ PDF ที่รองรับ
            </Text>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>ออกจากเครื่องตอกบัตรรุ่นมาตรฐาน</li>
              <li>
                แต่ละแถวประกอบด้วย: รหัส / ชื่อ / วันที่-เวลา / ประเภทบันทึก
              </li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
}
