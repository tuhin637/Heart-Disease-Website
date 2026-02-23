"""
Heart Disease Prediction — FastAPI Backend
Author : Md. Tuhinuzzaman Tuhin | DIU 221-15-4649
Deploy : Render.com  (free tier)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from typing import Literal
import numpy as np
import pickle, os

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Heart Disease Prediction API",
    description="RuleNet Hybrid ML — CDC BRFSS 2020 | DIU FYDP",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # production-এ Vercel URL লিখো
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── RuleNet (training-এর মতোই) ────────────────────────────────────────────────
class RuleNetClassifier:
    def __init__(self, rf_model):
        self.rf_model = rf_model

    def predict(self, X):
        rule_preds = self._rules(X)
        out = []
        for i, rp in enumerate(rule_preds):
            out.append(rp if rp != -1 else int(self.rf_model.predict([X[i]])[0]))
        return np.array(out)

    def predict_proba(self, X):
        probas = []
        for i, rp in enumerate(self._rules(X)):
            if rp != -1:
                probas.append([0.1, 0.9] if rp == 1 else [0.9, 0.1])
            else:
                probas.append(self.rf_model.predict_proba([X[i]])[0].tolist())
        return np.array(probas)

    def rule_fired(self, X) -> bool:
        return self._rules(X)[0] != -1

    def _rules(self, X):
        out = []
        for row in X:
            if   row[0] > 35 and row[4] > 15:   out.append(1)   # BMI + PhysHealth
            elif row[3] == 1 and row[8] >= 8:    out.append(1)   # Stroke + Age 60+
            elif row[13] >= 8 and row[5] == 0:   out.append(0)   # Sleep + MentalHealth OK
            else:                                out.append(-1)
        return np.array(out)

# ── Model Load ─────────────────────────────────────────────────────────────────
rf_model       = None
label_encoders = None

@app.on_event("startup")
def load_model():
    global rf_model, label_encoders
    base = os.path.dirname(__file__)
    mp   = os.path.join(base, os.getenv("MODEL_PATH",   "best_rf_model.pkl"))
    ep   = os.path.join(base, os.getenv("ENCODER_PATH", "label_encoders.pkl"))
    if not os.path.exists(mp): raise RuntimeError(f"Model not found: {mp}")
    if not os.path.exists(ep): raise RuntimeError(f"Encoders not found: {ep}")
    with open(mp, "rb") as f: backbone = pickle.load(f)
    with open(ep, "rb") as f: label_encoders = pickle.load(f)
    rf_model = RuleNetClassifier(backbone)
    print("✓ Model loaded")

# ── Schemas ────────────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    BMI:             float = Field(..., ge=10, le=60,  example=25.0)
    Smoking:         Literal["Yes","No"]
    AlcoholDrinking: Literal["Yes","No"]
    Stroke:          Literal["Yes","No"]
    PhysicalHealth:  float = Field(..., ge=0, le=30, example=0)
    MentalHealth:    float = Field(..., ge=0, le=30, example=0)
    DiffWalking:     Literal["Yes","No"]
    Sex:             Literal["Male","Female"]
    AgeCategory:     Literal[
        "18-24","25-29","30-34","35-39","40-44","45-49",
        "50-54","55-59","60-64","65-69","70-74","75-79","80 or older"
    ]
    Race: Literal[
        "White","Black","Asian",
        "American Indian/Alaskan Native","Hispanic","Other"
    ]
    Diabetic: Literal[
        "Yes","No","No, borderline diabetes","Yes (during pregnancy)"
    ]
    PhysicalActivity: Literal["Yes","No"]
    GenHealth:        Literal["Excellent","Very good","Good","Fair","Poor"]
    SleepTime:        float = Field(..., ge=0, le=24, example=7)
    Asthma:           Literal["Yes","No"]
    KidneyDisease:    Literal["Yes","No"]
    SkinCancer:       Literal["Yes","No"]

    @field_validator("BMI")
    @classmethod
    def round_bmi(cls, v): return round(v, 2)

class RiskFactor(BaseModel):
    factor:      str
    value:       str
    description: str
    severity:    Literal["high","medium","low"]

class Recommendation(BaseModel):
    title:       str
    description: str
    icon:        str
    priority:    Literal["urgent","important","suggested"]

class PredictResponse(BaseModel):
    prediction:      int          # 0 / 1
    probability:     float        # 0.0–1.0
    risk_level:      str          # Low / Moderate / High / Very High
    risk_factors:    list[RiskFactor]
    recommendations: list[Recommendation]
    model_used:      str
    confidence:      str

# ── Helpers ────────────────────────────────────────────────────────────────────
def _enc(col, val):
    return int(label_encoders[col].transform([val])[0])

def encode(d: PredictRequest) -> np.ndarray:
    return np.array([[
        d.BMI,
        _enc("Smoking", d.Smoking),
        _enc("AlcoholDrinking", d.AlcoholDrinking),
        _enc("Stroke", d.Stroke),
        d.PhysicalHealth,
        d.MentalHealth,
        _enc("DiffWalking", d.DiffWalking),
        _enc("Sex", d.Sex),
        _enc("AgeCategory", d.AgeCategory),
        _enc("Race", d.Race),
        _enc("Diabetic", d.Diabetic),
        _enc("PhysicalActivity", d.PhysicalActivity),
        _enc("GenHealth", d.GenHealth),
        d.SleepTime,
        _enc("Asthma", d.Asthma),
        _enc("KidneyDisease", d.KidneyDisease),
        _enc("SkinCancer", d.SkinCancer),
    ]])

def risk_level(p: float) -> str:
    if p < 0.25: return "Low"
    if p < 0.50: return "Moderate"
    if p < 0.75: return "High"
    return "Very High"

def confidence_label(p: float) -> str:
    diff = abs(p - 0.5)
    if diff > 0.35: return "Very High"
    if diff > 0.20: return "High"
    if diff > 0.10: return "Moderate"
    return "Low"

def build_risk_factors(d: PredictRequest) -> list[RiskFactor]:
    f = []
    if d.BMI >= 30:
        f.append(RiskFactor(factor="High BMI", value=f"{d.BMI:.1f}",
            description="Obesity raises cardiovascular risk significantly.",
            severity="high" if d.BMI >= 35 else "medium"))
    if d.Smoking == "Yes":
        f.append(RiskFactor(factor="Smoking", value="Active Smoker",
            description="Smoking doubles the risk of heart disease.",
            severity="high"))
    if d.Stroke == "Yes":
        f.append(RiskFactor(factor="Previous Stroke", value="History Present",
            description="Prior stroke is a strong predictor of heart disease.",
            severity="high"))
    if d.Diabetic in ("Yes","No, borderline diabetes"):
        f.append(RiskFactor(factor="Diabetes / Pre-Diabetes", value=d.Diabetic,
            description="Diabetes raises heart disease risk 2–4×.",
            severity="high" if d.Diabetic == "Yes" else "medium"))
    if d.KidneyDisease == "Yes":
        f.append(RiskFactor(factor="Kidney Disease", value="Diagnosed",
            description="Chronic kidney disease is strongly linked to CVD.",
            severity="high"))
    if d.PhysicalHealth > 15:
        f.append(RiskFactor(factor="Poor Physical Health", value=f"{int(d.PhysicalHealth)} days/mo",
            description="Frequent unhealthy days indicate chronic conditions.",
            severity="medium"))
    if d.DiffWalking == "Yes":
        f.append(RiskFactor(factor="Difficulty Walking", value="Yes",
            description="Mobility issues correlate with reduced cardio fitness.",
            severity="medium"))
    if d.AgeCategory in ("60-64","65-69","70-74","75-79","80 or older"):
        f.append(RiskFactor(factor="Advanced Age", value=d.AgeCategory,
            description="Age is a major non-modifiable cardiovascular risk factor.",
            severity="medium"))
    if d.PhysicalActivity == "No":
        f.append(RiskFactor(factor="Sedentary Lifestyle", value="No Exercise",
            description="Inactivity increases heart disease risk by up to 35%.",
            severity="medium"))
    if d.AlcoholDrinking == "Yes":
        f.append(RiskFactor(factor="Heavy Alcohol Use", value="Yes",
            description="Excess alcohol elevates blood pressure and heart risk.",
            severity="low"))
    if not (6 <= d.SleepTime <= 9):
        f.append(RiskFactor(factor="Abnormal Sleep", value=f"{d.SleepTime:.0f} hrs/night",
            description="Both too little and too much sleep affect heart health.",
            severity="low"))
    return f

def build_recommendations(d: PredictRequest) -> list[Recommendation]:
    r = []
    if d.Smoking == "Yes":
        r.append(Recommendation(title="Quit Smoking", icon="🚭",
            description="Risk drops 50% within 1 year of quitting. Join a cessation program.",
            priority="urgent"))
    if d.Stroke == "Yes" or d.KidneyDisease == "Yes":
        r.append(Recommendation(title="See a Cardiologist", icon="🏥",
            description="Schedule an appointment for ECG, blood panel, and stress test.",
            priority="urgent"))
    if d.BMI >= 30:
        r.append(Recommendation(title="Weight Management", icon="🥗",
            description="A 5–10% weight loss can significantly cut heart disease risk.",
            priority="important"))
    if d.PhysicalActivity == "No":
        r.append(Recommendation(title="Start Exercising", icon="🏃",
            description="150 min/week of moderate aerobic activity. Start with daily walks.",
            priority="important"))
    if d.Diabetic in ("Yes","No, borderline diabetes"):
        r.append(Recommendation(title="Blood Sugar Control", icon="💉",
            description="Monitor HbA1c regularly. Diet and medication adherence are critical.",
            priority="important"))
    if d.SleepTime < 7:
        r.append(Recommendation(title="Improve Sleep", icon="😴",
            description="Target 7–9 hours nightly. Consistent schedule reduces cardiac stress.",
            priority="suggested"))
    if d.MentalHealth > 10:
        r.append(Recommendation(title="Mental Health Support", icon="🧠",
            description="Chronic stress elevates cortisol which damages the heart.",
            priority="suggested"))
    if d.AlcoholDrinking == "Yes":
        r.append(Recommendation(title="Reduce Alcohol", icon="🍹",
            description="Limit to ≤1 drink/day (women) or ≤2 drinks/day (men).",
            priority="suggested"))
    if not r:
        r.append(Recommendation(title="Keep It Up!", icon="✅",
            description="Maintain regular exercise, balanced diet, adequate sleep, and annual check-ups.",
            priority="suggested"))
    return r

# ── Routes ─────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "Heart Disease Prediction API v2.0 — DIU FYDP", "status": "ok"}

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": rf_model is not None}

@app.post("/api/predict", response_model=PredictResponse)
def predict(data: PredictRequest):
    if rf_model is None:
        raise HTTPException(503, "Model not loaded")
    try:
        X    = encode(data)
        pred = int(rf_model.predict(X)[0])
        prob = float(rf_model.predict_proba(X)[0][1])
        used = "RuleNet (Rule)" if rf_model.rule_fired(X) else "RuleNet (RF)"
        return PredictResponse(
            prediction=pred,
            probability=round(prob, 4),
            risk_level=risk_level(prob),
            risk_factors=build_risk_factors(data),
            recommendations=build_recommendations(data),
            model_used=used,
            confidence=confidence_label(prob),
        )
    except Exception as e:
        raise HTTPException(500, str(e))
