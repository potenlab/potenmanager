---
name: project-status
description: Show a project dashboard — meeting count, pending actions, timeline progress, latest activity. Use when someone wants a quick overview of a project's current state.
argument-hint: <org_id> <project_id>
allowed-tools: Read, Glob, mcp__supabase__query
user-invocable: true
---

# Project Status

Show a comprehensive status report for a project.

## Input

- First argument: `org_id`
- Second argument: `project_id`
- If no arguments provided, list all projects and ask which one

## Step 1: Get Project Info

```sql
SELECT * FROM pm_projects WHERE id = '<project_id>' AND org_id = '<org_id>';
```

## Step 2: Gather Stats

Run these queries:

```sql
-- Meeting count and latest meeting
SELECT COUNT(*) as total_meetings,
       MAX(date) as latest_meeting_date
FROM pm_meetings WHERE org_id = '<org_id>';

-- Action items breakdown
SELECT status, COUNT(*) as count
FROM pm_action_items WHERE project_id = '<project_id>' AND org_id = '<org_id>'
GROUP BY status;

-- Overdue action items
SELECT ai.task, p.full_name as assignee_name, ai.deadline
FROM pm_action_items ai
LEFT JOIN profiles p ON p.id = ai.assignee_id
WHERE ai.project_id = '<project_id>' AND ai.org_id = '<org_id>'
  AND ai.status = 'pending' AND ai.deadline < CURRENT_DATE
ORDER BY ai.deadline;

-- Timeline progress
SELECT status, COUNT(*) as count
FROM pm_timelines WHERE project_id = '<project_id>' AND org_id = '<org_id>'
GROUP BY status;

-- Upcoming milestones
SELECT milestone, target_date, priority, status
FROM pm_timelines
WHERE project_id = '<project_id>' AND org_id = '<org_id>' AND status != 'completed'
ORDER BY target_date LIMIT 5;
```

## Step 3: Read Context

Read `data/projects/<org_id>/<project_id>/CONTEXT.md` for the project overview.

## Step 4: Present Report

Format the output as a clean dashboard:

```
# Project: <name> (<client_name>)

## Overview
<Brief from CONTEXT.md — 2-3 sentences>

## Meetings
- Total: X meetings
- Latest: YYYY-MM-DD

## Action Items
- Pending: X
- In Progress: X
- Completed: X
- Overdue: X (list them if any)

## Timeline
- Pending: X milestones
- In Progress: X milestones
- Completed: X milestones

### Upcoming Milestones
| Milestone | Target Date | Priority | Status |
|-----------|-------------|----------|--------|
| ...       | ...         | ...      | ...    |

## Overdue Items (if any)
| Task | Assignee | Deadline |
|------|----------|----------|
| ...  | ...      | ...      |
```
