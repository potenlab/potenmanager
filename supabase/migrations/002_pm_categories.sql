-- ═══════════════════════════════════════════════════════════════
-- pm_categories: 카테고리 (접근 권한 그룹 + 도구 모음)
-- 개인 모드: org_id = NULL, created_by = user
-- 조직 모드: org_id = org, created_by = user
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pm_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  org_id      UUID REFERENCES pm_orgs(id) ON DELETE CASCADE,
  member_ids  UUID[] DEFAULT '{}',
  tool_ids    TEXT[] DEFAULT '{}',
  created_by  UUID NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_categories_org ON pm_categories(org_id);

ALTER TABLE pm_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own or org categories" ON pm_categories
  FOR ALL USING (
    (org_id IS NULL AND created_by = auth.uid())
    OR (org_id IS NOT NULL AND pm_is_org_member(org_id))
  );

CREATE TRIGGER pm_categories_updated_at BEFORE UPDATE ON pm_categories
  FOR EACH ROW EXECUTE FUNCTION pm_update_updated_at();
