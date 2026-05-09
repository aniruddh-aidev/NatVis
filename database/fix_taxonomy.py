import sqlite3
import requests
import time
import logging
from tqdm import tqdm

# ── logging ───────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
log = logging.getLogger("fix_taxonomy")

def fetch_taxonomy(sci_name: str, max_retries=3):
    """Fetch taxonomy from GBIF with exponential backoff retry."""
    for attempt in range(max_retries):
        try:
            r = requests.get(
                "https://api.gbif.org/v1/species/match",
                params={"name": sci_name, "verbose": "false"},
                headers={"User-Agent": "WildSense/1.0"},
                timeout=15
            )
            if r.status_code == 200:
                return r.json()
            else:
                log.warning(f"GBIF returned {r.status_code} for {sci_name}")
                return None
                
        except requests.exceptions.Timeout:
            log.warning(f"Timeout on {sci_name} (attempt {attempt+1}/{max_retries})")
        except requests.exceptions.ConnectionError as e:
            log.warning(f"Connection error on {sci_name}: {str(e)[:50]} (attempt {attempt+1}/{max_retries})")
        except requests.exceptions.SSLError as e:
            log.warning(f"SSL error on {sci_name} (attempt {attempt+1}/{max_retries}), waiting...")
        except Exception as e:
            log.error(f"Unexpected error on {sci_name}: {e}")
            return None
        
        # Exponential backoff: 1s, 3s, 7s
        wait_time = (2 ** attempt) - 1
        if attempt < max_retries - 1:
            time.sleep(wait_time)
    
    log.warning(f"Failed to fetch {sci_name} after {max_retries} retries")
    return None

# ── main ──────────────────────────────────────────────────

conn = sqlite3.connect("wildsense.db")
species_list = [r[0] for r in conn.execute("SELECT scientific_name FROM species").fetchall()]

log.info(f"Starting taxonomy fix for {len(species_list)} species")
updated = 0

for sci_name in tqdm(species_list):
    data = fetch_taxonomy(sci_name)
    
    if data:
        family = data.get("family", "")
        genus  = data.get("genus", "")
        kingdom = data.get("kingdom", "Plantae")
        gbif_id = str(data.get("speciesKey", ""))

        conn.execute("""
            UPDATE species SET family=?, genus=?, kingdom=?, gbif_id=?
            WHERE scientific_name=?
        """, (family, genus, kingdom, gbif_id, sci_name))
        updated += 1
    
    time.sleep(0.5)  # Be respectful to API

conn.commit()
conn.close()

log.info(f"✓ Done! Updated {updated} species with taxonomy data")