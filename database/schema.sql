-- ============================================================
-- WildSense Database Schema
-- Primary key: scientific_name across all tables
-- ============================================================

-- ── Core Species Table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS species (
    scientific_name         TEXT PRIMARY KEY,
    common_names            TEXT,           -- JSON array ["Rose", "Garden Rose"]
    kingdom                 TEXT,           -- Plantae / Animalia
    family                  TEXT,
    genus                   TEXT,
    species_epithet         TEXT,           -- just the species part
    gbif_id                 TEXT,
    inat_id                 TEXT,
    plantnet_id             TEXT,

    -- Appearance
    description             TEXT,
    habitat                 TEXT,
    appearance              TEXT,
    height_cm_min           REAL,
    height_cm_max           REAL,
    color                   TEXT,           -- JSON array ["red", "green"]
    season                  TEXT,           -- JSON array ["spring", "summer"]

    -- Media
    photo_paths             TEXT,           -- JSON array of local image paths
    photo_urls              TEXT,           -- JSON array of URLs

    -- Meta
    created_at              TEXT DEFAULT (datetime('now')),
    updated_at              TEXT DEFAULT (datetime('now'))
);

-- ── Location Table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS species_location (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    scientific_name         TEXT NOT NULL,
    continent               TEXT,           -- Asia, Africa, Europe, etc.
    country                 TEXT,
    region                  TEXT,           -- state/province
    latitude                REAL,
    longitude               REAL,
    location_confidence     REAL DEFAULT 1.0,  -- 0.0 to 1.0
    source                  TEXT,           -- GBIF, iNaturalist, etc.

    FOREIGN KEY (scientific_name) REFERENCES species(scientific_name)
);

-- ── Safety Table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS species_safety (
    scientific_name         TEXT PRIMARY KEY,

    -- Edibility
    edible                  INTEGER,        -- 0=no, 1=yes, 2=partial
    edible_parts            TEXT,           -- JSON array ["leaves", "fruit"]
    edible_notes            TEXT,
    edible_confidence       REAL DEFAULT 1.0,
    edible_source           TEXT,

    -- Toxicity
    toxic                   INTEGER,        -- 0=no, 1=yes, 2=partial
    toxicity_level          INTEGER,        -- 1=mild to 5=lethal
    toxic_to                TEXT,           -- JSON array ["humans", "animals", "both"]
    toxic_parts             TEXT,           -- JSON array ["seeds", "leaves", "all"]
    danger_level            TEXT,           -- low / moderate / severe / life-threatening
    symptoms                TEXT,           -- JSON array ["nausea", "vomiting", ...]
    onset_time              TEXT,           -- e.g. "30 minutes to 2 hours"
    safe_usage              TEXT,           -- e.g. "leaves safe in small qty, seeds lethal"
    toxicity_confidence     REAL DEFAULT 1.0,
    toxicity_source         TEXT,

    -- Immediate Action
    immediate_action        TEXT,           -- what to do if exposed
    call_emergency          INTEGER DEFAULT 0,  -- 0/1 flag

    FOREIGN KEY (scientific_name) REFERENCES species(scientific_name)
);

-- ── Remedies Table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS species_remedies (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    scientific_name         TEXT NOT NULL,  -- the TOXIC species
    remedy_plant            TEXT,           -- plant used as remedy
    remedy_part             TEXT,           -- which part of remedy plant
    remedy_usage            TEXT,           -- how to use it
    remedy_availability     TEXT,           -- common / rare / regional
    remedy_confidence       REAL DEFAULT 0.5,  -- remedies are often uncertain
    remedy_source           TEXT,
    notes                   TEXT,

    FOREIGN KEY (scientific_name) REFERENCES species(scientific_name)
);

-- ── Uses Table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS species_uses (
    scientific_name         TEXT PRIMARY KEY,

    -- Medicinal
    medicinal_uses          TEXT,           -- plain text description
    medicinal_parts         TEXT,           -- JSON array
    medicinal_confidence    REAL DEFAULT 1.0,
    medicinal_source        TEXT,

    -- Culinary
    culinary_uses           TEXT,
    culinary_parts          TEXT,           -- JSON array
    culinary_confidence     REAL DEFAULT 1.0,
    culinary_source         TEXT,

    -- Ecological
    ecological_role         TEXT,           -- pollinator, nitrogen fixer, etc.
    ecological_confidence   REAL DEFAULT 1.0,

    -- Cultural / Other
    cultural_uses           TEXT,
    other_uses              TEXT,

    FOREIGN KEY (scientific_name) REFERENCES species(scientific_name)
);

-- ── Text Search Table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS species_search (
    scientific_name         TEXT PRIMARY KEY,
    faiss_index             INTEGER,        -- index position in FAISS
    description_text        TEXT,           -- text used to build FAISS vector
    last_indexed            TEXT,

    FOREIGN KEY (scientific_name) REFERENCES species(scientific_name)
);

-- ── Data Quality Table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS species_quality (
    scientific_name         TEXT PRIMARY KEY,
    needs_review            INTEGER DEFAULT 0,  -- 0/1
    review_reason           TEXT,           -- why flagged
    conflict_data           TEXT,           -- JSON of conflicting sources
    completeness_score      REAL,           -- 0.0 to 1.0 how complete the record is
    last_reviewed           TEXT,
    reviewed_by             TEXT,

    FOREIGN KEY (scientific_name) REFERENCES species(scientific_name)
);

-- ── Chat History Table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_history (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id              TEXT,
    scientific_name         TEXT,           -- species being discussed
    user_message            TEXT,
    bot_response            TEXT,
    timestamp               TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (scientific_name) REFERENCES species(scientific_name)
);

-- ── Indexes for fast lookup ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_location_continent
    ON species_location(continent);

CREATE INDEX IF NOT EXISTS idx_location_country
    ON species_location(country);

CREATE INDEX IF NOT EXISTS idx_location_coords
    ON species_location(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_species_kingdom
    ON species(kingdom);

CREATE INDEX IF NOT EXISTS idx_species_family
    ON species(family);

CREATE INDEX IF NOT EXISTS idx_safety_toxic
    ON species_safety(toxic, toxicity_level);

CREATE INDEX IF NOT EXISTS idx_safety_edible
    ON species_safety(edible);

CREATE INDEX IF NOT EXISTS idx_quality_review
    ON species_quality(needs_review);

CREATE INDEX IF NOT EXISTS idx_search_faiss
    ON species_search(faiss_index);
