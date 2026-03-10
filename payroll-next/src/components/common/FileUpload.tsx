"use client";

import React, { useCallback, useState } from 'react';
import { Upload, Card, Spin, Collapse, Space, Tag, Statistic, Row, Col, Alert, Typography } from 'antd';
import type { UploadProps } from 'antd';
import {
  InboxOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { PdfParseResult } from '@/lib/pdf-parser';

const { Dragger } = Upload;
const { Panel } = Collapse;
const { Text, Title } = Typography;

interface FileUploadProps {
  onFilesProcessed: (files: File[]) => void;
  onError: (error: string) => void;
  isProcessing?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFilesProcessed,
  onError,
  isProcessing = false,
}) => {
  const [fileList, setFileList] = useState<any[]>([]);
  const [parseResults, setParseResults] = useState<{ fileName: string; result: PdfParseResult }[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  const handleFiles = useCallback((files: File[]) => {
    const pdfFiles = files.filter(f => f.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
      onError('กรุณาเลือกไฟล์ PDF');
      return;
    }

    setFileList(prev => [...prev, ...pdfFiles.map(f => ({
      uid: f.name,
      name: f.name,
      status: 'done',
    }))]);
    onFilesProcessed(pdfFiles);
  }, [onFilesProcessed, onError]);

  const uploadProps: UploadProps = {
    name: 'files',
    multiple: true,
    accept: '.pdf',
    showUploadList: false,
    beforeUpload: (file) => {
      handleFiles([file]);
      return false;
    },
    onDrop: (e) => {
      handleFiles(Array.from(e.dataTransfer.files));
    },
  };

  const removeFile = (index: number) => {
    setFileList(prev => prev.filter((_, i) => i !== index));
    setParseResults(prev => prev.filter((_, i) => i !== index));
  };

  const totalStats = parseResults.reduce((acc, r) => ({
    valid: acc.valid + r.result.stats.validRecords,
    invalid: acc.invalid + r.result.stats.invalidRecords,
    warnings: acc.warnings + r.result.warnings.length,
    errors: acc.errors + r.result.errors.length,
  }), { valid: 0, invalid: 0, warnings: 0, errors: 0 });

  const totalEmployees = parseResults.length > 0 
    ? new Set(parseResults.flatMap(r => r.result.data.filter((d: any) => d._isValid).map((d: any) => d.fullName))).size
    : 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Title level={3} className="mb-2 font-semibold text-gray-800">อัปโหลดไฟล์ PDF ข้อมูลตอกบัตร</Title>
        <Alert
          title={
            <div>
              <Text>
                <strong>รูปแบบไฟล์ที่รองรับ:</strong> PDF ที่ออกจากเครื่องตอกบัตรมาตรฐาน โดยแต่ละแถวในไฟล์ต้องมีข้อมูลในรูปแบบ:{" "}
                <strong>รหัสพนักงาน / ชื่อ / วันที่และเวลา / ประเภทการบันทึก</strong>
              </Text>
              <Text className="block mt-2">
                สามารถอัปโหลดหลายไฟล์พร้อมกันได้ ระบบจะนำข้อมูลมารวมกันโดยอัตโนมัติ
              </Text>
            </div>
          }
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          className="text-left"
        />
      </div>

      <Dragger {...uploadProps} className="!p-12">
        <Space orientation="vertical" size="middle" style={{ display: 'flex' }}>
          <InboxOutlined className="text-5xl text-gray-400" />
          <div>
            <Text className="text-lg">ลากไฟล์มาวางหรือคลิกเพื่อเลือก</Text>
            <Text className="block text-gray-500">รองรับไฟล์ PDF หลายไฟล์</Text>
          </div>
        </Space>
      </Dragger>

      {isProcessing && (
        <div className="flex flex-col items-center py-8 gap-3">
          <Spin size="large" />
          <Text className="text-gray-500 text-sm">กำลังอ่านและตรวจสอบข้อมูลจากไฟล์...</Text>
        </div>
      )}

      {fileList.length > 0 && (
        <div className="space-y-4">
          <Title level={4}>
            <FileTextOutlined className="mr-2" />
            ไฟล์ที่อัปโหลด:
          </Title>
          {fileList.map((file, index) => {
            const result = parseResults[index];
            return (
              <Card
                key={`${file.name}-${index}`}
                size="small"
                className="mb-2"
                extra={
                  <DeleteOutlined
                    className="text-gray-500 hover:text-red-500 cursor-pointer"
                    onClick={() => removeFile(index)}
                  />
                }
              >
                <Space orientation="vertical" style={{ width: '100%' }}>
                  <Text strong>{file.name}</Text>
                  {result && (
                    <Space wrap size="small">
                      <Tag icon={<CheckCircleOutlined />} color="success">
                        ถูกต้อง: {result.result.stats.validRecords}
                      </Tag>
                      {result.result.stats.invalidRecords > 0 && (
                        <Tag icon={<CloseCircleOutlined />} color="error">
                          ผิดพลาด: {result.result.stats.invalidRecords}
                        </Tag>
                      )}
                      {result.result.warnings.length > 0 && (
                        <Tag icon={<ExclamationCircleOutlined />} color="warning">
                          เตือน: {result.result.warnings.length}
                        </Tag>
                      )}
                    </Space>
                  )}
                </Space>
              </Card>
            );
          })}
        </div>
      )}

      {parseResults.length > 0 && (
        <Card
          title={
            <Space>
              <InfoCircleOutlined className="text-primary" />
              <Text strong>สรุปผลการตรวจสอบข้อมูล</Text>
            </Space>
          }
          size="small"
          extra={
            <a onClick={() => setShowDetails(!showDetails)}>
              {showDetails ? 'ซ่อน' : 'ดู'} รายละเอียด
            </a>
          }
        >
          <Row gutter={16} className="mb-4">
            <Col span={6}>
              <Statistic
                title="รายการถูกต้อง"
                value={totalStats.valid}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Col>
            {totalStats.invalid > 0 && (
              <Col span={6}>
                <Statistic
                  title="รายการผิดพลาด"
                  value={totalStats.invalid}
                  styles={{ content: { color: '#ff4d4f' } }}
                />
              </Col>
            )}
            {totalStats.warnings > 0 && (
              <Col span={6}>
                <Statistic
                  title="รายการเตือน"
                  value={totalStats.warnings}
                  styles={{ content: { color: '#faad14' } }}
                />
              </Col>
            )}
            <Col span={6}>
              <Statistic
                title="พนักงานทั้งหมด"
                value={totalEmployees}
                styles={{ content: { color: '#52c41a' } }}
              />
            </Col>
          </Row>

          {showDetails && (
            <Collapse accordion>
              {parseResults.map((fileResult, idx) => (
                <Panel header={fileResult.fileName} key={idx}>
                  {fileResult.result.errors.length > 0 && (
                    <div className="mb-3">
                      <Text type="danger" strong className="block mb-2">ข้อผิดพลาด:</Text>
                      <div className="space-y-1">
                        {fileResult.result.errors.map((err, i) => (
                          <Alert
                            key={i}
                            title={`บรรทัด ${err.line}: ${err.error}`}
                            type="error"
                            showIcon
                            className="mb-1 text-sm"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {fileResult.result.warnings.length > 0 && (
                    <div>
                      <Text className="block mb-2" style={{ color: '#faad14' }} strong>คำเตือน:</Text>
                      <div className="space-y-1">
                        {fileResult.result.warnings.map((warn, i) => (
                          <Alert
                            key={i}
                            title={`บรรทัด ${warn.line}: ${warn.error}`}
                            type="warning"
                            showIcon
                            className="mb-1 text-sm"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </Panel>
              ))}
            </Collapse>
          )}
        </Card>
      )}
    </div>
  );
};
