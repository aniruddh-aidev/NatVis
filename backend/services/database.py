"""
WildSense — Database Service
SQLite queries for species data retrieval.
"""

import sqlite3
import json
from pathlib import Path

DB_PATH = Path(__file__).parent.parent.parent / "database" / "wildsense.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_species(scientific_name: str) -> dict | None:
    """Fetch full species record including safety, uses, and locations."""
    conn = get_connection()

    # core species data
    species = conn.execute("""
        SELECT * FROM species WHERE scientific_name = ?
    """, (scientific_name,)).fetchone()

    if not species:
        conn.close()
        return None

    species = dict(species)

    # safety data
    safety = conn.execute("""
        SELECT * FROM species_safety WHERE scientific_name = ?
    """, (scientific_name,)).fetchone()
    species["safety"] = dict(safety) if safety else {}

    # uses data
    uses = conn.execute("""
        SELECT * FROM species_uses WHERE scientific_name = ?
    """, (scientific_name,)).fetchone()
    species["uses"] = dict(uses) if uses else {}

    # remedies
    remedies = conn.execute("""
        SELECT * FROM species_remedies WHERE scientific_name = ?
    """, (scientific_name,)).fetchall()
    species["remedies"] = [dict(r) for r in remedies]

    # locations (unique continents + countries)
    locations = conn.execute("""
        SELECT DISTINCT continent, country
        FROM species_location
        WHERE scientific_name = ?
        LIMIT 10
    """, (scientific_name,)).fetchall()
    species["locations"] = [dict(l) for l in locations]

    # quality
    quality = conn.execute("""
        SELECT * FROM species_quality WHERE scientific_name = ?
    """, (scientific_name,)).fetchone()
    species["quality"] = dict(quality) if quality else {}

    conn.close()
    return species


def search_by_region(continent: str = None, country: str = None,
                     kingdom: str = None, limit: int = 50) -> list[str]:
    """Get species names filtered by region and/or kingdom."""
    conn = get_connection()

    query = """
        SELECT DISTINCT s.scientific_name
        FROM species s
        JOIN species_location sl ON s.scientific_name = sl.scientific_name
        WHERE 1=1
    """
    params = []

    if continent:
        query += " AND LOWER(sl.continent) = LOWER(?)"
        params.append(continent)
    if country:
        query += " AND LOWER(sl.country) = LOWER(?)"
        params.append(country)
    if kingdom:
        query += " AND LOWER(s.kingdom) = LOWER(?)"
        params.append(kingdom)

    query += f" LIMIT {limit}"

    results = conn.execute(query, params).fetchall()
    conn.close()
    return [r[0] for r in results]


def get_species_summary(scientific_name: str) -> dict:
    """
    Returns a clean human-readable summary card for the frontend.
    Converts raw DB fields into display-ready format.
    """
    data = get_species(scientific_name)
    if not data:
        return {}

    safety = data.get("safety", {})
    quality = data.get("quality", {})

    # toxicity display
    toxicity_level = safety.get("toxicity_level")
    toxicity_map = {
        1: "Very Low",
        2: "Low",
        3: "Moderate",
        4: "High",
        5: "Lethal"
    }

    # edibility display
    edible_map = {
        0: "Not Edible",
        1: "Edible",
        2: "Partially Edible"
    }

    # danger display
    danger_icons = {
        "low":              "🟢 Low",
        "moderate":         "🟡 Moderate",
        "severe":           "🟠 Severe",
        "life-threatening": "🔴 Life-Threatening"
    }

    needs_review = quality.get("needs_review", 1)

    return {
        "scientific_name":  scientific_name,
        "common_names":     json.loads(data.get("common_names") or "[]"),
        "family":           data.get("family", ""),
        "kingdom":          data.get("kingdom", ""),
        "description":      data.get("description", ""),
        "habitat":          data.get("habitat", ""),
        "appearance":       data.get("appearance", ""),

        # safety card
        "edible":           edible_map.get(safety.get("edible"), "Unknown"),
        "toxic":            "Yes" if safety.get("toxic") == 1 else
                            "Partially" if safety.get("toxic") == 2 else
                            "No" if safety.get("toxic") == 0 else "Unknown",
        "toxicity_level":   toxicity_map.get(toxicity_level, "Unknown"),
        "toxic_to":         json.loads(safety.get("toxic_to") or "[]"),
        "danger_level":     danger_icons.get(
                                safety.get("danger_level", ""), "⚪ Unknown"
                            ),
        "symptoms":         json.loads(safety.get("symptoms") or "[]"),
        "safe_usage":       safety.get("safe_usage", ""),
        "immediate_action": safety.get("immediate_action", ""),

        # uses
        "medicinal_uses":   data.get("uses", {}).get("medicinal_uses", ""),
        "culinary_uses":    data.get("uses", {}).get("culinary_uses", ""),
        "ecological_role":  data.get("uses", {}).get("ecological_role", ""),

        # remedies
        "remedies":         data.get("remedies", []),

        # locations
        "found_in":         data.get("locations", []),

        # confidence warning
        "data_verified":    not bool(needs_review),
        "confidence_note":  "⚠️ Data not fully verified — consult an expert before use"
                            if needs_review else "✅ Data verified",

        # quality
        "completeness":     quality.get("completeness_score", 0)
    }

def find_species_fuzzy(name: str) -> dict:
    """Try exact match first, then genus-level match."""
    conn = get_connection()
    
    # exact match
    row = conn.execute(
        "SELECT scientific_name FROM species WHERE scientific_name LIKE ?",
        (f"%{name.split()[0]}%",)
    ).fetchone()
    
    conn.close()
    
    if row:
        return get_species_summary(row[0])
    return {}