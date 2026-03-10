import type { Metadata } from "next";
import "./globals.css";
import AntdProvider from "@/components/AntdProvider";

export const metadata: Metadata = {
  title: "ระบบคิดเงินเดือนร้านอาหาร",
  description: "ระบบคิดเงินเดือนร้านอาหารจากไฟล์ PDF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>
        <AntdProvider>
          {children}
        </AntdProvider>
      </body>
    </html>
  );
}
