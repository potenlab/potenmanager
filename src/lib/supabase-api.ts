/**
 * Poten Manager API Layer — Direct Supabase CRUD (pm_* tables)
 *
 * No Edge Function needed for basic CRUD — RLS handles auth.
 * Edge Function only for: AI calls, OG metadata fetch, file upload.
 */

import { supabase } from "../app/context/AuthContext";

// ─── Types ──────────────────────────────────────────────────────

export interface PmOrg {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  industry?: string;
  plan: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface PmOrgMember {
  org_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export interface PmTask {
  id: string;
  title: string;
  title_ko?: string;
  description?: string;
  status: string;
  priority?: string;
  category?: string;
  emoji?: string;
  owner_id: string;
  org_id?: string | null;
  assignee_ids: string[];
  parent_id?: string | null;
  project_id?: string | null;
  due_date?: string | null;
  estimated_minutes?: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PmProject {
  id: string;
  name: string;
  description?: string;
  status: string;
  color?: string;
  logo_url?: string;
  category?: string;
  owner_id: string;
  org_id?: string | null;
  member_ids: string[];
  client_name?: string;
  budget?: number;
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PmLibraryItem {
  id: string;
  title: string;
  description?: string;
  type: string;
  url?: string;
  category?: string;
  visibility: string;
  og_metadata?: Record<string, any>;
  owner_id: string;
  org_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PmMeeting {
  id: string;
  title: string;
  description?: string;
  status: string;
  type: string;
  date?: string;
  duration?: number;
  location?: string;
  attendee_ids: string[];
  action_items: any[];
  org_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Helper ─────────────────────────────────────────────────────

function getUserId(): string {
  const user = supabase.auth.getUser;
  // Sync access via session
  const session = (supabase as any).auth.session?.();
  return session?.user?.id || "";
}

async function getUid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || "";
}

// ─── Orgs ───────────────────────────────────────────────────────

export const pmApi = {
  // ── Auth helper ──
  getUser: () => supabase.auth.getUser().then(({ data }) => data.user),

  // ── Orgs ──
  async getMyOrgs(): Promise<{ org: PmOrg; role: string }[]> {
    const uid = await getUid();
    const { data, error } = await supabase
      .from("pm_org_members")
      .select("org_id, role, pm_orgs(*)")
      .eq("user_id", uid);
    if (error) throw error;
    return (data || []).map((row: any) => ({
      org: row.pm_orgs as PmOrg,
      role: row.role,
    }));
  },

  async createOrg(org: Partial<PmOrg>): Promise<PmOrg> {
    const uid = await getUid();
    const { data, error } = await supabase
      .from("pm_orgs")
      .insert({ ...org, owner_id: uid })
      .select()
      .single();
    if (error) throw error;
    // Auto-add owner as member
    await supabase.from("pm_org_members").insert({
      org_id: data.id,
      user_id: uid,
      role: "owner",
    });
    return data;
  },

  async updateOrg(id: string, updates: Partial<PmOrg>): Promise<PmOrg> {
    const { data, error } = await supabase
      .from("pm_orgs")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── Org Members ──
  async getOrgMembers(orgId: string): Promise<(PmOrgMember & { profile: any })[]> {
    const { data, error } = await supabase
      .from("pm_org_members")
      .select("*, profiles(*)")
      .eq("org_id", orgId);
    if (error) throw error;
    return (data || []).map((row: any) => ({
      ...row,
      profile: row.profiles,
    }));
  },

  async addOrgMember(orgId: string, userId: string, role = "member") {
    const { error } = await supabase
      .from("pm_org_members")
      .insert({ org_id: orgId, user_id: userId, role });
    if (error) throw error;
  },

  async removeOrgMember(orgId: string, userId: string) {
    const { error } = await supabase
      .from("pm_org_members")
      .delete()
      .eq("org_id", orgId)
      .eq("user_id", userId);
    if (error) throw error;
  },

  // ── Tasks ──
  async getTasks(orgId?: string | null): Promise<PmTask[]> {
    const uid = await getUid();
    let query = supabase.from("pm_tasks").select("*");
    if (orgId) {
      query = query.eq("org_id", orgId);
    } else {
      query = query.eq("owner_id", uid).is("org_id", null);
    }
    const { data, error } = await query.order("sort_order").order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createTask(task: Partial<PmTask>): Promise<PmTask> {
    const uid = await getUid();
    const { data, error } = await supabase
      .from("pm_tasks")
      .insert({ ...task, owner_id: uid })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateTask(id: string, updates: Partial<PmTask>): Promise<PmTask> {
    const { data, error } = await supabase
      .from("pm_tasks")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteTask(id: string) {
    const { error } = await supabase.from("pm_tasks").delete().eq("id", id);
    if (error) throw error;
  },

  // ── Projects ──
  async getProjects(orgId?: string | null): Promise<PmProject[]> {
    const uid = await getUid();
    let query = supabase.from("pm_projects").select("*");
    if (orgId) {
      query = query.eq("org_id", orgId);
    } else {
      query = query.eq("owner_id", uid).is("org_id", null);
    }
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createProject(project: Partial<PmProject>): Promise<PmProject> {
    const uid = await getUid();
    const { data, error } = await supabase
      .from("pm_projects")
      .insert({ ...project, owner_id: uid })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateProject(id: string, updates: Partial<PmProject>): Promise<PmProject> {
    const { data, error } = await supabase
      .from("pm_projects")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteProject(id: string) {
    const { error } = await supabase.from("pm_projects").delete().eq("id", id);
    if (error) throw error;
  },

  // ── Library ──
  async getLibrary(orgId?: string | null): Promise<PmLibraryItem[]> {
    const uid = await getUid();
    let query = supabase.from("pm_library").select("*");
    if (orgId) {
      query = query.eq("org_id", orgId);
    } else {
      query = query.eq("owner_id", uid).is("org_id", null);
    }
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createLibraryItem(item: Partial<PmLibraryItem>): Promise<PmLibraryItem> {
    const uid = await getUid();
    const { data, error } = await supabase
      .from("pm_library")
      .insert({ ...item, owner_id: uid })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateLibraryItem(id: string, updates: Partial<PmLibraryItem>): Promise<PmLibraryItem> {
    const { data, error } = await supabase
      .from("pm_library")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteLibraryItem(id: string) {
    const { error } = await supabase.from("pm_library").delete().eq("id", id);
    if (error) throw error;
  },

  // ── Meetings (org only) ──
  async getMeetings(orgId: string): Promise<PmMeeting[]> {
    const { data, error } = await supabase
      .from("pm_meetings")
      .select("*")
      .eq("org_id", orgId)
      .order("date", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createMeeting(meeting: Partial<PmMeeting>): Promise<PmMeeting> {
    const uid = await getUid();
    const { data, error } = await supabase
      .from("pm_meetings")
      .insert({ ...meeting, created_by: uid })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateMeeting(id: string, updates: Partial<PmMeeting>): Promise<PmMeeting> {
    const { data, error } = await supabase
      .from("pm_meetings")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteMeeting(id: string) {
    const { error } = await supabase.from("pm_meetings").delete().eq("id", id);
    if (error) throw error;
  },

  // ── Biz Radar (org only) ──
  async getRadarItems(orgId: string) {
    const { data, error } = await supabase
      .from("pm_biz_radar")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createRadarItem(item: Partial<any>) {
    const uid = await getUid();
    const { data, error } = await supabase
      .from("pm_biz_radar")
      .insert({ ...item, created_by: uid })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateRadarItem(id: string, updates: Partial<any>) {
    const { data, error } = await supabase
      .from("pm_biz_radar")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteRadarItem(id: string) {
    const { error } = await supabase.from("pm_biz_radar").delete().eq("id", id);
    if (error) throw error;
  },

  // ── Brands (org only) ──
  async getBrands(orgId: string) {
    const { data, error } = await supabase
      .from("pm_brands")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createBrand(brand: Partial<any>) {
    const uid = await getUid();
    const { data, error } = await supabase
      .from("pm_brands")
      .insert({ ...brand, created_by: uid })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateBrand(id: string, updates: Partial<any>) {
    const { data, error } = await supabase
      .from("pm_brands")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteBrand(id: string) {
    const { error } = await supabase.from("pm_brands").delete().eq("id", id);
    if (error) throw error;
  },

  // ── Activity Logs ──
  async getLogs(entityType: string, entityId: string) {
    const { data, error } = await supabase
      .from("pm_activity_logs")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createLog(log: { entity_type: string; entity_id: string; action: string; changes?: any }) {
    const uid = await getUid();
    const { error } = await supabase
      .from("pm_activity_logs")
      .insert({ ...log, actor_id: uid });
    if (error) throw error;
  },

  // ── Sub Pages ──
  async getSubPage(id: string) {
    const { data, error } = await supabase
      .from("pm_sub_pages")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async createSubPage(page: Partial<any>) {
    const uid = await getUid();
    const { data, error } = await supabase
      .from("pm_sub_pages")
      .insert({ ...page, owner_id: uid })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateSubPage(id: string, updates: Partial<any>) {
    const { data, error } = await supabase
      .from("pm_sub_pages")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── Shares ──
  async createShare(share: { type: string; item_id: string; org_id?: string }) {
    const uid = await getUid();
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const { data, error } = await supabase
      .from("pm_shares")
      .insert({ ...share, token, created_by: uid })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getShareByToken(token: string) {
    const { data, error } = await supabase
      .from("pm_shares")
      .select("*")
      .eq("token", token)
      .single();
    if (error) throw error;
    return data;
  },

  // ── Files ──
  async getFiles(parentType: string, parentId: string) {
    const { data, error } = await supabase
      .from("pm_files")
      .select("*")
      .eq("parent_type", parentType)
      .eq("parent_id", parentId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createFile(file: Partial<any>) {
    const uid = await getUid();
    const { data, error } = await supabase
      .from("pm_files")
      .insert({ ...file, uploaded_by: uid })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteFile(id: string) {
    const { error } = await supabase.from("pm_files").delete().eq("id", id);
    if (error) throw error;
  },

  // ── Chat (org only) ──
  async getChatRooms(orgId: string) {
    const { data, error } = await supabase
      .from("pm_chat_rooms")
      .select("*")
      .eq("org_id", orgId);
    if (error) throw error;
    return data || [];
  },

  async createChatRoom(room: Partial<any>) {
    const { data, error } = await supabase
      .from("pm_chat_rooms")
      .insert(room)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getChatMessages(roomId: string) {
    const { data, error } = await supabase
      .from("pm_chat_messages")
      .select("*, profiles(*)")
      .eq("room_id", roomId)
      .order("created_at");
    if (error) throw error;
    return data || [];
  },

  async sendChatMessage(roomId: string, content: string) {
    const uid = await getUid();
    const { data, error } = await supabase
      .from("pm_chat_messages")
      .insert({ room_id: roomId, sender_id: uid, content })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── Kanban ──
  async getKanbanColumns(boardType: string, orgId?: string) {
    let query = supabase
      .from("pm_kanban_columns")
      .select("*")
      .eq("board_type", boardType);
    if (orgId) query = query.eq("org_id", orgId);
    const { data, error } = await query.order("sort_order");
    if (error) throw error;
    return data || [];
  },

  async getKanbanCards(columnId: string) {
    const { data, error } = await supabase
      .from("pm_kanban_cards")
      .select("*")
      .eq("column_id", columnId)
      .order("sort_order");
    if (error) throw error;
    return data || [];
  },
};
