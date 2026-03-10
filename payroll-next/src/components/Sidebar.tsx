"use client";

import React from "react";
import { Card, Typography, Divider, Space } from "antd";
import {
  BookOutlined,
  FileTextOutlined,
  TeamOutlined,
  PhoneOutlined,
} from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

export default function Sidebar() {
  return (
    <div className="fixed left-0 top-0 h-full w-72 bg-gray-50 border-r border-gray-200 overflow-y-auto p-4">
      <Card
        title={
          <Space>
            <BookOutlined className="text-primary" />
            <Title level={5} style={{ margin: 0 }}>📖 วิธีใช้งาน</Title>
          </Space>
        }
        size="small"
        className="mb-4"
      >
        <Space orientation="vertical" size="small" style={{ width: "100%" }}>
          <div>
            <Text strong>**ขั้นตอนการใช้งาน:**</Text>
            <ol style={{ paddingLeft: "20px", margin: "8px 0" }}>
              <li>
                <Text type="secondary">
                  <strong>อัปโหลด PDF</strong> — ไฟล์จากเครื่องตอกบัตรมาตรฐาน (รองรับหลายไฟล์)
                </Text>
              </li>
              <li>
                <Text type="secondary">
                  <strong>ตั้งค่าค่าจ้าง</strong> — ระบุอัตราค่าจ้างพื้นฐานรายวันของแต่ละคน
                </Text>
              </li>
              <li>
                <Text type="secondary">
                  <strong>ตรวจสอบ & ส่งออก</strong> — ดูผลและดาวน์โหลด Excel
                </Text>
              </li>
            </ol>
          </div>

          <Divider style={{ margin: "8px 0" }} />

          <div>
            <Space>
              <FileTextOutlined className="text-primary" />
              <Text strong>**รูปแบบ PDF ที่รองรับ:**</Text>
            </Space>
            <ul style={{ paddingLeft: "20px", margin: "8px 0" }}>
              <li>
                <Text type="secondary">
                  ออกจากเครื่องตอกบัตรรุ่นมาตรฐาน
                </Text>
              </li>
              <li>
                <Text type="secondary">
                  แต่ละแถวประกอบด้วย: รหัส / ชื่อ / วันที่-เวลา / ประเภทบันทึก
                </Text>
              </li>
            </ul>
          </div>

          <Divider style={{ margin: "8px 0" }} />

          <div>
            <Space>
              <TeamOutlined className="text-primary" />
              <Text strong>**ติดต่อสอบถาม:**</Text>
            </Space>
            <Paragraph type="secondary" style={{ margin: "8px 0" }}>
              หากพบปัญหา กรุณาแจ้งผู้ดูแลระบบ
            </Paragraph>
          </div>

          <Divider style={{ margin: "8px 0" }} />

          <div>
            <Space>
              <PhoneOutlined className="text-primary" />
              <Text strong>**ติดต่อฝ่าย IT:**</Text>
            </Space>
            <Paragraph type="secondary" style={{ margin: "8px 0" }}>
              Email: support@example.com<br />
              Tel: 02-XXX-XXXX
            </Paragraph>
          </div>
        </Space>
      </Card>
    </div>
  );
}
