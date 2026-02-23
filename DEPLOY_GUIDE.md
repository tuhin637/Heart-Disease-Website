# Vercel Deployment Guide — 2025

## Frontend Deploy (Vercel) — সহজ!

### Method 1: Vercel CLI
```bash
cd frontend
npm install
npm run build          # test locally first
npx vercel             # deploy
```

### Method 2: GitHub + Vercel Dashboard (সবচেয়ে সহজ)
1. GitHub-এ নতুন repo তৈরি করো
2. `frontend/` folder-এর সব files push করো
3. https://vercel.com → "New Project" → GitHub repo select করো
4. Settings:
   - **Framework**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Deploy!

---

## Backend Deploy (Render — Free)

1. https://render.com → New Web Service
2. GitHub repo connect করো
3. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Environment: Python 3.11

**Important:** Model pkl files আগে locally generate করে Render-এ upload করতে হবে, অথবা startup script-এ train করতে হবে।

---

## Frontend-এ Backend URL Connect করো

`frontend/src/App.jsx` file-এর শুরুতে:
```js
// এটা change করো:
const BASE_URL = "http://localhost:8000";

// Render URL দিয়ে replace করো:
const BASE_URL = "https://your-app-name.onrender.com";
```

---

## Full Stack Architecture

```
User Browser
    ↓ HTTPS
Vercel (React Frontend)
    ↓ API calls
Render (FastAPI Backend)
    ↓ loads
Model PKL files (best_model.pkl)
    trained on
CDC BRFSS 2020 Dataset
```

---

## Quick Test Locally

```bash
# Terminal 1 — Backend
cd backend
pip install -r requirements.txt
# (model train করার পরে)
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend  
cd frontend
npm install
npm run dev
```

Open: http://localhost:5173
