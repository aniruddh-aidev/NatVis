"""
WildSense — Search Service
FAISS-based text similarity search for species identification from descriptions.
"""

import faiss
import json
import numpy as np
from pathlib import Path
from sentence_transformers import SentenceTransformer

# ── paths ──────────────────────────────────────────────────
BASE_DIR        = Path(__file__).parent.parent.parent
FAISS_PATH      = BASE_DIR / "text_similarity" / "species_index.faiss"
FAISS_META_PATH = BASE_DIR / "text_similarity" / "species_index_meta.json"

# ── load model + index ─────────────────────────────────────
print("[SearchService] Loading sentence transformer...")
encoder = SentenceTransformer("all-MiniLM-L6-v2")

print("[SearchService] Loading FAISS index...")
index = faiss.read_index(str(FAISS_PATH))

with open(FAISS_META_PATH) as f:
    species_names = json.load(f)

print(f"[SearchService] Ready — {index.ntotal} species indexed")


def search_by_text(query: str, top_k: int = 5) -> list[dict]:
    """
    Search species by text description.
    Returns top_k matches with species name and similarity score.
    """
    vector = encoder.encode([query]).astype("float32")
    faiss.normalize_L2(vector)

    scores, indices = index.search(vector, top_k)

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx < 0 or idx >= len(species_names):
            continue
        results.append({
            "scientific_name": species_names[idx],
            "similarity":      round(float(score), 4),
            "similarity_pct":  f"{float(score) * 100:.1f}%"
        })

    return results
