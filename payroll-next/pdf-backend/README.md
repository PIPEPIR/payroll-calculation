# PDF Parser Backend - Hugging Face Spaces

FastAPI backend for PDF parsing using PyMuPDF.

## Deploy to Hugging Face Spaces (Free)

### Step 1: Create a Hugging Face Account

Go to https://huggingface.co and sign up (free).

### Step 2: Create New Space

1. Go to https://huggingface.co/spaces
2. Click **"Create new Space"**
3. Fill in:
   - **Space name:** `payroll-pdf-parser` (or any name)
   - **License:** MIT
   - **Space SDK:** Select **Docker**
   - **Visibility:** Public (free) or Private (paid)

### Step 3: Connect GitHub Repo

**Option A: Push directly to Hugging Face**

```bash
# Clone your Hugging Face Space
git clone https://huggingface.co/spaces/YOUR_USERNAME/payroll-pdf-parser

# Copy backend files
cp -r pdf-backend/* payroll-pdf-parser/

# Push to Hugging Face
cd payroll-pdf-parser
git add .
git commit -m "Initial commit"
git push
```

**Option B: Deploy from GitHub**

1. In your Space settings, enable **"Link to GitHub repo"**
2. Select your `payroll-calculation` repository
3. Set **Root directory:** `pdf-backend`
4. Hugging Face will auto-deploy

### Step 4: Wait for Build

- Hugging Face will build your Docker container (~2-3 minutes)
- Status shows "Building" → "Running"
- Your API will be at: `https://YOUR_USERNAME-payroll-pdf-parser.hf.space`

### Step 5: Update Frontend

Create `.env.local` in your Next.js project:

```bash
NEXT_PUBLIC_PDF_BACKEND_URL=https://YOUR_USERNAME-payroll-pdf-parser.hf.space
```

## API Endpoints

### POST /parse-pdf

Upload PDF file for parsing.

**Request:**
```bash
curl -X POST "https://YOUR_USERNAME-payroll-pdf-parser.hf.space/parse-pdf" \
  -F "file=@your-file.pdf"
```

**Response:**
```json
{
  "data": [...],
  "errors": [],
  "warnings": [],
  "stats": {...}
}
```

### GET /health

Health check endpoint.

```bash
curl https://YOUR_USERNAME-payroll-pdf-parser.hf.space/health
```

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run server
python main.py

# Or with uvicorn directly
uvicorn main:app --reload --port 7860
```

Server runs at `http://localhost:7860`

## Free Tier Limits

- **RAM:** 512MB
- **CPU:** 2 vCPU (shared)
- **Storage:** 10GB
- **Sleep:** Never (always on)
- **Bandwidth:** Unlimited

## Troubleshooting

**Space shows "Error"**: Check logs in Hugging Face dashboard

**CORS errors**: Backend allows all origins by default. For production, update `allow_origins` in `main.py`.

**Timeout**: Large PDFs may timeout. Consider adding timeout config.
