"""
Predicting Heart Disease Using Machine Learning
Model Training Script — v2.0 (2025)
FYDP · Daffodil International University
Author: Md. Tuhinuzzaman Tuhin (221-15-4649)

Run this ONCE to generate:
  best_model.pkl, label_encoders.pkl, imputer.pkl, model_metrics.json

Usage:
  cd model
  python train_model.py
"""

import pandas as pd
import numpy as np
import pickle
import json
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (accuracy_score, precision_score, recall_score,
                             f1_score, roc_auc_score, confusion_matrix)
from sklearn.impute import SimpleImputer
from imblearn.over_sampling import SMOTE

print("=" * 65)
print("  PREDICTING HEART DISEASE USING MACHINE LEARNING")
print("  Model Training Script — 2025")
print("=" * 65)

# ── 1. Load Dataset ───────────────────────────────────────────
print("\n[1/6] Loading dataset...")
df = pd.read_csv("../data/heart_2020_cleaned.csv")
print(f"  Loaded {df.shape[0]:,} rows x {df.shape[1]} columns")
print(f"  HeartDisease: {df['HeartDisease'].value_counts().to_dict()}")

# ── 2. Outlier Capping (IQR) ──────────────────────────────────
print("\n[2/6] Capping outliers...")
def cap_outliers(df, col):
    Q1, Q3 = df[col].quantile(0.25), df[col].quantile(0.75)
    IQR = Q3 - Q1
    df[col] = df[col].clip(Q1 - 1.5*IQR, Q3 + 1.5*IQR)

for col in ["BMI","PhysicalHealth","MentalHealth","SleepTime"]:
    cap_outliers(df, col)
print("  Capped: BMI, PhysicalHealth, MentalHealth, SleepTime")

# ── 3. Label Encoding ─────────────────────────────────────────
print("\n[3/6] Label encoding...")
label_encoders = {}
for col in df.select_dtypes(include=["object"]).columns:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col])
    label_encoders[col] = le
    print(f"  {col}: {list(le.classes_)}")

with open("label_encoders.pkl", "wb") as f:
    pickle.dump(label_encoders, f)
print("  Saved: label_encoders.pkl")

# ── 4. SMOTE Balancing ────────────────────────────────────────
print("\n[4/6] Applying SMOTE...")
X = df.drop("HeartDisease", axis=1).values
y = df["HeartDisease"].values

imputer = SimpleImputer(strategy="mean")
X = imputer.fit_transform(X)
with open("imputer.pkl", "wb") as f:
    pickle.dump(imputer, f)

smote = SMOTE(sampling_strategy="auto", random_state=42)
X_res, y_res = smote.fit_resample(X, y)
print(f"  Before: {dict(zip(*np.unique(y, return_counts=True)))}")
print(f"  After:  {dict(zip(*np.unique(y_res, return_counts=True)))}")

X_train, X_test, y_train, y_test = train_test_split(
    X_res, y_res, test_size=0.2, random_state=42, stratify=y_res
)
print(f"  Train: {len(X_train):,}  |  Test: {len(X_test):,}")

# ── 5. RuleNet Training ───────────────────────────────────────
print("\n[5/6] Training RuleNet model...")

class RuleNetClassifier:
    """
    Hybrid Classifier:
    - 3 medical expert rules fire first for high-confidence cases
    - RandomForest handles all remaining ambiguous cases
    """
    IDX = {
        "BMI":0, "Smoking":1, "AlcoholDrinking":2, "Stroke":3,
        "PhysicalHealth":4, "MentalHealth":5, "DiffWalking":6, "Sex":7,
        "AgeCategory":8, "Race":9, "Diabetic":10, "PhysicalActivity":11,
        "GenHealth":12, "SleepTime":13, "Asthma":14, "KidneyDisease":15, "SkinCancer":16
    }

    def __init__(self, rf_model):
        self.rf_model = rf_model

    def fit(self, X, y):
        self.rf_model.fit(X, y)
        return self

    def apply_rules(self, X):
        preds = []
        for row in X:
            # Rule 1: Severe obesity + very poor physical health → HIGH RISK
            if row[self.IDX["BMI"]] > 35 and row[self.IDX["PhysicalHealth"]] > 15:
                preds.append(1)
            # Rule 2: Smoker + elderly (age category 70+) → HIGH RISK
            elif row[self.IDX["Smoking"]] == 1 and row[self.IDX["AgeCategory"]] >= 10:
                preds.append(1)
            # Rule 3: Healthy sleep + zero mental health issues → LOW RISK
            elif 7 <= row[self.IDX["SleepTime"]] <= 9 and row[self.IDX["MentalHealth"]] == 0:
                preds.append(0)
            else:
                preds.append(-1)  # defer to RF
        return np.array(preds)

    def predict(self, X):
        rule_preds = self.apply_rules(X)
        final = []
        for i, rp in enumerate(rule_preds):
            final.append(rp if rp != -1 else self.rf_model.predict([X[i]])[0])
        return np.array(final)

    def predict_proba(self, X):
        rule_preds = self.apply_rules(X)
        probas = []
        for i, rp in enumerate(rule_preds):
            if rp == 1:   probas.append([0.10, 0.90])
            elif rp == 0: probas.append([0.90, 0.10])
            else:         probas.append(self.rf_model.predict_proba([X[i]])[0].tolist())
        return np.array(probas)


rf_base = RandomForestClassifier(
    n_estimators=500, max_depth=None,
    min_samples_split=2, min_samples_leaf=1,
    bootstrap=False, random_state=42, n_jobs=-1
)
model = RuleNetClassifier(rf_base)
model.fit(X_train, y_train)
print("  RuleNet training complete")

# ── 6. Evaluate & Save ────────────────────────────────────────
print("\n[6/6] Evaluating model...")

y_pred  = model.predict(X_test)
y_proba = model.predict_proba(X_test)[:, 1]

acc       = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred)
recall    = recall_score(y_test, y_pred)
f1        = f1_score(y_test, y_pred)
auc_roc   = roc_auc_score(y_test, y_proba)
cm        = confusion_matrix(y_test, y_pred).tolist()

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv_scores = cross_val_score(rf_base, X_res, y_res, cv=cv, scoring="accuracy", n_jobs=-1)

feature_names = list(RuleNetClassifier.IDX.keys())
importances   = rf_base.feature_importances_.tolist()

metrics = {
    "project": "Predicting Heart Disease Using Machine Learning",
    "year": 2025,
    "test_accuracy":   round(acc * 100, 2),
    "precision":       round(precision * 100, 2),
    "recall":          round(recall * 100, 2),
    "f1_score":        round(f1 * 100, 2),
    "auc_roc":         round(auc_roc, 4),
    "cv_mean":         round(cv_scores.mean() * 100, 2),
    "cv_std":          round(cv_scores.std() * 100, 2),
    "cv_scores":       [round(s * 100, 2) for s in cv_scores.tolist()],
    "confusion_matrix": cm,
    "feature_importance": dict(zip(feature_names, [round(i, 4) for i in importances])),
    "train_samples":   len(X_train),
    "test_samples":    len(X_test),
    "total_features":  len(feature_names),
    "dataset":         "CDC BRFSS 2020",
    "balancing":       "SMOTE",
    "algorithm":       "RuleNet (RandomForest + Medical Rules)",
}

with open("model_metrics.json", "w") as f:
    json.dump(metrics, f, indent=2)

with open("best_model.pkl", "wb") as f:
    pickle.dump(model, f)

print("\n" + "=" * 65)
print("  ALL FILES SAVED SUCCESSFULLY")
print("=" * 65)
print(f"\n  Real Model Metrics (2025):")
print(f"    Test Accuracy  : {metrics['test_accuracy']}%")
print(f"    Precision      : {metrics['precision']}%")
print(f"    Recall         : {metrics['recall']}%")
print(f"    F1-Score       : {metrics['f1_score']}%")
print(f"    AUC-ROC        : {metrics['auc_roc']}")
print(f"    CV Accuracy    : {metrics['cv_mean']}% (+/-{metrics['cv_std']}%)")
print(f"\n  Files generated:")
print(f"    1. best_model.pkl")
print(f"    2. label_encoders.pkl")
print(f"    3. imputer.pkl")
print(f"    4. model_metrics.json")
print(f"\n  Next: cd ../backend && uvicorn main:app --reload")
print("=" * 65)