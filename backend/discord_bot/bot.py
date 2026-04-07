"""
Poten Manager — Discord Bot
Answers questions about projects, meetings, timelines, and action items
by calling the Auto PM backend API.

Usage:
  1. Create a Discord bot at https://discord.com/developers/applications
  2. Enable MESSAGE CONTENT INTENT in Bot settings
  3. Add bot to your server with permissions: Send Messages, Read Messages
  4. Set DISCORD_BOT_TOKEN in backend/.env
  5. Run: python -m discord_bot.bot
"""

import os
import sys
import logging
import asyncio
import httpx
import discord
from discord import Intents
from dotenv import load_dotenv

# Load env from parent directory (backend/.env)
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(name)s] %(levelname)s: %(message)s')
logger = logging.getLogger("discord-bot")

# Config
DISCORD_TOKEN = os.getenv("DISCORD_BOT_TOKEN", "")
AUTO_PM_API = os.getenv("AUTO_PM_API", "http://localhost:8000")
DEFAULT_ORG_ID = os.getenv("DEFAULT_ORG_ID", "00000000-0000-0000-0000-000000000001")
BOT_PREFIX = os.getenv("BOT_PREFIX", "!pm")

if not DISCORD_TOKEN:
    print("ERROR: DISCORD_BOT_TOKEN not set in backend/.env")
    print("Get one from: https://discord.com/developers/applications")
    sys.exit(1)

# Discord client
intents = Intents.default()
intents.message_content = True
client = discord.Client(intents=intents)


async def ask_auto_pm(question: str, org_id: str = "", project_id: str = "") -> str:
    """Call the Auto PM backend to answer a question."""
    try:
        async with httpx.AsyncClient(timeout=120) as http:
            res = await http.post(f"{AUTO_PM_API}/api/chat", json={
                "org_id": org_id or DEFAULT_ORG_ID,
                "project_id": project_id,
                "session_id": "discord",
                "question": question,
            })
            if res.status_code == 200:
                data = res.json()
                return data.get("answer", "No answer returned.")
            else:
                logger.error(f"API error {res.status_code}: {res.text}")
                return f"API error ({res.status_code}). Make sure the backend is running at {AUTO_PM_API}"
    except httpx.ConnectError:
        return (
            "Cannot connect to Auto PM backend.\n"
            f"Make sure it's running: `cd backend && uvicorn app.main:app --port 8000`"
        )
    except Exception as e:
        logger.error(f"Error calling API: {e}")
        return f"Error: {str(e)}"


@client.event
async def on_ready():
    logger.info(f"Bot logged in as {client.user} (ID: {client.user.id})")
    logger.info(f"API: {AUTO_PM_API} | Org: {DEFAULT_ORG_ID} | Prefix: {BOT_PREFIX}")
    logger.info(f"Invite URL: https://discord.com/api/oauth2/authorize?client_id={client.user.id}&permissions=2048&scope=bot")


@client.event
async def on_message(message: discord.Message):
    # Ignore own messages
    if message.author == client.user:
        return

    content = message.content.strip()

    # Respond to !pm <question>
    if content.lower().startswith(BOT_PREFIX):
        question = content[len(BOT_PREFIX):].strip()

        if not question:
            help_text = (
                "**Poten Auto PM Bot**\n\n"
                "Ask me anything about your projects!\n\n"
                "**Usage:** `!pm <question>`\n\n"
                "**Examples:**\n"
                "- `!pm What are the pending action items?`\n"
                "- `!pm Summarize the latest meetings`\n"
                "- `!pm What milestones are coming up?`\n"
                "- `!pm Show overdue tasks`\n"
                "- `!pm Who is responsible for the website redesign?`\n"
                "- `!pm 최근 회의 요약해줘`\n"
                "- `!pm 대기 중인 액션 아이템은?`\n"
            )
            await message.reply(help_text)
            return

        # Show typing indicator while processing
        async with message.channel.typing():
            answer = await ask_auto_pm(question)

        # Discord has a 2000 char limit per message
        if len(answer) <= 2000:
            await message.reply(answer)
        else:
            # Split long messages
            chunks = [answer[i:i+1900] for i in range(0, len(answer), 1900)]
            for i, chunk in enumerate(chunks):
                if i == 0:
                    await message.reply(chunk)
                else:
                    await message.channel.send(chunk)

    # Also respond to @mentions
    elif client.user and client.user.mentioned_in(message) and not message.mention_everyone:
        # Remove the mention from the message
        question = message.content
        for mention in message.mentions:
            question = question.replace(f'<@{mention.id}>', '').replace(f'<@!{mention.id}>', '')
        question = question.strip()

        if not question:
            await message.reply("Ask me anything about your projects! Example: `@bot What are the pending action items?`")
            return

        async with message.channel.typing():
            answer = await ask_auto_pm(question)

        if len(answer) <= 2000:
            await message.reply(answer)
        else:
            chunks = [answer[i:i+1900] for i in range(0, len(answer), 1900)]
            for i, chunk in enumerate(chunks):
                if i == 0:
                    await message.reply(chunk)
                else:
                    await message.channel.send(chunk)


def main():
    logger.info("Starting Discord bot...")
    client.run(DISCORD_TOKEN)


if __name__ == "__main__":
    main()
