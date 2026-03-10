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
  summaries: EmployeeSummary[]
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
      col.eachCell && col.eachCell({ includeEmpty: true }, (cell) => {
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
  periodText: string = ""
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
  worksheet.mergeCells("A1:G1");
  worksheet.getCell("A1").value = `เงินเดือนพนักงานติดมันส์สาขาหาดใหญ่ ${empName}`;
  worksheet.getCell("A1").font = titleFont;

  worksheet.mergeCells("A2:G2");
  worksheet.getCell("A2").value = "โทร: .......................................";

  worksheet.mergeCells("A3:C3");
  worksheet.getCell("A3").value = periodText ? `วันที่ ${periodText}` : "วันที่ ........................";
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
  ];

  const headerRow = worksheet.addRow(colHeaders);
  headerRow.eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = centerAlignment;
    cell.border = thinBorder;
  });

  // Data rows
  let lastRow = 5;
  for (let i = 0; i < records.length; i++) {
    const rowIdx = 6 + i;
    lastRow = rowIdx;
    const rec = records[i];

    const values = [
      rec.staffId,
      rec.name,
      rec.date,
      rec.checkInTime,
      rec.basePay,
      rec.tip,
      `=E${rowIdx}+F${rowIdx}`,
      rec.advance,
      `=G${rowIdx}-H${rowIdx}`,
    ];

    const row = worksheet.addRow(values);
    row.eachCell((cell, colNum) => {
      cell.border = thinBorder;
      if (colNum >= 3) {
        cell.alignment = centerAlignment;
      }
    });
  }

  // Summary row
  const summaryRow = lastRow + 1;
  if (lastRow >= 6) {
    worksheet.getCell(`B${summaryRow}`).value = `รวม ${periodText}`.trim();
    worksheet.getCell(`B${summaryRow}`).alignment = centerAlignment;
    worksheet.getCell(`E${summaryRow}`).value = { formula: `SUM(E6:E${lastRow})` };
    worksheet.getCell(`F${summaryRow}`).value = { formula: `SUM(F6:F${lastRow})` };
    worksheet.getCell(`G${summaryRow}`).value = { formula: `SUM(G6:G${lastRow})` };
    worksheet.getCell(`H${summaryRow}`).value = { formula: `SUM(H6:H${lastRow})` };
    worksheet.getCell(`I${summaryRow}`).value = { formula: `SUM(I6:I${lastRow})` };
  }

  for (let c = 1; c <= 9; c++) {
    const cell = worksheet.getCell(summaryRow, c);
    cell.border = thinBorder;
  }

  // Empty rows for spacing
  for (let r = summaryRow + 1; r <= summaryRow + 2; r++) {
    for (let c = 1; c <= 9; c++) {
      worksheet.getCell(r, c).border = thinBorder;
    }
  }

  // Signature row
  const sigRow = summaryRow + 3;
  worksheet.getCell(`B${sigRow}`).value = "ลายเซ็นต์รับเงิน";
  worksheet.getCell(`B${sigRow}`).alignment = centerAlignment;
  worksheet.getCell(`G${sigRow}`).value = "วันที่";
  worksheet.getCell(`G${sigRow}`).alignment = centerAlignment;
  for (let c = 1; c <= 9; c++) {
    worksheet.getCell(sigRow, c).border = thinBorder;
  }

  // Column widths
  const colWidths = [14, 20, 14, 14, 12, 8, 12, 10, 12];
  colWidths.forEach((width, i) => {
    worksheet.getColumn(i + 1).width = width;
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
  periodText: string = ""
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
    const sheetTitle = empName.replace(/[\/\\]/g, "-").substring(0, 31) || `Employee_${idx + 1}`;

    let worksheet: ExcelJS.Worksheet;
    if (idx === 0) {
      worksheet = workbook.addWorksheet(sheetTitle);
    } else {
      worksheet = workbook.addWorksheet(sheetTitle);
    }

    // Header rows
    worksheet.mergeCells("A1:G1");
    worksheet.getCell("A1").value = `เงินเดือนพนักงานติดมันส์สาขาหาดใหญ่ ${empName}`;
    worksheet.getCell("A1").font = titleFont;

    worksheet.mergeCells("A2:G2");
    worksheet.getCell("A2").value = "โทร: .......................................";

    worksheet.mergeCells("A3:C3");
    worksheet.getCell("A3").value = periodText ? `วันที่ ${periodText}` : "วันที่ ........................";
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
    ];

    const headerRow = worksheet.addRow(colHeaders);
    headerRow.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = centerAlignment;
      cell.border = thinBorder;
    });

    // Data rows
    let lastRow = 5;
    for (let i = 0; i < records.length; i++) {
      const rowIdx = 6 + i;
      lastRow = rowIdx;
      const rec = records[i];

      const values = [
        rec.staffId,
        rec.name,
        rec.date,
        rec.checkInTime,
        rec.basePay,
        rec.tip,
        `=E${rowIdx}+F${rowIdx}`,
        rec.advance,
        `=G${rowIdx}-H${rowIdx}`,
      ];

      const row = worksheet.addRow(values);
      row.eachCell((cell, colNum) => {
        cell.border = thinBorder;
        if (colNum >= 3) {
          cell.alignment = centerAlignment;
        }
      });
    }

    // Summary row
    const summaryRow = lastRow + 1;
    if (lastRow >= 6) {
      worksheet.getCell(`B${summaryRow}`).value = `รวม ${periodText}`.trim();
      worksheet.getCell(`B${summaryRow}`).alignment = centerAlignment;
      worksheet.getCell(`E${summaryRow}`).value = { formula: `SUM(E6:E${lastRow})` };
      worksheet.getCell(`F${summaryRow}`).value = { formula: `SUM(F6:F${lastRow})` };
      worksheet.getCell(`G${summaryRow}`).value = { formula: `SUM(G6:G${lastRow})` };
      worksheet.getCell(`H${summaryRow}`).value = { formula: `SUM(H6:H${lastRow})` };
      worksheet.getCell(`I${summaryRow}`).value = { formula: `SUM(I6:I${lastRow})` };
    }

    for (let c = 1; c <= 9; c++) {
      worksheet.getCell(summaryRow, c).border = thinBorder;
    }

    // Empty rows
    for (let r = summaryRow + 1; r <= summaryRow + 2; r++) {
      for (let c = 1; c <= 9; c++) {
        worksheet.getCell(r, c).border = thinBorder;
      }
    }

    // Signature row
    const sigRow = summaryRow + 3;
    worksheet.getCell(`B${sigRow}`).value = "ลายเซ็นต์รับเงิน";
    worksheet.getCell(`B${sigRow}`).alignment = centerAlignment;
    worksheet.getCell(`G${sigRow}`).value = "วันที่";
    worksheet.getCell(`G${sigRow}`).alignment = centerAlignment;
    for (let c = 1; c <= 9; c++) {
      worksheet.getCell(sigRow, c).border = thinBorder;
    }

    // Column widths
    const colWidths = [14, 20, 14, 14, 12, 8, 12, 10, 12];
    colWidths.forEach((width, i) => {
      worksheet.getColumn(i + 1).width = width;
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
