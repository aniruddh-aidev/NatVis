"""
WildSense — Vision Service
Uses PlantNet API for photo identification.
"""
from PIL import Image
import io
import requests
import os
from dotenv import load_dotenv

load_dotenv()
PLANTNET_API_KEY = os.getenv("PLANTNET_API_KEY", "")  # paste your key here
PLANTNET_URL     = "https://my-api.plantnet.org/v2/identify/all"


def predict_image(image_bytes: bytes, top_k: int = 5) -> list[dict]:
    try:
        # convert to JPEG (handles webp, png, etc.)
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        jpeg_bytes = buf.getvalue()

        r = requests.post(
            PLANTNET_URL,
            params={
                "api-key":    PLANTNET_API_KEY,
                "lang":       "en",
                "nb-results": top_k
            },
            files=[("images", ("image.jpg", jpeg_bytes, "image/jpeg"))],
            timeout=15
        )
        print(f"[PlantNet] Status: {r.status_code}")
        print(f"[PlantNet] Response: {r.text[:500]}")
        r.raise_for_status()
        results = r.json().get("results", [])
        seen = {}
        for res in results:
           name = res["species"]["scientificNameWithoutAuthor"]
           score = res["score"]
           if name not in seen or score > seen[name]:
             seen[name] = score
        deduped = sorted(seen.items(), key=lambda x: x[1], reverse=True)[:top_k]

        return [
         {
          "scientific_name": name,
          "confidence":      round(score, 4),
          "confidence_pct":  f"{score * 100:.1f}%"
        }
        for name, score in deduped]

    except Exception as e:
        print(f"[VisionService] PlantNet API error: {e}")
        return []