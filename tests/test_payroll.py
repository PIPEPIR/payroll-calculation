import unittest
import pandas as pd
import sys

# Mock Streamlit UI
class MockSessionState(dict):
    def __getattr__(self, key): return self.get(key)
    def __setattr__(self, key, value): self[key] = value

class DummyStreamlit:
    def __init__(self):
        self.session_state = MockSessionState()
    def set_page_config(self, *args, **kwargs): pass
    def title(self, *args, **kwargs): pass
    def write(self, *args, **kwargs): pass
    def number_input(self, *args, **kwargs): return 300
    def file_uploader(self, *args, **kwargs): return []
    def button(self, *args, **kwargs): return False
    def divider(self, *args, **kwargs): pass
    def subheader(self, *args, **kwargs): pass
    def success(self, *args, **kwargs): pass
    def warning(self, *args, **kwargs): pass
    def error(self, *args, **kwargs): pass
    def header(self, *args, **kwargs): pass
    def dataframe(self, *args, **kwargs): pass
    def metric(self, *args, **kwargs): pass
    def download_button(self, *args, **kwargs): pass
    def expander(self, *args, **kwargs): return self
    def columns(self, spec, **kwargs): return [self] * (spec if isinstance(spec, int) else len(spec))
    def tabs(self, *args, **kwargs): return [self, self, self]
    def caption(self, *args, **kwargs): pass
    def progress(self, *args, **kwargs): return self
    def spinner(self, *args, **kwargs): return self
    def empty(self, *args, **kwargs): pass
    def rerun(self, *args, **kwargs): pass
    def markdown(self, *args, **kwargs): pass
    def __enter__(self): return self
    def __exit__(self, exc_type, exc_val, exc_tb): pass

mock_st = DummyStreamlit()

def mock_decorator(*args, **kwargs):
    def wrapper(func): return func
    return wrapper

mock_st.cache_data = mock_decorator
sys.modules["streamlit"] = mock_st

from app import calculate_employee_payroll

class TestPayrollPDF(unittest.TestCase):
    def setUp(self):
        self.daily_rate = 300

    def test_calculate_payroll_on_time(self):
        data = {"Timestamp": ["2023-10-01 13:50:00", "2023-10-01 22:00:00"]}
        df = pd.DataFrame(data)
        
        records, days, hours, penalty, incomplete = calculate_employee_payroll(df, self.daily_rate)
        
        self.assertEqual(days, 1)
        self.assertEqual(penalty, 0)
        self.assertEqual(records[0]["สาย (นาที)"], 0)
        self.assertEqual(records[0]["โดนหัก (บาท)"], 0)
        self.assertEqual(records[0]["ค่าจ้างวันนี้ (บาท)"], 300)
        self.assertEqual(hours, 8.17)

    def test_calculate_payroll_late_under_30(self):
        data = {"Timestamp": ["2023-10-01 14:10:00", "2023-10-01 22:10:00"]}
        df = pd.DataFrame(data)
        
        records, days, hours, penalty, incomplete = calculate_employee_payroll(df, self.daily_rate)
        
        self.assertEqual(penalty, 50) # 10 mins * 5
        self.assertEqual(records[0]["สาย (นาที)"], 10)
        self.assertEqual(records[0]["ค่าจ้างวันนี้ (บาท)"], 250)

    def test_calculate_payroll_late_over_30(self):
        data = {"Timestamp": ["2023-10-01 14:45:00", "2023-10-01 22:45:00"]}
        df = pd.DataFrame(data)
        
        records, days, hours, penalty, incomplete = calculate_employee_payroll(df, self.daily_rate)
        
        self.assertEqual(penalty, 300) # (30 * 5) + (15 * 10) = 300
        self.assertEqual(records[0]["ค่าจ้างวันนี้ (บาท)"], 0)

    def test_calculate_payroll_incomplete(self):
        data = {"Timestamp": ["2023-10-01 14:00:00"]}
        df = pd.DataFrame(data)
        
        records, days, hours, penalty, incomplete = calculate_employee_payroll(df, self.daily_rate)
        
        self.assertEqual(days, 0)
        self.assertEqual(len(incomplete), 1)
        self.assertEqual(records[0]["ค่าจ้างวันนี้ (บาท)"], "-")

    def test_parttime_on_time(self):
        data = {"Timestamp": ["2023-10-01 15:50:00", "2023-10-01 23:00:00"]}
        df = pd.DataFrame(data)
        
        records, days, hours, penalty, incomplete = calculate_employee_payroll(df, daily_rate=250, start_hour=16)
        
        self.assertEqual(days, 1)
        self.assertEqual(penalty, 0)
        self.assertEqual(records[0]["ค่าจ้างวันนี้ (บาท)"], 250)

    def test_parttime_late_under_30(self):
        data = {"Timestamp": ["2023-10-01 16:15:00", "2023-10-01 23:00:00"]}
        df = pd.DataFrame(data)
        
        # Late 15 mins
        records, days, hours, penalty, incomplete = calculate_employee_payroll(df, daily_rate=250, start_hour=16)
        
        self.assertEqual(penalty, 15 * 5) # 75
        self.assertEqual(records[0]["ค่าจ้างวันนี้ (บาท)"], 250 - 75)

    def test_parttime_late_over_30(self):
        data = {"Timestamp": ["2023-10-01 16:45:00", "2023-10-01 23:00:00"]}
        df = pd.DataFrame(data)
        
        # Late 45 mins: 30*5 + 15*10 = 150 + 150 = 300
        records, days, hours, penalty, incomplete = calculate_employee_payroll(df, daily_rate=250, start_hour=16)
        
        self.assertEqual(penalty, 300)
        self.assertEqual(records[0]["ค่าจ้างวันนี้ (บาท)"], -50) # 250 - 300

    def test_custom_payroll(self):
        # Testing a custom scenario, e.g., rate 500, default start_hour 14
        data = {"Timestamp": ["2023-10-01 14:15:00", "2023-10-01 22:00:00"]}
        df = pd.DataFrame(data)
        
        # Late 15 mins
        records, days, hours, penalty, incomplete = calculate_employee_payroll(df, daily_rate=500, start_hour=14)
        
        self.assertEqual(penalty, 15 * 5) # 75
        self.assertEqual(records[0]["ค่าจ้างวันนี้ (บาท)"], 500 - 75)

if __name__ == '__main__':
    unittest.main()
