# Auto PM — Implementation Plan

> Automated Project Management powered by Claude Code CLI
> Extracts meeting insights, manages timelines & action items, enables AI Q&A per project

---

## 1. Overview

Integrate the Auto PM demo (`demo/project-automation/`) into the main Poten Manager app.
Claude Code CLI processes meeting transcripts locally, extracts structured data, and populates the existing Supabase database — making milestones, action items, and summaries appear on the calendar and project pages automatically.

### What Changes

| Area | Before | After |
|------|--------|-------|
| Meetings | Manual notes, inline action items (JSONB) | Transcript processing, AI-extracted summary, decisions, participants |
| Action Items | Inline JSONB in `pm_meetings` | Separate `pm_action_items` table with deadlines, assignees, project links |
| Timeline | Does not exist | New `pm_timelines` table with milestones per project |
| Calendar | Shows tasks + meetings | Shows tasks + meetings + milestones + action item deadlines |
| Project Detail | Overview only | + Timeline tab + AI Chat tab |
| AI Chat | Team chat only (person-to-person) | + Project-scoped AI Q&A (Claude answers from meeting context) |

---

## 2. Claude Code Skills & Agents (Move from Demo)

The demo has 4 skills + 1 agent in `demo/project-automation/.claude/`. These move to the **project root** `.claude/` directory, adapted for Supabase (`pm_*` tables) and Supabase MCP.

### 2.1 Directory Structure (Root `.claude/`)

```
.claude/
├── settings.local.json                    # Permissions for MCP + file access
├── skills/
│   ├── save-meeting/
│   │   └── SKILL.md                       # Process transcript → extract → save to Supabase
│   ├── chat-project/
│   │   └── SKILL.md                       # AI Q&A about project meetings
│   ├── project-status/
│   │   └── SKILL.md                       # Project dashboard (stats, overdue, upcoming)
│   └── project-actions/
│       └── SKILL.md                       # List/manage action items
└── agents/
    └── update-context/
        └── SKILL.md                       # Background agent: refresh CONTEXT.md + rolling summary
```

### 2.2 Skill: `/save-meeting`

**Source:** `demo/project-automation/.claude/skills/save-meeting/SKILL.md`
**Changes for main project:**

| Demo (PostgreSQL) | Main Project (Supabase) |
|-------------------|------------------------|
| `projects` table | `pm_projects` table |
| `meetings` table | `pm_meetings` table (+ new columns: `transcript`, `summary`, `key_decisions`, `participants`, `processed_at`) |
| `action_items` table | `pm_action_items` table (NEW) |
| `timelines` table | `pm_timelines` table (NEW) |
| `mcp__postgres__query` tool | `mcp__supabase__query` tool |
| `data/projects/{project_id}/` | `data/projects/{org_id}/{project_id}/` |
| No org_id concept | All INSERTs include `org_id` |
| `assignee` (text name) | `assignee_id` (UUID → match team members) |

**Skill definition:**
```yaml
---
name: save-meeting
description: Process a meeting transcript — summarize, extract timeline and action items, save to Supabase and workspace files.
argument-hint: <org_id> <project_id> <transcript_file_or_text>
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, mcp__supabase__query
user-invocable: true
---
```

**Steps (adapted):**
1. Query `pm_projects` by project_id
2. Read transcript (file or raw text)
3. Extract summary JSON (title, summary, key_decisions, participants, meeting_type, meeting_date)
4. Extract timeline milestones (milestone, target_date, priority, notes)
5. Extract action items (task, assignee name → resolve to `assignee_id` via `pm_org_members` + `profiles`, deadline)
6. INSERT into `pm_meetings` (with org_id), `pm_timelines` (with org_id), `pm_action_items` (with org_id)
7. Write workspace files to `data/projects/{org_id}/{project_id}/`
8. Trigger `update-context` agent
9. Report results

### 2.3 Skill: `/chat-project`

**Source:** `demo/project-automation/.claude/skills/chat-project/SKILL.md`
**Changes:**

```yaml
---
name: chat-project
description: Chat about a project's meetings, decisions, action items, and timeline. Answers developer questions using project context files and Supabase database.
argument-hint: <org_id> <project_id> <question>
allowed-tools: Read, Glob, Grep, mcp__supabase__query
user-invocable: true
---
```

**SQL changes:** All queries use `pm_*` tables with `org_id` filtering:
```sql
-- Demo
SELECT * FROM action_items WHERE project_id = $1;
-- Main project
SELECT * FROM pm_action_items WHERE project_id = $1 AND org_id = $2;
```

### 2.4 Skill: `/project-status`

**Source:** `demo/project-automation/.claude/skills/project-status/SKILL.md`
**Changes:**

```yaml
---
name: project-status
description: Show a project dashboard — meeting count, pending actions, timeline progress, latest activity.
argument-hint: <org_id> <project_id>
allowed-tools: Read, Glob, mcp__supabase__query
user-invocable: true
---
```

**SQL changes:** All queries target `pm_meetings`, `pm_action_items`, `pm_timelines` with `org_id`.

### 2.5 Skill: `/project-actions`

**Source:** `demo/project-automation/.claude/skills/project-actions/SKILL.md`
**Changes:**

```yaml
---
name: project-actions
description: List and manage action items for a project. Show pending tasks, update status, filter by assignee or deadline.
argument-hint: <org_id> <project_id> [assignee|status|update <action_id> <new_status>]
allowed-tools: Read, Write, Edit, mcp__supabase__query
user-invocable: true
---
```

**Key difference:** Assignee lookup joins `profiles` table instead of plain text:
```sql
SELECT ai.*, p.full_name as assignee_name
FROM pm_action_items ai
LEFT JOIN profiles p ON p.id = ai.assignee_id
WHERE ai.project_id = $1 AND ai.org_id = $2
ORDER BY ai.deadline;
```

### 2.6 Agent: `update-context` (Background)

**Source:** `demo/project-automation/.claude/agents/update-context/SKILL.md`
**Changes:**

```yaml
---
name: update-context
description: Background agent that updates project CONTEXT.md and rolling summary after new meetings are processed.
user-invocable: false
allowed-tools: Read, Write, Edit, Glob, mcp__supabase__query
context: fork
---
```

**SQL changes:** All queries target `pm_meetings`, `pm_action_items`, `pm_timelines` with `org_id`.
**Path changes:** Workspace at `data/projects/{org_id}/{project_id}/`.

### 2.7 Permissions: `.claude/settings.local.json`

```json
{
  "permissions": {
    "allow": [
      "WebFetch(domain:raw.githubusercontent.com)",
      "WebFetch(domain:github.com)",
      "mcp__supabase__query",
      "Read",
      "Write",
      "Edit",
      "Glob",
      "Grep",
      "Bash"
    ]
  }
}
```

---

## 3. MCP Configuration

### 3.1 Replace PostgreSQL MCP with Supabase MCP

**Demo used:**
```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres",
               "postgresql://localhost:5432/meeting_chatbot"]
    }
  }
}
```

**Main project uses Supabase MCP:**

### `.mcp.json` (project root — NEW)

```json
{
  "mcpServers": {
    "supabase": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "supabase-mcp-server@latest",
        "--supabase-url", "${SUPABASE_URL}",
        "--supabase-key", "${SUPABASE_SERVICE_ROLE_KEY}"
      ],
      "env": {
        "SUPABASE_URL": "${SUPABASE_URL}",
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}"
      }
    }
  }
}
```

### Key Differences from Demo

| Demo (PostgreSQL MCP) | Main Project (Supabase MCP) |
|----------------------|----------------------------|
| `mcp__postgres__query` tool | `mcp__supabase__query` tool |
| Direct PostgreSQL connection | Supabase Management API + direct DB access |
| `postgresql://localhost:5432/meeting_chatbot` | Supabase project URL + service role key |
| No auth context | RLS policies respected (service role bypasses for skills) |
| Single database | Shared Supabase project with existing `pm_*` tables |

### 3.2 Environment Variables Needed

```bash
# Add to .env or shell environment
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Service role key (bypasses RLS for Claude skills)
```

> **Security note:** Service role key is used by Claude CLI locally only.
> The frontend still uses the anon key with RLS.

---

## 4. CLAUDE.md (Project Root — NEW)

Create a `CLAUDE.md` at project root with Supabase-adapted instructions:

```markdown
# Poten Manager — Auto PM Instructions

## Architecture
- **Frontend**: React + Vite (SPA)
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **AI**: Claude Code CLI via custom skills + agents
- **Database**: Supabase PostgreSQL (accessed via Supabase MCP)
- **Context**: File-based project workspaces (markdown files)

## Database (Supabase via MCP)

Use the `supabase` MCP server to query. All tables are prefixed with `pm_`.

### Auto PM Tables

- `pm_meetings` — id, org_id, title, date, duration, type, status, attendee_ids,
  notes, action_items (legacy JSONB), transcript, summary, key_decisions (JSONB),
  participants (JSONB), processed_at
- `pm_timelines` — id, org_id, project_id, meeting_id, milestone, target_date,
  priority, status, notes
- `pm_action_items` — id, org_id, project_id, meeting_id, task, assignee_id,
  deadline, status, linked_task_id
- `pm_ai_chat_sessions` — id, org_id, project_id, user_id, title
- `pm_ai_chat_messages` — id, session_id, role, content

### Existing Tables (Reference)

- `pm_orgs` — organizations
- `pm_org_members` — org memberships (user_id, role)
- `pm_projects` — projects (name, status, member_ids, start_date, end_date)
- `pm_tasks` — tasks (title, status, priority, category, assignee_ids, due_date)
- `profiles` — user profiles (full_name, email, avatar_url, job_title)

### Common Queries

SELECT p.*, COUNT(m.id) as meeting_count
FROM pm_projects p LEFT JOIN pm_meetings m ON m.org_id = p.org_id
WHERE p.org_id = $1 GROUP BY p.id;

SELECT * FROM pm_action_items WHERE project_id = $1 AND org_id = $2
  AND status = 'pending' ORDER BY deadline;

SELECT * FROM pm_timelines WHERE project_id = $1 AND org_id = $2
  ORDER BY target_date;

-- Resolve assignee name
SELECT ai.*, p.full_name as assignee_name
FROM pm_action_items ai LEFT JOIN profiles p ON p.id = ai.assignee_id
WHERE ai.project_id = $1;

## Project Workspaces

data/projects/{org_id}/{project_id}/
├── CONTEXT.md
├── meetings/{date}_{type}.md
├── summaries/all_meetings.md
├── action_items.md
└── timeline.md

### Rules
- CONTEXT.md is primary context — always read first
- all_meetings.md is rolling summary — read for broad context
- Individual meeting files — only when specific meeting referenced
- action_items.md and timeline.md synced from DB (DB is source of truth)

## Output Formats (JSON)

### Summary: { summary, key_decisions[], participants[], meeting_type }
### Timeline: { milestones: [{ milestone, target_date, priority, notes }] }
### Actions: { actions: [{ task, assignee, deadline, status }] }
### Chat: { answer, confidence: high|medium|low }
```

---

## 5. Database Changes (Supabase Migration)

### 5.1 New Table: `pm_timelines`

```sql
CREATE TABLE pm_timelines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES pm_orgs(id) ON DELETE CASCADE,
  project_id  UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
  meeting_id  UUID REFERENCES pm_meetings(id) ON DELETE SET NULL,
  milestone   TEXT NOT NULL,
  target_date DATE NOT NULL,
  priority    TEXT NOT NULL DEFAULT 'medium'
              CHECK (priority IN ('high', 'medium', 'low')),
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'in_progress', 'completed')),
  notes       TEXT,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pm_timelines_project ON pm_timelines(project_id);
CREATE INDEX idx_pm_timelines_org     ON pm_timelines(org_id);
CREATE INDEX idx_pm_timelines_date    ON pm_timelines(target_date);

ALTER TABLE pm_timelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage timelines"
  ON pm_timelines FOR ALL
  USING (pm_is_org_member(org_id));

CREATE TRIGGER set_pm_timelines_updated
  BEFORE UPDATE ON pm_timelines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 5.2 New Table: `pm_action_items`

```sql
CREATE TABLE pm_action_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES pm_orgs(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES pm_projects(id) ON DELETE SET NULL,
  meeting_id      UUID REFERENCES pm_meetings(id) ON DELETE SET NULL,
  task            TEXT NOT NULL,
  assignee_id     UUID REFERENCES auth.users(id),
  deadline        DATE,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'in_progress', 'completed')),
  linked_task_id  UUID REFERENCES pm_tasks(id) ON DELETE SET NULL,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pm_action_items_project  ON pm_action_items(project_id);
CREATE INDEX idx_pm_action_items_meeting  ON pm_action_items(meeting_id);
CREATE INDEX idx_pm_action_items_org      ON pm_action_items(org_id);
CREATE INDEX idx_pm_action_items_assignee ON pm_action_items(assignee_id);

ALTER TABLE pm_action_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage action items"
  ON pm_action_items FOR ALL
  USING (pm_is_org_member(org_id));

CREATE TRIGGER set_pm_action_items_updated
  BEFORE UPDATE ON pm_action_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 5.3 New Table: `pm_ai_chat_sessions`

```sql
CREATE TABLE pm_ai_chat_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES pm_orgs(id) ON DELETE CASCADE,
  project_id  UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  title       TEXT DEFAULT 'New Chat',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pm_ai_chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own AI chat sessions"
  ON pm_ai_chat_sessions FOR ALL
  USING (auth.uid() = user_id);

CREATE TRIGGER set_pm_ai_chat_sessions_updated
  BEFORE UPDATE ON pm_ai_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 5.4 New Table: `pm_ai_chat_messages`

```sql
CREATE TABLE pm_ai_chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES pm_ai_chat_sessions(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pm_ai_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own AI chat messages"
  ON pm_ai_chat_messages FOR ALL
  USING (
    session_id IN (
      SELECT id FROM pm_ai_chat_sessions WHERE user_id = auth.uid()
    )
  );
```

### 5.5 Alter Existing: `pm_meetings`

```sql
ALTER TABLE pm_meetings
  ADD COLUMN IF NOT EXISTS transcript    TEXT,
  ADD COLUMN IF NOT EXISTS summary       TEXT,
  ADD COLUMN IF NOT EXISTS key_decisions JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS participants  JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS processed_at  TIMESTAMPTZ;
```

> **Note:** `pm_meetings` already has `type` and `action_items` (JSONB) columns.
> Keep `action_items` JSONB for backward compatibility.
> New AI-extracted action items go into `pm_action_items` table.

---

## 6. Project Workspace (File-Based Context)

Each project gets a local workspace for Claude to read/write:

```
data/projects/{org_id}/{project_id}/
├── CONTEXT.md              # Auto-updated project overview
├── meetings/
│   ├── 2026-03-15_kickoff.md
│   └── 2026-03-22_progress.md
├── summaries/
│   └── all_meetings.md     # Rolling summary (re-generated after each meeting)
├── action_items.md          # Current action items (synced from DB)
└── timeline.md              # Current milestones (synced from DB)
```

### Rules

- Claude reads `CONTEXT.md` + `all_meetings.md` for project overview
- Individual meeting files only read when a specific meeting is referenced
- After processing a new meeting, Claude updates `all_meetings.md` rolling summary
- `action_items.md` and `timeline.md` are synced bidirectionally (DB is source of truth)
- `data/` directory is gitignored (local workspace only)

---

## 7. Frontend Changes

### 7.1 New: Timeline Tab in `ProjectDetailPage`

Add a "Timeline" tab to the existing project detail page.

**Component:** `ProjectTimeline.tsx`
- Vertical timeline view (like demo)
- Milestones sorted by `target_date` ascending
- Status colors: pending (gray), in_progress (blue), completed (green)
- Click to toggle status cycle
- Priority badges (high/medium/low)
- Add milestone manually (inline form)
- Link to source meeting if `meeting_id` exists

### 7.2 New: AI Chat Tab in `ProjectDetailPage`

Add an "AI Chat" tab for project-scoped Claude Q&A.

**Component:** `ProjectAIChat.tsx`
- Chat interface with message history
- Session sidebar (multiple conversations)
- Sends question to local proxy → Claude CLI → response
- Auto-saves messages to `pm_ai_chat_sessions` / `pm_ai_chat_messages`
- Suggested questions: "What are the pending action items?", "Summarize last meeting", etc.

### 7.3 Update: `CalendarView.tsx`

Add milestones and action item deadlines to the calendar.

**New data sources:**
- `pm_timelines` → render as diamond/milestone markers on `target_date`
- `pm_action_items` (with deadline) → render as small bars on `deadline` date

**Visual distinction:**
- Tasks: existing colored bars
- Meetings: existing meeting bars
- Milestones: diamond icon + milestone name (new color: purple/violet)
- Action items: smaller bars with checkbox icon (new color: orange)

**New filter toggles:**
- Show/hide milestones
- Show/hide action items

### 7.4 Update: `MeetingDetailPage.tsx`

Add transcript processing UI:

- "Upload Transcript" button (paste text or upload audio)
- Processing status indicator (idle → processing → done)
- After processing: show AI-extracted summary, decisions, participants
- Extracted action items auto-populate `pm_action_items` table
- Extracted milestones auto-populate `pm_timelines` table
- Link to view extracted items on calendar

### 7.5 New: Context Provider `TimelineContext.tsx`

```typescript
interface TimelineMilestone {
  id: string;
  orgId: string;
  projectId: string;
  meetingId?: string;
  milestone: string;
  targetDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface TimelineContextType {
  milestones: TimelineMilestone[];
  isLoading: boolean;
  addMilestone: (m: Omit<TimelineMilestone, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateMilestone: (id: string, updates: Partial<TimelineMilestone>) => Promise<void>;
  removeMilestone: (id: string) => Promise<void>;
  getMilestonesByProject: (projectId: string) => TimelineMilestone[];
}
```

### 7.6 New: Context Provider `ActionItemContext.tsx`

```typescript
interface ActionItemRecord {
  id: string;
  orgId: string;
  projectId?: string;
  meetingId?: string;
  task: string;
  assigneeId?: string;
  deadline?: string;
  status: 'pending' | 'in_progress' | 'completed';
  linkedTaskId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface ActionItemContextType {
  actionItems: ActionItemRecord[];
  isLoading: boolean;
  addActionItem: (item: Omit<ActionItemRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateActionItem: (id: string, updates: Partial<ActionItemRecord>) => Promise<void>;
  removeActionItem: (id: string) => Promise<void>;
  getByProject: (projectId: string) => ActionItemRecord[];
  getByMeeting: (meetingId: string) => ActionItemRecord[];
  convertToTask: (id: string) => Promise<void>;
}
```

---

## 8. API Layer

### 8.1 Supabase API (`src/lib/supabase-api.ts`)

Add to existing `pmApi`:

```typescript
// --- Timelines ---
getTimelines(orgId: string): Promise<TimelineMilestone[]>
getProjectTimelines(projectId: string): Promise<TimelineMilestone[]>
createTimeline(data: CreateTimelinePayload): Promise<TimelineMilestone>
updateTimeline(id: string, updates: Partial<TimelineMilestone>): Promise<void>
deleteTimeline(id: string): Promise<void>

// --- Action Items ---
getActionItems(orgId: string): Promise<ActionItemRecord[]>
getProjectActionItems(projectId: string): Promise<ActionItemRecord[]>
getMeetingActionItems(meetingId: string): Promise<ActionItemRecord[]>
createActionItem(data: CreateActionItemPayload): Promise<ActionItemRecord>
updateActionItem(id: string, updates: Partial<ActionItemRecord>): Promise<void>
deleteActionItem(id: string): Promise<void>

// --- AI Chat ---
getAIChatSessions(projectId: string): Promise<AIChatSession[]>
createAIChatSession(projectId: string): Promise<AIChatSession>
getAIChatMessages(sessionId: string): Promise<AIChatMessage[]>
sendAIChatMessage(sessionId: string, content: string): Promise<AIChatMessage>
```

### 8.2 Claude CLI Integration (Local Proxy)

The frontend calls a local API proxy that invokes Claude CLI:

```
Frontend → localhost:8000/api/auto-pm/process → proxy → claude -p /save-meeting → Supabase MCP
Frontend → localhost:8000/api/auto-pm/chat    → proxy → claude -p /chat-project → Supabase MCP
```

**Proxy server** (lightweight FastAPI or Express):
- Receives request from frontend
- Calls `claude -p` with appropriate skill prompt
- Returns Claude's JSON response
- Saves chat messages to Supabase

---

## 9. Implementation Phases

### Phase 1: Infrastructure — Skills, MCP, Database
1. Move `.claude/` skills + agents from demo to project root (adapted for Supabase)
2. Create `.mcp.json` with Supabase MCP server config
3. Create `CLAUDE.md` at project root with Supabase-adapted instructions
4. Create Supabase migration `002_auto_pm.sql` (new tables + alter `pm_meetings`)
5. Run migration on Supabase
6. Add `data/` to `.gitignore`

### Phase 2: API & Context Providers
7. Add timeline, action item, AI chat API methods to `supabase-api.ts`
8. Add `TimelineMilestone`, `ActionItemRecord` types to `mockData.ts`
9. Create `TimelineContext.tsx` and `ActionItemContext.tsx`
10. Wire contexts into `RootProviders.tsx`

### Phase 3: Timeline Feature
11. Build `ProjectTimeline.tsx` component (vertical timeline view)
12. Add "Timeline" tab to `ProjectDetailPage.tsx`
13. Add milestone markers to `CalendarView.tsx`
14. Manual milestone CRUD (add/edit/delete from UI)

### Phase 4: Action Items Table
15. Build `ProjectActionItems.tsx` component (table view)
16. Add action item deadline bars to `CalendarView.tsx`
17. Migration path: convert inline meeting action items → `pm_action_items` records
18. Update `MeetingDetailPage.tsx` to use new table

### Phase 5: Meeting Processing (Auto PM Core)
19. Set up local proxy server (FastAPI or Express)
20. Test Claude Code skills locally (`/save-meeting`, `/chat-project`, `/project-status`, `/project-actions`)
21. Create project workspace directory structure
22. Build transcript upload UI in `MeetingDetailPage.tsx`
23. Implement processing pipeline: upload → Claude → Supabase + workspace files
24. Auto-populate timelines + action items from extracted data

### Phase 6: AI Chat
25. Build `ProjectAIChat.tsx` component
26. Add "AI Chat" tab to `ProjectDetailPage.tsx`
27. Test `/chat-project` skill with full context reading
28. Session management (create, list, load history)

### Phase 7: Calendar Integration
29. Render milestones on calendar (diamond markers)
30. Render action item deadlines on calendar (mini bars)
31. Add filter toggles for milestones / action items
32. Drag milestones to reschedule (update `target_date`)

---

## 10. File Changes Summary

### New Files
```
.claude/settings.local.json                          # MCP + file access permissions
.claude/skills/save-meeting/SKILL.md                  # Process meeting transcript
.claude/skills/chat-project/SKILL.md                  # AI Q&A about project
.claude/skills/project-status/SKILL.md                # Project dashboard
.claude/skills/project-actions/SKILL.md               # Manage action items
.claude/agents/update-context/SKILL.md                # Background context sync
.mcp.json                                             # Supabase MCP server config
CLAUDE.md                                             # Project instructions for Claude
docs/auto-pm.plan.md                                  # This plan
supabase/migrations/002_auto_pm.sql                   # New tables + alterations
src/app/context/TimelineContext.tsx                    # Timeline state management
src/app/context/ActionItemContext.tsx                  # Action items state management
src/app/components/project/ProjectTimeline.tsx         # Timeline vertical view
src/app/components/project/ProjectAIChat.tsx           # AI chat interface
src/app/components/project/ProjectActionItems.tsx      # Action items table
```

### Modified Files
```
src/lib/supabase-api.ts                    # Add timeline, action item, AI chat API methods
src/lib/mockData.ts                        # Add TimelineMilestone, ActionItemRecord types
src/app/context/RootProviders.tsx           # Wrap with TimelineProvider, ActionItemProvider
src/app/pages/ProjectDetailPage.tsx         # Add Timeline + AI Chat tabs
src/app/pages/MeetingDetailPage.tsx         # Add transcript upload + processing UI
src/app/components/dashboard/CalendarView.tsx  # Add milestone + action item rendering
.gitignore                                  # Add data/ directory
```

---

## 11. Dependencies

### No New Frontend Dependencies
All UI built with existing shadcn/ui + Tailwind + Lucide icons.

### Supabase MCP
```bash
# Installed automatically via npx in .mcp.json
npx supabase-mcp-server@latest
```

### Local Proxy (Phase 5)
- Option A: Python — `fastapi`, `uvicorn` (matches demo)
- Option B: Node — `express` (matches existing JS ecosystem)
- Both just shell out to `claude -p` and return the response

### Claude Code Requirements
- Claude Code CLI installed locally
- Supabase MCP server (`supabase-mcp-server`)
- Environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
