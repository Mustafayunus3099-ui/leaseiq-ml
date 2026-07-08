"""
Downloads the official CUAD-QA JSON files directly from the Atticus Project
GitHub repo and builds a clean, flat CSV that includes both answerable
(positive) and unanswerable (negative) examples.

Why this script exists:
  The HuggingFace `theatticusproject/cuad-qa` dataset uses a loading script
  that broke in datasets>=4.x.  The `chenghao/cuad_qa` mirror that we
  originally used was pre-filtered to positive-only examples, removing all
  41,270 unanswerable rows. This script goes straight to the canonical source
  so we get the full positive/negative mix that the model needs.

Output columns:
  contract_id   - contract filename used as a unique identifier
  category      - clean clause-type label (e.g. "Audit Rights")
  context       - full text of the legal contract
  answer_text   - extracted clause span; empty string when is_answerable=False
  answer_start  - character offset in context; -1 when is_answerable=False
  is_answerable - True when the clause type is present in this contract
  split         - "train" or "test" (preserved for downstream use)
"""

import io
import json
import re
import zipfile
from pathlib import Path

import pandas as pd
import requests
from tqdm import tqdm

# Canonical source from the Atticus Project GitHub repo.
CUAD_ZIP_URL = "https://github.com/TheAtticusProject/cuad/raw/main/data.zip"

RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"
PROCESSED_DIR = Path(__file__).resolve().parent.parent / "data" / "processed"

TRAIN_JSON = RAW_DIR / "cuad_train.json"
TEST_JSON  = RAW_DIR / "cuad_test.json"
OUTPUT_CSV = PROCESSED_DIR / "cuad_clean.csv"


# ---------------------------------------------------------------------------
# Download helpers
# ---------------------------------------------------------------------------

def download_cuad_json_files():
    """Download data.zip from the Atticus repo and save the two JSON files."""
    print(f"Downloading CUAD data.zip from:\n  {CUAD_ZIP_URL}")

    response = requests.get(CUAD_ZIP_URL, stream=True, timeout=120)
    response.raise_for_status()

    total = int(response.headers.get("Content-Length", 0))
    buf = io.BytesIO()
    with tqdm(total=total, unit="B", unit_scale=True, desc="cuad data.zip") as pbar:
        for chunk in response.iter_content(chunk_size=65536):
            buf.write(chunk)
            pbar.update(len(chunk))

    buf.seek(0)
    with zipfile.ZipFile(buf) as zf:
        # The zip is flat: CUADv1.json, train_separate_questions.json, test.json
        zf.extract("train_separate_questions.json", RAW_DIR)
        zf.extract("test.json", RAW_DIR)

    # Rename to something more obvious.
    (RAW_DIR / "train_separate_questions.json").rename(TRAIN_JSON)
    (RAW_DIR / "test.json").rename(TEST_JSON)

    print(f"Saved to:\n  {TRAIN_JSON}\n  {TEST_JSON}\n")


def ensure_raw_files():
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    if TRAIN_JSON.exists() and TEST_JSON.exists():
        print("Raw JSON files already present, skipping download.")
    else:
        download_cuad_json_files()


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------

def extract_category(qa_id: str) -> str:
    """
    Pull the clause-type label out of the QA id field.

    CUAD ids follow the pattern:
        <contract_title>__<Category Name>_<span_index>
    e.g. "ACME_2020__Audit Rights_0"

    We split on the first '__', then strip the trailing '_N' digit suffix.
    """
    if "__" not in qa_id:
        return ""
    suffix = qa_id.split("__", 1)[1]         # "Audit Rights_0"
    return re.sub(r"_\d+$", "", suffix)      # "Audit Rights"


def parse_squad_json(filepath: Path, split: str) -> list[dict]:
    """
    Parse one SQuAD-style CUAD JSON file into a list of row dicts.

    Each qa entry becomes one row. Multi-span answers are already split into
    separate qa entries (one per span) in train_separate_questions.json, so
    there's a clean 1-to-1 mapping between QA entries and output rows.
    """
    with open(filepath, encoding="utf-8") as f:
        data = json.load(f)

    rows = []
    for doc in data["data"]:
        contract_id = doc["title"].strip()
        # Every CUAD document has exactly one paragraph (the full contract text).
        for para in doc["paragraphs"]:
            context = para["context"].strip()
            for qa in para["qas"]:
                is_answerable = not qa["is_impossible"]
                if is_answerable:
                    answer_text  = qa["answers"][0]["text"].strip()
                    answer_start = qa["answers"][0]["answer_start"]
                else:
                    answer_text  = ""
                    answer_start = -1

                rows.append({
                    "contract_id":   contract_id,
                    "category":      extract_category(qa["id"]),
                    "context":       context,
                    "answer_text":   answer_text,
                    "answer_start":  answer_start,
                    "is_answerable": is_answerable,
                    "split":         split,
                })
    return rows


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def build_dataset() -> pd.DataFrame:
    ensure_raw_files()
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    print("Parsing train split...")
    train_rows = parse_squad_json(TRAIN_JSON, split="train")
    print(f"  {len(train_rows)} rows")

    print("Parsing test split...")
    test_rows = parse_squad_json(TEST_JSON, split="test")
    print(f"  {len(test_rows)} rows")

    df = pd.DataFrame(train_rows + test_rows)

    # Cast types explicitly so the CSV round-trips cleanly.
    df["answer_start"]  = df["answer_start"].astype(int)
    df["is_answerable"] = df["is_answerable"].astype(bool)

    df.to_csv(OUTPUT_CSV, index=False)
    print(f"\nSaved to: {OUTPUT_CSV}")
    return df


def main():
    df = build_dataset()

    print("\n" + "=" * 60)
    print(f"Shape: {df.shape}")
    print("\nColumn dtypes:")
    print(df.dtypes.to_string())

    print("\n" + "=" * 60)
    answerable_sample = df[df["is_answerable"]].iloc[0]
    print("Sample ANSWERABLE row:")
    for col, val in answerable_sample.items():
        display = str(val)
        if len(display) > 120:
            display = display[:120] + "..."
        print(f"  {col:16s}: {display}")

    print("\n" + "=" * 60)
    unanswerable_sample = df[~df["is_answerable"]].iloc[0]
    print("Sample UNANSWERABLE row:")
    for col, val in unanswerable_sample.items():
        display = str(val)
        if len(display) > 120:
            display = display[:120] + "..."
        print(f"  {col:16s}: {display}")

    print("\n" + "=" * 60)
    print("Positive / negative split:")
    print(df.groupby(["split", "is_answerable"]).size().to_string())


if __name__ == "__main__":
    main()
