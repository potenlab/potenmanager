-- ═══════════════════════════════════════════════════════════════
-- POTEN MANAGER (pm_) SCHEMA
-- Run in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 조직 ────────────────────────────────────────────────────────
CREATE TABLE pm_orgs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  logo_url    TEXT,
  industry    TEXT,
  plan        TEXT DEFAULT 'free',
  owner_id    UUID NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pm_org_members (
  org_id      UUID NOT NULL REFERENCES pm_orgs(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member',
  joined_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

-- ── 태스크 (개인 + 조직) ────────────────────────────────────────
CREATE TABLE pm_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  title_ko        TEXT,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  priority        TEXT DEFAULT 'medium',
  category        TEXT,
  emoji           TEXT,
  owner_id        UUID NOT NULL REFERENCES auth.users(id),
  org_id          UUID REFERENCES pm_orgs(id),
  assignee_ids    UUID[] DEFAULT '{}',
  parent_id       UUID REFERENCES pm_tasks(id) ON DELETE SET NULL,
  project_id      UUID,
  due_date        TIMESTAMPTZ,
  estimated_minutes INT,
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 프로젝트 (개인 + 조직) ──────────────────────────────────────
CREATE TABLE pm_projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  status          TEXT DEFAULT 'active',
  color           TEXT,
  logo_url        TEXT,
  category        TEXT,
  owner_id        UUID NOT NULL REFERENCES auth.users(id),
  org_id          UUID REFERENCES pm_orgs(id),
  member_ids      UUID[] DEFAULT '{}',
  client_name     TEXT,
  budget          BIGINT,
  start_date      TIMESTAMPTZ,
  end_date        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 자료실 (개인 + 조직) ────────────────────────────────────────
CREATE TABLE pm_library (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  type            TEXT DEFAULT 'note',
  url             TEXT,
  category        TEXT,
  visibility      TEXT DEFAULT 'private',
  og_metadata     JSONB,
  owner_id        UUID NOT NULL REFERENCES auth.users(id),
  org_id          UUID REFERENCES pm_orgs(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 회의 (조직 전용) ────────────────────────────────────────────
CREATE TABLE pm_meetings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT DEFAULT 'scheduled',
  type            TEXT DEFAULT 'general',
  date            TIMESTAMPTZ,
  duration        INT,
  location        TEXT,
  attendee_ids    UUID[] DEFAULT '{}',
  action_items    JSONB DEFAULT '[]',
  org_id          UUID NOT NULL REFERENCES pm_orgs(id),
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 채팅 (조직 전용) ────────────────────────────────────────────
CREATE TABLE pm_chat_rooms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            TEXT DEFAULT 'dm',
  name            TEXT,
  participant_ids UUID[] DEFAULT '{}',
  org_id          UUID NOT NULL REFERENCES pm_orgs(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pm_chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         UUID NOT NULL REFERENCES pm_chat_rooms(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES auth.users(id),
  content         TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 비즈 레이더 (조직 전용) ─────────────────────────────────────
CREATE TABLE pm_biz_radar (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT,
  stage           TEXT DEFAULT 'discovered',
  type            TEXT,
  value           BIGINT DEFAULT 0,
  probability     INT DEFAULT 50,
  contact_name    TEXT,
  contact_company TEXT,
  assignee_id     UUID,
  action_items    JSONB DEFAULT '[]',
  org_id          UUID NOT NULL REFERENCES pm_orgs(id),
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 브랜딩 (조직 전용) ──────────────────────────────────────────
CREATE TABLE pm_brands (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  platform        TEXT,
  category        TEXT,
  image_url       TEXT,
  org_id          UUID NOT NULL REFERENCES pm_orgs(id),
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 칸반 ────────────────────────────────────────────────────────
CREATE TABLE pm_kanban_columns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_type      TEXT NOT NULL,
  board_id        UUID,
  name            TEXT NOT NULL,
  sort_order      INT DEFAULT 0,
  org_id          UUID REFERENCES pm_orgs(id),
  owner_id        UUID REFERENCES auth.users(id)
);

CREATE TABLE pm_kanban_cards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id       UUID NOT NULL REFERENCES pm_kanban_columns(id) ON DELETE CASCADE,
  title           TEXT,
  description     TEXT,
  sort_order      INT DEFAULT 0,
  linked_id       UUID,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 활동 로그 ───────────────────────────────────────────────────
CREATE TABLE pm_activity_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  action          TEXT NOT NULL,
  changes         JSONB,
  actor_id        UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 서브 페이지 ─────────────────────────────────────────────────
CREATE TABLE pm_sub_pages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT,
  emoji           TEXT,
  content         TEXT,
  parent_type     TEXT,
  parent_id       UUID,
  owner_id        UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 공유 링크 ───────────────────────────────────────────────────
CREATE TABLE pm_shares (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token           TEXT UNIQUE NOT NULL,
  type            TEXT NOT NULL,
  item_id         UUID NOT NULL,
  org_id          UUID REFERENCES pm_orgs(id),
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 파일 ────────────────────────────────────────────────────────
CREATE TABLE pm_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  url             TEXT NOT NULL,
  size            INT,
  mime_type       TEXT,
  parent_type     TEXT,
  parent_id       UUID,
  uploaded_by     UUID REFERENCES auth.users(id),
  org_id          UUID REFERENCES pm_orgs(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- 인덱스
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX idx_pm_tasks_owner       ON pm_tasks(owner_id);
CREATE INDEX idx_pm_tasks_org         ON pm_tasks(org_id);
CREATE INDEX idx_pm_tasks_project     ON pm_tasks(project_id);
CREATE INDEX idx_pm_tasks_status      ON pm_tasks(org_id, status);
CREATE INDEX idx_pm_tasks_parent      ON pm_tasks(parent_id);
CREATE INDEX idx_pm_projects_owner    ON pm_projects(owner_id);
CREATE INDEX idx_pm_projects_org      ON pm_projects(org_id);
CREATE INDEX idx_pm_library_owner     ON pm_library(owner_id);
CREATE INDEX idx_pm_library_org       ON pm_library(org_id);
CREATE INDEX idx_pm_meetings_org      ON pm_meetings(org_id);
CREATE INDEX idx_pm_radar_org         ON pm_biz_radar(org_id);
CREATE INDEX idx_pm_brands_org        ON pm_brands(org_id);
CREATE INDEX idx_pm_activity_entity   ON pm_activity_logs(entity_type, entity_id);
CREATE INDEX idx_pm_chat_msgs_room    ON pm_chat_messages(room_id);
CREATE INDEX idx_pm_files_parent      ON pm_files(parent_type, parent_id);
CREATE INDEX idx_pm_org_members_user  ON pm_org_members(user_id);
CREATE INDEX idx_pm_kanban_cols_board ON pm_kanban_columns(board_type, org_id);
CREATE INDEX idx_pm_kanban_cards_col  ON pm_kanban_cards(column_id);
CREATE INDEX idx_pm_sub_pages_parent  ON pm_sub_pages(parent_type, parent_id);
CREATE INDEX idx_pm_shares_token      ON pm_shares(token);

-- ═══════════════════════════════════════════════════════════════
-- RLS (Row Level Security)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE pm_orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_biz_radar ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_kanban_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_sub_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_files ENABLE ROW LEVEL SECURITY;

-- ── RLS 정책: 조직 멤버이거나 본인 데이터만 접근 ────────────────

-- 헬퍼: 유저가 해당 조직의 멤버인지 확인
CREATE OR REPLACE FUNCTION pm_is_org_member(check_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM pm_org_members
    WHERE org_id = check_org_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- pm_orgs: 멤버만 조회, 오너만 수정
CREATE POLICY "Members can view org" ON pm_orgs
  FOR SELECT USING (pm_is_org_member(id));
CREATE POLICY "Owner can update org" ON pm_orgs
  FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Anyone can create org" ON pm_orgs
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- pm_org_members: 같은 조직 멤버만 조회
CREATE POLICY "Members can view members" ON pm_org_members
  FOR SELECT USING (pm_is_org_member(org_id));
CREATE POLICY "Org owner can manage members" ON pm_org_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM pm_orgs WHERE id = org_id AND owner_id = auth.uid())
  );

-- pm_tasks: 본인 개인 태스크 OR 조직 멤버
CREATE POLICY "Access own or org tasks" ON pm_tasks
  FOR ALL USING (
    owner_id = auth.uid()
    OR (org_id IS NOT NULL AND pm_is_org_member(org_id))
  );

-- pm_projects: 본인 개인 OR 조직 멤버
CREATE POLICY "Access own or org projects" ON pm_projects
  FOR ALL USING (
    owner_id = auth.uid()
    OR (org_id IS NOT NULL AND pm_is_org_member(org_id))
  );

-- pm_library: 본인 OR 조직 멤버 (published만)
CREATE POLICY "Access own or org library" ON pm_library
  FOR ALL USING (
    owner_id = auth.uid()
    OR (org_id IS NOT NULL AND pm_is_org_member(org_id))
  );

-- pm_meetings: 조직 멤버만
CREATE POLICY "Org members access meetings" ON pm_meetings
  FOR ALL USING (pm_is_org_member(org_id));

-- pm_chat_rooms: 조직 멤버만
CREATE POLICY "Org members access chat" ON pm_chat_rooms
  FOR ALL USING (pm_is_org_member(org_id));

-- pm_chat_messages: 채팅방 접근 가능한 유저만
CREATE POLICY "Chat room members access messages" ON pm_chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pm_chat_rooms
      WHERE id = room_id AND pm_is_org_member(org_id)
    )
  );

-- pm_biz_radar: 조직 멤버만
CREATE POLICY "Org members access radar" ON pm_biz_radar
  FOR ALL USING (pm_is_org_member(org_id));

-- pm_brands: 조직 멤버만
CREATE POLICY "Org members access brands" ON pm_brands
  FOR ALL USING (pm_is_org_member(org_id));

-- pm_kanban_*: 본인 OR 조직 멤버
CREATE POLICY "Access own or org kanban cols" ON pm_kanban_columns
  FOR ALL USING (
    owner_id = auth.uid()
    OR (org_id IS NOT NULL AND pm_is_org_member(org_id))
  );
CREATE POLICY "Access kanban cards via column" ON pm_kanban_cards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pm_kanban_columns
      WHERE id = column_id
      AND (owner_id = auth.uid() OR (org_id IS NOT NULL AND pm_is_org_member(org_id)))
    )
  );

-- pm_activity_logs: 인증된 유저
CREATE POLICY "Authenticated users access logs" ON pm_activity_logs
  FOR ALL USING (auth.uid() IS NOT NULL);

-- pm_sub_pages: 본인만
CREATE POLICY "Owner access sub pages" ON pm_sub_pages
  FOR ALL USING (owner_id = auth.uid());

-- pm_shares: 토큰 기반 공개 + 생성자
CREATE POLICY "Creator manages shares" ON pm_shares
  FOR ALL USING (created_by = auth.uid());
CREATE POLICY "Anyone can read shares by token" ON pm_shares
  FOR SELECT USING (true);

-- pm_files: 본인 OR 조직 멤버
CREATE POLICY "Access own or org files" ON pm_files
  FOR ALL USING (
    uploaded_by = auth.uid()
    OR (org_id IS NOT NULL AND pm_is_org_member(org_id))
  );

-- ═══════════════════════════════════════════════════════════════
-- updated_at 자동 업데이트 트리거
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION pm_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pm_tasks_updated_at BEFORE UPDATE ON pm_tasks
  FOR EACH ROW EXECUTE FUNCTION pm_update_updated_at();
CREATE TRIGGER pm_projects_updated_at BEFORE UPDATE ON pm_projects
  FOR EACH ROW EXECUTE FUNCTION pm_update_updated_at();
CREATE TRIGGER pm_library_updated_at BEFORE UPDATE ON pm_library
  FOR EACH ROW EXECUTE FUNCTION pm_update_updated_at();
CREATE TRIGGER pm_meetings_updated_at BEFORE UPDATE ON pm_meetings
  FOR EACH ROW EXECUTE FUNCTION pm_update_updated_at();
CREATE TRIGGER pm_biz_radar_updated_at BEFORE UPDATE ON pm_biz_radar
  FOR EACH ROW EXECUTE FUNCTION pm_update_updated_at();
CREATE TRIGGER pm_brands_updated_at BEFORE UPDATE ON pm_brands
  FOR EACH ROW EXECUTE FUNCTION pm_update_updated_at();
CREATE TRIGGER pm_sub_pages_updated_at BEFORE UPDATE ON pm_sub_pages
  FOR EACH ROW EXECUTE FUNCTION pm_update_updated_at();
