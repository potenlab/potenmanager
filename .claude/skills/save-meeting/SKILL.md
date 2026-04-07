---
name: save-meeting
description: Process a meeting transcript or audio file — transcribe, summarize, extract timeline and action items, save everything to Supabase and project workspace files. Use when a PM uploads a new meeting or provides a transcript.
argument-hint: <org_id> <project_id> <transcript_file_or_text>
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, mcp__supabase__query
user-invocable: true
---

# Save Meeting

You are processing a new meeting for a project. Follow these steps exactly.

## Input

- `$ARGUMENTS` contains: org ID, project ID, and either a file path to a transcript/audio or raw transcript text
- Parse the first argument as `org_id`, second as `project_id`, everything after is the transcript source

## Step 1: Get Project Info

Query Supabase to get the project details:

```sql
SELECT * FROM pm_projects WHERE id = '<project_id>' AND org_id = '<org_id>';
```

If the project doesn't exist, tell the user and stop.

## Step 2: Get the Transcript

- If a file path was provided, read it
- If raw text was provided, use it directly
- If an audio file (.mp3, .wav, .m4a) was provided, note that transcription needs to happen first (tell the user — STT integration is handled by the backend)

## Step 3: Extract Summary

Analyze the transcript and produce a JSON summary:

```json
{
  "title": "Brief meeting title",
  "summary": "2-3 paragraph summary of what was discussed",
  "key_decisions": ["Decision 1", "Decision 2"],
  "participants": ["Name 1", "Name 2"],
  "meeting_type": "kickoff|progress|review|planning|brainstorm|external|other",
  "meeting_date": "YYYY-MM-DD"
}
```

## Step 4: Extract Timeline/Milestones

From the transcript, extract any milestones or deadlines mentioned:

```json
{
  "milestones": [
    {
      "milestone": "Milestone name",
      "target_date": "YYYY-MM-DD",
      "priority": "high|medium|low",
      "notes": "Additional context"
    }
  ]
}
```

If no milestones are mentioned, return an empty array.

## Step 5: Extract Action Items

From the transcript, extract tasks assigned to people:

```json
{
  "actions": [
    {
      "task": "What needs to be done",
      "assignee": "Person responsible",
      "deadline": "YYYY-MM-DD",
      "status": "pending"
    }
  ]
}
```

If no action items are found, return an empty array.

## Step 6: Resolve Assignees

For each action item assignee name, try to match to a team member:

```sql
SELECT om.user_id, p.full_name, p.email
FROM pm_org_members om
JOIN profiles p ON p.id = om.user_id
WHERE om.org_id = '<org_id>'
AND (p.full_name ILIKE '%<assignee_name>%' OR p.email ILIKE '%<assignee_name>%');
```

Use the matched `user_id` as `assignee_id`. If no match found, leave `assignee_id` as NULL.

## Step 7: Save to Supabase

Insert the meeting record:

```sql
INSERT INTO pm_meetings (org_id, title, description, date, type, status, transcript, summary, key_decisions, participants, processed_at, created_by, created_at)
VALUES ('<org_id>', '<title>', '<summary>', '<meeting_date>', '<meeting_type>', 'completed', '<transcript>', '<summary>', '<key_decisions_json>', '<participants_json>', NOW(), '<created_by>', NOW())
RETURNING id;
```

Insert timeline milestones (for each milestone):

```sql
INSERT INTO pm_timelines (org_id, project_id, meeting_id, milestone, target_date, priority, status, notes, created_at)
VALUES ('<org_id>', '<project_id>', '<meeting_id>', '<milestone>', '<target_date>', '<priority>', 'pending', '<notes>', NOW());
```

Insert action items (for each action):

```sql
INSERT INTO pm_action_items (org_id, project_id, meeting_id, task, assignee_id, deadline, status, created_at)
VALUES ('<org_id>', '<project_id>', '<meeting_id>', '<task>', '<assignee_id>', '<deadline>', 'pending', NOW());
```

## Step 8: Save to Workspace Files

Use workspace path: `data/projects/<org_id>/<project_id>/`.

### Create meeting file

Write to `data/projects/<org_id>/<project_id>/meetings/<meeting_date>_<meeting_type>.md`:

```markdown
# <title>

**Date**: <meeting_date>
**Type**: <meeting_type>
**Participants**: <comma-separated names>

## Summary

<summary text>

## Key Decisions

- <decision 1>
- <decision 2>

## Action Items

| Task | Assignee | Deadline | Status |
|------|----------|----------|--------|
| <task> | <assignee> | <deadline> | pending |

## Milestones

| Milestone | Target Date | Priority |
|-----------|-------------|----------|
| <milestone> | <date> | <priority> |

## Raw Transcript

<full transcript text>
```

### Update action_items.md

Read all pending action items from Supabase for this project and overwrite `data/projects/<org_id>/<project_id>/action_items.md`:

```sql
SELECT ai.*, p.full_name as assignee_name
FROM pm_action_items ai
LEFT JOIN profiles p ON p.id = ai.assignee_id
WHERE ai.project_id = '<project_id>' AND ai.org_id = '<org_id>' AND ai.status != 'completed'
ORDER BY ai.deadline;
```

### Update timeline.md

Read all timeline entries from Supabase for this project and overwrite `data/projects/<org_id>/<project_id>/timeline.md`:

```sql
SELECT * FROM pm_timelines WHERE project_id = '<project_id>' AND org_id = '<org_id>' ORDER BY target_date;
```

## Step 9: Trigger Context Update

After saving everything, invoke the update-context agent to refresh `CONTEXT.md` and the rolling summary. Do this by:

1. Reading the existing `CONTEXT.md` and `summaries/all_meetings.md`
2. Incorporating the new meeting's summary
3. Rewriting both files with updated content

## Step 10: Report

Show the user a summary of what was saved:
- Meeting title and date
- Number of key decisions found
- Number of action items created
- Number of milestones added
- Confirmation that workspace files were updated
