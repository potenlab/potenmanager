---
name: update-context
description: Background agent that updates project CONTEXT.md and rolling summary after new meetings are processed. Auto-invoked by save-meeting skill.
user-invocable: false
allowed-tools: Read, Write, Edit, Glob, mcp__supabase__query
context: fork
---

# Update Project Context

You are a background agent that keeps project workspace files in sync with the latest meeting data.

## Input

- `$ARGUMENTS` contains: `<org_id> <project_id>`

## Step 1: Gather All Meeting Summaries

```sql
SELECT title, date, type, summary, key_decisions, participants
FROM pm_meetings
WHERE org_id = '<org_id>' AND status = 'completed'
ORDER BY date;
```

Also get the project info:

```sql
SELECT * FROM pm_projects WHERE id = '<project_id>' AND org_id = '<org_id>';
```

## Step 2: Read Existing Context

Read these files (they may not exist yet for new projects):
- `data/projects/<org_id>/<project_id>/CONTEXT.md`
- `data/projects/<org_id>/<project_id>/summaries/all_meetings.md`

## Step 3: Generate Updated CONTEXT.md

Write a project overview that includes:
- Project name and client
- What the project is about (derived from meetings)
- Current phase/status
- Key stakeholders and their roles
- Major decisions made so far
- Current priorities and next steps

Keep it concise — this file is loaded as context for every chat question. Target 200-400 words.

Write to `data/projects/<org_id>/<project_id>/CONTEXT.md`.

## Step 4: Generate Rolling Summary

Create a chronological summary of ALL meetings:
- One section per meeting (date + type as header)
- 3-5 bullet points per meeting highlighting key points
- Decisions and action items called out
- Connections between meetings noted (e.g., "follow-up from kickoff decision about X")

This should be comprehensive but scannable. Target ~100 words per meeting.

Write to `data/projects/<org_id>/<project_id>/summaries/all_meetings.md`.

## Step 5: Sync Action Items File

```sql
SELECT ai.*, p.full_name as assignee_name, m.title as meeting_title, m.date as meeting_date
FROM pm_action_items ai
LEFT JOIN profiles p ON p.id = ai.assignee_id
LEFT JOIN pm_meetings m ON m.id = ai.meeting_id
WHERE ai.project_id = '<project_id>' AND ai.org_id = '<org_id>'
ORDER BY ai.status, ai.deadline;
```

Write to `data/projects/<org_id>/<project_id>/action_items.md` as a markdown table.

## Step 6: Sync Timeline File

```sql
SELECT t.*, m.title as meeting_title
FROM pm_timelines t
LEFT JOIN pm_meetings m ON m.id = t.meeting_id
WHERE t.project_id = '<project_id>' AND t.org_id = '<org_id>'
ORDER BY t.target_date;
```

Write to `data/projects/<org_id>/<project_id>/timeline.md` as a markdown table.
