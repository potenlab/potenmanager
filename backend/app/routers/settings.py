import os
import logging
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/settings", tags=["settings"])


class DiscordConfig(BaseModel):
    token: str
    prefix: str = "!pm"
    org_id: str = ""


@router.post("/discord")
def save_discord_config(data: DiscordConfig):
    """Save Discord bot config to .env file."""
    env_path = Path(__file__).parent.parent.parent / ".env"

    if not env_path.exists():
        return {"error": ".env file not found"}

    lines = env_path.read_text().splitlines()
    updated = {}

    for key, value in [
        ("DISCORD_BOT_TOKEN", data.token),
        ("BOT_PREFIX", data.prefix),
        ("DEFAULT_ORG_ID", data.org_id),
    ]:
        found = False
        for i, line in enumerate(lines):
            if line.startswith(f"{key}="):
                lines[i] = f"{key}={value}"
                found = True
                break
        if not found:
            lines.append(f"{key}={value}")
        updated[key] = value

    env_path.write_text("\n".join(lines) + "\n")
    logger.info(f"Discord config saved: prefix={data.prefix}, org_id={data.org_id}")

    return {"success": True, "updated": list(updated.keys())}


@router.get("/discord")
def get_discord_config():
    """Get current Discord bot config (token masked)."""
    token = os.getenv("DISCORD_BOT_TOKEN", "")
    return {
        "has_token": bool(token and token != "<YOUR_DISCORD_BOT_TOKEN>"),
        "token_preview": f"{token[:8]}...{token[-4:]}" if len(token) > 12 else "",
        "prefix": os.getenv("BOT_PREFIX", "!pm"),
        "org_id": os.getenv("DEFAULT_ORG_ID", ""),
    }
