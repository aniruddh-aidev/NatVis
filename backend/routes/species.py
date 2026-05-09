"""
WildSense — Species Routes
/species/{scientific_name}  — full species card
/species/search             — search by region/kingdom
"""

from fastapi import APIRouter, HTTPException
from services.database import get_species_summary, search_by_region

router = APIRouter()


@router.get("/{scientific_name:path}")
def get_species(scientific_name: str):
    """
    Get full species card by scientific name.
    Returns all data including safety, uses, remedies, locations.
    """
    data = get_species_summary(scientific_name)
    if not data:
        raise HTTPException(
            status_code=404,
            detail=f"Species '{scientific_name}' not found in database"
        )
    return data


@router.get("/")
def search_species(
    continent: str = None,
    country:   str = None,
    kingdom:   str = None,
    limit:     int = 20
):
    """
    Search species by region and/or kingdom.
    """
    results = search_by_region(
        continent=continent,
        country=country,
        kingdom=kingdom,
        limit=limit
    )
    return {
        "count":   len(results),
        "species": results
    }
