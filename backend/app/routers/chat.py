import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.supabase_client import get_supabase
from app.services.claude_service import claude_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatInput(BaseModel):
    org_id: str
    project_id: str = ""
    session_id: str = "global"
    question: str


@router.post("")
async def ask_question(data: ChatInput):
    """Send question to Claude CLI. Queries across all projects if project_id is empty."""

    # Call Claude CLI
    try:
        result = await claude_service.chat(data.org_id, data.project_id, data.question)
    except Exception as e:
        logger.error(f"Claude chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    answer = result.get("answer", str(result))

    return {"answer": answer, "confidence": result.get("confidence", "medium")}
