"use client";

import React, { useState } from "react";
import {
  DownloadOutlined,
  WarningOutlined,
  FileExcelOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Alert,
  Tag,
  Typography,
  Statistic,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { DailyRecord, EmployeeSummary, EmployeeDetail } from "@/types";
import { UniverSheetEditor } from "@/components/common";
import { useExcelGenerator } from "@/hooks/useExcelGenerator";

const { Title, Text } = Typography;

interface Step3ResultsProps {
  summaries: EmployeeSummary[];
  details: EmployeeDetail[];
  onBack: () => void;
  onExportSummary: () => void;
  onExportIndividual: (empName: string) => void;
  onExportAll: () => void;
}

export default function Step3Results({
  summaries,
  details,
  onBack,
  onExportSummary,
  onExportIndividual,
  onExportAll,
}: Step3ResultsProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [periodText, setPeriodText] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorExcelData, setEditorExcelData] = useState<string | null>(null);

  const { isGenerating, generateExcel, downloadExcel } = useExcelGenerator();

  const grandTotal = summaries.reduce((sum, s) => sum + s.netPay, 0);
  const selectedDetail = details.find((d) => d.empName === selectedEmployee);

  // Count warnings
  const totalAutoCheckout = details.reduce(
    (sum, d) => sum + d.autoCheckoutDays.length,
    0,
  );
  const totalForgotCheckin = details.reduce(
    (sum, d) => sum + d.forgotCheckinDays.length,
    0,
  );
  const hasWarnings = totalAutoCheckout > 0 || totalForgotCheckin > 0;

  // Open UniverSheet editor
  const handleOpenEditor = async () => {
    try {
      // Generate Excel data from Python
      const excelBase64 = await generateExcel("all", {
        employees: details.map((d) => ({
          emp_name: d.empName,
          records: d.records,
        })),
        period_text: periodText,
      });
      setEditorExcelData(excelBase64);
      setIsEditorOpen(true);
    } catch (error) {
      console.error("Failed to generate Excel for editor:", error);
    }
  };

  // Export from UniverSheet
  const handleExportFromEditor = async (excelBase64: string) => {
    downloadExcel(
      excelBase64,
      `เงินเดือนพนักงานทุกคน_${periodText || new Date().toISOString().split("T")[0]}.xlsx`,
    );
    setIsEditorOpen(false);
  };

  const summaryColumns: ColumnsType<EmployeeSummary> = [
    {
      title: "ชื่อพนักงาน",
      dataIndex: "name",
      key: "name",
      fixed: "left",
      width: 200,
      render: (name: string, record) => (
        <a
          onClick={() =>
            setSelectedEmployee(selectedEmployee === name ? null : name)
          }
          style={{ color: selectedEmployee === name ? "#FF6B00" : undefined }}
        >
          {name}
        </a>
      ),
    },
    {
      title: "วันที่ทำงาน",
      dataIndex: "totalDays",
      key: "totalDays",
      align: "center",
      width: 100,
      render: (days: number) => <Tag color="blue">{days} วัน</Tag>,
    },
    {
      title: "ชั่วโมงทำงาน",
      dataIndex: "totalHours",
      key: "totalHours",
      align: "center",
      width: 100,
      render: (hours: number) => <Tag color="green">{hours} ชม.</Tag>,
    },
    {
      title: "ค่าจ้างปกติ",
      dataIndex: "basePay",
      key: "basePay",
      align: "center",
      width: 100,
      render: (pay: number) => <Text>{pay.toLocaleString()}</Text>,
    },
    {
      title: "หักมาสาย",
      dataIndex: "totalPenalty",
      key: "totalPenalty",
      align: "center",
      width: 100,
      render: (penalty: number) => (
        <Text type="danger">{penalty.toLocaleString()}</Text>
      ),
    },
    {
      title: "รับเงินสุทธิ",
      dataIndex: "netPay",
      key: "netPay",
      align: "center",
      width: 120,
      render: (pay: number) => (
        <Text strong style={{ color: "#52c41a" }}>
          {pay.toLocaleString()}
        </Text>
      ),
    },
  ];

  const detailColumns: ColumnsType<DailyRecord> = [
    {
      title: "วันที่",
      dataIndex: "date",
      key: "date",
      width: 120,
      fixed: "left",
    },
    {
      title: "เวลาเข้า",
      dataIndex: "checkInTime",
      key: "checkInTime",
      align: "center",
      width: 80,
    },
    {
      title: "สาย (นาที)",
      dataIndex: "lateMinutes",
      key: "lateMinutes",
      align: "center",
      width: 80,
      render: (mins: number) => (mins > 0 ? mins : "-"),
    },
    {
      title: "หัก (บาท)",
      dataIndex: "penalty",
      key: "penalty",
      align: "center",
      width: 80,
      render: (penalty: number) =>
        penalty > 0 ? <Text type="danger">{penalty}</Text> : "-",
    },
    {
      title: "ชั่วโมง",
      dataIndex: "totalHours",
      key: "totalHours",
      align: "center",
      width: 80,
    },
    {
      title: "คิดเป็นเงิน",
      dataIndex: "basePay",
      key: "basePay",
      align: "center",
      width: 100,
      render: (pay: number) => pay.toLocaleString(),
    },
    {
      title: "หมายเหตุ",
      dataIndex: "note",
      key: "note",
      ellipsis: true,
      width: 200,
      render: (note: string) => (
        <Text type="secondary" style={{ fontSize: "12px" }}>
          {note || "-"}
        </Text>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Title level={2}>📊 ผลการคำนวณเงินเดือน</Title>
      </div>

      {/* Warnings */}
      {hasWarnings && (
        <Alert
          title={
            <Space orientation="vertical" style={{ width: "100%" }}>
              {totalAutoCheckout > 0 && (
                <Text>
                  ⚠️ มี <strong>{totalAutoCheckout}</strong> วันที่ระบบเติม
                  checkout อัตโนมัติ
                </Text>
              )}
              {totalForgotCheckin > 0 && (
                <Text>
                  ⚠️ มี <strong>{totalForgotCheckin}</strong>{" "}
                  วันที่พนักงานลืมตอกบัตรเข้างาน
                </Text>
              )}
            </Space>
          }
          type="warning"
          showIcon
          icon={<WarningOutlined />}
        />
      )}

      {/* Summary Table */}
      <Card
        title={
          <Space>
            <TeamOutlined />
            <Text strong>สรุปยอดจ่ายเงินพนักงาน ({summaries.length} คน)</Text>
          </Space>
        }
        extra={
          <Statistic
            title="ยอดรวมทั้งหมด"
            value={grandTotal}
            precision={0}
            styles={{ content: { color: "#52c41a" } }}
            suffix="บาท"
          />
        }
      >
        <Table
          columns={summaryColumns}
          dataSource={summaries}
          rowKey="name"
          pagination={false}
          size="small"
          scroll={{ y: 300 }}
          onRow={(record) => ({
            onClick: () =>
              setSelectedEmployee(
                selectedEmployee === record.name ? null : record.name,
              ),
            style: {
              cursor: "pointer",
              backgroundColor:
                selectedEmployee === record.name ? "#fff7e6" : undefined,
            },
          })}
        />
      </Card>

      {/* Employee Detail View */}
      {selectedDetail && (
        <Card
          title={
            <Space>
              <UserOutlined />
              <Text strong>รายละเอียด: {selectedDetail.empName}</Text>
            </Space>
          }
          extra={
            <Button
              type="primary"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => onExportIndividual(selectedDetail.empName)}
            >
              ดาวน์โหลด Excel
            </Button>
          }
        >
          <Table
            columns={detailColumns}
            dataSource={selectedDetail.records}
            rowKey="date"
            pagination={false}
            size="small"
            scroll={{ y: 300 }}
            footer={() => (
              <Space
                className="w-full"
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                <Space>
                  <Tag color="blue">{selectedDetail.totalDays} วัน</Tag>
                  <Tag color="green">{selectedDetail.totalHours} ชม.</Tag>
                  <Tag color="red">หัก: {selectedDetail.totalPenalty} บาท</Tag>
                </Space>
                <Text strong style={{ color: "#52c41a", fontSize: "16px" }}>
                  สุทธิ: {selectedDetail.netPay.toLocaleString()} บาท
                </Text>
              </Space>
            )}
          />
        </Card>
      )}

      {/* Export Options */}
      <Card
        size="small"
        title={
          <Space>
            <FileExcelOutlined />
            <Text strong>ส่งออก Excel</Text>
          </Space>
        }
      >
        <Space.Compact block>
          <Input
            value={periodText}
            onChange={(e) => setPeriodText(e.target.value)}
            placeholder="ระบุช่วงวันที่ (เช่น 16-31 ธ.ค. 68)"
            style={{ flex: 1 }}
          />
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleOpenEditor}
            loading={isGenerating}
          >
            ดาวน์โหลดทุกคน (รวม) - แก้ไขได้
          </Button>
          <Button icon={<DownloadOutlined />} onClick={onExportSummary}>
            ดาวน์โหลดสรุปยอด
          </Button>
        </Space.Compact>
      </Card>

      {/* Back button */}
      <div className="flex justify-center">
        <Button size="large" onClick={onBack}>
          🔙 กลับไปแก้ไขค่าจ้าง
        </Button>
      </div>

      {/* UniverSheet Editor Modal */}
      <UniverSheetEditor
        open={isEditorOpen}
        title="แก้ไข Excel - ทุกคน"
        excelBase64={editorExcelData}
        onExport={(exportedBase64) => {
          downloadExcel(
            exportedBase64,
            `เงินเดือนพนักงานทุกคน_${periodText || new Date().toISOString().split("T")[0]}.xlsx`
          );
          setEditorExcelData(null);
          setIsEditorOpen(false);
        }}
        onCancel={() => {
          setEditorExcelData(null);
          setIsEditorOpen(false);
        }}
      />
    </div>
  );
}
