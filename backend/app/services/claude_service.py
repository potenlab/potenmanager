import subprocess
import json
import logging
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)


class ClaudeService:
    """Thin wrapper — calls claude -p and returns the response."""

    async def process_meeting(self, org_id: str, project_id: str, text: str) -> dict:
        """Process meeting text — Claude extracts summary, timeline, actions. Returns JSON only."""
        prompt = (
            f"You are a meeting transcript analyzer. Extract structured data from this transcript.\n"
            f"Do NOT call any tools. Just analyze the text and return pure JSON.\n\n"
            f"Return ONLY this JSON format (no markdown, no explanation, just JSON):\n"
            f'{{\n'
            f'  "title": "Brief meeting title",\n'
            f'  "summary": "2-3 paragraph summary",\n'
            f'  "key_decisions": ["Decision 1", "Decision 2"],\n'
            f'  "participants": ["Name 1 (Role)", "Name 2 (Role)"],\n'
            f'  "meeting_type": "kickoff|progress|review|planning|brainstorm|external|other",\n'
            f'  "meeting_date": "YYYY-MM-DD",\n'
            f'  "milestones": [\n'
            f'    {{"milestone": "Name", "target_date": "YYYY-MM-DD", "priority": "high|medium|low", "notes": "context"}}\n'
            f'  ],\n'
            f'  "actions": [\n'
            f'    {{"task": "What to do", "assignee": "Person name", "deadline": "YYYY-MM-DD"}}\n'
            f'  ]\n'
            f'}}\n\n'
            f"TRANSCRIPT:\n{text}"
        )
        return await self._call(prompt, max_turns=3)

    async def chat(self, org_id: str, project_id: str, question: str) -> dict:
        """Answer a question using meeting data from the database."""
        scope = f"project_id={project_id}" if project_id else "ALL projects"
        project_filter = f"AND project_id = '{project_id}'" if project_id else ""

        prompt = (
            f"You are a PM assistant. Answer questions using the Supabase database.\n"
            f"Organization: org_id={org_id}. Scope: {scope}.\n\n"
            f"Available tables (query via execute_sql tool):\n"
            f"- pm_meetings: id, org_id, title, date, type, status, summary, key_decisions (jsonb), participants (jsonb), notes, transcript\n"
            f"- pm_timelines: id, org_id, project_id, milestone, target_date, priority, status, notes\n"
            f"- pm_action_items: id, org_id, project_id, task, assignee_id, deadline, status\n"
            f"- pm_projects: id, org_id, name, description, status, client_name, start_date, end_date\n"
            f"- profiles: id, full_name, email, job_title\n\n"
            f"Example queries:\n"
            f"SELECT * FROM pm_action_items WHERE org_id='{org_id}' {project_filter} AND status='pending' ORDER BY deadline;\n"
            f"SELECT * FROM pm_timelines WHERE org_id='{org_id}' {project_filter} ORDER BY target_date;\n"
            f"SELECT title, summary, key_decisions, date FROM pm_meetings WHERE org_id='{org_id}' ORDER BY date DESC LIMIT 5;\n"
            f"SELECT p.name, COUNT(ai.id) as action_count FROM pm_projects p LEFT JOIN pm_action_items ai ON ai.project_id=p.id WHERE p.org_id='{org_id}' GROUP BY p.id, p.name;\n\n"
            f"Instructions:\n"
            f"1. Query the database to get the data needed to answer\n"
            f"2. Answer naturally in the user's language\n"
            f"3. Reference specific dates, names, and projects\n"
            f"4. Return JSON: {{\"answer\": \"your answer\", \"confidence\": \"high|medium|low\"}}\n\n"
            f"QUESTION: {question}"
        )
        return await self._call(prompt, max_turns=10)

    async def _call(self, prompt: str, max_turns: int = 10) -> dict:
        """Call claude -p and return parsed JSON response."""
        allowed_tools = "mcp__supabase__execute_sql,Read,Glob,Grep"

        cmd = [
            settings.CLAUDE_CLI_PATH, "-p",
            "--output-format", "json",
            "--max-turns", str(max_turns),
            "--allowedTools", allowed_tools,
        ]

        project_root = str(Path(settings.PROJECT_ROOT).resolve())
        logger.info(f"Calling Claude CLI: cwd={project_root}, max_turns={max_turns}")
        logger.info(f"Allowed tools: {allowed_tools}")

        try:
            result = subprocess.run(
                cmd,
                input=prompt,
                capture_output=True,
                text=True,
                cwd=project_root,
                timeout=300,
            )
        except subprocess.TimeoutExpired:
            logger.error("Claude CLI timed out after 300 seconds")
            raise Exception("Claude CLI timed out after 300 seconds")
        except FileNotFoundError:
            logger.error(f"Claude CLI not found at: {settings.CLAUDE_CLI_PATH}")
            raise Exception(f"Claude CLI not found at: {settings.CLAUDE_CLI_PATH}")

        logger.info(f"Claude CLI exit code: {result.returncode}")
        if result.stderr:
            logger.warning(f"Claude CLI stderr: {result.stderr[:500]}")
        if result.stdout:
            logger.info(f"Claude CLI stdout (first 300): {result.stdout[:300]}")

        if result.returncode != 0:
            logger.error(f"Claude CLI failed: {result.stderr}")
            raise Exception(f"Claude CLI error: {result.stderr[:500]}")

        # Parse output
        try:
            raw = json.loads(result.stdout)
        except json.JSONDecodeError:
            logger.warning("Claude returned non-JSON, treating as plain text answer")
            return {"answer": result.stdout.strip(), "confidence": "medium"}

        # --output-format json wraps in: {"type": "result", "result": "...", ...}
        if isinstance(raw, dict) and "result" in raw:
            text_content = raw["result"].strip()
        elif isinstance(raw, dict) and "answer" in raw:
            return raw
        else:
            return {"answer": str(raw), "confidence": "medium"}

        # Strip markdown code block wrappers
        if text_content.startswith("```"):
            lines = text_content.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            text_content = "\n".join(lines).strip()

        # Try parse as JSON
        try:
            parsed = json.loads(text_content)
            if isinstance(parsed, dict):
                if "answer" in parsed:
                    return {"answer": parsed["answer"], "confidence": parsed.get("confidence", "medium")}
                return parsed
        except (json.JSONDecodeError, TypeError):
            pass

        return {"answer": text_content, "confidence": "medium"}


claude_service = ClaudeService()
