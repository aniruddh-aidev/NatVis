import json
import faiss
import numpy as np
from tqdm import tqdm
import wikipediaapi
from sentence_transformers import SentenceTransformer

# ── load mapping ──────────────────────────────────────────
# in build_index.py, filter mapping to plants only
with open("plantnet300K_species_id_2_name.json") as f:
    mapping = json.load(f)


# filter out non-plant species (insects have author names like "Fabricius, 1793")
# plants just have genus + species e.g. "Lactuca virosa L."
plant_names = {k: v for k, v in mapping.items() 
               if len(v.split()) <= 4 and not any(
                   word in v for word in ["Walker", "Fabricius", "Cameron", "Ashmead", "Girault"]
               )}

print(f"Filtered: {len(plant_names)} plants from {len(mapping)} total")

# ── fetch Wikipedia descriptions ──────────────────────────
wiki = wikipediaapi.Wikipedia(
    language="en",
    user_agent="WildSense/1.0"
)

descriptions = []
valid_names   = []

print("Fetching Wikipedia descriptions...")
for name in tqdm(plant_names.values()):
    page = wiki.page(name)
    if page.exists():
        desc = page.summary[:500]   # first 500 chars
    else:
        desc = name                 # fallback to just the name
    descriptions.append(desc)
    valid_names.append(name)

# ── save descriptions ─────────────────────────────────────
with open("species_descriptions.json", "w") as f:
    json.dump(dict(zip(valid_names, descriptions)), f)

print(f"Descriptions fetched: {len(descriptions)}")

# ── build FAISS index ─────────────────────────────────────
print("Building FAISS index...")
model = SentenceTransformer("all-MiniLM-L6-v2")

vectors = model.encode(descriptions, show_progress_bar=True)
vectors = np.array(vectors).astype("float32")

# normalize for cosine similarity
faiss.normalize_L2(vectors)

index = faiss.IndexFlatIP(vectors.shape[1])
index.add(vectors)

# ── save index + metadata ─────────────────────────────────
faiss.write_index(index, "species_index.faiss")

with open("species_index_meta.json", "w") as f:
    json.dump(valid_names, f)

print(f"FAISS index built: {index.ntotal} species")
print("Saved: species_index.faiss + species_index_meta.json")