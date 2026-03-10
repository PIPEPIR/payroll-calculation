#!/usr/bin/env python3
"""
PDF Parsing API for Payroll System
Deploy on Hugging Face Spaces
"""

import os
import sys
import json
import re
from pathlib import Path
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import fitz  # PyMuPDF

app = FastAPI(title="Payroll PDF Parser")

# Allow CORS for your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Regex pattern for parsing punch card lines
ROW_REGEX = re.compile(
    r'^(\d+)\s+(.+?)\s+(\d{4}[/\-]\d{2}[/\-]\d{2}\s+\d{2}:\d{2}:\d{2})\s+(.+)$'
)

def normalize_thai(text: str) -> str:
    """Normalize Thai characters and fix common encoding issues"""
    if not text:
        return text
    text = text.replace('\u00a0', ' ')  # Non-breaking space
    text = text.replace('\u200b', '')   # Zero-width space
    text = text.replace('\ufeff', '')   # BOM
    return text.strip()

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

            validation_errors = []

            if not record["staffId"].isdigit():
                validation_errors.append(f"Invalid staff ID: {record['staffId']}")

            if not record["fullName"] or len(record["fullName"]) < 2:
                validation_errors.append("Invalid employee name")

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

                date_part = record["timestamp"].split()[0]
                if earliest_date is None or date_part < earliest_date:
                    earliest_date = date_part
                if latest_date is None or date_part > latest_date:
                    latest_date = date_part

            results.append(record)
        else:
            if len(line) > 5:
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

@app.post("/parse-pdf")
async def parse_pdf(file: UploadFile = File(...)):
    """Parse uploaded PDF file"""
    try:
        contents = await file.read()
        
        # Save to temp file for PyMuPDF
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
            tmp.write(contents)
            tmp_path = tmp.name
        
        try:
            # Extract text using PyMuPDF
            doc = fitz.open(tmp_path)
            all_text = []
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                text = page.get_text("text", sort=True)
                if text:
                    all_text.append(text)
            
            doc.close()
            text = "\n".join(all_text)
            
            # Parse content
            result = parse_pdf_content(text)
            return result
            
        finally:
            # Clean up temp file
            Path(tmp_path).unlink(missing_ok=True)
            
    except Exception as e:
        return {
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
        }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    # Hugging Face Spaces uses port 7860
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
