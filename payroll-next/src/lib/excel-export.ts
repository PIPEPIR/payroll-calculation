/**
 * Excel export utility using exceljs
 */

import ExcelJS from "exceljs";

export interface DailyRecord {
  staffId: string;
  name: string;
  date: string;
  checkInTime: string;
  basePay: number;
  tip: number;
  totalPay: number;
  advance: string;
  netPay: number;
  lateMinutes: number;
  penalty: number;
  totalHours: number;
  note: string;
}

export interface EmployeeSummary {
  name: string;
  totalDays: number;
  totalHours: number;
  basePay: number;
  totalPenalty: number;
  netPay: number;
}

/**
 * Export summary data to Excel
 */
export async function exportSummaryToExcel(
  summaries: EmployeeSummary[],
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("สรุปยอดจ่ายเงิน");

  // Set header style
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFA500" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    size: 12,
  };
  const centerAlignment: Partial<ExcelJS.Alignment> = {
    horizontal: "center",
    vertical: "middle",
  };
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  // Headers
  const headers = [
    "ชื่อพนักงาน",
    "วันที่ทำงาน (วัน)",
    "ชั่วโมงทำงาน (ชม.)",
    "ค่าจ้างปกติ (บาท)",
    "หักมาสาย (บาท)",
    "รับเงินสุทธิ (บาท)",
  ];

  // Add header row
  const headerRow = worksheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = centerAlignment;
    cell.border = thinBorder;
  });

  // Add data rows
  for (const summary of summaries) {
    const row = worksheet.addRow([
      summary.name,
      summary.totalDays,
      summary.totalHours,
      summary.basePay,
      summary.totalPenalty,
      summary.netPay,
    ]);
    row.eachCell((cell) => {
      cell.border = thinBorder;
      cell.alignment = centerAlignment;
    });
  }

  // Auto-fit columns
  worksheet.columns.forEach((col, i) => {
    if (col) {
      let maxLen = 0;
      col.eachCell &&
        col.eachCell({ includeEmpty: true }, (cell) => {
          const len = cell.value ? String(cell.value).length : 0;
          maxLen = Math.max(maxLen, len);
        });
      col.width = maxLen + 5;
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * Export individual employee Excel (matching Thai restaurant template)
 */
export async function exportIndividualExcel(
  empName: string,
  records: DailyRecord[],
  periodText: string = "",
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("เงินเดือน");

  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFA500" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    size: 11,
  };
  const titleFont: Partial<ExcelJS.Font> = {
    bold: true,
    size: 13,
  };
  const centerAlignment: Partial<ExcelJS.Alignment> = {
    horizontal: "center",
    vertical: "middle",
  };
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  // Header rows
  worksheet.mergeCells("A1:J1");
  worksheet.getCell("A1").value =
    `เงินเดือนพนักงานติดมันส์สาขาหาดใหญ่ ${empName}`;
  worksheet.getCell("A1").font = titleFont;

  worksheet.mergeCells("A2:J2");
  worksheet.getCell("A2").value =
    "โทร: .......................................";

  worksheet.mergeCells("A3:C3");
  worksheet.getCell("A3").value = periodText
    ? `วันที่ ${periodText}`
    : "วันที่ ........................";
  worksheet.getCell("E3").value = "เงินสด";

  // Column headers (row 5)
  const colHeaders = [
    "รหัสพนักงาน",
    "ชื่อ",
    "วันที่",
    "เวลาเข้างาน",
    "คิดเป็นเงิน",
    "ทิป",
    "รวมเงิน",
    "เบิกเงิน",
    "เหลือสุทธิ",
    "หมายเหตุ",
  ];

  const headerRow = worksheet.addRow(colHeaders);
  headerRow.eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = centerAlignment;
    cell.border = thinBorder;
  });

  // Data rows — derive row numbers from actual header position
  const firstDataRowNum = headerRow.number + 1;
  let lastDataRowNum = headerRow.number; // fallback if no records

  for (let i = 0; i < records.length; i++) {
    const rowIdx = firstDataRowNum + i;
    lastDataRowNum = rowIdx;
    const rec = records[i];

    const values = [
      rec.staffId,
      rec.name,
      rec.date,
      rec.checkInTime,
      rec.basePay,
      rec.tip,
      { formula: `E${rowIdx}+F${rowIdx}` },
      parseFloat(String(rec.advance)) || 0,
      { formula: `IFERROR(G${rowIdx}-H${rowIdx},0)` },
      "",
    ];

    const row = worksheet.addRow(values);
    row.eachCell((cell) => {
      cell.border = thinBorder;
      cell.alignment = centerAlignment;
    });
  }

  // Summary row
  if (lastDataRowNum >= firstDataRowNum) {
    const summaryRowObj = worksheet.addRow([
      "",
      `รวม ${periodText}`.trim(),
      "",
      "",
      { formula: `SUM(E${firstDataRowNum}:E${lastDataRowNum})` },
      { formula: `SUM(F${firstDataRowNum}:F${lastDataRowNum})` },
      { formula: `SUM(G${firstDataRowNum}:G${lastDataRowNum})` },
      { formula: `SUM(H${firstDataRowNum}:H${lastDataRowNum})` },
      { formula: `SUM(I${firstDataRowNum}:I${lastDataRowNum})` },
      "",
    ]);
    summaryRowObj.eachCell((cell) => {
      cell.border = thinBorder;
      cell.alignment = centerAlignment;
    });
  }

  // Empty rows for spacing
  for (let s = 0; s < 2; s++) {
    const emptyRow = worksheet.addRow(Array(10).fill(""));
    emptyRow.eachCell((cell) => {
      cell.border = thinBorder;
    });
  }

  // Signature row
  const sigRow = worksheet.addRow([
    "",
    "ลายเซ็นต์รับเงิน",
    "",
    "",
    "",
    "",
    "วันที่",
    "",
    "",
    "",
  ]);
  sigRow.eachCell((cell) => {
    cell.border = thinBorder;
    cell.alignment = centerAlignment;
  });

  // Column widths
  const colWidths = [14, 20, 14, 14, 12, 8, 12, 10, 12, 20];
  colWidths.forEach((width, idx) => {
    worksheet.getColumn(idx + 1).width = width;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * Export all employees to Excel (each employee in separate sheet)
 */
export async function exportAllEmployeesExcel(
  employeesData: { empName: string; records: DailyRecord[] }[],
  periodText: string = "",
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();

  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFA500" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    size: 11,
  };
  const titleFont: Partial<ExcelJS.Font> = {
    bold: true,
    size: 13,
  };
  const centerAlignment: Partial<ExcelJS.Alignment> = {
    horizontal: "center",
    vertical: "middle",
  };
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  for (let idx = 0; idx < employeesData.length; idx++) {
    const { empName, records } = employeesData[idx];
    const sheetTitle =
      empName.replace(/[\/\\]/g, "-").substring(0, 31) || `Employee_${idx + 1}`;

    const worksheet = workbook.addWorksheet(sheetTitle);

    // Header rows
    worksheet.mergeCells("A1:J1");
    worksheet.getCell("A1").value =
      `เงินเดือนพนักงานติดมันส์สาขาหาดใหญ่ ${empName}`;
    worksheet.getCell("A1").font = titleFont;

    worksheet.mergeCells("A2:J2");
    worksheet.getCell("A2").value =
      "โทร: .......................................";

    worksheet.mergeCells("A3:C3");
    worksheet.getCell("A3").value = periodText
      ? `วันที่ ${periodText}`
      : "วันที่ ........................";
    worksheet.getCell("E3").value = "เงินสด";

    // Column headers
    const colHeaders = [
      "รหัสพนักงาน",
      "ชื่อ",
      "วันที่",
      "เวลาเข้างาน",
      "คิดเป็นเงิน",
      "ทิป",
      "รวมเงิน",
      "เบิกเงิน",
      "เหลือสุทธิ",
      "หมายเหตุ",
    ];

    const headerRow = worksheet.addRow(colHeaders);
    headerRow.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = centerAlignment;
      cell.border = thinBorder;
    });

    // Data rows — derive row numbers from actual header position
    const firstDataRowNum = headerRow.number + 1;
    let lastDataRowNum = headerRow.number; // fallback if no records

    for (let i = 0; i < records.length; i++) {
      const rowIdx = firstDataRowNum + i;
      lastDataRowNum = rowIdx;
      const rec = records[i];

      const values = [
        rec.staffId,
        rec.name,
        rec.date,
        rec.checkInTime,
        rec.basePay,
        0,
        { formula: `E${rowIdx}+F${rowIdx}` },
        0,
        { formula: `IFERROR(G${rowIdx}-H${rowIdx},0)` },
        "",
      ];

      const row = worksheet.addRow(values);
      row.eachCell((cell) => {
        cell.border = thinBorder;
        cell.alignment = centerAlignment;
      });
    }

    // Summary row
    if (lastDataRowNum >= firstDataRowNum) {
      const summaryRowObj = worksheet.addRow([
        "",
        `รวม ${periodText}`.trim(),
        "",
        "",
        { formula: `SUM(E${firstDataRowNum}:E${lastDataRowNum})` },
        { formula: `SUM(F${firstDataRowNum}:F${lastDataRowNum})` },
        { formula: `SUM(G${firstDataRowNum}:G${lastDataRowNum})` },
        { formula: `SUM(H${firstDataRowNum}:H${lastDataRowNum})` },
        { formula: `SUM(I${firstDataRowNum}:I${lastDataRowNum})` },
        "",
      ]);
      summaryRowObj.eachCell((cell) => {
        cell.border = thinBorder;
        cell.alignment = centerAlignment;
      });
    }

    // Empty rows
    for (let s = 0; s < 2; s++) {
      const emptyRow = worksheet.addRow(Array(10).fill(""));
      emptyRow.eachCell((cell) => {
        cell.border = thinBorder;
      });
    }

    // Signature row
    const sigRow = worksheet.addRow([
      "",
      "ลายเซ็นต์รับเงิน",
      "",
      "",
      "",
      "",
      "วันที่",
      "",
      "",
      "",
    ]);
    sigRow.eachCell((cell) => {
      cell.border = thinBorder;
      cell.alignment = centerAlignment;
    });

    // Column widths
    const colWidths = [14, 20, 14, 14, 12, 8, 12, 10, 12, 20];
    colWidths.forEach((width, idx) => {
      worksheet.getColumn(idx + 1).width = width;
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
