"""
WildSense — Database Seeder
============================
Populates the SQLite database from:
1. PlantNet mapping (species names)
2. GBIF API (location, taxonomy)
3. Wikipedia API (description, appearance, habitat)
4. USDA API (edibility, toxicity)
5. FAISS index (search linking)

Usage:
    python seed_data.py
"""

import sqlite3
import json
import time
import logging
import requests
import wikipediaapi
from pathlib import Path
from tqdm import tqdm
from datetime import datetime

# ── logging ───────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)
log = logging.getLogger("wildsense.seeder")

# ── paths ─────────────────────────────────────────────────
BASE_DIR        = Path(__file__).parent
DB_PATH         = BASE_DIR / "wildsense.db"
SCHEMA_PATH     = BASE_DIR / "schema.sql"
MAPPING_PATH    = BASE_DIR.parent / "text_similarity" / "plantnet300K_species_id_2_name.json"
FAISS_META_PATH = BASE_DIR.parent / "text_similarity" / "species_index_meta.json"
CHECKPOINT_PATH = BASE_DIR / "seed_checkpoint.json"

# ── helpers ───────────────────────────────────────────────
def safe_get(url, params=None, retries=3, delay=2):
    for attempt in range(retries):
        try:
            r = requests.get(url, params=params,
                             headers={"User-Agent": "WildSense/1.0"},
                             timeout=15)
            r.raise_for_status()
            return r
        except Exception as e:
            log.warning(f"Request failed ({attempt+1}/{retries}): {e}")
            time.sleep(delay * (attempt + 1))
    return None


def load_checkpoint():
    if CHECKPOINT_PATH.exists():
        return set(json.loads(CHECKPOINT_PATH.read_text()))
    return set()


def save_checkpoint(done):
    CHECKPOINT_PATH.write_text(json.dumps(list(done)))


def compute_completeness(species_row, safety_row, uses_row):
    """Score 0.0-1.0 based on how many fields are filled."""
    total, filled = 0, 0
    for val in [*species_row.values(), *safety_row.values(), *uses_row.values()]:
        total += 1
        if val not in (None, "", "[]", "{}"):
            filled += 1
    return round(filled / total, 2) if total > 0 else 0.0

# ── data fetchers ─────────────────────────────────────────

def fetch_gbif(scientific_name: str) -> dict:
    """Fetch taxonomy + location data from GBIF."""
    r = safe_get(
        "https://api.gbif.org/v1/species",
        params={"name": scientific_name, "limit": 1}
    )
    if not r:
        return {}

    results = r.json().get("results", [])
    if not results:
        return {}

    rec = results[0]
    gbif_key = rec.get("key") or rec.get("nubKey")

    # fetch occurrences for location data
    locations = []
    if gbif_key:
        occ_r = safe_get(
            "https://api.gbif.org/v1/occurrence/search",
            params={
                "taxonKey": gbif_key,
                "hasCoordinate": "true",
                "limit": 10
            }
        )
        if occ_r:
            for occ in occ_r.json().get("results", []):
                lat = occ.get("decimalLatitude")
                lng = occ.get("decimalLongitude")
                if lat and lng:
                    locations.append({
                        "continent":  occ.get("continent", ""),
                        "country":    occ.get("country", ""),
                        "region":     occ.get("stateProvince", ""),
                        "latitude":   lat,
                        "longitude":  lng,
                        "source":     "GBIF"
                    })

    return {
        "gbif_id":  str(gbif_key or ""),
        "family":   rec.get("family", ""),
        "genus":    rec.get("genus", ""),
        "kingdom":  rec.get("kingdom", "Plantae"),
        "locations": locations
    }


def fetch_wikipedia(scientific_name: str, wiki) -> dict:
    """Fetch description, habitat, appearance, toxicity, and edibility from Wikipedia."""
    page = wiki.page(scientific_name)
    if not page.exists():
        # try genus only
        genus = scientific_name.split()[0]
        page = wiki.page(genus)

    if not page.exists():
        return {}

    summary = page.summary
    sections = page.sections

    habitat = ""
    appearance = ""
    toxicity_text = ""
    edibility_text = ""
    medicinal_text = ""

    for section in sections:
        title_lower = section.title.lower()
        text = section.text[:300]
        
        if any(w in title_lower for w in ["habitat", "distribution", "ecology"]):
            habitat = text
        elif any(w in title_lower for w in ["description", "appearance", "morphology"]):
            appearance = text
        elif any(w in title_lower for w in ["toxicity", "poisoning", "toxin", "toxic"]):
            toxicity_text = text
        elif any(w in title_lower for w in ["edibility", "edible", "food", "culinary"]):
            edibility_text = text
        elif any(w in title_lower for w in ["medicinal", "medical", "uses", "traditional use"]):
            medicinal_text = text

    # Determine toxicity from text
    toxic = None
    toxicity_level = None
    danger_level = None
    if toxicity_text:
        text_lower = toxicity_text.lower()
        if any(word in text_lower for word in ["lethal", "fatal", "death", "deadly"]):
            toxic = 1
            toxicity_level = 5
            danger_level = "life-threatening"
        elif any(word in text_lower for word in ["severe", "dangerous", "poison"]):
            toxic = 1
            toxicity_level = 4
            danger_level = "severe"
        elif any(word in text_lower for word in ["mild", "minor", "slight"]):
            toxic = 1
            toxicity_level = 2
            danger_level = "low"
        else:
            toxic = 1
            toxicity_level = 3
            danger_level = "moderate"

    # Determine edibility from text
    edible = None
    if edibility_text or medicinal_text:
        combined_text = (edibility_text + " " + medicinal_text).lower()
        if any(word in combined_text for word in ["edible", "food", "eat", "culinary"]):
            edible = 1
        elif any(word in combined_text for word in ["not edible", "inedible", "poisonous"]):
            edible = 0

    return {
        "description":     summary[:500] if summary else "",
        "habitat":         habitat,
        "appearance":      appearance,
        "toxicity_text":   toxicity_text,
        "edibility_text":  edibility_text,
        "medicinal_text":  medicinal_text,
        "toxic":           toxic,
        "toxicity_level":  toxicity_level,
        "danger_level":    danger_level,
        "edible":          edible,
    }


def fetch_wikipedia_safety(wiki_data: dict) -> dict:
    """Extract and score safety data from Wikipedia content."""
    toxicity_confidence = 0.7 if wiki_data.get("toxicity_text") else 0.3
    edibility_confidence = 0.7 if wiki_data.get("edibility_text") or wiki_data.get("medicinal_text") else 0.3
    
    return {
        "edible":             wiki_data.get("edible"),
        "edible_confidence":  edibility_confidence,
        "edible_source":      "Wikipedia" if wiki_data.get("edibility_text") else "needs_review",
        "toxic":              wiki_data.get("toxic"),
        "toxicity_level":     wiki_data.get("toxicity_level"),
        "toxicity_confidence": toxicity_confidence,
        "toxicity_source":    "Wikipedia" if wiki_data.get("toxicity_text") else "needs_review",
        "danger_level":       wiki_data.get("danger_level"),
    }


def calculate_completeness(species_data: dict, safety_data: dict, locations_count: int) -> dict:
    """
    Calculate completeness score (0.0-1.0) based on filled fields.
    Weighted by field importance and data availability.
    
    Returns: {completeness, needs_review, review_reason}
    """
    # ── Base score: Core taxonomy/description ──────────────
    # These are the most reliable fields from Wikipedia + GBIF
    base_score = 0.0
    
    # Description: highest priority (most available)
    if species_data.get("description"):
        base_score += 0.25
    
    # Appearance & Habitat: common in Wikipedia
    if species_data.get("appearance"):
        base_score += 0.15
    if species_data.get("habitat"):
        base_score += 0.15
    
    # ── Safety data: Lower priority (rarely available) ──────
    safety_score = 0.0
    
    # Toxicity from Wikipedia sections (rare: ~10%)
    if safety_data.get("toxic") is not None:
        safety_score += 0.15
        if safety_data.get("danger_level"):
            safety_score += 0.05
    
    # Edibility from Wikipedia sections (rare: ~14%)
    if safety_data.get("edible") is not None:
        safety_score += 0.15
    
    # ── Location bonus: Geographic data ────────────────────
    location_score = 0.0
    if locations_count > 0:
        # 0.02 per location, max 0.10
        location_score = min(0.10, locations_count * 0.02)
    
    # ── Total completeness ────────────────────────────────
    completeness = round(base_score + safety_score + location_score, 2)
    completeness = min(1.0, completeness)  # Cap at 1.0
    
    # ── Determine review status ───────────────────────────
    needs_review = 0
    review_reasons = []
    
    # Critical issues that require review
    if not species_data.get("description"):
        needs_review = 1
        review_reasons.append("Missing description")
    
    if safety_data.get("toxicity_confidence", 0) < 0.5 and completeness < 0.7:
        review_reasons.append("Toxicity unverified")
    
    if safety_data.get("edible_confidence", 0) < 0.5 and completeness < 0.7:
        review_reasons.append("Edibility unverified")
    
    # Minor issues (informational)
    if not species_data.get("habitat"):
        review_reasons.append("No habitat data; add for 0.15 boost")
    
    if locations_count == 0:
        review_reasons.append("No location data; add for +0.02 to +0.10 boost")
    
    review_reason = "; ".join(review_reasons) if review_reasons else "Adequate data"
    
    return {
        "completeness": completeness,
        "needs_review": needs_review,
        "review_reason": review_reason
    }

# ── database operations ───────────────────────────────────

def init_db(conn):
    """Create tables from schema.sql."""
    schema = SCHEMA_PATH.read_text()
    conn.executescript(schema)
    conn.commit()
    log.info("Database initialized from schema.sql")


def insert_species(conn, data: dict):
    conn.execute("""
        INSERT OR REPLACE INTO species (
            scientific_name, common_names, kingdom, family, genus,
            species_epithet, gbif_id, description, habitat, appearance,
            created_at, updated_at
        ) VALUES (
            :scientific_name, :common_names, :kingdom, :family, :genus,
            :species_epithet, :gbif_id, :description, :habitat, :appearance,
            :created_at, :updated_at
        )
    """, data)


def insert_locations(conn, scientific_name: str, locations: list):
    for loc in locations:
        conn.execute("""
            INSERT INTO species_location (
                scientific_name, continent, country, region,
                latitude, longitude, source
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            scientific_name,
            loc.get("continent", ""),
            loc.get("country", ""),
            loc.get("region", ""),
            loc.get("latitude"),
            loc.get("longitude"),
            loc.get("source", "GBIF")
        ))


def insert_safety(conn, data: dict):
    conn.execute("""
        INSERT OR REPLACE INTO species_safety (
            scientific_name, edible, edible_confidence, edible_source,
            toxic, toxicity_level, toxicity_confidence, toxicity_source,
            danger_level
        ) VALUES (
            :scientific_name, :edible, :edible_confidence, :edible_source,
            :toxic, :toxicity_level, :toxicity_confidence, :toxicity_source,
            :danger_level
        )
    """, data)


def insert_uses(conn, scientific_name: str):
    """Placeholder — uses need manual curation."""
    conn.execute("""
        INSERT OR IGNORE INTO species_uses (scientific_name)
        VALUES (?)
    """, (scientific_name,))


def insert_search(conn, scientific_name: str, faiss_idx: int, description: str):
    conn.execute("""
        INSERT OR REPLACE INTO species_search (
            scientific_name, faiss_index, description_text, last_indexed
        ) VALUES (?, ?, ?, ?)
    """, (scientific_name, faiss_idx, description[:500], datetime.now().isoformat()))


def insert_quality(conn, scientific_name: str, needs_review: int,
                   review_reason: str, completeness: float):
    conn.execute("""
        INSERT OR REPLACE INTO species_quality (
            scientific_name, needs_review, review_reason, completeness_score
        ) VALUES (?, ?, ?, ?)
    """, (scientific_name, needs_review, review_reason, completeness))

# ── main seeder ───────────────────────────────────────────

def seed():
    # load mapping
    log.info("Loading species mapping...")
    with open(MAPPING_PATH) as f:
        mapping = json.load(f)
    species_list = list(mapping.values())  # 1081 scientific names
    log.info(f"Total species to seed: {len(species_list)}")

    # load FAISS metadata for index linking
    faiss_meta = []
    if FAISS_META_PATH.exists():
        with open(FAISS_META_PATH) as f:
            faiss_meta = json.load(f)
    faiss_lookup = {name: i for i, name in enumerate(faiss_meta)}

    # init Wikipedia
    wiki = wikipediaapi.Wikipedia(
        language="en",
        user_agent="WildSense/1.0"
    )

    # init DB
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    init_db(conn)

    # load checkpoint
    done = load_checkpoint()
    remaining = [s for s in species_list if s not in done]
    log.info(f"Resuming: {len(done)} done, {len(remaining)} remaining")

    for i, sci_name in enumerate(tqdm(remaining)):
        try:
            # ── GBIF ──────────────────────────────────────
            gbif = fetch_gbif(sci_name)
            time.sleep(0.3)

            # ── Wikipedia ─────────────────────────────────
            wiki_data = fetch_wikipedia(sci_name, wiki)
            time.sleep(0.3)

            # ── Safety (from Wikipedia) ───────────────────
            safety = fetch_wikipedia_safety(wiki_data)

            # ── Species epithet ───────────────────────────
            parts = sci_name.split()
            epithet = parts[1] if len(parts) > 1 else ""

            # ── Insert species ────────────────────────────
            now = datetime.now().isoformat()
            species_data = {
                "scientific_name": sci_name,
                "common_names":    "[]",
                "kingdom":         gbif.get("kingdom", "Plantae"),
                "family":          gbif.get("family", ""),
                "genus":           gbif.get("genus", ""),
                "species_epithet": epithet,
                "gbif_id":         gbif.get("gbif_id", ""),
                "description":     wiki_data.get("description", ""),
                "habitat":         wiki_data.get("habitat", ""),
                "appearance":      wiki_data.get("appearance", ""),
                "created_at":      now,
                "updated_at":      now,
            }
            insert_species(conn, species_data)

            # ── Insert locations ──────────────────────────
            locations = gbif.get("locations", [])
            insert_locations(conn, sci_name, locations)

            # ── Insert safety ─────────────────────────────
            insert_safety(conn, {
                "scientific_name":    sci_name,
                "edible":             safety.get("edible"),
                "edible_confidence":  safety.get("edible_confidence", 0.3),
                "edible_source":      safety.get("edible_source", ""),
                "toxic":              safety.get("toxic"),
                "toxicity_level":     safety.get("toxicity_level"),
                "toxicity_confidence": safety.get("toxicity_confidence", 0.3),
                "toxicity_source":    safety.get("toxicity_source", ""),
                "danger_level":       safety.get("danger_level"),
            })

            # ── Insert uses placeholder ───────────────────
            insert_uses(conn, sci_name)

            # ── Insert search link ────────────────────────
            faiss_idx = faiss_lookup.get(sci_name, -1)
            insert_search(conn, sci_name, faiss_idx,
                          wiki_data.get("description", sci_name))

            # ── Calculate and insert quality ──────────────
            quality_data = calculate_completeness(
                species_data,
                safety,
                len(locations)
            )
            insert_quality(
                conn, sci_name,
                needs_review=quality_data["needs_review"],
                review_reason=quality_data["review_reason"],
                completeness=quality_data["completeness"]
            )

            # ── checkpoint every 20 ───────────────────────
            done.add(sci_name)
            if len(done) % 20 == 0:
                conn.commit()
                save_checkpoint(done)
                log.info(f"Checkpoint: {len(done)}/{len(species_list)} done")

        except Exception as e:
            log.error(f"Failed on {sci_name}: {e}")
            continue

    # final commit
    conn.commit()
    save_checkpoint(done)
    conn.close()

    log.info("=" * 50)
    log.info("SEEDING COMPLETE")
    log.info(f"Total seeded: {len(done)}")
    log.info(f"Database: {DB_PATH}")
    log.info("=" * 50)
    log.info("Enhanced with Wikipedia-based safety extraction:")
    log.info("✓ Toxicity/Toxin section parsing")
    log.info("✓ Edibility/Food use section parsing")
    log.info("✓ Medicinal use section parsing")
    log.info("✓ Dynamic completeness scoring")
    log.info("✓ Confidence-based review flagging")
    log.info("Check species_quality table for review status.")


if __name__ == "__main__":
    seed()