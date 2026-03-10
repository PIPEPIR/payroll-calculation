#!/usr/bin/env python3
"""
PDF to JSON converter for payroll system
Uses PyMuPDF for better Thai character support
Usage: python pdf-to-json.py <pdf_file>
"""

import sys
import json
import re
import codecs
from pathlib import Path

# Set UTF-8 encoding for stdout
sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer)

try:
    import fitz  # PyMuPDF
except ImportError:
    print("Error: PyMuPDF not installed. Run: pip install PyMuPDF")
    sys.exit(1)

# Regex pattern for parsing punch card lines
# Format: StaffID Name Timestamp RecordType
ROW_REGEX = re.compile(
    r'^(\d+)\s+(.+?)\s+(\d{4}[/\-]\d{2}[/\-]\d{2}\s+\d{2}:\d{2}:\d{2})\s+(.+)$'
)

def normalize_thai(text: str) -> str:
    """Normalize Thai characters and fix common encoding issues"""
    if not text:
        return text
    
    # Normalize different types of spaces
    text = text.replace('\u00a0', ' ')  # Non-breaking space
    text = text.replace('\u200b', '')   # Zero-width space
    text = text.replace('\ufeff', '')   # BOM
    
    # Strip and normalize
    return text.strip()

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from PDF with better Thai support"""
    try:
        doc = fitz.open(pdf_path)
        all_text = []
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            # Use text extraction with sorting
            text = page.get_text("text", sort=True)
            if text:
                all_text.append(text)
        
        doc.close()
        return "\n".join(all_text)
    except Exception as e:
        raise Exception(f"Error reading PDF: {str(e)}")

def parse_pdf_content(text: str) -> dict:
    """Parse extracted text into structured data"""
    results = []
    errors = []
    warnings = []
    lines = text.split('\n')
    
    valid_count = 0
    invalid_count = 0
    employees = set()
    earliest_date = None
    latest_date = None
    
    for line_num, line in enumerate(lines, 1):
        line = line.strip()
        if not line:
            continue
        
        match = ROW_REGEX.match(line)
        
        if match:
            record = {
                "staffId": match.group(1).strip(),
                "fullName": normalize_thai(match.group(2)),
                "timestamp": match.group(3).strip(),
                "recordType": normalize_thai(match.group(4)),
                "_isValid": True,
                "_parseErrors": []
            }
            
            # Validate
            validation_errors = []
            
            # Validate staff ID
            if not record["staffId"].isdigit():
                validation_errors.append(f"Invalid staff ID: {record['staffId']}")
            
            # Validate name
            if not record["fullName"] or len(record["fullName"]) < 2:
                validation_errors.append("Invalid employee name")
            
            # Validate timestamp format
            ts_pattern = r'^\d{4}[/\-]\d{2}[/\-]\d{2}\s+\d{2}:\d{2}:\d{2}$'
            if not re.match(ts_pattern, record["timestamp"]):
                validation_errors.append(f"Invalid timestamp format: {record['timestamp']}")
            
            if validation_errors:
                record["_isValid"] = False
                record["_parseErrors"] = validation_errors
                invalid_count += 1
                errors.append({
                    "line": line_num,
                    "content": line,
                    "error": "; ".join(validation_errors)
                })
            else:
                valid_count += 1
                employees.add(record["fullName"])
                
                # Track date range
                date_part = record["timestamp"].split()[0]
                if earliest_date is None or date_part < earliest_date:
                    earliest_date = date_part
                if latest_date is None or date_part > latest_date:
                    latest_date = date_part
            
            results.append(record)
        else:
            # Line doesn't match expected format
            if len(line) > 5:  # Ignore short lines (headers/footers)
                warnings.append({
                    "line": line_num,
                    "content": line,
                    "error": "รูปแบบไม่ตรงกับที่คาดหวัง"
                })
    
    return {
        "data": results,
        "errors": errors,
        "warnings": warnings,
        "stats": {
            "totalLines": len(lines),
            "validRecords": valid_count,
            "invalidRecords": invalid_count,
            "uniqueEmployees": len(employees),
            "dateRange": {
                "earliest": earliest_date,
                "latest": latest_date
            }
        }
    }

def main():
    if len(sys.argv) < 2:
        print("Usage: python pdf-to-json.py <pdf_file>")
        print("       python pdf-to-json.py --stdin  (read from stdin)")
        sys.exit(1)
    
    if sys.argv[1] == "--stdin":
        # Read PDF path from stdin
        pdf_path = sys.stdin.read().strip()
    else:
        pdf_path = sys.argv[1]
    
    if not Path(pdf_path).exists():
        print(json.dumps({
            "error": f"File not found: {pdf_path}",
            "data": [],
            "errors": [],
            "warnings": [],
            "stats": {
                "totalLines": 0,
                "validRecords": 0,
                "invalidRecords": 0,
                "uniqueEmployees": 0,
                "dateRange": {"earliest": None, "latest": None}
            }
        }, ensure_ascii=False, indent=2))
        sys.exit(1)
    
    try:
        # Extract text
        text = extract_text_from_pdf(pdf_path)
        
        # Parse content
        result = parse_pdf_content(text)
        
        # Output as JSON
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "data": [],
            "errors": [],
            "warnings": [],
            "stats": {
                "totalLines": 0,
                "validRecords": 0,
                "invalidRecords": 0,
                "uniqueEmployees": 0,
                "dateRange": {"earliest": None, "latest": None}
            }
        }, ensure_ascii=False, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()
