"use client";

import React from "react";
import { Steps } from "antd";
import type { StepsProps } from "antd";

interface StepIndicatorProps {
  currentStep: number;
}

const steps: StepsProps["items"] = [
  {
    title: "อัปโหลด PDF",
    content: "ไฟล์ตอกบัตร",
  },
  {
    title: "ตั้งค่าค่าจ้าง",
    content: "อัตราค่าจ้าง",
  },
  {
    title: "ผลลัพธ์ & ส่งออก",
    content: "ตรวจสอบและดาวน์โหลด",
  },
];

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="mb-8 px-4 py-5 bg-white rounded-xl border border-gray-100 shadow-sm">
      <Steps
        current={currentStep - 1}
        items={steps}
        size="small"
        style={{ maxWidth: 560, margin: '0 auto' }}
      />
    </div>
  );
}
