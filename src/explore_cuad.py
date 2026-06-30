"""
One-off exploration script for the CUAD dataset.

Downloads CUAD from HuggingFace, saves the raw data to data/raw/, and prints
out its structure so we can decide how to clean/process it later. This script
does NOT clean or transform the data - it's purely for inspection.
"""

from pathlib import Path

from datasets import load_dataset

# Where to save the untouched, raw dataset.
RAW_DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "raw" / "cuad"

# Candidate HuggingFace dataset IDs to try, in order of preference.
# "theatticusproject/cuad-qa" uses a legacy loading script that the installed
# datasets>=4 library no longer supports, and "theatticusproject/cuad" only
# exposes the raw PDFs (no QA pairs). "chenghao/cuad_qa" mirrors the original
# CUAD SQuAD-style QA format (id, title, context, question, answers).
CANDIDATE_DATASET_IDS = [
    "theatticusproject/cuad-qa",
    "chenghao/cuad_qa",
    "theatticusproject/cuad",
]


def load_cuad():
    """Try each candidate dataset ID until one loads successfully."""
    last_error = None
    for dataset_id in CANDIDATE_DATASET_IDS:
        try:
            print(f"Trying to load dataset: {dataset_id} ...")
            dataset = load_dataset(dataset_id, verification_mode="no_checks")
            print(f"Loaded successfully from: {dataset_id}\n")
            return dataset_id, dataset
        except Exception as e:
            print(f"  Failed ({e.__class__.__name__}: {e})\n")
            last_error = e
    raise RuntimeError(
        f"Could not load any of {CANDIDATE_DATASET_IDS} from HuggingFace."
    ) from last_error


def print_schema(dataset):
    print("=" * 70)
    print("DATASET STRUCTURE / SCHEMA")
    print("=" * 70)
    for split_name, split_data in dataset.items():
        print(f"\nSplit: {split_name}")
        print(f"  Number of examples: {len(split_data)}")
        print(f"  Features:")
        for col_name, col_type in split_data.features.items():
            print(f"    - {col_name}: {col_type}")


def print_total_examples(dataset):
    total = sum(len(split) for split in dataset.values())
    print("\n" + "=" * 70)
    print(f"TOTAL EXAMPLES ACROSS ALL SPLITS: {total}")
    print("=" * 70)


def print_samples(dataset, n=3):
    print("\n" + "=" * 70)
    print(f"SAMPLE EXAMPLES (first {n})")
    print("=" * 70)
    first_split_name = list(dataset.keys())[0]
    split_data = dataset[first_split_name]
    for i in range(min(n, len(split_data))):
        print(f"\n--- Example {i} (split: {first_split_name}) ---")
        example = split_data[i]
        for key, value in example.items():
            value_str = str(value)
            if len(value_str) > 500:
                value_str = value_str[:500] + f"... [truncated, full length={len(value_str)}]"
            print(f"  {key}: {value_str}")


def print_clause_categories(dataset):
    print("\n" + "=" * 70)
    print("CLAUSE CATEGORIES")
    print("=" * 70)

    first_split_name = list(dataset.keys())[0]
    split_data = dataset[first_split_name]
    features = split_data.features

    # CUAD-QA stores the clause category as the literal question text (e.g.
    # "Audit Rights", "Anti-Assignment") rather than as a dedicated label
    # column, so we check "question" first before falling back to other
    # likely places (or parsing it out of the "id" field).
    found = False

    for candidate_col in ["question", "category", "label", "clause_type", "title"]:
        if candidate_col in features:
            unique_vals = sorted(set(split_data[candidate_col]))
            print(f"\nFound categories in column '{candidate_col}' ({len(unique_vals)} unique):")
            for v in unique_vals:
                print(f"  - {v}")
            found = True
            break

    if not found and "id" in features:
        # CUAD-QA ids are typically formatted like: "<doc_id>__<Clause Type>"
        ids = split_data["id"]
        categories = set()
        for ex_id in ids:
            if "__" in ex_id:
                categories.add(ex_id.split("__", 1)[1])
        if categories:
            print(f"\nExtracted {len(categories)} unique categories from the 'id' field:")
            for c in sorted(categories):
                print(f"  - {c}")
            found = True

    if not found:
        print("\nCould not automatically locate clause categories in this split.")
        print("Available columns:", list(features.keys()))


def main():
    RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)

    dataset_id, dataset = load_cuad()

    print_total_examples(dataset)
    print_schema(dataset)
    print_samples(dataset, n=3)
    print_clause_categories(dataset)

    print("\n" + "=" * 70)
    print(f"SAVING RAW DATASET TO: {RAW_DATA_DIR}")
    print("=" * 70)
    dataset.save_to_disk(str(RAW_DATA_DIR))
    print(f"Saved. Source dataset id: {dataset_id}")


if __name__ == "__main__":
    main()
