# PDF Parser Backend

Python FastAPI backend for PDF parsing.

## Deploy to Railway

1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect this repository
4. Railway will auto-detect `requirements.txt` and deploy
5. Copy your deployment URL (e.g., `https://your-app.railway.app`)

## Deploy to Render

1. Go to https://render.com
2. Click "New" → "Web Service"
3. Connect repository
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `python main.py`
6. Copy your deployment URL

## Environment Variables

Set these on your hosting platform:

```
FRONTEND_URL=https://your-frontend.vercel.app
```

## Local Development

```bash
pip install -r requirements.txt
python main.py
```

Server runs at `http://localhost:8000`

Test: `POST http://localhost:8000/parse-pdf` with PDF file
