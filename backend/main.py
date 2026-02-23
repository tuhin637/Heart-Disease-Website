"""
Predicting Heart Disease Using Machine Learning
FastAPI Backend — v2.0 (2025)
FYDP · Daffodil International University
Author: Md. Tuhinuzzaman Tuhin (221-15-4649)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
import pickle, json, numpy as np, os

app = FastAPI(
    title="Heart Disease Prediction API",
    description=(
        "Predicting Heart Disease Using Machine Learning: "
        "An Analysis of Risk Factors, Model Optimization, and Web-Based Deployment\n\n"
        "Algorithm: RuleNet Hybrid (RandomForest + Medical Rules)\n"
        "Dataset: CDC BRFSS 2020 (319,795 records)"
    ),
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "model")

def load_artifact(filename):
    path = os.path.join(MODEL_DIR, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"{filename} not found. Run model/train_model.py first.")
    with open(path, "rb") as f:
        return pickle.load(f)

try:
    model          = load_artifact("best_model.pkl")
    label_encoders = load_artifact("label_encoders.pkl")
    imputer        = load_artifact("imputer.pkl")
    with open(os.path.join(MODEL_DIR, "model_metrics.json")) as f:
        model_metrics = json.load(f)
    print("All model artifacts loaded successfully")
except FileNotFoundError as e:
    print(f"Warning: {e}")
    model = label_encoders = imputer = None
    model_metrics = {}

FEATURE_ORDER = [
    "BMI","Smoking","AlcoholDrinking","Stroke","PhysicalHealth",
    "MentalHealth","DiffWalking","Sex","AgeCategory","Race",
    "Diabetic","PhysicalActivity","GenHealth","SleepTime",
    "Asthma","KidneyDisease","SkinCancer"
]

AGE_CATEGORIES = ["18-24","25-29","30-34","35-39","40-44","45-49","50-54","55-59","60-64","65-69","70-74","75-79","80 or older"]
RACES          = ["White","Black","Asian","American Indian/Alaskan Native","Hispanic","Other"]
GEN_HEALTH     = ["Excellent","Very good","Good","Fair","Poor"]
DIABETIC_OPT   = ["No","No, borderline diabetes","Yes","Yes (during pregnancy)"]


class PredictionRequest(BaseModel):
    BMI:              float = Field(..., ge=10.0, le=70.0)
    Smoking:          str
    AlcoholDrinking:  str
    Stroke:           str
    PhysicalHealth:   float = Field(..., ge=0.0, le=30.0)
    MentalHealth:     float = Field(..., ge=0.0, le=30.0)
    DiffWalking:      str
    Sex:              str
    AgeCategory:      str
    Race:             str
    Diabetic:         str
    PhysicalActivity: str
    GenHealth:        str
    SleepTime:        float = Field(..., ge=0.0, le=24.0)
    Asthma:           str
    KidneyDisease:    str
    SkinCancer:       str

    @validator("AgeCategory")
    def v_age(cls, v):
        if v not in AGE_CATEGORIES: raise ValueError(f"Must be one of: {AGE_CATEGORIES}")
        return v

    @validator("Race")
    def v_race(cls, v):
        if v not in RACES: raise ValueError(f"Must be one of: {RACES}")
        return v

    @validator("GenHealth")
    def v_health(cls, v):
        if v not in GEN_HEALTH: raise ValueError(f"Must be one of: {GEN_HEALTH}")
        return v

    @validator("Diabetic")
    def v_diabetic(cls, v):
        if v not in DIABETIC_OPT: raise ValueError(f"Must be one of: {DIABETIC_OPT}")
        return v

    @validator("Smoking","AlcoholDrinking","Stroke","DiffWalking",
               "PhysicalActivity","Asthma","KidneyDisease","SkinCancer")
    def v_yesno(cls, v):
        if v not in ["Yes","No"]: raise ValueError("Must be 'Yes' or 'No'")
        return v

    @validator("Sex")
    def v_sex(cls, v):
        if v not in ["Male","Female"]: raise ValueError("Must be 'Male' or 'Female'")
        return v


class RiskFactor(BaseModel):
    factor: str
    value:  str
    impact: str
    advice: str


class PredictionResponse(BaseModel):
    prediction:      int
    risk_label:      str
    probability:     float
    risk_percentage: float
    risk_level:      str
    risk_factors:    list[RiskFactor]
    recommendations: list[str]
    model_used:      str
    disclaimer:      str


def encode_input(data: PredictionRequest) -> np.ndarray:
    raw = data.dict()
    encoded = {}
    for col, le in label_encoders.items():
        if col in raw:
            try:
                encoded[col] = le.transform([raw[col]])[0]
            except ValueError:
                raise HTTPException(422, f"Invalid value '{raw[col]}' for '{col}'.")
    vector = [float(encoded[f]) if f in encoded else float(raw[f]) for f in FEATURE_ORDER]
    return imputer.transform(np.array([vector]))


def get_risk_level(p: float) -> str:
    if p < 0.25: return "Low"
    if p < 0.50: return "Moderate"
    if p < 0.75: return "High"
    return "Very High"


def analyze_risk_factors(data: PredictionRequest) -> list[RiskFactor]:
    factors = []
    if data.BMI >= 35:
        factors.append(RiskFactor(factor="Severe Obesity", value=f"BMI {data.BMI:.1f}", impact="high", advice="Target BMI below 25 through structured diet and exercise with specialist guidance."))
    elif data.BMI >= 30:
        factors.append(RiskFactor(factor="Obesity", value=f"BMI {data.BMI:.1f}", impact="medium", advice="Aim for gradual weight loss of 0.5-1 kg/week through lifestyle changes."))
    if data.Smoking == "Yes":
        factors.append(RiskFactor(factor="Active Smoking", value="Yes", impact="high", advice="Enroll in a cessation program. Consider nicotine replacement therapy."))
    if data.Stroke == "Yes":
        factors.append(RiskFactor(factor="History of Stroke", value="Yes", impact="high", advice="Regular cardiac monitoring and cardiologist consultation required."))
    if data.PhysicalHealth > 15:
        factors.append(RiskFactor(factor="Poor Physical Health", value=f"{int(data.PhysicalHealth)} bad days/month", impact="high", advice="Seek comprehensive medical evaluation for underlying chronic conditions."))
    elif data.PhysicalHealth > 7:
        factors.append(RiskFactor(factor="Declining Physical Health", value=f"{int(data.PhysicalHealth)} bad days/month", impact="medium", advice="Monitor symptoms and discuss with your physician."))
    age_idx = AGE_CATEGORIES.index(data.AgeCategory)
    if age_idx >= 10:
        factors.append(RiskFactor(factor="Advanced Age (70+)", value=data.AgeCategory, impact="high", advice="Annual cardiac checkups strongly recommended."))
    elif age_idx >= 8:
        factors.append(RiskFactor(factor="Age 60-69", value=data.AgeCategory, impact="medium", advice="Regular health screenings every 6 months advised."))
    if data.Diabetic in ["Yes","Yes (during pregnancy)"]:
        factors.append(RiskFactor(factor="Diabetes", value=data.Diabetic, impact="high", advice="Strict blood sugar control. Regular HbA1c monitoring is essential."))
    elif data.Diabetic == "No, borderline diabetes":
        factors.append(RiskFactor(factor="Borderline Diabetes", value=data.Diabetic, impact="medium", advice="Diet modification and regular glucose monitoring recommended."))
    if data.PhysicalActivity == "No":
        factors.append(RiskFactor(factor="Sedentary Lifestyle", value="No regular exercise", impact="medium", advice="Aim for 150 minutes/week of moderate aerobic activity."))
    if data.KidneyDisease == "Yes":
        factors.append(RiskFactor(factor="Kidney Disease", value="Yes", impact="high", advice="CKD significantly elevates cardiovascular risk. Specialist consultation needed."))
    if data.SleepTime < 6 or data.SleepTime > 9:
        factors.append(RiskFactor(factor="Poor Sleep Duration", value=f"{data.SleepTime:.0f} hrs/night", impact="low", advice="Target 7-9 hours nightly. Evaluate for sleep apnea if needed."))
    if data.AlcoholDrinking == "Yes":
        factors.append(RiskFactor(factor="Heavy Alcohol Consumption", value="Yes", impact="medium", advice="Reduce to 2 or fewer drinks/day (men) or 1 (women)."))
    return factors


def generate_recommendations(data: PredictionRequest, prediction: int) -> list[str]:
    recs = []
    if prediction == 1:
        recs.append("Consult a cardiologist for a full cardiac evaluation as soon as possible.")
        recs.append("Request ECG, echocardiogram, stress test, and comprehensive blood panel.")
    if data.BMI >= 30:
        recs.append("Work with a registered dietitian for a heart-healthy, calorie-controlled meal plan.")
    if data.Smoking == "Yes":
        recs.append("Smoking cessation is the single most impactful lifestyle change for heart health.")
    if data.PhysicalActivity == "No":
        recs.append("Start with 20-30 min daily walks and gradually build to 150 min/week.")
    if data.SleepTime < 7:
        recs.append("Prioritize 7-9 hours of sleep with a consistent schedule.")
    if data.MentalHealth > 10:
        recs.append("Chronic stress elevates cardiac risk. Consider counseling or mindfulness practices.")
    if data.Diabetic in ["Yes","No, borderline diabetes"]:
        recs.append("Maintain HbA1c below 7%. Work with an endocrinologist on glucose management.")
    if data.AlcoholDrinking == "Yes":
        recs.append("Reduce alcohol intake significantly. Seek professional support if needed.")
    recs.append("Schedule annual health screenings: cholesterol, blood pressure, and blood glucose.")
    return recs


@app.get("/", tags=["Info"])
def root():
    return {
        "project": "Predicting Heart Disease Using Machine Learning",
        "subtitle": "An Analysis of Risk Factors, Model Optimization, and Web-Based Deployment",
        "author": "Md. Tuhinuzzaman Tuhin (221-15-4649)",
        "institution": "Daffodil International University",
        "year": 2025,
        "docs": "/docs",
        "status": "model_loaded" if model else "model_not_loaded"
    }


@app.get("/health", tags=["Info"])
def health():
    return {"status": "healthy", "model_loaded": model is not None}


@app.get("/metrics", tags=["Model"])
def get_metrics():
    if not model_metrics:
        raise HTTPException(503, "Metrics not available. Run model/train_model.py first.")
    return model_metrics


@app.get("/model-info", tags=["Model"])
def model_info():
    return {
        "project": "Predicting Heart Disease Using Machine Learning",
        "model": "RuleNet Hybrid Classifier",
        "algorithm": "RandomForest + Medical Rules",
        "dataset": "CDC BRFSS 2020",
        "records": 319795,
        "features": FEATURE_ORDER,
        "balancing": "SMOTE",
        "year": 2025,
        "age_categories": AGE_CATEGORIES,
        "race_options": RACES,
        "gen_health_options": GEN_HEALTH,
        "diabetic_options": DIABETIC_OPT,
    }


@app.post("/predict", response_model=PredictionResponse, tags=["Prediction"])
def predict(request: PredictionRequest):
    """Predict heart disease risk from 17 patient health parameters."""
    if model is None:
        raise HTTPException(503, "Model not loaded. Please run model/train_model.py first.")
    try:
        X           = encode_input(request)
        prediction  = int(model.predict(X)[0])
        probability = float(model.predict_proba(X)[0][1])
        return PredictionResponse(
            prediction=prediction,
            risk_label="Elevated Risk" if prediction == 1 else "Low Risk",
            probability=round(probability, 4),
            risk_percentage=round(probability * 100, 2),
            risk_level=get_risk_level(probability),
            risk_factors=analyze_risk_factors(request),
            recommendations=generate_recommendations(request, prediction),
            model_used="RuleNet (RandomForest + Medical Rules)",
            disclaimer=(
                "This tool provides AI-based risk assessment only and is NOT a medical diagnosis. "
                "Always consult a qualified healthcare professional for medical advice."
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Prediction error: {str(e)}")
