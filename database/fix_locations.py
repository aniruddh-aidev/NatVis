import sqlite3
import requests
import time
from tqdm import tqdm

conn = sqlite3.connect("wildsense.db")
species_list = [r[0] for r in conn.execute("SELECT scientific_name FROM species").fetchall()]

# check already done
done_set = set(r[0] for r in conn.execute(
    "SELECT DISTINCT scientific_name FROM species_location"
).fetchall())

remaining = [s for s in species_list if s not in done_set]
print(f"Remaining: {len(remaining)}")

for sci_name in tqdm(remaining):
    row = conn.execute(
        "SELECT gbif_id FROM species WHERE scientific_name=?", (sci_name,)
    ).fetchone()

    gbif_id = row[0] if row and row[0] else None
    if not gbif_id:
        continue

    for attempt in range(3):
        try:
            r = requests.get(
                "https://api.gbif.org/v1/occurrence/search",
                params={
                    "taxonKey":      gbif_id,
                    "hasCoordinate": "true",
                    "limit":         5
                },
                headers={"User-Agent": "WildSense/1.0"},
                timeout=30   # increased from 10 to 30
            )

            if r.status_code == 200:
                for occ in r.json().get("results", []):
                    lat = occ.get("decimalLatitude")
                    lng = occ.get("decimalLongitude")
                    if not lat or not lng:
                        continue
                    conn.execute("""
                        INSERT INTO species_location (
                            scientific_name, continent, country, region,
                            latitude, longitude, source
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        sci_name,
                        occ.get("continent", ""),
                        occ.get("country", ""),
                        occ.get("stateProvince", ""),
                        lat, lng, "GBIF"
                    ))
            break

        except requests.exceptions.ReadTimeout:
            time.sleep(5 * (attempt + 1))
        except Exception as e:
            break

    conn.commit()
    time.sleep(0.5)

conn.close()
print("Done")