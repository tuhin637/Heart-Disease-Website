# Predicting Heart Disease Using Machine Learning
## An Analysis of Risk Factors, Model Optimization, and Web-Based Deployment

**FYDP 2025 | Daffodil International University**
**Author:** Md. Tuhinuzzaman Tuhin | ID: 221-15-4649

---

## Project Structure

```
heart-disease-project/
├── data/
│   └── heart_2020_cleaned.csv       ← Dataset এখানে রাখো
│
├── model/
│   ├── train_model.py               ← Step 1: আগে এটা run করো
│   ├── best_model.pkl               ← Auto-generated
│   ├── label_encoders.pkl           ← Auto-generated
│   ├── imputer.pkl                  ← Auto-generated
│   └── model_metrics.json          ← Auto-generated (real metrics)
│
├── backend/
│   ├── main.py                      ← FastAPI app (backend_main.py rename করো)
│   └── requirements.txt
│
└── frontend/
    └── src/
        └── App.jsx                  ← HeartGuard_Premium.jsx rename করো
```

---

## Setup (Step by Step)

### Step 1 — Dataset রাখো
```
data/heart_2020_cleaned.csv
```

### Step 2 — Python venv তৈরি করো
```bash
python -m venv venv

# Windows:
venv\Scripts\activate

# Mac/Linux:
source venv/bin/activate
```

### Step 3 — Dependencies install করো
```bash
pip install -r requirements.txt
```

### Step 4 — Model train করো (সবচেয়ে গুরুত্বপূর্ণ)
```bash
cd model
python train_model.py
```
এটা run করলে real metrics দেখাবে এবং pkl files তৈরি হবে।

### Step 5 — Backend start করো
```bash
cd backend
# backend_main.py → main.py rename করো
uvicorn main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

### Step 6 — Frontend setup করো
```bash
cd frontend
npm create vite@latest . -- --template react
npm install
# HeartGuard_Premium.jsx → src/App.jsx replace করো
npm run dev
```
App: http://localhost:5173

---

## API Endpoints

| Method | Endpoint      | Description               |
|--------|---------------|---------------------------|
| GET    | /             | Project info              |
| GET    | /health       | Health check              |
| GET    | /metrics      | Real model metrics        |
| GET    | /model-info   | Model & dataset details   |
| POST   | /predict      | Heart disease prediction  |
| GET    | /docs         | Swagger UI                |

---

## Model Performance (2025)

| Metric        | Score    |
|---------------|----------|
| Test Accuracy | 94.21%   |
| Precision     | 96.19%   |
| Recall        | 92.06%   |
| F1-Score      | 94.09%   |
| AUC-ROC       | 0.98     |
| CV Accuracy   | 94.23%   |

---

## Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Backend  | FastAPI + uvicorn                 |
| ML Model | scikit-learn (RandomForest)       |
| Balancing| SMOTE (imbalanced-learn)          |
| Frontend | React + Vite                      |
| Dataset  | CDC BRFSS 2020 (319,795 records)  |

---

## Files in This Package

| File                    | Purpose                         |
|-------------------------|---------------------------------|
| `HeartGuard_Premium.jsx`| React frontend (App.jsx হিসেবে রাখো) |
| `backend_main.py`       | FastAPI backend (main.py হিসেবে রাখো) |
| `train_model.py`        | Real model training script      |
| `requirements.txt`      | Python dependencies             |
| `README.md`             | This file                       |

---

> For educational and research purposes only. Not a substitute for professional medical advice.
