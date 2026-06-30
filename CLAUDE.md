# LeaseIQ - AAI-590 Capstone Project

## Project Overview
Automated commercial lease clause extraction and risk classification system. 
Fine-tunes LegalBERT on the CUAD (Contract Understanding Atticus Dataset) for 
clause extraction across 41 categories, with a secondary XGBoost risk scoring 
layer. Includes a voice agent interface (Vapi) on top of the trained model 
for the product layer.

## Environment
- MacBook M4, macOS
- Python virtual environment: leaseiq-env (activate with `source leaseiq-env/bin/activate`)
- PyTorch with MPS backend (Apple Silicon GPU acceleration) — confirmed available
- Dependencies installed: torch, torchvision, torchaudio, transformers, datasets, 
  tokenizers, accelerate, evaluate, seqeval, scikit-learn, pandas, numpy, matplotlib, 
  seaborn, jupyterlab, pdfplumber, pypdf2, xgboost, shap
- requirements.txt is kept in sync via `pip freeze` after installing new packages

## Project Structure
- data/raw - raw downloaded datasets
- data/processed - cleaned, tokenized data ready for training
- notebooks/ - numbered Jupyter notebooks for each pipeline stage
- src/ - reusable Python modules (data_utils.py, model_utils.py, risk_scorer.py)
- models/ - saved model checkpoints
- results/ - evaluation outputs, plots, metrics
- reports/ - report drafts and exports

## Working Style
- I am the user (Mustafa), a "vibe coder" - I review and test code, you write it
- Always explain what each script does in plain language before/after writing it
- Keep code well-commented since this needs to go into a GitHub repo for grading
- Prioritize getting things working end-to-end before optimizing
- Commit to git after each meaningful milestone with clear commit messages

## Academic Requirements (do not skip these)
- Must include data cleaning, EDA, model training, model optimization, evaluation
- Must compare at least 2 models (LegalBERT vs DistilBERT baseline)
- All code must be well-documented for GitHub submission
- This is for a 7-week capstone course, currently in Week 2
