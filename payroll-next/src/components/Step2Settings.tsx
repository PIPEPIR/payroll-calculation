"use client";

import React, { useState, useEffect } from 'react';
import {
  InfoCircleOutlined,
  CalculatorOutlined,
  DownloadOutlined,
  UploadOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import {
  Card,
  Collapse,
  InputNumber,
  Button,
  Table,
  Typography,
  Space,
  Tag,
  Modal,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { CollapseProps } from 'antd';
import { RawDataItem, EmployeeSetting as EmployeeSettingType } from '@/types';

interface EmployeeSetting {
  key: string;
  name: string;
  dailyRate: number;
}

interface Step2SettingsProps {
  rawData: RawDataItem[];
  initialSettings: EmployeeSettingType[];
  onConfirm: (settings: { name: string; dailyRate: number }[]) => void;
  onBack: () => void;
}

const { Panel } = Collapse;
const { Title, Text } = Typography;

export default function Step2Settings({
  rawData,
  initialSettings,
  onConfirm,
  onBack,
}: Step2SettingsProps) {
  const [bulkWage, setBulkWage] = useState(300);
  const [settings, setSettings] = useState<EmployeeSetting[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [deleteConfirmApi, deleteConfirmApiContextHolder] = Modal.useModal();

  // Initialize settings
  useEffect(() => {
    const employeeNames = Array.from(new Set(rawData.map(d => d.fullName))).sort();
    const newSettings = employeeNames.map((name, index) => {
      const existing = initialSettings.find(s => s.name === name);
      return {
        key: `emp-${index}`,
        name,
        dailyRate: existing?.dailyRate || 300,
      };
    });
    setSettings(newSettings);
  }, [rawData, initialSettings]);

  const handleApplyBulk = () => {
    setSettings(settings.map(s => ({ ...s, dailyRate: bulkWage })));
  };

  const handleRateChange = (key: string, value: number) => {
    setSettings(settings.map(s => 
      s.key === key ? { ...s, dailyRate: value } : s
    ));
  };

  const handleDelete = (key: string, name: string) => {
    deleteConfirmApi.confirm({
      title: 'ยืนยันการลบ',
      content: `คุณต้องการลบ "${name}" ออกจากตารางใช่หรือไม่?`,
      okText: 'ลบ',
      cancelText: 'ยกเลิก',
      onOk: () => {
        setSettings(settings.filter(s => s.key !== key));
      },
    });
  };

  const handleConfirm = () => {
    const finalSettings = settings.map(s => ({
      name: s.name,
      dailyRate: s.dailyRate,
    }));
    onConfirm(finalSettings);
  };

  // Raw data summary
  const parsedDataSummary = React.useMemo(() => {
    const byEmployee = new Map<string, { count: number; timestamps: string[] }>();
    for (const item of rawData) {
      if (!byEmployee.has(item.fullName)) {
        byEmployee.set(item.fullName, { count: 0, timestamps: [] });
      }
      const emp = byEmployee.get(item.fullName)!;
      emp.count++;
      emp.timestamps.push(item.timestamp);
    }
    return Array.from(byEmployee.entries()).map(([name, data]) => ({
      name,
      recordCount: data.count,
      firstTimestamp: data.timestamps[0],
      lastTimestamp: data.timestamps[data.timestamps.length - 1],
    }));
  }, [rawData]);

  // Table columns
  const columns: ColumnsType<EmployeeSetting> = [
    {
      title: 'ชื่อพนักงาน',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 250,
    },
    {
      title: 'ค่าจ้างต่อวัน (บาท)',
      dataIndex: 'dailyRate',
      key: 'dailyRate',
      width: 180,
      align: 'center',
      render: (rate: number, record) => (
        editingKey === record.key ? (
          <InputNumber
            value={rate}
            onChange={(value) => handleRateChange(record.key, value || 0)}
            min={0}
            step={50}
            autoFocus
            onPressEnter={() => setEditingKey(null)}
            onBlur={() => setEditingKey(null)}
            style={{ width: '100%' }}
          />
        ) : (
          <div
            className="cursor-pointer hover:bg-orange-50 px-2 py-1 rounded"
            onClick={() => setEditingKey(record.key)}
          >
            <Tag color="orange">{rate.toLocaleString()}</Tag>
            <EditOutlined className="ml-2 text-gray-400 text-xs" />
          </div>
        )
      ),
    },
    {
      title: 'ลบ',
      key: 'action',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(record.key, record.name)}
          title="ลบพนักงานนี้ออก"
        />
      ),
    },
  ];

  const rawDataColumns: ColumnsType<any> = [
    {
      title: 'ชื่อพนักงาน',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 200,
    },
    {
      title: 'จำนวนรายการ',
      dataIndex: 'recordCount',
      key: 'recordCount',
      align: 'center',
      width: 100,
      render: (count: number) => <Tag color="blue">{count}</Tag>,
    },
    {
      title: 'เวลาแรก',
      dataIndex: 'firstTimestamp',
      key: 'firstTimestamp',
      width: 180,
    },
    {
      title: 'เวลาสุดท้าย',
      dataIndex: 'lastTimestamp',
      key: 'lastTimestamp',
      width: 180,
    },
  ];

  const rulesItems: CollapseProps['items'] = [
    {
      key: '1',
      label: 'กฎการกำหนดกะอัตโนมัติ (รายวัน)',
      children: (
        <ul className="list-disc list-inside space-y-1">
          <li>เข้างานก่อน 15:45 → <strong>กะ 14:00</strong> ได้รับค่าจ้างตามอัตราพื้นฐาน</li>
          <li>เข้างานตั้งแต่ 15:45 เป็นต้นไป → <strong>กะ 16:00</strong> ได้รับ <strong>250 บาท</strong> (ตายตัว)</li>
        </ul>
      ),
    },
    {
      key: '2',
      label: 'กฎการหักเงินสาย',
      children: (
        <ul className="list-disc list-inside space-y-1">
          <li>สายไม่เกิน 30 นาที → หักนาทีละ <strong>5 บาท</strong></li>
          <li>สายเกิน 30 นาที → ส่วนที่เกิน 30 นาทีแรก หักนาทีละ <strong>10 บาท</strong></li>
        </ul>
      ),
    },
    {
      key: '3',
      label: 'กรณีพิเศษ',
      children: (
        <ul className="list-disc list-inside space-y-1">
          <li>ตอกบัตรไม่ครบคู่ → ระบบเติม checkout เป็น <strong>23:59:59</strong> อัตโนมัติ</li>
          <li>สแกนซ้ำห่างกันไม่เกิน 5 นาที → ถือว่าตอกเดียวกัน (กรองออก)</li>
          <li>เวลาเข้างานเกินกำหนดเกิน 4 ชั่วโมง → ถือว่าลืมตอกบัตรเข้างาน ข้ามการคำนวณ</li>
        </ul>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Title level={2} className="mb-4">⚙️ ตั้งค่าค่าจ้างพนักงาน</Title>
        
        <Space className="mb-4">
          <Button
            type="link"
            icon={showRules ? <EyeInvisibleOutlined /> : <InfoCircleOutlined />}
            onClick={() => setShowRules(!showRules)}
          >
            {showRules ? 'ซ่อน' : 'ดู'} เงื่อนไขการคำนวณ
          </Button>
          <Button
            type="link"
            icon={showRawData ? <EyeInvisibleOutlined /> : <DownloadOutlined />}
            onClick={() => setShowRawData(!showRawData)}
          >
            {showRawData ? 'ซ่อน' : 'ดู'} ข้อมูล PDF ดิบ ({rawData.length} รายการ)
          </Button>
        </Space>

        {showRules && (
          <Card size="small" className="mt-4 text-left">
            <Collapse
              defaultActiveKey={['1', '2', '3']}
              items={rulesItems}
              bordered={false}
              size="small"
            />
          </Card>
        )}

        {showRawData && (
          <Card
            size="small"
            className="mt-4 text-left"
            title={
              <Space>
                <InfoCircleOutlined />
                <Text strong>
                  สรุปข้อมูลจาก PDF ({rawData.length} รายการ, {parsedDataSummary.length} พนักงาน)
                </Text>
              </Space>
            }
          >
            <Table
              columns={rawDataColumns}
              dataSource={parsedDataSummary}
              rowKey="name"
              pagination={false}
              size="small"
              scroll={{ y: 300 }}
            />
          </Card>
        )}
      </div>

      {/* Bulk wage setter */}
      <Card size="small" title="ตั้งค่าจ้างพื้นฐานพร้อมกันทุกคน">
        <Space.Compact block>
          <InputNumber
            value={bulkWage}
            onChange={(value) => setBulkWage(value || 0)}
            min={0}
            step={50}
            placeholder="ค่าจ้างพื้นฐาน (บาท)"
            style={{ flex: 1 }}
          />
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={handleApplyBulk}
          >
            ใช้กับทุกคน
          </Button>
        </Space.Compact>
      </Card>

      {/* Editable table */}
      <Card
        size="small"
        title={
          <Space>
            <Text>แก้ไขค่าจ้างรายคน (คลิกที่ช่องค่าจ้างเพื่อแก้ไข)</Text>
            <Tag color="gray">กด Enter เพื่อบันทึก</Tag>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={settings}
          rowKey="key"
          pagination={false}
          size="small"
          scroll={{ y: 400 }}
        />
      </Card>

      {/* Action buttons */}
      <Space className="w-full" style={{ display: 'flex' }}>
        <Button
          type="primary"
          size="large"
          icon={<CalculatorOutlined />}
          onClick={handleConfirm}
          className="flex-1"
        >
          ✅ ยืนยันและคำนวณเงินเดือน
        </Button>
        <Button
          size="large"
          onClick={onBack}
        >
          🔙 กลับไปอัปโหลดใหม่
        </Button>
      </Space>

      {deleteConfirmApiContextHolder}
    </div>
  );
}
