-- ═══════════════════════════════════════════════════════════════
-- AUTO PM SCHEMA — Timelines, Action Items, AI Chat
-- Run in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 타임라인 (프로젝트 마일스톤) ───────────────────────────────
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

-- ── 액션 아이템 (별도 테이블) ──────────────────────────────────
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

-- ── AI 채팅 세션 ──────────────────────────────────────────────
CREATE TABLE pm_ai_chat_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES pm_orgs(id) ON DELETE CASCADE,
  project_id  UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  title       TEXT DEFAULT 'New Chat',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ── AI 채팅 메시지 ────────────────────────────────────────────
CREATE TABLE pm_ai_chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES pm_ai_chat_sessions(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── pm_meetings 확장 (트랜스크립트 + AI 처리 결과) ─────────────
ALTER TABLE pm_meetings
  ADD COLUMN IF NOT EXISTS transcript    TEXT,
  ADD COLUMN IF NOT EXISTS summary       TEXT,
  ADD COLUMN IF NOT EXISTS key_decisions JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS participants  JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS processed_at  TIMESTAMPTZ;

-- ═══════════════════════════════════════════════════════════════
-- 인덱스
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX idx_pm_timelines_project    ON pm_timelines(project_id);
CREATE INDEX idx_pm_timelines_org        ON pm_timelines(org_id);
CREATE INDEX idx_pm_timelines_date       ON pm_timelines(target_date);
CREATE INDEX idx_pm_timelines_meeting    ON pm_timelines(meeting_id);

CREATE INDEX idx_pm_action_items_project  ON pm_action_items(project_id);
CREATE INDEX idx_pm_action_items_meeting  ON pm_action_items(meeting_id);
CREATE INDEX idx_pm_action_items_org      ON pm_action_items(org_id);
CREATE INDEX idx_pm_action_items_assignee ON pm_action_items(assignee_id);
CREATE INDEX idx_pm_action_items_status   ON pm_action_items(org_id, status);

CREATE INDEX idx_pm_ai_sessions_project  ON pm_ai_chat_sessions(project_id);
CREATE INDEX idx_pm_ai_sessions_user     ON pm_ai_chat_sessions(user_id);
CREATE INDEX idx_pm_ai_messages_session  ON pm_ai_chat_messages(session_id);

-- ═══════════════════════════════════════════════════════════════
-- RLS (Row Level Security)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE pm_timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- pm_timelines: 조직 멤버만
CREATE POLICY "Org members can manage timelines"
  ON pm_timelines FOR ALL
  USING (pm_is_org_member(org_id));

-- pm_action_items: 조직 멤버만
CREATE POLICY "Org members can manage action items"
  ON pm_action_items FOR ALL
  USING (pm_is_org_member(org_id));

-- pm_ai_chat_sessions: 본인 세션만
CREATE POLICY "Users can manage own AI chat sessions"
  ON pm_ai_chat_sessions FOR ALL
  USING (auth.uid() = user_id);

-- pm_ai_chat_messages: 본인 세션의 메시지만
CREATE POLICY "Users can manage own AI chat messages"
  ON pm_ai_chat_messages FOR ALL
  USING (
    session_id IN (
      SELECT id FROM pm_ai_chat_sessions WHERE user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- updated_at 자동 업데이트 트리거
-- ═══════════════════════════════════════════════════════════════

CREATE TRIGGER pm_timelines_updated_at
  BEFORE UPDATE ON pm_timelines
  FOR EACH ROW EXECUTE FUNCTION pm_update_updated_at();

CREATE TRIGGER pm_action_items_updated_at
  BEFORE UPDATE ON pm_action_items
  FOR EACH ROW EXECUTE FUNCTION pm_update_updated_at();

CREATE TRIGGER pm_ai_chat_sessions_updated_at
  BEFORE UPDATE ON pm_ai_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION pm_update_updated_at();
