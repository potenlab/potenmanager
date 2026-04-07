# Poten Manager — Auto PM Instructions

## Architecture

- **Frontend**: React + Vite (SPA), Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **AI**: Claude Code CLI via custom skills + agents
- **Database**: Supabase PostgreSQL (accessed via Supabase MCP)
- **Context**: File-based project workspaces (markdown files)

## Database (Supabase via MCP)

Use the `supabase` MCP server to query. All tables are prefixed with `pm_`.

### Auto PM Tables

- `pm_timelines` — id, org_id, project_id, meeting_id, milestone, target_date, priority (high/medium/low), status (pending/in_progress/completed), notes, created_by, created_at, updated_at
- `pm_action_items` — id, org_id, project_id, meeting_id, task, assignee_id, deadline, status (pending/in_progress/completed), linked_task_id, created_by, created_at, updated_at
- `pm_ai_chat_sessions` — id, org_id, project_id, user_id, title, created_at, updated_at
- `pm_ai_chat_messages` — id, session_id, role (user/assistant), content, created_at

### Existing Tables (Reference)

- `pm_orgs` — id, name, slug, logo_url, industry, plan, owner_id
- `pm_org_members` — org_id, user_id, role (owner/admin/member/viewer)
- `pm_projects` — id, name, description, status, color, logo_url, category, owner_id, org_id, member_ids, client_name, budget, start_date, end_date
- `pm_tasks` — id, title, title_ko, description, status, priority, category, emoji, owner_id, org_id, assignee_ids, parent_id, project_id, due_date, estimated_minutes, sort_order
- `pm_meetings` — id, title, description, status, type, date, duration, location, attendee_ids, action_items (legacy JSONB), notes, org_id, created_by, transcript, summary, key_decisions (JSONB), participants (JSONB), processed_at
- `pm_chat_rooms` — id, type (dm/group), name, participant_ids, org_id
- `pm_chat_messages` — id, room_id, sender_id, content
- `profiles` — id, full_name, nickname, email, avatar_url, job_title

### Common Queries

```sql
-- Get project with meeting count
SELECT p.*, COUNT(m.id) as meeting_count
FROM pm_projects p
LEFT JOIN pm_meetings m ON m.org_id = p.org_id
WHERE p.org_id = '<org_id>'
GROUP BY p.id;

-- Get pending action items for a project
SELECT ai.*, p.full_name as assignee_name
FROM pm_action_items ai
LEFT JOIN profiles p ON p.id = ai.assignee_id
WHERE ai.project_id = '<project_id>' AND ai.org_id = '<org_id>'
  AND ai.status = 'pending'
ORDER BY ai.deadline;

-- Get timeline for a project
SELECT * FROM pm_timelines
WHERE project_id = '<project_id>' AND org_id = '<org_id>'
ORDER BY target_date;

-- Get team members
SELECT om.user_id, om.role, p.full_name, p.email, p.job_title
FROM pm_org_members om
JOIN profiles p ON p.id = om.user_id
WHERE om.org_id = '<org_id>';
```

## Project Workspaces

Each project has a workspace directory at `data/projects/{org_id}/{project_id}/`:

```
data/projects/{org_id}/{project_id}/
├── CONTEXT.md              # Project overview (auto-updated after each meeting)
├── meetings/
│   └── {date}_{type}.md    # Individual meeting files
├── summaries/
│   └── all_meetings.md     # Rolling summary of all meetings
├── action_items.md         # Current action items (synced from DB)
└── timeline.md             # Project milestones (synced from DB)
```

### Rules for Workspace Files

- `CONTEXT.md` is the primary context file — always read this first when answering questions
- `summaries/all_meetings.md` contains a rolling summary — read this for broad project context
- Individual meeting files in `meetings/` contain full detail — only read when a specific meeting is referenced
- `action_items.md` and `timeline.md` are synced from Supabase — the DB is the source of truth
- Always update workspace files after processing a new meeting

## Output Formats

When processing meetings, always return strict JSON:

### Summary Output
```json
{
  "summary": "string",
  "key_decisions": ["string"],
  "participants": ["string"],
  "meeting_type": "kickoff|progress|review|planning|brainstorm|external|other"
}
```

### Timeline Output
```json
{
  "milestones": [
    {"milestone": "string", "target_date": "YYYY-MM-DD", "priority": "high|medium|low", "notes": "string"}
  ]
}
```

### Actions Output
```json
{
  "actions": [
    {"task": "string", "assignee": "string", "deadline": "YYYY-MM-DD", "status": "pending"}
  ]
}
```

### Chat Output
```json
{
  "answer": "string",
  "confidence": "high|medium|low"
}
```
