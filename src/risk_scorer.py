"""
risk_scorer.py
XGBoost risk scoring layer for LeaseIQ.

Takes a contract-level binary feature matrix (one column per CUAD clause type)
and predicts LOW / MEDIUM / HIGH risk based on which critical clauses are
present or missing.
"""

import numpy as np
import pandas as pd


# These are the clauses whose absence causes the most legal/commercial exposure.
# Absence of Cap On Liability = unlimited damages; no Governing Law = jurisdiction
# disputes; no Termination For Convenience = locked in with no exit, etc.
HIGH_RISK_CLAUSES = [
    "Cap On Liability",
    "Governing Law",
    "Anti-Assignment",
    "Termination For Convenience",
    "Notice Period To Terminate Renewal",
]

MEDIUM_RISK_CLAUSES = [
    "Audit Rights",
    "Non-Compete",
    "Exclusivity",
    "Ip Ownership Assignment",
    "Warranty Duration",
]


def build_feature_matrix(df: pd.DataFrame) -> pd.DataFrame:
    """
    Pivot cuad_final.csv into a contract × clause binary matrix.
    Each cell is 1 if that clause was found in the contract, 0 otherwise.
    """
    pivot = (
        df.groupby(["contract_id", "category"])["is_answerable"]
        .max()
        .astype(int)
        .unstack(fill_value=0)
        .reset_index()
    )
    pivot = pivot.rename_axis(None, axis=1)
    return pivot


def assign_risk_label(row: pd.Series) -> int:
    """
    Simple rule: count how many of the 5 high-risk clauses are missing.
    >= 3 missing = HIGH, 1-2 missing = MEDIUM, 0 missing = LOW.
    """
    missing = sum(
        1 for c in HIGH_RISK_CLAUSES
        if c in row.index and row[c] == 0
    )
    if missing >= 3:
        return 2  # HIGH
    elif missing >= 1:
        return 1  # MEDIUM
    return 0      # LOW


def label_contracts(feature_df: pd.DataFrame) -> pd.DataFrame:
    """Add risk_level (int) and risk_label (str) columns to the feature matrix."""
    feature_df = feature_df.copy()
    feature_df["risk_level"] = feature_df.apply(assign_risk_label, axis=1)
    feature_df["risk_label"] = feature_df["risk_level"].map(
        {0: "LOW", 1: "MEDIUM", 2: "HIGH"}
    )
    return feature_df


def get_feature_columns(feature_df: pd.DataFrame) -> list:
    """Return just the clause-type columns, excluding any metadata columns."""
    exclude = {"contract_id", "risk_level", "risk_label"}
    return [c for c in feature_df.columns if c not in exclude]


def score_contract(model, feature_cols: list, contract_row: pd.Series) -> dict:
    """
    Score a single contract and return a plain-English risk report dict.
    Used by the Streamlit app and FastAPI backend.
    """
    x     = contract_row[feature_cols].values.reshape(1, -1)
    pred  = model.predict(x)[0]
    proba = model.predict_proba(x)[0]

    label_map = {0: "LOW", 1: "MEDIUM", 2: "HIGH"}

    missing = [
        c for c in HIGH_RISK_CLAUSES
        if c in contract_row.index and contract_row[c] == 0
    ]

    return {
        "contract_id":               contract_row.get("contract_id", "unknown"),
        "risk_label":                label_map[pred],
        "risk_score_pct":            round(proba[pred] * 100, 1),
        "prob_low":                  round(proba[0] * 100, 1),
        "prob_medium":               round(proba[1] * 100, 1),
        "prob_high":                 round(proba[2] * 100, 1),
        "missing_high_risk_clauses": missing,
    }
