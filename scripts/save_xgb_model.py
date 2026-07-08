"""
save_xgb_model.py
Trains the XGBoost risk classifier and saves it to models/xgb_risk_model.pkl.
Run this before starting the Streamlit app or FastAPI server.

Training is very fast (< 5 seconds) since XGBoost is working on a 510x41
binary matrix, not raw text.

Usage:
    source leaseiq-env/bin/activate
    python scripts/save_xgb_model.py
"""

import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

ROOT      = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "processed" / "cuad_final.csv"
OUT_PATH  = ROOT / "models" / "xgb_risk_model.pkl"

print("Loading data...")
df = pd.read_csv(DATA_PATH)

# Build contract x category binary matrix (1 = clause present, 0 = absent)
feature_pivot = (
    df.groupby(["contract_id", "category"])["is_answerable"]
    .max()
    .unstack(fill_value=0)
    .reset_index()
)
feature_cols = [c for c in feature_pivot.columns if c != "contract_id"]
print(f"Feature matrix: {feature_pivot.shape[0]} contracts × {len(feature_cols)} clauses")

# Risk label heuristic: count missing high-risk clauses
# >= 3 missing = HIGH, 1-2 missing = MEDIUM, 0 missing = LOW
HIGH_RISK_CLAUSES = [
    "Cap On Liability",
    "Governing Law",
    "Anti-Assignment",
    "Termination For Convenience",
    "Notice Period To Terminate Renewal",
]
risk_cols = [c for c in HIGH_RISK_CLAUSES if c in feature_pivot.columns]

def assign_label(row):
    missing = sum(row[c] == 0 for c in risk_cols)
    if missing >= 3:
        return 2   # HIGH
    if missing >= 1:
        return 1   # MEDIUM
    return 0       # LOW

feature_pivot["label"] = feature_pivot.apply(assign_label, axis=1)

label_map = {0: "LOW", 1: "MEDIUM", 2: "HIGH"}
for k, v in feature_pivot["label"].value_counts().sort_index().items():
    print(f"  {label_map[k]}: {v} contracts")

X = feature_pivot[feature_cols].values.astype(np.float32)
y = feature_pivot["label"].values
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print("\nTraining XGBoost...")
xgb = XGBClassifier(
    n_estimators=200,
    max_depth=4,
    learning_rate=0.1,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    eval_metric="mlogloss",
)
xgb.fit(X_train, y_train)

acc = (xgb.predict(X_test) == y_test).mean()
print(f"Test accuracy: {acc:.1%}")

OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
with open(OUT_PATH, "wb") as f:
    pickle.dump(xgb, f)

print(f"\nSaved → {OUT_PATH}")
