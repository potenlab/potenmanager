/**
 * Migration Script: KV Store → pm_* Tables
 *
 * 1. Create org (포텐랩) in pm_orgs
 * 2. Add members to pm_org_members
 * 3. Migrate tasks → pm_tasks
 * 4. Migrate projects/kanban → pm_projects
 * 5. Migrate library → pm_library
 * 6. Migrate meetings → pm_meetings
 *
 * Run: npx ts-node scripts/migrate-to-pm.ts
 * Or: paste in browser console (fetch-based)
 */

// ── Config ──
const OLD_BASE = "https://dzxjtlwalhhqjcfdiwnv.supabase.co/functions/v1/make-server-f580d5ca";
const OLD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6eGp0bHdhbGhocWpjZmRpd252Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwOTA5OTcsImV4cCI6MjA4NzY2Njk5N30.37E5GNjAdmDAROzFhVy-lppV2FP7Du9vScFDkxS8g_0";
const OLD_ORG_ID = "org-1772368183800-tmnb";

const NEW_URL = "https://slereezbgubofcrqnkip.supabase.co";
const NEW_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsZXJlZXpiZ3Vib2ZjcnFua2lwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk4NzI3MiwiZXhwIjoyMDc3NTYzMjcyfQ.Wgcdilk5A8HLuHJ4VVH_D1RHdoJ2YONFm7CZ0tT_v-M";

// Member UUID mapping: old KV id → new potenlab auth.users UUID
const MEMBER_MAP: Record<string, string> = {
  "311bcdcc-f243-4e1f-a53b-0ec68bf95fd7": "561b84bd-f4a0-4aa7-a017-3ab9645e5b51", // 민썸
  "d41f09c2-6a92-4497-8f35-6f8827019b37": "043fdde3-79a4-4f3c-86a2-1f1938f9f781", // 남대현
  "dd3d9d0d-25e8-4d68-93c8-c2d527e09179": "561b84bd-f4a0-4aa7-a017-3ab9645e5b51", // 서지민 → 민썸 (임시)
  "66fa0534-c121-4822-a453-02161c6713dc": "561b84bd-f4a0-4aa7-a017-3ab9645e5b51", // 안승주 → 민썸 (임시)
};

const OWNER_UUID = "561b84bd-f4a0-4aa7-a017-3ab9645e5b51"; // 민썸 (org owner)

// ── Helpers ──
async function oldFetch(path: string) {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${OLD_BASE}${path}${sep}orgId=${OLD_ORG_ID}`, {
    headers: { Authorization: `Bearer ${OLD_KEY}` },
  });
  return res.json();
}

async function newInsert(table: string, rows: any[]) {
  if (rows.length === 0) return;
  const res = await fetch(`${NEW_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: NEW_SERVICE_KEY,
      Authorization: `Bearer ${NEW_SERVICE_KEY}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`❌ INSERT ${table} failed:`, err);
    throw new Error(err);
  }
  const data = await res.json();
  console.log(`✅ ${table}: ${data.length} rows inserted`);
  return data;
}

function mapUserId(oldId: string | undefined | null): string {
  if (!oldId) return OWNER_UUID;
  return MEMBER_MAP[oldId] || OWNER_UUID;
}

// ── Migration ──
async function migrate() {
  console.log("🚀 Starting migration...\n");

  // 1. Create org
  console.log("1️⃣ Creating org...");
  const orgRows = await newInsert("pm_orgs", [{
    name: "포텐랩",
    slug: "potenlab",
    industry: "dev_agency",
    plan: "free",
    owner_id: OWNER_UUID,
  }]);
  const ORG_ID = orgRows[0].id;
  console.log(`   Org ID: ${ORG_ID}\n`);

  // 2. Add members
  console.log("2️⃣ Adding org members...");
  await newInsert("pm_org_members", [
    { org_id: ORG_ID, user_id: "561b84bd-f4a0-4aa7-a017-3ab9645e5b51", role: "owner" },  // 민썸
    { org_id: ORG_ID, user_id: "043fdde3-79a4-4f3c-86a2-1f1938f9f781", role: "admin" },   // 남대현
  ]);

  // 3. Migrate tasks
  console.log("\n3️⃣ Migrating tasks...");
  const oldTasks = await oldFetch("/tasks");
  console.log(`   Found ${oldTasks.length} tasks`);

  const newTasks = oldTasks.map((t: any) => ({
    title: t.title || "Untitled",
    title_ko: t.titleKo || t.title || null,
    description: t.description || null,
    status: t.status || "pending",
    priority: t.priority || "medium",
    category: t.category || null,
    emoji: t.emoji || null,
    owner_id: mapUserId(t.assigneeId),
    org_id: ORG_ID,
    assignee_ids: (t.assigneeIds || (t.assigneeId ? [t.assigneeId] : []))
      .map((id: string) => mapUserId(id)),
    due_date: t.dueDate || null,
    estimated_minutes: t.estimatedMinutes || null,
    sort_order: t.sortOrder || 0,
    created_at: t.createdAt || new Date().toISOString(),
    updated_at: t.updatedAt || new Date().toISOString(),
  }));

  if (newTasks.length > 0) {
    await newInsert("pm_tasks", newTasks);
  }

  // 4. Migrate library
  console.log("\n4️⃣ Migrating library...");
  const oldLibrary = await oldFetch("/library");
  console.log(`   Found ${oldLibrary.length} library items`);

  const newLibrary = oldLibrary.map((item: any) => ({
    title: item.title || "Untitled",
    description: item.description || null,
    type: item.type || "note",
    url: item.url || null,
    category: item.category || null,
    visibility: item.visibility || "private",
    og_metadata: item.ogMetadata || null,
    owner_id: mapUserId(item.ownerId),
    org_id: ORG_ID,
    created_at: item.createdAt || new Date().toISOString(),
    updated_at: item.updatedAt || new Date().toISOString(),
  }));

  if (newLibrary.length > 0) {
    await newInsert("pm_library", newLibrary);
  }

  // 5. Migrate meetings
  console.log("\n5️⃣ Migrating meetings...");
  const oldMeetings = await oldFetch("/meetings");
  console.log(`   Found ${oldMeetings.length} meetings`);

  const newMeetings = oldMeetings.map((m: any) => ({
    title: m.title || "Untitled",
    description: m.description || m.notes || null,
    status: m.status || "scheduled",
    type: m.type || "general",
    date: m.date || null,
    duration: m.duration || 60,
    location: m.location || null,
    attendee_ids: (m.attendeeIds || []).map((id: string) => mapUserId(id)),
    action_items: m.actionItems || [],
    org_id: ORG_ID,
    created_by: OWNER_UUID,
    created_at: m.createdAt || new Date().toISOString(),
    updated_at: m.updatedAt || new Date().toISOString(),
  }));

  if (newMeetings.length > 0) {
    await newInsert("pm_meetings", newMeetings);
  }

  // 6. Migrate biz radar
  console.log("\n6️⃣ Migrating biz radar...");
  const oldRadar = await oldFetch("/radar");
  console.log(`   Found ${oldRadar.length} radar items`);

  const newRadar = oldRadar.map((r: any) => ({
    title: r.title || "Untitled",
    description: r.description || null,
    category: r.category || null,
    stage: r.stage || "discovered",
    type: r.type || null,
    value: r.value || 0,
    probability: r.probability || 50,
    contact_name: r.contactName || null,
    contact_company: r.contactCompany || null,
    assignee_id: mapUserId(r.assigneeId),
    action_items: r.actionItems || [],
    org_id: ORG_ID,
    created_by: OWNER_UUID,
    created_at: r.createdAt || new Date().toISOString(),
    updated_at: r.updatedAt || new Date().toISOString(),
  }));

  if (newRadar.length > 0) {
    await newInsert("pm_biz_radar", newRadar);
  }

  console.log("\n✅ Migration complete!");
  console.log(`   Org: ${ORG_ID} (포텐랩)`);
  console.log(`   Tasks: ${newTasks.length}`);
  console.log(`   Library: ${newLibrary.length}`);
  console.log(`   Meetings: ${newMeetings.length}`);
  console.log(`   Radar: ${newRadar.length}`);
}

migrate().catch(console.error);
