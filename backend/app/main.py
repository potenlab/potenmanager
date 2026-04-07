import os
import logging
import threading
import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.routers import meetings, chat, settings as settings_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

# ── Discord bot runner (background thread) ──

_discord_thread: threading.Thread | None = None


def _run_discord_bot():
    """Run the Discord bot in a separate thread with its own event loop."""
    token = os.getenv("DISCORD_BOT_TOKEN", "")
    if not token or token == "<YOUR_DISCORD_BOT_TOKEN>":
        logger.info("Discord bot: No token configured, skipping.")
        return

    try:
        import discord
        from discord import Intents
        import httpx

        intents = Intents.default()
        intents.message_content = True
        client = discord.Client(intents=intents)

        auto_pm_api = os.getenv("AUTO_PM_API", "http://localhost:8000")
        default_org_id = os.getenv("DEFAULT_ORG_ID", "00000000-0000-0000-0000-000000000001")
        bot_prefix = os.getenv("BOT_PREFIX", "!pm")

        @client.event
        async def on_ready():
            logger.info(f"Discord bot online: {client.user} (prefix: {bot_prefix})")

        @client.event
        async def on_message(message):
            if message.author == client.user:
                return

            content = message.content.strip()
            question = None

            if content.lower().startswith(bot_prefix):
                question = content[len(bot_prefix):].strip()
            elif client.user and client.user.mentioned_in(message) and not message.mention_everyone:
                question = content
                for m in message.mentions:
                    question = question.replace(f'<@{m.id}>', '').replace(f'<@!{m.id}>', '')
                question = question.strip()

            if question is None:
                return

            if not question:
                await message.reply(
                    f"**Poten Auto PM Bot**\n\n"
                    f"Usage: `{bot_prefix} <question>`\n\n"
                    f"Examples:\n"
                    f"- `{bot_prefix} What are the pending action items?`\n"
                    f"- `{bot_prefix} Summarize the latest meetings`\n"
                    f"- `{bot_prefix} 최근 회의 요약해줘`"
                )
                return

            async with message.channel.typing():
                try:
                    async with httpx.AsyncClient(timeout=120) as http:
                        res = await http.post(f"{auto_pm_api}/api/chat", json={
                            "org_id": default_org_id,
                            "project_id": "",
                            "session_id": "discord",
                            "question": question,
                        })
                        answer = res.json().get("answer", "No answer.") if res.status_code == 200 else f"API error ({res.status_code})"
                except Exception as e:
                    answer = f"Error: {e}"

            # Discord 2000 char limit
            if len(answer) <= 2000:
                await message.reply(answer)
            else:
                for i in range(0, len(answer), 1900):
                    chunk = answer[i:i+1900]
                    if i == 0:
                        await message.reply(chunk)
                    else:
                        await message.channel.send(chunk)

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(client.start(token))
    except Exception as e:
        logger.error(f"Discord bot failed: {e}")


# ── App lifespan ──

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _discord_thread
    # Start Discord bot in background thread
    _discord_thread = threading.Thread(target=_run_discord_bot, daemon=True)
    _discord_thread.start()
    logger.info("App started (Discord bot launching in background)")
    yield
    logger.info("App shutting down")


app = FastAPI(
    title="Poten Manager — Auto PM Backend",
    description="Local proxy that calls Claude CLI for meeting processing and AI chat",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(meetings.router)
app.include_router(chat.router)
app.include_router(settings_router.router)


@app.get("/health")
def health_check():
    bot_token = os.getenv("DISCORD_BOT_TOKEN", "")
    bot_active = bool(bot_token and bot_token != "<YOUR_DISCORD_BOT_TOKEN>" and _discord_thread and _discord_thread.is_alive())
    return {
        "status": "ok",
        "service": "poten-auto-pm",
        "discord_bot": "online" if bot_active else "offline",
    }
