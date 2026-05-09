import faiss
import json
import numpy as np
from sentence_transformers import SentenceTransformer

# load index and metadata
index = faiss.read_index("species_index.faiss")
with open("species_index_meta.json") as f:
    species_names = json.load(f)

model = SentenceTransformer("all-MiniLM-L6-v2")

def search(query, top_k=5):
    vector = model.encode([query]).astype("float32")
    faiss.normalize_L2(vector)
    scores, indices = index.search(vector, top_k)
    print(f"\nQuery: '{query}'")
    for score, idx in zip(scores[0], indices[0]):
        print(f"  {species_names[idx]} — score: {score:.4f}")

# test it
search("tall plant with red berries and thorny stem")
search("yellow flower with large petals")
search("small succulent with thick leaves")