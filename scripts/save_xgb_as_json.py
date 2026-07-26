"""
One-time migration: convert xgb_risk_model.pkl → xgb_risk_model.json

XGBoost's native JSON format is safe to load (no arbitrary code execution),
unlike pickle. Run this once, then the inference pipeline will automatically
use the JSON file and the .pkl can be deleted.

Usage:
    source leaseiq-env/bin/activate
    python scripts/save_xgb_as_json.py
"""

import pickle  # SAFE: loading our own first-party model to migrate it out of pickle
import sys
from pathlib import Path

import numpy as np
import xgboost as xgb

ROOT     = Path(__file__).resolve().parent.parent
PKL_PATH = ROOT / "models" / "xgb_risk_model.pkl"
JSON_PATH = ROOT / "models" / "xgb_risk_model.json"

if not PKL_PATH.exists():
    sys.exit(f"Not found: {PKL_PATH}")

print(f"Loading {PKL_PATH} ...")
with open(PKL_PATH, "rb") as f:
    model = pickle.load(f)
print(f"  type: {type(model).__name__}")

model.save_model(str(JSON_PATH))
print(f"Saved {JSON_PATH}")

# Verify round-trip
model2 = type(model)()
model2.load_model(str(JSON_PATH))
x = np.zeros((1, 41), dtype=np.float32)
ok = np.allclose(model.predict_proba(x), model2.predict_proba(x), atol=1e-6)

if ok:
    print("Round-trip verified — predictions identical.")
    print(f"\nYou can now delete {PKL_PATH.name} safely.")
else:
    sys.exit("ERROR: predict_proba() mismatch after round-trip.")
