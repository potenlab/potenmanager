-- ═══════════════════════════════════════════════════════════════
-- pm_categories: 카테고리 (접근 권한 그룹 + 도구 모음)
-- 예: "A부서" → 멤버 3명 → 재무관리, 고객관리 도구 할당
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pm_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  org_id      UUID NOT NULL REFERENCES pm_orgs(id) ON DELETE CASCADE,
  member_ids  UUID[] DEFAULT '{}',
  tool_ids    TEXT[] DEFAULT '{}',
  created_by  UUID NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_categories_org ON pm_categories(org_id);

ALTER TABLE pm_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members access categories" ON pm_categories
  FOR ALL USING (pm_is_org_member(org_id));

CREATE TRIGGER pm_categories_updated_at BEFORE UPDATE ON pm_categories
  FOR EACH ROW EXECUTE FUNCTION pm_update_updated_at();
