"use client";

import React, { useEffect, useRef } from "react";

import {
  LocaleType,
  Univer,
  UniverInstanceType,
  IWorkbookData,
} from "@univerjs/core";
import { UniverDocsPlugin } from "@univerjs/docs";
import { UniverDocsUIPlugin } from "@univerjs/docs-ui";
import DocsUIEnUS from "@univerjs/docs-ui/locale/en-US";
import { UniverFormulaEnginePlugin } from "@univerjs/engine-formula";
import { UniverRenderEnginePlugin } from "@univerjs/engine-render";
import { UniverSheetsPlugin } from "@univerjs/sheets";
import SheetsEnUS from "@univerjs/sheets/locale/en-US";
import { UniverSheetsFormulaPlugin } from "@univerjs/sheets-formula";
import { UniverSheetsFormulaUIPlugin } from "@univerjs/sheets-formula-ui";
import SheetsFormulaUIEnUS from "@univerjs/sheets-formula-ui/locale/en-US";
import { UniverSheetsNumfmtPlugin } from "@univerjs/sheets-numfmt";
import { UniverSheetsNumfmtUIPlugin } from "@univerjs/sheets-numfmt-ui";
import SheetsNumfmtUIEnUS from "@univerjs/sheets-numfmt-ui/locale/en-US";
import { UniverSheetsUIPlugin } from "@univerjs/sheets-ui";
import SheetsUIEnUS from "@univerjs/sheets-ui/locale/en-US";
import { UniverUIPlugin } from "@univerjs/ui";
import UIEnUS from "@univerjs/ui/locale/en-US";
import LuckyExcel from "@mertdeveci55/univer-import-export";

import "@univerjs/design/lib/index.css";
import "@univerjs/ui/lib/index.css";
import "@univerjs/docs-ui/lib/index.css";
import "@univerjs/sheets-ui/lib/index.css";
import "@univerjs/sheets-formula-ui/lib/index.css";
import "@univerjs/sheets-numfmt-ui/lib/index.css";
import { Typography, Button, Skeleton } from "antd";
import { EditOutlined, DownloadOutlined, CloseOutlined, PrinterOutlined } from "@ant-design/icons";

interface UniverSheetEditorProps {
  open: boolean;
  title: string;
  excelBase64?: string | null;
  onExport?: (excelBase64: string) => void;
  onCancel: () => void;
}

// Empty workbook data
const WORKBOOK_DATA: IWorkbookData = {
  id: "workbook_1",
  name: "Workbook",
  sheetOrder: ["sheet_1"],
  sheets: {
    sheet_1: {
      id: "sheet_1",
      name: "Sheet 1",
      cellData: {},
      rowCount: 100,
      columnCount: 26,
    },
  },
  appVersion: "",
  locale: LocaleType.EN_US,
  styles: { pb: {} },
};

export const UniverSheetEditor: React.FC<UniverSheetEditorProps> = ({
  open,
  title,
  excelBase64,
  onExport,
  onCancel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const univerRef = useRef<Univer | null>(null);
  const snapshotRef = useRef<IWorkbookData | null>(null);
  const [isSheetLoaded, setIsSheetLoaded] = React.useState(false);

  const handlePrint = () => {
    const snapshot = snapshotRef.current;
    if (!snapshot) {
      console.error("No snapshot available to print");
      return;
    }

    // Build an HTML table for each sheet from the snapshot cell data.
    // This prints ALL sheets (one per page), unlike canvas which only shows the active sheet.
    const sheetOrder = snapshot.sheetOrder ?? Object.keys(snapshot.sheets);
    const styles = snapshot.styles ?? {};

    const sheetsHtml = sheetOrder
      .map((sheetId) => {
        const sheet = snapshot.sheets[sheetId];
        if (!sheet) return "";
        const cellData = sheet.cellData ?? {};

        // Determine grid bounds
        const rowKeys = Object.keys(cellData).map(Number);
        if (rowKeys.length === 0) return "";
        const maxRow = Math.max(...rowKeys);
        let maxCol = 0;
        for (const rk of rowKeys) {
          const cols = Object.keys(cellData[rk] ?? {}).map(Number);
          if (cols.length) maxCol = Math.max(maxCol, ...cols);
        }

        // Build rows
        const rows: string[] = [];
        for (let r = 0; r <= maxRow; r++) {
          const rowCells: string[] = [];
          for (let c = 0; c <= maxCol; c++) {
            const cell = cellData[r]?.[c];
            const v = cell?.v ?? "";
            const styleId = cell?.s;
            const style = styleId && typeof styleId === "string" ? styles[styleId] : null;

            const cssProps: string[] = [
              "border:1px solid #ccc",
              "padding:3px 6px",
              "font-size:11px",
              "white-space:nowrap",
            ];
            if (style?.bl) cssProps.push("font-weight:bold");
            if (style?.it) cssProps.push("font-style:italic");
            const ht = style?.ht; // 1=left, 2=center, 3=right
            if (ht === 2) cssProps.push("text-align:center");
            else if (ht === 3) cssProps.push("text-align:right");
            if (style?.bg?.rgb) cssProps.push(`background:${style.bg.rgb}`);

            rowCells.push(`<td style="${cssProps.join(";")}">${String(v).replace(/</g, "&lt;")}</td>`);
          }
          rows.push(`<tr>${rowCells.join("")}</tr>`);
        }

        return `
<div class="sheet-title">${sheet.name ?? sheetId}</div>
<table>${rows.join("")}</table>`;
      })
      .join('<div class="page-break"></div>');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Print</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #fff; font-family: 'Sarabun', 'Leelawadee UI', sans-serif; padding: 12px; }
    .sheet-title { font-size: 13px; font-weight: bold; margin-bottom: 6px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
    td { overflow: hidden; }
    .page-break { page-break-after: always; margin: 0; }
    @media print {
      @page { margin: 10mm; size: landscape; }
      .page-break { page-break-after: always; }
    }
  </style>
</head>
<body onload="window.focus();window.print();window.onafterprint=function(){window.close();}">
  ${sheetsHtml}
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const printWin = window.open(url, "_blank");
    if (printWin) {
      printWin.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
    }
  };

  const handleExport = () => {
    if (!snapshotRef.current) {
      console.error("No snapshot available");
      return;
    }
    LuckyExcel.transformUniverToExcel({
      snapshot: snapshotRef.current,
      fileName: "export.xlsx",
      getBuffer: true,
      success: (buffer) => {
        if (!buffer) return;
        const blob = new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          if (onExport) onExport(base64);
        };
        reader.readAsDataURL(blob);
      },
      error: (err) => console.error("Export error:", err),
    });
  };

  const loadExcelData = (base64: string) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const file = new File([blob], "data.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    LuckyExcel.transformExcelToUniver(
      file,
      (univerData) => {
        if (univerRef.current) {
          snapshotRef.current = univerData;
          univerRef.current.createUnit(UniverInstanceType.UNIVER_SHEET, univerData);
          setIsSheetLoaded(true);
        }
      },
      (error) => {
        console.error("Excel import error:", error);
        snapshotRef.current = WORKBOOK_DATA;
        univerRef.current?.createUnit(UniverInstanceType.UNIVER_SHEET, WORKBOOK_DATA);
        setIsSheetLoaded(true);
      },
    );
  };

  // Initialize Univer once the overlay DOM is painted.
  // requestAnimationFrame ensures the container has non-zero dimensions
  // before Univer mounts its canvas renderer.
  useEffect(() => {
    if (!open || univerRef.current) return;

    const rafId = requestAnimationFrame(() => {
      if (!containerRef.current) return;

      const instance = new Univer({
        locale: LocaleType.EN_US,
        locales: {
          [LocaleType.EN_US]: {
            ...UIEnUS,
            ...DocsUIEnUS,
            ...SheetsUIEnUS,
            ...SheetsFormulaUIEnUS,
            ...SheetsNumfmtUIEnUS,
            ...SheetsEnUS,
          },
        },
      });

      instance.registerPlugin(UniverRenderEnginePlugin);
      instance.registerPlugin(UniverUIPlugin, {
        container: containerRef.current,
      });
      instance.registerPlugin(UniverDocsPlugin);
      instance.registerPlugin(UniverDocsUIPlugin);
      instance.registerPlugin(UniverSheetsPlugin);
      instance.registerPlugin(UniverSheetsUIPlugin);
      instance.registerPlugin(UniverSheetsFormulaPlugin);
      instance.registerPlugin(UniverSheetsFormulaUIPlugin);
      instance.registerPlugin(UniverSheetsNumfmtPlugin);
      instance.registerPlugin(UniverSheetsNumfmtUIPlugin);
      instance.registerPlugin(UniverFormulaEnginePlugin);

      univerRef.current = instance;

      if (excelBase64) {
        loadExcelData(excelBase64);
      } else {
        snapshotRef.current = WORKBOOK_DATA;
        instance.createUnit(UniverInstanceType.UNIVER_SHEET, WORKBOOK_DATA);
        setIsSheetLoaded(true);
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [open]);

  // Cleanup when overlay closes — defer dispose() out of React's render cycle
  useEffect(() => {
    if (!open && univerRef.current) {
      const instance = univerRef.current;
      univerRef.current = null;
      snapshotRef.current = null;
      setIsSheetLoaded(false);
      setTimeout(() => instance.dispose(), 0);
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    // Full-screen overlay — intentionally NOT using Ant Design Modal.
    // Ant Design Modal (via rc-component/dialog) uses Radix DismissableLayer
    // which sets pointer-events:none on body when a dropdown opens, breaking
    // Univer's toolbar dropdowns (which also render at body level via Radix).
    // A plain fixed overlay avoids all stacking-context and focus-trap conflicts.
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        background: "rgba(0,0,0,0.45)",
      }}
      // Clicking the backdrop closes the editor
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      {/* Modal panel */}
      <div
        style={{
          margin: "20px auto",
          width: "95%",
          height: "calc(100% - 40px)",
          background: "#fff",
          borderRadius: 8,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid #f0f0f0",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <EditOutlined />
            <Typography.Text strong>{title}</Typography.Text>
          </div>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onCancel}
          />
        </div>

        {/* Univer container — takes all remaining height */}
        <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
          {!isSheetLoaded && (
            <div style={{
              position: "absolute",
              inset: 0,
              background: "#fff",
              zIndex: 10,
              padding: "32px 40px",
              overflowY: "auto",
            }}>
              <Skeleton active paragraph={{ rows: 4 }} className="mb-6" />
              <Skeleton active paragraph={{ rows: 6 }} className="mb-6" />
              <Skeleton active paragraph={{ rows: 6 }} />
            </div>
          )}
          <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #f0f0f0",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <Button onClick={onCancel}>ยกเลิก</Button>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>
            พิมพ์
          </Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
            ส่งออก Excel
          </Button>
        </div>
      </div>
    </div>
  );
};
