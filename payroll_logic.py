import pandas as pd
import math

def calculate_payroll(df, hourly_rate):
    daily_records = []
    total_hours_person = 0
    total_penalty_person = 0 # เก็บยอดโดนหักรวม
    warnings = []
    
    for date, group in df.groupby('Date'):
        punches = group['Timestamp'].tolist()
        
        if len(punches) % 2 != 0:
            warnings.append(f"⚠️ วันที่ {date}: มีการตอกบัตร {len(punches)} ครั้ง ระบบจะคิดเฉพาะคู่ที่สมบูรณ์")
        
        # ==========================================
        # ระบบคำนวณหักเงินมาสาย (ดูจากการตอกบัตรรอบแรกของวัน)
        # ==========================================
        first_punch = punches[0]
        shift_start_time = first_punch.replace(hour=14, minute=0, second=0, microsecond=0)
        
        daily_penalty = 0
        late_mins = 0
        
        # ถ้าตอกบัตรเข้างานหลัง 14:00 น.
        if first_punch > shift_start_time:
            late_delta = first_punch - shift_start_time
            # ปัดเศษนาทีลง (ถ้ามา 14:00:59 ถือว่าไม่สาย)
            late_mins = math.floor(late_delta.total_seconds() / 60) 
            
            if late_mins > 0:
                if late_mins <= 30:
                    daily_penalty = late_mins * 5
                else:
                    # 30 นาทีแรก นาทีละ 5 บาท + นาทีที่เกิน 30 นาทีละ 10 บาท
                    daily_penalty = (30 * 5) + ((late_mins - 30) * 10)
        
        total_penalty_person += daily_penalty

        # ==========================================
        # คำนวณชั่วโมงทำงานปกติ
        # ==========================================
        daily_hours = 0
        for i in range(0, len(punches) - 1, 2):
            time_in = punches[i]
            time_out = punches[i+1]
            hours = (time_out - time_in).total_seconds() / 3600
            daily_hours += hours
        
        daily_hours = round(daily_hours, 2)
        total_hours_person += daily_hours
        
        daily_records.append({
            'วันที่': date,
            'เวลาเข้างาน (รอบแรก)': first_punch.strftime('%H:%M:%S'),
            'สาย (นาที)': late_mins,
            'โดนหัก (บาท)': daily_penalty,
            'ชั่วโมงทำงานรวม': daily_hours
        })
        
    base_pay = total_hours_person * hourly_rate
    net_pay = base_pay - total_penalty_person
    
    return daily_records, total_hours_person, total_penalty_person, base_pay, net_pay, warnings
