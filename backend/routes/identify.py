"""
WildSense — Identify Routes
/identify/photo  — image upload → species prediction
/identify/text   — text description → species search
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from services.vision import predict_image
from services.search import search_by_text
from services.database import get_species_summary
from services.database import get_species_summary, find_species_fuzzy

router = APIRouter()


# ── Photo Identification ───────────────────────────────────

@router.post("/photo")
async def identify_photo(
    file: UploadFile = File(...),
    top_k: int = 5
):
    """
    Upload a photo to identify the species.
    Returns top_k predictions with confidence scores and species summaries.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    image_bytes = await file.read()

    if len(image_bytes) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="Image too large (max 10MB)")

    predictions = predict_image(image_bytes, top_k=top_k)

    # enrich top prediction with full species data
    results = []
    for pred in predictions:
        summary = get_species_summary(pred["scientific_name"]) or find_species_fuzzy(pred["scientific_name"])
        results.append({
            **pred,
            "species_data": summary
        })

    return {
        "method":      "photo",
        "predictions": results,
        "top_match":   results[0] if results else None
    }


# ── Text Identification ────────────────────────────────────

class TextQuery(BaseModel):
    description: str
    kingdom:     str = "both"   # flora / fauna / both
    region:      str = None     # optional region filter
    top_k:       int = 5


@router.post("/text")
def identify_text(query: TextQuery):
    """
    Describe a plant or animal in text to identify it.
    Returns top_k matches with similarity scores and species summaries.
    """
    if len(query.description.strip()) < 5:
        raise HTTPException(
            status_code=400,
            detail="Description too short — please provide more detail"
        )

    matches = search_by_text(query.description, top_k=query.top_k)

    results = []
    for match in matches:
        summary = get_species_summary(match["scientific_name"]) or find_species_fuzzy(match["scientific_name"])
        results.append({
            **match,
            "species_data": summary
        })

    return {
        "method":  "text",
        "query":   query.description,
        "results": results,
        "top_match": results[0] if results else None
    }
