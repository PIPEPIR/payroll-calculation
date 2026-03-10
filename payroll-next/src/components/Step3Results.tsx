"use client";

import React, { useState } from "react";
import dayjs from "dayjs";
import {
  DownloadOutlined,
  WarningOutlined,
  FileExcelOutlined,
  TeamOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
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
  Modal,
  DatePicker,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { DailyRecord, EmployeeSummary, EmployeeDetail } from "@/types";
import { UniverSheetEditor } from "@/components/common";
import { exportAllEmployeesExcel } from "@/lib/excel-export";

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
  const [highlightedDate, setHighlightedDate] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorExcelData, setEditorExcelData] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);

  const grandTotal = summaries.reduce((sum, s) => sum + s.netPay, 0);
  const selectedDetail = details.find((d) => d.empName === selectedEmployee);

  // Count warnings
  const totalAutoCheckout = details.reduce(
    (sum, d) => sum + d.autoCheckoutDays.length,
    0,
  );
  const forgotCheckinEmployees = details.filter(
    (d) => d.forgotCheckinDays.length > 0,
  );

  // Format date range as Thai: "16-31 ธ.ค. 68"
  const formatPeriodText = (range: [dayjs.Dayjs, dayjs.Dayjs] | null): string => {
    if (!range) return "";
    const [start, end] = range;
    const monthsThai = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const startMonth = monthsThai[start.month()];
    const endMonth = monthsThai[end.month()];
    // Buddhist Era year (พ.ศ.) - last 2 digits only
    const startYear = ((start.year() + 543) % 100);
    const endYear = ((end.year() + 543) % 100);
    
    if (start.month() === end.month() && start.year() === end.year()) {
      return `${start.date()}-${end.date()} ${startMonth} ${startYear}`;
    } else if (start.year() === end.year()) {
      return `${start.date()} ${startMonth} - ${end.date()} ${endMonth} ${endYear}`;
    } else {
      return `${start.date()} ${startMonth} ${startYear} - ${end.date()} ${endMonth} ${endYear}`;
    }
  };

  const periodText = formatPeriodText(dateRange);

  const openEmployeeDetail = (empName: string, targetDate?: string) => {
    setSelectedEmployee(empName);
    setHighlightedDate(targetDate || null);
    setIsDetailModalOpen(true);
  };

  const closeEmployeeDetail = () => {
    setIsDetailModalOpen(false);
    setTimeout(() => {
      setHighlightedDate(null);
    }, 200);
  };

  const downloadBase64Excel = (base64: string, filename: string) => {
    const link = document.createElement("a");
    link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
    link.download = filename;
    link.click();
  };

  // Open UniverSheet editor — fully client-side, no API call
  const handleOpenEditor = async () => {
    try {
      setIsGenerating(true);
      const blob = await exportAllEmployeesExcel(
        details.map((d) => ({ empName: d.empName, records: d.records })),
        periodText,
      );
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () =>
          resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      setEditorExcelData(base64);
      setIsEditorOpen(true);
    } catch (error) {
      console.error("Failed to generate Excel for editor:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const summaryColumns: ColumnsType<EmployeeSummary> = [
    {
      title: "ชื่อพนักงาน",
      dataIndex: "name",
      key: "name",
      fixed: "left",
      width: 220,
      render: (name: string, record) => (
        <span
          onClick={() => openEmployeeDetail(name)}
          style={{
            color: "#1890ff",
            cursor: "pointer",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <EyeOutlined />
          {name}
        </span>
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
      render: (note: string, record) => {
        if (!note)
          return (
            <Text type="secondary" style={{ fontSize: "12px" }}>
              -
            </Text>
          );

        // Forgot to clock in - critical (red with close icon)
        if (note.includes("ลืมตอกบัตรเข้างาน")) {
          return (
            <Tag
              color="red"
              icon={<CloseCircleOutlined />}
              style={{ fontWeight: 600 }}
            >
              ลืมตอกบัตรเข้างาน
            </Tag>
          );
        }

        // Auto-checkout - warning (orange with clock icon)
        if (note.includes("เติม checkout") || note.includes("อัตโนมัติ")) {
          return (
            <Tag color="orange" icon={<ClockCircleOutlined />}>
              เติม checkout 23:59
            </Tag>
          );
        }

        return (
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {note}
          </Text>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Title level={3} className="font-semibold text-gray-800">
          ผลการคำนวณเงินเดือน
        </Title>
      </div>

      {/* Critical: Forgot check-in */}
      {forgotCheckinEmployees.length > 0 && (
        <Alert
          type="error"
          showIcon
          icon={<ExclamationCircleOutlined />}
          description={
            <div>
              <Text strong style={{ color: "#cf1322" }}>
                พบพนักงานลืมตอกบัตรเข้างาน — ข้ามการคำนวณวันดังกล่าว
              </Text>
              <div style={{ marginTop: 8 }}>
                {forgotCheckinEmployees.map((d) => (
                  <div
                    key={d.empName}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEmployeeDetail(d.empName);
                    }}
                    style={{
                      marginBottom: 8,
                      padding: "10px 14px",
                      backgroundColor: "#fff1f0",
                      borderRadius: "6px",
                      border: "1px solid #ffa39e",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                      e.currentTarget.style.backgroundColor = "#fff1f0";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "6px",
                      }}
                    >
                      <span
                        onClick={() => openEmployeeDetail(d.empName)}
                        style={{
                          color: "#d4380d",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          cursor: "pointer",
                        }}
                      >
                        <EyeOutlined />
                        {d.empName}
                      </span>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 400,
                          color: "#666",
                        }}
                      >
                        (คลิกชื่อเพื่อดูรายละเอียด)
                      </span>
                    </div>
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
                    >
                      {d.forgotCheckinDays.map((date) => (
                        <Button
                          key={date}
                          size="small"
                          danger
                          icon={<CloseCircleOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEmployeeDetail(d.empName, date);
                          }}
                        >
                          {date}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }
        />
      )}

      {/* Warning: Auto-checkout */}
      {totalAutoCheckout > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          description={
            <Text>
              มี <strong>{totalAutoCheckout}</strong> วันที่ระบบเติม checkout
              อัตโนมัติ (23:59:59)
            </Text>
          }
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
            onClick: () => openEmployeeDetail(record.name),
            style: {
              cursor: "pointer",
              transition: "background-color 0.2s",
            },
            className: "hover:bg-orange-50",
          })}
        />
      </Card>

      {/* Employee Detail Modal */}
      <Modal
        title={
          <Space>
            <UserOutlined />
            <Text strong>รายละเอียด: {selectedDetail?.empName}</Text>
            {highlightedDate && (
              <Tag color="orange" style={{ marginLeft: 8 }}>
                กำลังดูวันที่: {highlightedDate}
              </Tag>
            )}
          </Space>
        }
        open={isDetailModalOpen}
        onCancel={closeEmployeeDetail}
        width={900}
        footer={
          <Space>
            {highlightedDate && (
              <Button
                size="small"
                onClick={() => setHighlightedDate(null)}
                icon={<CloseCircleOutlined />}
              >
                ล้างการเน้น
              </Button>
            )}
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => {
                if (selectedDetail) {
                  onExportIndividual(selectedDetail.empName);
                }
              }}
            >
              ดาวน์โหลด Excel
            </Button>
          </Space>
        }
      >
        <Table
          columns={detailColumns}
          dataSource={selectedDetail?.records}
          rowKey="date"
          pagination={false}
          size="small"
          scroll={{ y: 500 }}
          onRow={(record) => ({
            "data-date": record.date,
            style: {
              backgroundColor:
                highlightedDate === record.date ? "#fff7e6" : undefined,
              transition: "background-color 0.2s",
              border:
                highlightedDate === record.date
                  ? "2px solid #FF6B00"
                  : undefined,
            },
            className: highlightedDate === record.date ? "highlighted-row" : "",
          })}
          footer={() => (
            <Space
              className="w-full"
              style={{ display: "flex", justifyContent: "space-between" }}
            >
              <Space>
                <Tag color="blue">{selectedDetail?.totalDays} วัน</Tag>
                <Tag color="green">{selectedDetail?.totalHours} ชม.</Tag>
                <Tag color="red">หัก: {selectedDetail?.totalPenalty} บาท</Tag>
              </Space>
              <Text strong style={{ color: "#52c41a", fontSize: "16px" }}>
                สุทธิ: {selectedDetail?.netPay.toLocaleString()} บาท
              </Text>
            </Space>
          )}
        />
      </Modal>

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
          <DatePicker.RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            format="DD/MM/YYYY"
            style={{ flex: 1 }}
            placeholder={["วันที่เริ่มต้น", "วันที่สิ้นสุด"]}
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
          กลับไปแก้ไขค่าจ้าง
        </Button>
      </div>

      {/* UniverSheet Editor Modal */}
      <UniverSheetEditor
        open={isEditorOpen}
        title="แก้ไข Excel - ทุกคน"
        excelBase64={editorExcelData}
        onExport={(exportedBase64) => {
          downloadBase64Excel(
            exportedBase64,
            `เงินเดือนพนักงานทุกคน_${periodText || new Date().toISOString().split("T")[0]}.xlsx`,
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
