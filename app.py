import re
import io
import math
import streamlit as st
import pandas as pd
from openpyxl.styles import Font, Alignment, Border, Side, PatternFill
from openpyxl.utils import get_column_letter

# regex จับแต่ละบรรทัดข้อมูลในไฟล์ PDF ที่มีรูปแบบ:
# StaffID  ชื่อพนักงาน  วันที่-เวลา  ประเภทการตอกบัตร
_ROW_RE = re.compile(
    r'^(\d+)\s+(.+?)\s+(\d{4}[/\-]\d{2}[/\-]\d{2}\s+\d{2}:\d{2}:\d{2})\s+(.+)$'
)

st.set_page_config(page_title="ระบบคิดเงินเดือนร้านอาหาร", page_icon="📝")
st.title("📝 ระบบคิดเงินเดือน")
st.write("พนักงานประจำ: เริ่ม 14.00 น. | พาร์ทไทม์: เริ่ม 16.00 น.")
st.write("สายไม่เกิน 30 นาที หักนาทีละ 5 ฿ | สายเกิน 30 นาที หักนาทีละ 10 ฿")

# ซ่อนคำแนะนำ "Press Enter to apply" 
st.markdown(
    """
    <style>
    div[data-testid="InputInstructions"] > span:nth-child(1) {
        visibility: hidden;
        display: none;
    }
    div[data-testid="InputInstructions"] {
        visibility: hidden;
        position: absolute;
    }
    </style>
    """,
    unsafe_allow_html=True,
)



# key สำหรับ reset file uploader ของแต่ละ tab (เพิ่มทีละ 1 เมื่อกดล้างไฟล์)
for k in ["key_normal", "key_parttime", "key_custom"]:
    if k not in st.session_state:
        st.session_state[k] = 0


@st.cache_data(show_spinner=False)
def read_file_to_df(file) -> pd.DataFrame:
    # อ่านข้อความทุกหน้าในไฟล์ PDF ด้วย PyMuPDF ที่เร็วกว่าหลายสิบเท่า
    lines = []
    
    # ดึง bytes จาก file object (UploadedFile ของ Streamlit)
    file_bytes = file.read()
    
    import fitz  # PyMuPDF
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    
    for page in doc:
        # ใช้ sort=True เรียงลำดับตัวอักษรให้อ่านจากซ้ายไปขวา / บนลงล่าง เหมือน pdfplumber
        text = page.get_text("text", sort=True)
        if text:
            lines.extend(text.splitlines())
            
    doc.close()

    if not lines:
        raise ValueError("ไม่พบข้อมูลในไฟล์ PDF")

    # กรองเฉพาะบรรทัดที่ตรงกับ pattern ข้อมูลพนักงาน
    rows = []
    for line in lines:
        m = _ROW_RE.match(line.strip())
        if m:
            staff_id, full_name, timestamp, record_type = m.groups()
            rows.append({
                "Employee Staff ID": staff_id.strip(),
                "Full Name": full_name.strip(),
                "Timestamp": timestamp.strip(),
                "Record Type": record_type.strip(),
            })

    if not rows:
        raise ValueError("ไม่พบข้อมูลแถวในไฟล์ PDF")

    return pd.DataFrame(rows)


def calculate_employee_payroll(df: pd.DataFrame, daily_rate: int, start_hour: int = 14):
    # เตรียม DataFrame โดยแปลง Timestamp และจัดเรียงตามเวลา
    df = df[["Timestamp"]].copy()
    df["Timestamp"] = pd.to_datetime(df["Timestamp"], format="mixed")
    df = df.sort_values("Timestamp").reset_index(drop=True)
    df["Date"] = df["Timestamp"].dt.date

    daily_records = []
    total_days = 0
    total_hours = 0.0
    total_penalty = 0
    incomplete_days = []  # วันที่ตอกบัตรไม่ครบคู่

    for date, group in df.groupby("Date"):
        punches = group["Timestamp"].tolist()

        # ถ้าจำนวนครั้งที่ตอกบัตรเป็นเลขคี่ = ไม่ครบคู่เข้า-ออก → ข้ามการคำนวณ
        if len(punches) % 2 != 0:
            incomplete_days.append(f"{date} ({len(punches)} ครั้ง)")
            daily_records.append({
                "วันที่": date,
                "เวลาเข้างาน (รอบแรก)": punches[0].strftime("%H:%M:%S"),
                "สาย (นาที)": "-",
                "โดนหัก (บาท)": "-",
                "ชั่วโมงทำงานรวม": "-",
                "ค่าจ้างวันนี้ (บาท)": "-",
            })
            continue

        first_punch = punches[0]
        # กำหนดเวลาเริ่มกะตามที่ระบุ (14:00 หรือ 16:00)
        shift_start = first_punch.replace(hour=start_hour, minute=0, second=0, microsecond=0)

        # คำนวณนาทีที่มาสายและค่าปรับ
        late_mins = 0
        daily_penalty = 0
        if first_punch > shift_start:
            late_mins = math.floor((first_punch - shift_start).total_seconds() / 60)
            if late_mins <= 30:
                # สายไม่เกิน 30 นาที → หักนาทีละ 5 บาท
                daily_penalty = late_mins * 5
            else:
                # สายเกิน 30 นาที → 30 นาทีแรกหักนาทีละ 5, ส่วนที่เกินหักนาทีละ 10
                daily_penalty = (30 * 5) + ((late_mins - 30) * 10)

        total_penalty += daily_penalty

        # คำนวณชั่วโมงทำงานรวมจากทุกคู่เข้า-ออก
        daily_hours = round(sum(
            (punches[i + 1] - punches[i]).total_seconds() / 3600
            for i in range(0, len(punches) - 1, 2)
        ), 2)
        total_hours += daily_hours
        total_days += 1

        daily_records.append({
            "วันที่": date,
            "เวลาเข้างาน (รอบแรก)": first_punch.strftime("%H:%M:%S"),
            "สาย (นาที)": late_mins,
            "โดนหัก (บาท)": daily_penalty,
            "ชั่วโมงทำงานรวม": daily_hours,
            "ค่าจ้างวันนี้ (บาท)": daily_rate - daily_penalty,
        })

    return daily_records, total_days, round(total_hours, 2), total_penalty, incomplete_days


@st.cache_data(show_spinner=False)
def to_excel(df: pd.DataFrame) -> bytes:
    # สร้างไฟล์ Excel พร้อมจัดรูปแบบ header และ border
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="สรุปยอดจ่ายเงิน")
        ws = writer.sheets["สรุปยอดจ่ายเงิน"]

        header_fill = PatternFill(start_color="FFA500", end_color="FFA500", fill_type="solid")
        header_font = Font(bold=True, color="FFFFFF", size=12)
        center = Alignment(horizontal="center", vertical="center")
        thin = Border(
            left=Side(style="thin"), right=Side(style="thin"),
            top=Side(style="thin"), bottom=Side(style="thin"),
        )

        # ตกแต่ง header row
        for col_num, _ in enumerate(df.columns, 1):
            cell = ws.cell(row=1, column=col_num)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = center
            cell.border = thin

        # ปรับความกว้างคอลัมน์ให้พอดีกับข้อมูล และใส่ border ทุก cell
        for col_num, _ in enumerate(df.columns, 1):
            col_letter = get_column_letter(col_num)
            max_len = 0
            for cell in ws[col_letter]:
                try:
                    max_len = max(max_len, len(str(cell.value)))
                except Exception:
                    pass
                cell.border = thin
                if col_num > 1:
                    cell.alignment = center
            ws.column_dimensions[col_letter].width = max_len + 5

    return output.getvalue()


def process_payroll(uploaded_files, daily_rate: int, tab_key: str, start_hour: int = 14):
    if not uploaded_files:
        return

    all_employees_summary = []
    st.divider()

    n = len(uploaded_files)
    progress_bar = st.progress(0, text=f"เริ่มประมวลผล 0/{n} ไฟล์...")

    for idx, file in enumerate(uploaded_files):
        progress_bar.progress(idx / n, text=f"📄 กำลังอ่าน {file.name}  ({idx + 1}/{n})")
        try:
            with st.spinner(f"กำลังอ่านและแปลงข้อมูล **{file.name}** ..."):
                raw_df = read_file_to_df(file)

            # แบ่งกลุ่มพนักงานตามชื่อ (กรณีไฟล์มีหลายคน) หรือใช้ชื่อไฟล์แทน
            employee_groups = (
                [(name.strip(), grp) for name, grp in raw_df.groupby("Full Name")]
                if "Full Name" in raw_df.columns
                else [(file.name, raw_df)]
            )

            for emp_name, emp_df in employee_groups:
                st.subheader(f"👤 {emp_name}")

                with st.spinner(f"กำลังคำนวณเงินเดือน {emp_name}..."):
                    daily_records, total_days, total_hours, total_penalty, incomplete_days = \
                        calculate_employee_payroll(emp_df, daily_rate, start_hour)

                # แจ้งเตือนวันที่ตอกบัตรไม่ครบ ให้ผู้ใช้คำนวณเอง
                if incomplete_days:
                    st.warning(f"⚠️ วันที่ {', '.join(incomplete_days)} ตอกบัตรไม่ครบคู่เข้า-ออก — กรุณาคำนวณวันเหล่านี้ด้วยตนเอง")

                if daily_records:
                    with st.expander(f"ดูรายละเอียดรายวัน ของ {emp_name}"):
                        st.dataframe(pd.DataFrame(daily_records))

                base_pay = total_days * daily_rate
                net_pay = base_pay - total_penalty

                st.success(
                    f"ทำงาน: {total_days} วัน ({total_hours:.2f} ชม.) | "
                    f"ค่าจ้าง: ฿{base_pay:,.2f} | โดนหักสาย: ฿{total_penalty:,.2f} | "
                    f"**รับสุทธิ: ฿{net_pay:,.2f}**"
                )
                st.write("---")

                all_employees_summary.append({
                    "ชื่อพนักงาน": emp_name,
                    "วันที่ทำงาน (วัน)": total_days,
                    "ชั่วโมงทำงาน (ชม.)": total_hours,
                    "ค่าจ้างปกติ (บาท)": base_pay,
                    "หักมาสาย (บาท)": total_penalty,
                    "รับเงินสุทธิ (บาท)": net_pay,
                })

        except Exception as e:
            st.error(f"ไฟล์ {file.name} มีปัญหา (Error: {e})")

        progress_bar.progress((idx + 1) / n, text=f"✅ เสร็จสิ้น {idx + 1}/{n} ไฟล์")

    progress_bar.empty()

    if all_employees_summary:
        st.header("💰 สรุปยอดจ่ายเงินพนักงานทั้งหมด")
        summary_df = pd.DataFrame(all_employees_summary)
        st.dataframe(summary_df, width='stretch')

        grand_total = summary_df["รับเงินสุทธิ (บาท)"].sum()
        st.metric("ยอดเงินรวมที่ร้านต้องโอนจ่าย (บาท)", f"฿{grand_total:,.2f}")

        st.download_button(
            label="📥 ดาวน์โหลดสรุปยอดเงินทั้งหมด (Excel)",
            data=to_excel(summary_df),
            file_name=f"payroll_summary_{pd.Timestamp.now().strftime('%Y%m%d_%H%M')}.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            key=f"download_{tab_key}",
        )


tab_normal, tab_parttime, tab_custom = st.tabs(["👔 พนักงานประจำ", "🕐 พาร์ทไทม์", "✏️ กำหนดเอง"])

with tab_normal:
    with st.expander("⚙️ ตั้งค่าอัตราค่าจ้างพนักงานประจำ"):
        rate_normal = st.number_input("👔 พนักงานประจำ (บาท/วัน):", min_value=0, value=300, step=50, key="rate_normal")
        st.caption(f"🟢 อัตราปัจจุบัน: {rate_normal} ฿ (พิมพ์แล้วกด Enter หรือคลิกที่อื่นเพื่อบันทึก)")
    col_up, col_clear = st.columns([4, 1])
    with col_up:
        files_normal = st.file_uploader("อัปโหลดไฟล์ PDF พนักงานประจำ", type=["pdf"], accept_multiple_files=True, key=f"uploader_normal_{st.session_state.key_normal}")
    with col_clear:
        st.write("")
        st.write("")
        if st.button("🗑️ ล้างไฟล์", key="clear_normal"):
            st.session_state.key_normal += 1
            st.rerun()
    process_payroll(files_normal, rate_normal, "normal")

with tab_parttime:
    with st.expander("⚙️ ตั้งค่าอัตราค่าจ้างพาร์ทไทม์"):
        rate_parttime = st.number_input("🕐 พาร์ทไทม์ (บาท/วัน):", min_value=0, value=250, step=50, key="rate_parttime")
        st.caption(f"🟢 อัตราปัจจุบัน: {rate_parttime} ฿ (พิมพ์แล้วกด Enter หรือคลิกที่อื่นเพื่อบันทึก)")
    col_up, col_clear = st.columns([4, 1])
    with col_up:
        files_parttime = st.file_uploader("อัปโหลดไฟล์ PDF พนักงานพาร์ทไทม์", type=["pdf"], accept_multiple_files=True, key=f"uploader_parttime_{st.session_state.key_parttime}")
    with col_clear:
        st.write("")
        st.write("")
        if st.button("🗑️ ล้างไฟล์", key="clear_parttime"):
            st.session_state.key_parttime += 1
            st.rerun()
    process_payroll(files_parttime, rate_parttime, "parttime", start_hour=16)

with tab_custom:
    rate_custom = st.number_input("กำหนดอัตราค่าจ้างต่อวัน (บาท):", min_value=0, value=400, step=50, key="rate_custom")
    st.caption(f"🟢 อัตราปัจจุบัน: {rate_custom} ฿ (พิมพ์แล้วกด Enter หรือคลิกที่อื่นเพื่อบันทึก)")
    col_up, col_clear = st.columns([4, 1])
    with col_up:
        files_custom = st.file_uploader("อัปโหลดไฟล์ PDF (อัตราพิเศษ)", type=["pdf"], accept_multiple_files=True, key=f"uploader_custom_{st.session_state.key_custom}")
    with col_clear:
        st.write("")
        st.write("")
        if st.button("🗑️ ล้างไฟล์", key="clear_custom"):
            st.session_state.key_custom += 1
            st.rerun()
    process_payroll(files_custom, rate_custom, "custom")