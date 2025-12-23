from huggingface_hub import snapshot_download
from pathlib import Path
import os

# Use a local directory within the project to keep it self-contained
# This resolves to p:/New folder/New folder (2)/backend/models/mistral-7b
project_root = Path(__file__).resolve().parent.parent.parent
mistral_models_path = project_root.joinpath('backend', 'models', 'mistral-7b')

print(f"Setup: Downloading Mistral-7B-Instruct-v0.3 to {mistral_models_path}")
mistral_models_path.mkdir(parents=True, exist_ok=True)

snapshot_download(
    repo_id="mistralai/Mistral-7B-Instruct-v0.3", 
    allow_patterns=["params.json", "consolidated.safetensors", "tokenizer.model.v3"], 
    local_dir=mistral_models_path
)

print("Success: Model downloaded.")
