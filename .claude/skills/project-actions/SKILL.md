---
name: project-actions
description: List and manage action items for a project. Show pending tasks, update status, filter by assignee or deadline. Use when someone wants to check or update action items.
argument-hint: <org_id> <project_id> [assignee|status|update <action_id> <new_status>]
allowed-tools: Read, Write, Edit, mcp__supabase__query
user-invocable: true
---

# Project Actions

Manage action items for a project.

## Input

- First argument: `org_id`
- Second argument: `project_id`
- Optional third argument:
  - No third arg -> show all pending/in_progress action items
  - `assignee <name>` -> filter by assignee
  - `overdue` -> show only overdue items
  - `all` -> show all items including completed
  - `update <action_id> <new_status>` -> update an action item's status

## Commands

### List (default)

```sql
SELECT ai.*, p.full_name as assignee_name, m.title as meeting_title, m.date as meeting_date
FROM pm_action_items ai
LEFT JOIN profiles p ON p.id = ai.assignee_id
LEFT JOIN pm_meetings m ON m.id = ai.meeting_id
WHERE ai.project_id = '<project_id>' AND ai.org_id = '<org_id>'
  AND ai.status IN ('pending', 'in_progress')
ORDER BY ai.deadline;
```

Present as a table:

```
# Action Items — <project_name>

| # | Task | Assignee | Deadline | Status | From Meeting |
|---|------|----------|----------|--------|--------------|
| 1 | ...  | ...      | ...      | ...    | ...          |
```

Flag overdue items with a warning.

### Filter by Assignee

```sql
SELECT ai.*, p.full_name as assignee_name
FROM pm_action_items ai
LEFT JOIN profiles p ON p.id = ai.assignee_id
WHERE ai.project_id = '<project_id>' AND ai.org_id = '<org_id>'
  AND p.full_name ILIKE '%<name>%'
ORDER BY ai.deadline;
```

### Show Overdue

```sql
SELECT ai.*, p.full_name as assignee_name
FROM pm_action_items ai
LEFT JOIN profiles p ON p.id = ai.assignee_id
WHERE ai.project_id = '<project_id>' AND ai.org_id = '<org_id>'
  AND ai.status = 'pending' AND ai.deadline < CURRENT_DATE
ORDER BY ai.deadline;
```

### Update Status

```sql
UPDATE pm_action_items SET status = '<new_status>', updated_at = NOW()
WHERE id = '<action_id>' AND project_id = '<project_id>' AND org_id = '<org_id>';
```

Valid statuses: `pending`, `in_progress`, `completed`

After updating, also sync the workspace file:

1. Query all action items for the project
2. Rewrite `data/projects/<org_id>/<project_id>/action_items.md`

### Show All

```sql
SELECT ai.*, p.full_name as assignee_name, m.title as meeting_title
FROM pm_action_items ai
LEFT JOIN profiles p ON p.id = ai.assignee_id
LEFT JOIN pm_meetings m ON m.id = ai.meeting_id
WHERE ai.project_id = '<project_id>' AND ai.org_id = '<org_id>'
ORDER BY ai.status, ai.deadline;
```

## After Any Update

When an action item status changes:
1. Confirm the update to the user
2. Sync `data/projects/<org_id>/<project_id>/action_items.md` with current DB state
