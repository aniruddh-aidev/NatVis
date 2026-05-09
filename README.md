# 🌿 NatVis — Flora & Fauna Field Intelligence

> Identify plants and animals from photos or text descriptions — with safety intelligence built in.

NatVis tells you not just *what* a species is, but whether it's **safe to eat, toxic, how dangerous**, what symptoms it causes, nearby plant remedies, medicinal uses, and where it's found globally.

---

## Features

- **Photo Identification** — upload a photo, get top species matches with confidence scores (powered by PlantNet API)
- **Text Search** — describe a plant or animal in natural language, FAISS semantic search finds the closest match
- **Safety Intelligence** — edibility, toxicity level (1–5), danger classification, symptoms, immediate action
- **Species Detail** — full card with description, habitat, appearance, medicinal/culinary/ecological uses
- **Location Awareness** — species filtered by continent and country
- **Chat Interface** — ask questions about an identified species (intent detection for habitat, toxicity, uses, remedies)
- **Remedy Data** — nearby plant-based first aid suggestions where available

---

## Tech Stack

| Layer | Technology |
|---|---|
| Vision Model | EfficientNet-B0 (fine-tuned on PlantNet-300K, 1081 species, 79.4% accuracy) |
| Photo ID API | PlantNet API (production identification) |
| Text Search | FAISS + sentence-transformers (all-MiniLM-L6-v2) |
| Backend | FastAPI + SQLite |
| Database | SQLite (1081 species, 4400+ location records) |
| Frontend | React + Vite |
| Data Sources | GBIF, Wikipedia, iNaturalist, PlantNet |

---

## Project Structure

```
NatVis/
├── backend/
│   ├── main.py                 ← FastAPI app
│   ├── routes/
│   │   ├── identify.py         ← /identify/photo + /identify/text
│   │   ├── species.py          ← /species/{name}
│   │   └── chat.py             ← /chat
│   └── services/
│       ├── vision.py           ← PlantNet API + EfficientNet
│       ├── search.py           ← FAISS text search
│       ├── database.py         ← SQLite queries
│       └── chat.py             ← Intent detection + responses
├── database/
│   ├── schema.sql              ← Full DB schema
│   ├── seed_data.py            ← Data collection pipeline
│   ├── fix_taxonomy.py         ← GBIF taxonomy enrichment
│   └── fix_locations.py        ← Location data enrichment
├── text_similarity/
│   ├── build_index.py          ← FAISS index builder
│   ├── species_index.faiss     ← Vector index (1081 species)
│   └── species_index_meta.json ← Index metadata
├── models/
│   └── best_model.pth          ← Trained EfficientNet weights (not in repo)
└── natvis-frontend/
    └── src/
        └── NatVis.jsx          ← React frontend
```

---

## Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- PlantNet API key (free at [my.plantnet.org](https://my.plantnet.org))

### Backend

```bash
# create virtual environment
python -m venv natvis_env
natvis_env\Scripts\activate  # Windows
source natvis_env/bin/activate  # Mac/Linux

# install dependencies
pip install fastapi uvicorn python-multipart pillow requests \
    sentence-transformers faiss-cpu timm torch torchvision \
    tqdm wikipediaapi python-dotenv

# set up environment variables
cp .env.example .env
# edit .env and add your PlantNet API key

# run backend
cd backend
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd natvis-frontend
npm install
npm run dev
```

Open `http://localhost:5173`

### Database

The database is not included in the repo (too large). To rebuild it:

```bash
cd database
python seed_data.py        # seeds species data from Wikipedia + GBIF
python fix_taxonomy.py     # enriches taxonomy from GBIF
python fix_locations.py    # adds location data
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/identify/photo` | Upload image → top species matches |
| POST | `/identify/text` | Text description → semantic species search |
| GET | `/species/{name}` | Full species card |
| GET | `/species/` | Search by continent/country/kingdom |
| POST | `/chat/` | Chat about a species |
| GET | `/chat/history/{session_id}` | Chat history |

API docs available at `http://localhost:8000/docs`

---

## Model

EfficientNet-B0 fine-tuned on [PlantNet-300K](https://huggingface.co/datasets/mikehemberger/plantnet300K):
- 1081 plant species
- 243,916 training images
- 79.4% top-1 validation accuracy
- Trained on 2x T4 GPUs (Kaggle)

For production photo identification, the app uses the PlantNet API which provides higher accuracy on real-world field photos.

---

## Data

Species data sourced from:
- **GBIF** — taxonomy, location, occurrence data
- **Wikipedia** — descriptions, habitat, appearance
- **PlantNet** — species mapping (1081 classes)

Safety data (toxicity, edibility, remedies) is partially populated and flagged for expert review. All safety-critical fields include a confidence score and verification status.

---

## Disclaimer

Safety data in NatVis is algorithmically sourced and **has not been fully verified by domain experts**. Do not use this app as your sole source for decisions about consuming or handling wild plants or animals. Always consult a qualified botanist, mycologist, or medical professional.

---

## Author

**Aniruddh** — [GitHub](https://github.com/aniruddh-aidev) | [Hugging Face](https://huggingface.co/annir241)

Built as part of an ML portfolio targeting real-world applied AI problems.
