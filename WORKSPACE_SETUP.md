# NatVis Workspace Setup

## Project Structure

```
e:\AI tools\NatVis\
├── backend/                   # FastAPI Python backend (port 8000)
│   ├── main.py
│   ├── requirements.txt
│   └── [API endpoints]
│
├── frontend/                  # React + Next.js + Canvas renderer
│   ├── app/                   # Next.js app directory
│   ├── components/            # React components
│   │   └── TerrainRenderer.tsx # Canvas-based terrain with flora
│   ├── node_modules/          # Frontend dependencies (npm)
│   ├── package.json
│   └── tsconfig.json
│
├── database/                  # SQLite database & seeding scripts
│   ├── wildsense.db
│   ├── seed_data.py          # Seeds 1,081+ species with Wikipedia data
│   ├── fix_taxonomy.py       # GBIF API enrichment
│   └── verify_db.py          # Database verification
│
├── text_similarity/           # Plant similarity search
│   ├── species_index.faiss
│   ├── species_index_meta.json
│   └── build_index.py
│
├── natvis_env/               # Python virtual environment
│   ├── Scripts/
│   └── Lib/site-packages/    # Python packages (FastAPI, requests, etc.)
│
└── .gitignore
```

## Installation Instructions

### Backend Setup
```bash
# Python environment already configured at: e:\AI tools\NatVis\natvis_env\
# Activate it:
& "e:\AI tools\NatVis\natvis_env\Scripts\Activate.ps1"

# Install Python dependencies (if needed)
pip install fastapi uvicorn sqlalchemy requests

# Run backend server
cd e:\AI tools\NatVis\backend
uvicorn main:app --reload --port 8000
```

### Frontend Setup
```bash
# Navigate to frontend directory
cd e:\AI tools\NatVis\frontend

# Install Node.js dependencies (creates node_modules in frontend/)
npm install

# Start development server
npm run dev
# Runs on http://localhost:3000
```

## Key Points

✓ **Backend**: Python 3.13 environment at `natvis_env/`
✓ **Frontend**: Node.js dependencies in `frontend/node_modules/` (NOT in natvis_env)
✓ **Database**: SQLite at `database/wildsense.db`
✓ **Species Data**: 1,081+ species with Wikipedia extraction
✓ **API**: FastAPI running on port 8000
✓ **UI**: Canvas-based terrain renderer with interactive flora

## Running the Full Stack

1. Terminal 1 - Backend:
```bash
& "e:\AI tools\NatVis\natvis_env\Scripts\Activate.ps1"
cd backend
uvicorn main:app --reload --port 8000
```

2. Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

3. Access at `http://localhost:3000`

## API Endpoints

- `GET http://localhost:8000/api/species` - Fetch all species
- `GET http://localhost:8000/api/species/{id}` - Get species by ID
- `POST http://localhost:8000/api/search` - Search species

## Frontend Features

- Interactive hillside terrain with rolling hills
- Animated flora (flowers, trees, plants) from database
- Parallax scrolling on sky (moves background)
- Zoom scrolling on hills (magnifies flora)
- Click flora to see species details
- Swaying animation on plants
- Real-time species data from backend
