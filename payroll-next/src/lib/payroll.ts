/**
 * Payroll calculation logic - ported from Python
 */

export interface PunchRecord {
  timestamp: Date;
}

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

export interface EmployeePayrollResult {
  records: DailyRecord[];
  totalDays: number;
  totalHours: number;
  totalPenalty: number;
  autoCheckoutDays: string[];
  forgotCheckinDays: string[];
}

/**
 * Calculate payroll for a single employee
 */
export function calculateEmployeePayroll(
  timestamps: Date[],
  baseDailyRate: number,
  staffId: string = "",
  empName: string = ""
): EmployeePayrollResult {
  // Sort timestamps
  const sorted = [...timestamps].sort((a, b) => a.getTime() - b.getTime());

  // Group by date
  const byDate = new Map<string, Date[]>();
  for (const ts of sorted) {
    const dateKey = ts.toISOString().split("T")[0];
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, []);
    }
    byDate.get(dateKey)!.push(ts);
  }

  const dailyRecords: DailyRecord[] = [];
  let totalDays = 0;
  let totalHours = 0;
  let totalPenalty = 0;
  const autoCheckoutDays: string[] = [];
  const forgotCheckinDays: string[] = [];

  for (const [dateStr, punches] of Array.from(byDate.entries())) {
    // Filter duplicate punches (if less than 5 minutes apart)
    const filteredPunches: Date[] = [];
    for (const punch of punches) {
      if (filteredPunches.length === 0) {
        filteredPunches.push(punch);
      } else if (punch.getTime() - filteredPunches[filteredPunches.length - 1].getTime() > 300000) {
        filteredPunches.push(punch);
      }
    }

    if (filteredPunches.length === 0) continue;

    const firstPunch = filteredPunches[0];

    // Determine shift automatically
    // Before 15:45 → 14:00 shift | 15:45+ → 16:00 shift (250 THB fixed)
    let shiftStartHour = 14;
    let dailyRate = baseDailyRate;

    if (firstPunch.getHours() > 15 || (firstPunch.getHours() === 15 && firstPunch.getMinutes() >= 45)) {
      shiftStartHour = 16;
      dailyRate = 250;
    }

    const shiftStart = new Date(firstPunch);
    shiftStart.setHours(shiftStartHour, 0, 0, 0);

    // If late more than 4 hours → consider as forgot to check in
    const lateMs = firstPunch.getTime() - shiftStart.getTime();
    const lateMinutes = Math.floor(lateMs / 60000);

    if (lateMinutes > 240) {
      forgotCheckinDays.push(dateStr);
      dailyRecords.push({
        staffId,
        name: empName,
        date: dateStr,
        checkInTime: firstPunch.toTimeString().slice(0, 5),
        basePay: 0,
        tip: 0,
        totalPay: 0,
        advance: "",
        netPay: 0,
        lateMinutes: 0,
        penalty: 0,
        totalHours: 0,
        note: "⚠️ ลืมตอกบัตรเข้างาน - ข้ามการคำนวณ",
      });
      continue;
    }

    // Auto-checkout: if odd number of punches, add 23:59:59
    let workingPunches = [...filteredPunches];
    if (workingPunches.length % 2 !== 0) {
      const lastPunch = workingPunches[workingPunches.length - 1];
      const autoCheckout = new Date(lastPunch);
      autoCheckout.setHours(23, 59, 59, 0);
      workingPunches.push(autoCheckout);
      autoCheckoutDays.push(dateStr);
    }

    // Calculate late penalty
    let dailyPenalty = 0;
    let actualLateMinutes = 0;

    if (firstPunch > shiftStart) {
      actualLateMinutes = Math.floor((firstPunch.getTime() - shiftStart.getTime()) / 60000);
      if (actualLateMinutes <= 30) {
        dailyPenalty = actualLateMinutes * 5;
      } else {
        dailyPenalty = 30 * 5 + (actualLateMinutes - 30) * 10;
      }
    }

    totalPenalty += dailyPenalty;

    // Calculate working hours
    let dailyHours = 0;
    for (let i = 0; i < workingPunches.length - 1; i += 2) {
      const timeIn = workingPunches[i];
      const timeOut = workingPunches[i + 1];
      dailyHours += (timeOut.getTime() - timeIn.getTime()) / 3600000;
    }
    dailyHours = Math.round(dailyHours * 100) / 100;
    totalHours += dailyHours;
    totalDays += 1;

    const netPayToday = dailyRate - dailyPenalty;

    dailyRecords.push({
      staffId,
      name: empName,
      date: dateStr,
      checkInTime: firstPunch.toTimeString().slice(0, 5),
      basePay: netPayToday,
      tip: 0,
      totalPay: netPayToday,
      advance: "",
      netPay: netPayToday,
      lateMinutes: actualLateMinutes,
      penalty: dailyPenalty,
      totalHours: dailyHours,
      note: autoCheckoutDays.includes(dateStr) ? "⚠️ เติม checkout 23:59:59 อัตโนมัติ" : "",
    });
  }

  return {
    records: dailyRecords,
    totalDays,
    totalHours: Math.round(totalHours * 100) / 100,
    totalPenalty,
    autoCheckoutDays,
    forgotCheckinDays,
  };
}

/**
 * Parse PDF text content into structured data
 */
export interface RawEmployeeData {
  staffId: string;
  fullName: string;
  timestamp: string;
  recordType: string;
}

const ROW_REGEX = /^(\d+)\s+(.+?)\s+(\d{4}[/\-]\d{2}[/\-]\d{2}\s+\d{2}:\d{2}:\d{2})\s+(.+)$/;

export function parsePdfText(text: string): RawEmployeeData[] {
  const lines = text.split(/\r?\n/);
  const results: RawEmployeeData[] = [];

  for (const line of lines) {
    const match = line.trim().match(ROW_REGEX);
    if (match) {
      results.push({
        staffId: match[1].trim(),
        fullName: match[2].trim(),
        timestamp: match[3].trim(),
        recordType: match[4].trim(),
      });
    }
  }

  return results;
}
