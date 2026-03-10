"use client";

import React from "react";
import { ConfigProvider, theme } from "antd";
import thTH from "antd/locale/th_TH";

interface AntdProviderProps {
  children: React.ReactNode;
}

export default function AntdProvider({ children }: AntdProviderProps) {
  return (
    <ConfigProvider
      locale={thTH}
      theme={{
        token: {
          colorPrimary: "#FF6B00",
          colorSuccess: "#28a745",
          colorWarning: "#faad14",
          colorError: "#ff4d4f",
          borderRadius: 6,
        },
        components: {
          Steps: {
            colorPrimary: "#FF6B00",
          },
          Button: {
            colorPrimary: "#FF6B00",
          },
        },
        algorithm: theme.defaultAlgorithm,
      }}
    >
      {children}
    </ConfigProvider>
  );
}
