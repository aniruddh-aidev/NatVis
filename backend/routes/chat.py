"""
WildSense — Chat Routes
/chat  — ask questions about an identified species
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.chat import handle_chat
from services.database import get_connection
from datetime import datetime

router = APIRouter()


class ChatMessage(BaseModel):
    scientific_name: str
    message:         str
    session_id:      str = "default"


@router.post("/")
def chat(msg: ChatMessage):
    """
    Ask a question about a specific species.
    Detects intent and returns structured response.
    """
    if not msg.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    if not msg.scientific_name.strip():
        raise HTTPException(status_code=400, detail="Species name required")

    result = handle_chat(msg.scientific_name, msg.message)

    # save to chat history
    try:
        conn = get_connection()
        conn.execute("""
            INSERT INTO chat_history (session_id, scientific_name, user_message, bot_response, timestamp)
            VALUES (?, ?, ?, ?, ?)
        """, (
            msg.session_id,
            msg.scientific_name,
            msg.message,
            result["response"],
            datetime.now().isoformat()
        ))
        conn.commit()
        conn.close()
    except Exception:
        pass  # don't fail chat if history save fails

    return result


@router.get("/history/{session_id}")
def get_history(session_id: str, limit: int = 20):
    """Get chat history for a session."""
    conn = get_connection()
    rows = conn.execute("""
        SELECT scientific_name, user_message, bot_response, timestamp
        FROM chat_history
        WHERE session_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
    """, (session_id, limit)).fetchall()
    conn.close()

    return {
        "session_id": session_id,
        "history": [dict(r) for r in rows]
    }
