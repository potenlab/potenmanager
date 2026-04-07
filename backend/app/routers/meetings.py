import logging
import json
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.supabase_client import get_supabase
from app.services.claude_service import claude_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/meetings", tags=["meetings"])


class ProcessTranscriptInput(BaseModel):
    org_id: str
    project_id: str
    meeting_id: str
    transcript: str


class ProcessingResult(BaseModel):
    meeting_id: str
    status: str
    title: Optional[str] = None
    summary: Optional[str] = None
    key_decisions: list = []
    participants: list = []
    milestones_count: int = 0
    actions_count: int = 0
    message: str = ""


async def _process_in_background(org_id: str, project_id: str, meeting_id: str, transcript: str):
    """Background task: call Claude CLI to process the transcript."""
    sb = get_supabase()

    try:
        # Set status to processing
        sb.table("pm_meetings").update({
            "transcript": transcript,
            "status": "processing",
        }).eq("id", meeting_id).execute()

        logger.info(f"Starting Claude processing for meeting {meeting_id}")

        # Call Claude CLI — returns pure JSON with extracted data
        result = await claude_service.process_meeting(org_id, project_id, transcript)

        logger.info(f"Claude result keys: {list(result.keys())}")

        # ── 1. Update meeting record with summary, decisions, participants, notes ──
        summary = result.get("summary", "")
        key_decisions = result.get("key_decisions", [])
        participants = result.get("participants", [])

        # Build description/notes from the extracted data
        notes_parts = []
        if summary:
            notes_parts.append(f"## Summary\n{summary}")
        if key_decisions:
            notes_parts.append("## Key Decisions\n" + "\n".join(f"- {d}" for d in key_decisions))
        if participants:
            notes_parts.append("## Participants\n" + ", ".join(participants))
        meeting_notes = "\n\n".join(notes_parts)

        update_data = {
            "status": "completed",
            "processed_at": datetime.utcnow().isoformat(),
            "transcript": transcript,
            "summary": summary,
            "description": meeting_notes,
            "notes": meeting_notes,
            "key_decisions": key_decisions if isinstance(key_decisions, list) else [],
            "participants": participants if isinstance(participants, list) else [],
        }
        if result.get("title"):
            update_data["title"] = result["title"]
        if result.get("meeting_type"):
            update_data["type"] = result["meeting_type"]

        sb.table("pm_meetings").update(update_data).eq("id", meeting_id).execute()
        logger.info(f"Meeting {meeting_id} updated with summary + notes")

        # ── 2. Save timelines to pm_timelines ──
        milestones = result.get("milestones", [])
        milestones_saved = 0
        if isinstance(milestones, list):
            for m in milestones:
                if not m.get("milestone"):
                    continue
                try:
                    sb.table("pm_timelines").insert({
                        "org_id": org_id,
                        "project_id": project_id,
                        "meeting_id": meeting_id,
                        "milestone": m["milestone"],
                        "target_date": m.get("target_date", datetime.utcnow().strftime("%Y-%m-%d")),
                        "priority": m.get("priority", "medium"),
                        "status": "pending",
                        "notes": m.get("notes", ""),
                    }).execute()
                    milestones_saved += 1
                except Exception as e:
                    logger.warning(f"Failed to insert milestone '{m.get('milestone')}': {e}")

        logger.info(f"Saved {milestones_saved} milestones for meeting {meeting_id}")

        # ── 3. Save action items to pm_action_items ──
        actions = result.get("actions", [])
        actions_saved = 0
        if isinstance(actions, list):
            for a in actions:
                if not a.get("task"):
                    continue
                try:
                    sb.table("pm_action_items").insert({
                        "org_id": org_id,
                        "project_id": project_id,
                        "meeting_id": meeting_id,
                        "task": a["task"],
                        "deadline": a.get("deadline") or None,
                        "status": "pending",
                    }).execute()
                    actions_saved += 1
                except Exception as e:
                    logger.warning(f"Failed to insert action '{a.get('task')}': {e}")

        logger.info(f"Saved {actions_saved} action items for meeting {meeting_id}")
        logger.info(f"Meeting {meeting_id} fully processed: {milestones_saved} milestones, {actions_saved} actions")

    except Exception as e:
        logger.error(f"Failed to process meeting {meeting_id}: {e}", exc_info=True)
        try:
            sb.table("pm_meetings").update({
                "status": "failed",
            }).eq("id", meeting_id).execute()
        except Exception:
            pass


@router.post("/process", response_model=ProcessingResult)
async def process_transcript(data: ProcessTranscriptInput, background_tasks: BackgroundTasks):
    """Receive transcript, save to Supabase, process with Claude in background."""
    sb = get_supabase()

    # Save transcript immediately
    sb.table("pm_meetings").update({
        "transcript": data.transcript,
        "status": "processing",
    }).eq("id", data.meeting_id).execute()

    # Create workspace directory
    workspace = settings.projects_dir / data.org_id / data.project_id
    workspace.mkdir(parents=True, exist_ok=True)
    (workspace / "meetings").mkdir(exist_ok=True)
    (workspace / "summaries").mkdir(exist_ok=True)

    # Process in background
    background_tasks.add_task(
        _process_in_background,
        data.org_id, data.project_id, data.meeting_id, data.transcript,
    )

    return ProcessingResult(
        meeting_id=data.meeting_id,
        status="processing",
        message="Transcript received. Claude is processing in background.",
    )


@router.get("/{meeting_id}/status")
def get_processing_status(meeting_id: str):
    """Poll processing status."""
    sb = get_supabase()
    result = sb.table("pm_meetings").select(
        "id, status, title, summary, key_decisions, participants, processed_at"
    ).eq("id", meeting_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Meeting not found")

    m = result.data[0]

    # Also count extracted data
    timelines = sb.table("pm_timelines").select("id", count="exact").eq("meeting_id", meeting_id).execute()
    actions = sb.table("pm_action_items").select("id", count="exact").eq("meeting_id", meeting_id).execute()

    return {
        "meeting_id": m["id"],
        "status": m["status"],
        "title": m.get("title"),
        "summary": m.get("summary"),
        "key_decisions": m.get("key_decisions", []),
        "participants": m.get("participants", []),
        "processed_at": m.get("processed_at"),
        "milestones_count": len(timelines.data) if timelines.data else 0,
        "actions_count": len(actions.data) if actions.data else 0,
    }
