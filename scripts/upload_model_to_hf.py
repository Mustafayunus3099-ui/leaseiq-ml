"""
Upload fine-tuned LeaseIQ models to HuggingFace Hub.

This creates two private model repos on your HF account and uploads the weights.
After running this, update HF_MODEL_LB and HF_MODEL_DB in your HF Space settings.

Usage:
    source leaseiq-env/bin/activate
    python scripts/upload_model_to_hf.py --username YOUR_HF_USERNAME

    # First-time auth (opens browser):
    huggingface-cli login
"""

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def upload_model(repo_id: str, local_dir: Path, description: str):
    from huggingface_hub import HfApi, create_repo

    api = HfApi()

    print(f"\n→ Creating repo: {repo_id}")
    create_repo(repo_id, repo_type="model", private=True, exist_ok=True)

    print(f"  Uploading {local_dir.name}/ ({description})...")
    api.upload_folder(
        folder_path=str(local_dir),
        repo_id=repo_id,
        repo_type="model",
        ignore_patterns=["checkpoint-*"],
    )
    print(f"  ✓ Uploaded → https://huggingface.co/{repo_id}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--username", required=True, help="Your HuggingFace username")
    args = parser.parse_args()

    try:
        from huggingface_hub import HfApi  # noqa: F401
    except ImportError:
        print("Error: huggingface_hub not installed. Run: pip install huggingface-hub")
        sys.exit(1)

    lb_dir = ROOT / "models" / "legalbert-cuad"
    db_dir = ROOT / "models" / "distilbert-cuad"

    if not lb_dir.exists():
        print(f"Error: {lb_dir} not found")
        sys.exit(1)
    if not db_dir.exists():
        print(f"Error: {db_dir} not found")
        sys.exit(1)

    upload_model(
        f"{args.username}/leaseiq-legalbert-cuad",
        lb_dir,
        "LegalBERT fine-tuned on CUAD for QA — 3 epochs, 408 contracts",
    )

    upload_model(
        f"{args.username}/leaseiq-distilbert-cuad",
        db_dir,
        "DistilBERT fine-tuned on CUAD for QA — 3 epochs, 408 contracts",
    )

    print("\n✅ Done! Set these in your HF Space environment variables:")
    print(f"   HF_MODEL_LB = {args.username}/leaseiq-legalbert-cuad")
    print(f"   HF_MODEL_DB = {args.username}/leaseiq-distilbert-cuad")
    print("\n   Then re-deploy the Space to pick up the fine-tuned weights.")


if __name__ == "__main__":
    main()
