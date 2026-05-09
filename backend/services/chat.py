"""
WildSense — Chat Service
Template-based response engine for structured species questions.
Falls back to open-ended response for unknown questions.
"""

import json
import re
from services.database import get_species_summary


# ── intent patterns ────────────────────────────────────────
INTENTS = {
    "edible":    r"(eat|edible|safe to eat|food|consume|cook)",
    "toxic":     r"(toxic|poison|dangerous|harmful|lethal|kill)",
    "symptoms":  r"(symptom|effect|happen if|what if|ingested|touched)",
    "remedy":    r"(cure|remedy|treat|antidote|help|first aid)",
    "uses":      r"(use|good for|benefit|medicinal|purpose|help with)",
    "habitat":   r"(where|found|grow|habitat|region|location|country)",
    "appear":    r"(look|appear|describe|colour|color|shape|size|leaf|flower)",
    "danger":    r"(danger|safe|risk|threat|how bad|severity)",
    "safe_use":  r"(how much|safe amount|dosage|safe to use|how to use)",
}


def detect_intent(message: str) -> str:
    message = message.lower()
    for intent, pattern in INTENTS.items():
        if re.search(pattern, message):
            return intent
    return "general"


def build_response(intent: str, data: dict) -> str:
    """Build a human-readable response from species data based on intent."""

    name = data.get("scientific_name", "This species")

    if intent == "edible":
        edible = data.get("edible", "Unknown")
        culinary = data.get("culinary_uses", "")
        resp = f"**{name}** is classified as: **{edible}**."
        if culinary:
            resp += f"\n\nCulinary uses: {culinary}"
        resp += f"\n\n{data.get('confidence_note', '')}"
        return resp

    elif intent == "toxic":
        toxic = data.get("toxic", "Unknown")
        level = data.get("toxicity_level", "Unknown")
        toxic_to = data.get("toxic_to", [])
        danger = data.get("danger_level", "Unknown")
        resp = f"**{name}**:\n- Toxic: **{toxic}**\n- Toxicity Level: **{level}**\n- Danger: **{danger}**"
        if toxic_to:
            resp += f"\n- Toxic to: {', '.join(toxic_to)}"
        resp += f"\n\n{data.get('confidence_note', '')}"
        return resp

    elif intent == "symptoms":
        symptoms = data.get("symptoms", [])
        action = data.get("immediate_action", "")
        if symptoms:
            resp = f"If exposed to **{name}**, symptoms may include:\n"
            resp += "\n".join(f"- {s}" for s in symptoms)
        else:
            resp = f"No specific symptom data available for **{name}**."
        if action:
            resp += f"\n\n**Immediate action:** {action}"
        resp += f"\n\n{data.get('confidence_note', '')}"
        return resp

    elif intent == "remedy":
        remedies = data.get("remedies", [])
        action = data.get("immediate_action", "")
        if remedies:
            resp = f"Possible remedies for **{name}** exposure:\n"
            for r in remedies:
                resp += f"- **{r.get('remedy_plant', '')}**: {r.get('remedy_usage', '')}"
        else:
            resp = f"No specific plant remedy data available for **{name}**."
        if action:
            resp += f"\n\n**Immediate action:** {action}"
        resp += "\n\n⚠️ Always seek medical attention for serious exposure."
        return resp

    elif intent == "uses":
        med = data.get("medicinal_uses", "")
        cul = data.get("culinary_uses", "")
        eco = data.get("ecological_role", "")
        resp = f"**Uses of {name}:**\n"
        if med:
            resp += f"\n🌿 **Medicinal:** {med}"
        if cul:
            resp += f"\n🍽️ **Culinary:** {cul}"
        if eco:
            resp += f"\n🌍 **Ecological:** {eco}"
        if not med and not cul and not eco:
            resp += "No specific use data available yet."
        return resp

    elif intent == "habitat":
        habitat = data.get("habitat", "")
        found_in = data.get("found_in", [])
        resp = f"**Habitat of {name}:**\n"
        if habitat:
            resp += f"{habitat}\n"
        if found_in:
            countries = list(set(l.get("country", "") for l in found_in if l.get("country")))[:5]
            continents = list(set(l.get("continent", "") for l in found_in if l.get("continent")))
            if continents:
                resp += f"\nFound in: {', '.join(continents)}"
            if countries:
                resp += f"\nCountries include: {', '.join(countries)}"
        if not habitat and not found_in:
            resp += "No habitat data available."
        return resp

    elif intent == "appear":
        desc = data.get("description", "")
        appear = data.get("appearance", "")
        resp = f"**{name}** appearance:\n"
        if appear:
            resp += appear
        elif desc:
            resp += desc[:300]
        else:
            resp += "No appearance data available."
        return resp

    elif intent == "danger":
        danger = data.get("danger_level", "Unknown")
        level = data.get("toxicity_level", "Unknown")
        resp = f"**{name}** danger assessment:\n- Danger Level: **{danger}**\n- Toxicity Level: **{level}**"
        resp += f"\n\n{data.get('confidence_note', '')}"
        return resp

    elif intent == "safe_use":
        safe = data.get("safe_usage", "")
        resp = f"**Safe usage of {name}:**\n"
        resp += safe if safe else "No safe usage data available."
        resp += f"\n\n{data.get('confidence_note', '')}"
        return resp

    else:
        # general — return full summary
        desc = data.get("description", "No description available.")
        return (
            f"**{name}**\n\n"
            f"{desc[:300]}\n\n"
            f"Edible: {data.get('edible', 'Unknown')} | "
            f"Toxic: {data.get('toxic', 'Unknown')} | "
            f"Danger: {data.get('danger_level', 'Unknown')}\n\n"
            f"{data.get('confidence_note', '')}"
        )


def handle_chat(scientific_name: str, message: str) -> dict:
    """
    Main chat handler.
    Detects intent from message, fetches species data, builds response.
    """
    data = get_species_summary(scientific_name)
    if not data:
        return {
            "response": f"Sorry, I don't have data for **{scientific_name}** yet.",
            "intent": "unknown"
        }

    intent = detect_intent(message)
    response = build_response(intent, data)

    return {
        "response":         response,
        "intent":           intent,
        "scientific_name":  scientific_name,
    }
