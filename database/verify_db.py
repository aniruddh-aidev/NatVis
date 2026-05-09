import sqlite3

conn = sqlite3.connect("wildsense.db")

# check counts
print("Species:", conn.execute("SELECT COUNT(*) FROM species").fetchone()[0])
print("Locations:", conn.execute("SELECT COUNT(*) FROM species_location").fetchone()[0])
print("Safety:", conn.execute("SELECT COUNT(*) FROM species_safety").fetchone()[0])
print("Quality:", conn.execute("SELECT COUNT(*) FROM species_quality").fetchone()[0])
print("Search:", conn.execute("SELECT COUNT(*) FROM species_search").fetchone()[0])

# check a sample record
row = conn.execute("""
    SELECT s.scientific_name, s.family, s.description, sq.completeness_score
    FROM species s
    JOIN species_quality sq ON s.scientific_name = sq.scientific_name
    LIMIT 1
""").fetchone()
print("\nSample record:")
print(f"  Name: {row[0]}")
print(f"  Family: {row[1]}")
print(f"  Description: {row[2][:100] if row[2] else 'None'}...")
print(f"  Completeness: {row[3]}")

conn.close()