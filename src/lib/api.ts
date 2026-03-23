// ─── Poten Manager API Client (v2 — Direct Supabase) ────────────────
// Replaced Edge Function KV calls with direct pm_* table queries.
// Same interface as before — drop-in replacement for contexts/pages.

import { supabase } from "../app/context/AuthContext";

// Edge Function base (still needed for AI, OG metadata, file upload)
import { projectId, publicAnonKey } from '/utils/supabase/info';
const EDGE_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-f580d5ca`;
const EDGE_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${publicAnonKey}`,
};

// Old Edge Function on the PREVIOUS project (for AI/OG/files that aren't migrated yet)
const OLD_PROJECT_ID = "dzxjtlwalhhqjcfdiwnv";
const OLD_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6eGp0bHdhbGhocWpjZmRpd252Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwOTA5OTcsImV4cCI6MjA4NzY2Njk5N30.37E5GNjAdmDAROzFhVy-lppV2FP7Du9vScFDkxS8g_0";
const OLD_EDGE_BASE = `https://${OLD_PROJECT_ID}.supabase.co/functions/v1/make-server-f580d5ca`;

async function edgeRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${OLD_EDGE_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OLD_ANON_KEY}`, ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.error || res.statusText);
  }
  return res.json();
}

// ─── Helpers ────────────────────────────────────────────────────────

function getActiveOrgId(): string {
  try { return localStorage.getItem('pm_active_org_id') || localStorage.getItem('poten_active_org_id') || ''; } catch { return ''; }
}

async function getUid(): Promise<string> {
  // Try session first (faster), then getUser
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) return session.user.id;
  const { data } = await supabase.auth.getUser();
  return data.user?.id || '';
}

// Convert snake_case DB row → camelCase for frontend compatibility
function toCamel(row: any): any {
  if (!row) return row;
  const out: any = {};
  for (const [k, v] of Object.entries(row)) {
    const camelKey = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camelKey] = v;
  }
  // Parse date strings
  for (const f of ['dueDate', 'startDate', 'endDate', 'createdAt', 'updatedAt', 'date', 'joinedAt']) {
    if (out[f] && typeof out[f] === 'string') out[f] = new Date(out[f]);
  }
  return out;
}

// Convert camelCase frontend data → snake_case for DB
function toSnake(data: any): any {
  if (!data) return data;
  const out: any = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === 'id' || k === 'created_at' || k === 'updated_at') { out[k] = v; continue; }
    const snakeKey = k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    out[snakeKey] = v instanceof Date ? v.toISOString() : v;
  }
  return out;
}

// ─── API Methods (same interface as before) ─────────────────────────
export const api = {
  // Health
  health: async () => ({ status: 'ok' }),

  // ── Tasks ──
  getTasks: async () => {
    const orgId = getActiveOrgId();
    const uid = await getUid();
    if (!uid) return []; // Not logged in yet
    let query = supabase.from('pm_tasks').select('*');
    if (orgId) {
      query = query.eq('org_id', orgId);
    } else {
      query = query.eq('owner_id', uid).is('org_id', null);
    }
    const { data, error } = await query.order('sort_order').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(toCamel);
  },
  createTask: async (task: any) => {
    const uid = await getUid();
    const orgId = getActiveOrgId();
    const row = toSnake(task);
    row.owner_id = uid;
    if (orgId) row.org_id = orgId;
    const { data, error } = await supabase.from('pm_tasks').insert(row).select().single();
    if (error) throw error;
    return toCamel(data);
  },
  updateTask: async (id: string, updates: any) => {
    const row = toSnake(updates);
    delete row.id;
    const { data, error } = await supabase.from('pm_tasks').update(row).eq('id', id).select().single();
    if (error) throw error;
    return toCamel(data);
  },
  deleteTask: async (id: string) => {
    const { error } = await supabase.from('pm_tasks').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  // ── Goals (stored as tasks with category) ──
  getGoals: async () => {
    // Goals aren't migrated to pm_ tables yet - return empty
    return [];
  },
  createGoal: async (goal: any) => goal,
  updateGoal: async (id: string, data: any) => data,
  deleteGoal: async (id: string) => ({ success: true }),

  // ── Activity Logs ──
  getLogs: async (entityId: string) => {
    const { data, error } = await supabase
      .from('pm_activity_logs')
      .select('*')
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(toCamel);
  },
  createLog: async (log: any) => {
    const uid = await getUid();
    const row = toSnake(log);
    row.actor_id = uid;
    const { error } = await supabase.from('pm_activity_logs').insert(row);
    if (error) throw error;
    return { success: true };
  },

  // ── Seed / Init ──
  checkSeeded: async () => ({ seeded: true }),
  seed: async () => ({ success: true }),

  // ── Onboarding ──
  getOnboarding: async (userId: string) => ({ exists: true, data: { completed: true } }),
  saveOnboarding: async (userId: string, data: any) => ({ success: true }),

  // ── Team ──
  getTeamMembers: async () => {
    const orgId = getActiveOrgId();
    if (!orgId) return [];
    const { data, error } = await supabase
      .from('pm_org_members')
      .select('*, profiles(*)')
      .eq('org_id', orgId);
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.user_id,
      name: row.profiles?.full_name || row.profiles?.nickname || 'Unknown',
      email: row.profiles?.email || '',
      avatar: row.profiles?.avatar_url || '',
      role: row.role,
      joinedAt: row.joined_at,
      jobRole: row.profiles?.job_title || '',
      jobTitle: row.profiles?.job_title || '',
    }));
  },
  createTeamMember: async (member: any) => member,
  updateTeamMember: async (id: string, data: any) => data,
  deleteTeamMember: async (id: string) => {
    const orgId = getActiveOrgId();
    if (orgId) {
      await supabase.from('pm_org_members').delete().eq('org_id', orgId).eq('user_id', id);
    }
    return { success: true };
  },

  // ── Profile ──
  getProfile: async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    return {
      phone: data?.phone || '',
      company: data?.company_name || '',
      location: data?.location || '',
      jobTitle: data?.job_title || '',
      jobRole: data?.job_title || '',
    };
  },
  updateProfile: async (userId: string, updates: any) => {
    const row = toSnake(updates);
    await supabase.from('profiles').update(row).eq('id', userId);
    return { success: true };
  },

  // ── Organization ──
  createOrg: async (data: any) => {
    const uid = await getUid();
    const { data: org, error } = await supabase
      .from('pm_orgs')
      .insert({ name: data.name, slug: data.name.toLowerCase().replace(/\s+/g, '-'), owner_id: uid })
      .select().single();
    if (error) throw error;
    await supabase.from('pm_org_members').insert({ org_id: org.id, user_id: uid, role: 'owner' });
    return org;
  },
  getOrg: async (orgId: string) => {
    const { data } = await supabase.from('pm_orgs').select('*').eq('id', orgId).single();
    return data;
  },
  updateOrg: async (orgId: string, updates: any) => {
    await supabase.from('pm_orgs').update(toSnake(updates)).eq('id', orgId);
    return { success: true };
  },
  getUserOrg: async (userId: string) => {
    const { data: memberships } = await supabase
      .from('pm_org_members')
      .select('org_id, role, pm_orgs(*)')
      .eq('user_id', userId);
    if (!memberships || memberships.length === 0) return { org: null, allOrgs: [] };
    const allOrgs = memberships.map((m: any) => ({
      orgId: m.org_id,
      orgName: (m.pm_orgs as any)?.name || '',
      slug: (m.pm_orgs as any)?.slug || '',
      role: m.role,
    }));
    const activeId = getActiveOrgId();
    const active = memberships.find((m: any) => m.org_id === activeId) || memberships[0];
    const org = active ? {
      id: active.org_id,
      name: (active.pm_orgs as any)?.name,
      slug: (active.pm_orgs as any)?.slug,
      ...(active.pm_orgs as any),
    } : null;
    return { org, userRole: active?.role, allOrgs, activeOrgId: active?.org_id };
  },
  switchActiveOrg: async (userId: string, orgId: string) => {
    localStorage.setItem('pm_active_org_id', orgId);
    localStorage.setItem('poten_active_org_id', orgId);
    const { data } = await supabase.from('pm_orgs').select('*').eq('id', orgId).single();
    return { org: data, userRole: 'member' };
  },

  // ── Invite System (simplified) ──
  generateInvite: async (orgId: string, data: any) => ({ code: Math.random().toString(36).slice(2, 8).toUpperCase(), orgId }),
  lookupInvite: async (code: string) => null,
  joinViaInvite: async (code: string, data: any) => ({ success: true }),
  directJoin: async (code: string, data: any) => ({ success: true }),
  getJoinRequests: async (orgId: string) => [],
  processJoinRequest: async (orgId: string, userId: string, action: string) => ({ success: true }),
  getOrgInvites: async (orgId: string) => [],

  // ── Brand Assets ──
  getBrandAssets: async () => {
    const orgId = getActiveOrgId();
    if (!orgId) return [];
    const { data, error } = await supabase.from('pm_brands').select('*').eq('org_id', orgId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(toCamel);
  },
  createBrandAsset: async (asset: any) => {
    const uid = await getUid();
    const orgId = getActiveOrgId();
    const row = toSnake(asset);
    row.created_by = uid;
    row.org_id = orgId;
    const { data, error } = await supabase.from('pm_brands').insert(row).select().single();
    if (error) throw error;
    return toCamel(data);
  },
  updateBrandAsset: async (id: string, updates: any) => {
    const { data, error } = await supabase.from('pm_brands').update(toSnake(updates)).eq('id', id).select().single();
    if (error) throw error;
    return toCamel(data);
  },
  deleteBrandAsset: async (id: string) => {
    await supabase.from('pm_brands').delete().eq('id', id);
    return { success: true };
  },

  // ── Sub Pages ──
  getSubPages: async () => {
    const uid = await getUid();
    const { data } = await supabase.from('pm_sub_pages').select('*').eq('owner_id', uid);
    return (data || []).map(toCamel);
  },
  createSubPage: async (page: any) => {
    const uid = await getUid();
    const row = toSnake(page);
    row.owner_id = uid;
    const { data, error } = await supabase.from('pm_sub_pages').insert(row).select().single();
    if (error) throw error;
    return toCamel(data);
  },
  updateSubPage: async (id: string, updates: any) => {
    const { data, error } = await supabase.from('pm_sub_pages').update(toSnake(updates)).eq('id', id).select().single();
    if (error) throw error;
    return toCamel(data);
  },
  deleteSubPage: async (id: string) => {
    await supabase.from('pm_sub_pages').delete().eq('id', id);
    return { success: true };
  },

  // ── Projects & Kanban ──
  getProjects: async () => {
    const orgId = getActiveOrgId();
    const uid = await getUid();
    if (!uid) return [];
    let query = supabase.from('pm_projects').select('*');
    if (orgId) query = query.eq('org_id', orgId);
    else query = query.eq('owner_id', uid).is('org_id', null);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(toCamel);
  },
  getProject: async (id: string) => {
    const { data } = await supabase.from('pm_projects').select('*').eq('id', id).single();
    return data ? toCamel(data) : null;
  },
  createProject: async (project: any) => {
    const uid = await getUid();
    const orgId = getActiveOrgId();
    const row = toSnake(project);
    row.owner_id = uid;
    if (orgId) row.org_id = orgId;
    const { data, error } = await supabase.from('pm_projects').insert(row).select().single();
    if (error) throw error;
    return toCamel(data);
  },
  updateProject: async (id: string, updates: any) => {
    const { data, error } = await supabase.from('pm_projects').update(toSnake(updates)).eq('id', id).select().single();
    if (error) throw error;
    return toCamel(data);
  },
  deleteProject: async (id: string) => {
    await supabase.from('pm_projects').delete().eq('id', id);
    return { success: true };
  },
  getKanbanColumns: async (board: string) => {
    const orgId = getActiveOrgId();
    let query = supabase.from('pm_kanban_columns').select('*').eq('board_type', board);
    if (orgId) query = query.eq('org_id', orgId);
    const { data } = await query.order('sort_order');
    return (data || []).map(toCamel);
  },
  saveKanbanColumns: async (board: string, cols: any[]) => {
    // Upsert columns
    for (const col of cols) {
      const row = toSnake(col);
      row.board_type = board;
      if (!row.org_id) row.org_id = getActiveOrgId() || null;
      if (col.id) {
        await supabase.from('pm_kanban_columns').upsert({ ...row, id: col.id });
      } else {
        await supabase.from('pm_kanban_columns').insert(row);
      }
    }
    return { success: true };
  },
  getKanbanCards: async (board: string) => {
    const orgId = getActiveOrgId();
    // Get columns first, then cards
    let colQuery = supabase.from('pm_kanban_columns').select('id').eq('board_type', board);
    if (orgId) colQuery = colQuery.eq('org_id', orgId);
    const { data: cols } = await colQuery;
    if (!cols || cols.length === 0) return [];
    const colIds = cols.map((c: any) => c.id);
    const { data } = await supabase.from('pm_kanban_cards').select('*').in('column_id', colIds).order('sort_order');
    return (data || []).map(toCamel);
  },
  createKanbanCard: async (board: string, card: any) => {
    const row = toSnake(card);
    const { data, error } = await supabase.from('pm_kanban_cards').insert(row).select().single();
    if (error) throw error;
    return toCamel(data);
  },
  updateKanbanCard: async (board: string, id: string, updates: any) => {
    const { data, error } = await supabase.from('pm_kanban_cards').update(toSnake(updates)).eq('id', id).select().single();
    if (error) throw error;
    return toCamel(data);
  },
  deleteKanbanCard: async (board: string, id: string) => {
    await supabase.from('pm_kanban_cards').delete().eq('id', id);
    return { success: true };
  },

  // ── Team Board (not migrated yet) ──
  getTeamBoardItems: async () => [],
  getTeamBoardItem: async () => null,
  createTeamBoardItem: async (_: string, item: any) => item,
  updateTeamBoardItem: async (_: string, __: string, data: any) => data,
  deleteTeamBoardItem: async () => ({ success: true }),

  // ── Biz Radar ──
  getRadarItems: async () => {
    const orgId = getActiveOrgId();
    if (!orgId) return [];
    const { data, error } = await supabase.from('pm_biz_radar').select('*').eq('org_id', orgId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(toCamel);
  },
  createRadarItem: async (item: any) => {
    const uid = await getUid();
    const orgId = getActiveOrgId();
    const row = toSnake(item);
    row.created_by = uid;
    row.org_id = orgId;
    const { data, error } = await supabase.from('pm_biz_radar').insert(row).select().single();
    if (error) throw error;
    return toCamel(data);
  },
  updateRadarItem: async (id: string, updates: any) => {
    const { data, error } = await supabase.from('pm_biz_radar').update(toSnake(updates)).eq('id', id).select().single();
    if (error) throw error;
    return toCamel(data);
  },
  deleteRadarItem: async (id: string) => {
    await supabase.from('pm_biz_radar').delete().eq('id', id);
    return { success: true };
  },
  fetchWishketProjects: async () => edgeRequest('/radar/wishket'),
  fetchWishketProjectsRefresh: async () => edgeRequest('/radar/wishket?refresh=true'),
  fetchFreemoaProjects: async () => edgeRequest('/radar/freemoa'),
  fetchFreemoaProjectsRefresh: async () => edgeRequest('/radar/freemoa?refresh=true'),

  // ── Meetings ──
  getMeetings: async () => {
    const orgId = getActiveOrgId();
    if (!orgId) return [];
    const { data, error } = await supabase.from('pm_meetings').select('*').eq('org_id', orgId).order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(toCamel);
  },
  getMeetingById: async (id: string) => {
    const { data } = await supabase.from('pm_meetings').select('*').eq('id', id).single();
    return data ? toCamel(data) : null;
  },
  createMeeting: async (meeting: any) => {
    const uid = await getUid();
    const orgId = getActiveOrgId();
    const row = toSnake(meeting);
    row.created_by = uid;
    row.org_id = orgId;
    const { data, error } = await supabase.from('pm_meetings').insert(row).select().single();
    if (error) throw error;
    return toCamel(data);
  },
  updateMeeting: async (id: string, updates: any) => {
    const { data, error } = await supabase.from('pm_meetings').update(toSnake(updates)).eq('id', id).select().single();
    if (error) throw error;
    return toCamel(data);
  },
  deleteMeeting: async (id: string) => {
    await supabase.from('pm_meetings').delete().eq('id', id);
    return { success: true };
  },

  // ── Library ──
  getLibraryItems: async () => {
    const orgId = getActiveOrgId();
    const uid = await getUid();
    if (!uid) return [];
    let query = supabase.from('pm_library').select('*');
    if (orgId) query = query.eq('org_id', orgId);
    else query = query.eq('owner_id', uid).is('org_id', null);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => ({
      ...toCamel(row),
      ogMetadata: row.og_metadata, // keep as-is
    }));
  },
  createLibraryItem: async (item: any) => {
    const uid = await getUid();
    const orgId = getActiveOrgId();
    const row = toSnake(item);
    row.owner_id = uid;
    if (orgId) row.org_id = orgId;
    if (item.ogMetadata) row.og_metadata = item.ogMetadata;
    const { data, error } = await supabase.from('pm_library').insert(row).select().single();
    if (error) throw error;
    return { ...toCamel(data), ogMetadata: data.og_metadata };
  },
  updateLibraryItem: async (id: string, updates: any) => {
    const row = toSnake(updates);
    if (updates.ogMetadata) row.og_metadata = updates.ogMetadata;
    const { data, error } = await supabase.from('pm_library').update(row).eq('id', id).select().single();
    if (error) throw error;
    return { ...toCamel(data), ogMetadata: data.og_metadata };
  },
  deleteLibraryItem: async (id: string) => {
    await supabase.from('pm_library').delete().eq('id', id);
    return { success: true };
  },
  fetchOgMetadata: async (url: string) => {
    return edgeRequest('/library/og', { method: 'POST', body: JSON.stringify({ url }) });
  },
  getLibraryCategories: async () => [],
  saveLibraryCategories: async (categories: string[]) => ({ success: true }),

  // ── AI (still use old Edge Function) ──
  generateStrategy: (data: any) => edgeRequest('/ai/strategy', { method: 'POST', body: JSON.stringify(data) }),
  aiDecomposeTask: (data: any) => edgeRequest('/ai/task-decompose', { method: 'POST', body: JSON.stringify(data) }),
  aiDescribeTask: (data: any) => edgeRequest('/ai/task-describe', { method: 'POST', body: JSON.stringify(data) }),
  aiRecommendTask: (data: any) => edgeRequest('/ai/task-recommend', { method: 'POST', body: JSON.stringify(data) }),
  aiSearchExternal: (data: any) => edgeRequest('/ai/search-external', { method: 'POST', body: JSON.stringify(data) }),
  aiCategoryAnalyze: (data: any) => edgeRequest('/ai/category-analyze', { method: 'POST', body: JSON.stringify(data) }),
  aiCategoryChat: (data: any) => edgeRequest('/ai/category-chat', { method: 'POST', body: JSON.stringify(data) }),
  aiTaskAssistant: (data: any) => edgeRequest('/ai/task-assistant', { method: 'POST', body: JSON.stringify(data) }),
  aiSuggestTasks: (data: any) => edgeRequest('/ai/suggest-tasks', { method: 'POST', body: JSON.stringify(data) }),
  aiGenerateContent: (data: any) => edgeRequest('/ai/generate-content', { method: 'POST', body: JSON.stringify(data) }),

  // ── Demo ──
  setupDemo: async () => ({ success: true, userId: 'demo' }),

  // ── Files (still use old Edge Function) ──
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${OLD_EDGE_BASE}/files/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OLD_ANON_KEY}` },
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },
  deleteFile: (key: string) => edgeRequest(`/files/${key}`, { method: 'DELETE' }),

  // ── Chat ──
  getChatRooms: async (userId: string) => {
    const orgId = getActiveOrgId();
    if (!orgId) return [];
    const { data } = await supabase.from('pm_chat_rooms').select('*').eq('org_id', orgId);
    return (data || []).filter((r: any) => r.participant_ids?.includes(userId)).map(toCamel);
  },
  createChatRoom: async (participants: string[]) => {
    const orgId = getActiveOrgId();
    const { data, error } = await supabase.from('pm_chat_rooms').insert({
      type: 'dm', participant_ids: participants, org_id: orgId,
    }).select().single();
    if (error) throw error;
    return toCamel(data);
  },
  getChatMessages: async (roomId: string, limit = 50) => {
    const { data } = await supabase.from('pm_chat_messages').select('*').eq('room_id', roomId).order('created_at').limit(limit);
    return (data || []).map(toCamel);
  },
  sendChatMessage: async (roomId: string, senderId: string, text: string) => {
    const { data, error } = await supabase.from('pm_chat_messages').insert({
      room_id: roomId, sender_id: senderId, content: text,
    }).select().single();
    if (error) throw error;
    return toCamel(data);
  },
  markChatRead: async () => ({ success: true }),

  // ── Share ──
  createShare: async (type: string, itemId: string, orgId: string, createdBy: string) => {
    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const { data, error } = await supabase.from('pm_shares').insert({
      token, type, item_id: itemId, org_id: orgId || null, created_by: createdBy,
    }).select().single();
    if (error) throw error;
    return { token: data.token, ...toCamel(data) };
  },
  getShare: async (token: string) => {
    const { data } = await supabase.from('pm_shares').select('*').eq('token', token).single();
    return data ? toCamel(data) : null;
  },
  deleteShare: async (token: string) => {
    await supabase.from('pm_shares').delete().eq('token', token);
    return { success: true };
  },
  checkShare: async (type: string, itemId: string) => {
    const { data } = await supabase.from('pm_shares').select('token').eq('type', type).eq('item_id', itemId).limit(1);
    if (data && data.length > 0) return { shared: true, token: data[0].token };
    return { shared: false };
  },

  // ── Clients (Sales) ──
  getClients: async () => {
    const orgId = getActiveOrgId();
    if (!orgId) return [];
    const { data, error } = await supabase.from('pm_clients').select('*').eq('org_id', orgId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(toCamel);
  },
  createClient: async (client: any) => {
    const uid = await getUid();
    const orgId = getActiveOrgId();
    const row = toSnake(client);
    row.created_by = uid;
    row.org_id = orgId;
    const { data, error } = await supabase.from('pm_clients').insert(row).select().single();
    if (error) throw error;
    return toCamel(data);
  },
  updateClient: async (id: string, updates: any) => {
    const { data, error } = await supabase.from('pm_clients').update(toSnake(updates)).eq('id', id).select().single();
    if (error) throw error;
    return toCamel(data);
  },
  deleteClient: async (id: string) => {
    await supabase.from('pm_clients').delete().eq('id', id);
    return { success: true };
  },

  // ── Estimates ──
  getEstimates: async () => {
    const orgId = getActiveOrgId();
    if (!orgId) return [];
    const { data, error } = await supabase.from('pm_estimates').select('*, pm_clients(name, company)').eq('org_id', orgId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => ({
      ...toCamel(row),
      clientName: row.pm_clients?.name,
      clientCompany: row.pm_clients?.company,
      items: row.items || [],
    }));
  },
  createEstimate: async (estimate: any) => {
    const uid = await getUid();
    const orgId = getActiveOrgId();
    const row = toSnake(estimate);
    row.created_by = uid;
    row.org_id = orgId;
    const { data, error } = await supabase.from('pm_estimates').insert(row).select().single();
    if (error) throw error;
    return toCamel(data);
  },
  updateEstimate: async (id: string, updates: any) => {
    const { data, error } = await supabase.from('pm_estimates').update(toSnake(updates)).eq('id', id).select().single();
    if (error) throw error;
    return toCamel(data);
  },
  deleteEstimate: async (id: string) => {
    await supabase.from('pm_estimates').delete().eq('id', id);
    return { success: true };
  },

  // ── Attendance ──
  getAttendance: async (date?: string) => {
    const orgId = getActiveOrgId();
    const d = date || new Date().toISOString().split('T')[0];
    const { data, error } = await supabase.from('pm_attendance').select('*').eq('org_id', orgId).eq('date', d);
    if (error) throw error;
    return (data || []).map(toCamel);
  },
  getAttendanceMonth: async (year: number, month: number) => {
    const orgId = getActiveOrgId();
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const to = `${year}-${String(month).padStart(2, '0')}-31`;
    const { data, error } = await supabase.from('pm_attendance').select('*').eq('org_id', orgId).gte('date', from).lte('date', to);
    if (error) throw error;
    return (data || []).map(toCamel);
  },
  checkIn: async () => {
    const uid = await getUid();
    const orgId = getActiveOrgId();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    const { data: existing } = await supabase.from('pm_attendance')
      .select('id').eq('user_id', uid).eq('org_id', orgId).eq('date', today).maybeSingle();
    let data, error;
    if (existing) {
      ({ data, error } = await supabase.from('pm_attendance')
        .update({ check_in: now, check_out: null, status: 'present', current_status: 'working' })
        .eq('id', existing.id).select().single());
    } else {
      ({ data, error } = await supabase.from('pm_attendance')
        .insert({ user_id: uid, org_id: orgId, date: today, check_in: now, status: 'present', current_status: 'working' })
        .select().single());
    }
    if (error) throw error;
    // Log check_in event
    const attId = data.id;
    await supabase.from('pm_attendance_logs').insert({ attendance_id: attId, user_id: uid, org_id: orgId, type: 'check_in', timestamp: now });
    return toCamel(data);
  },
  checkOut: async () => {
    const uid = await getUid();
    const orgId = getActiveOrgId();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('pm_attendance')
      .update({ check_out: now, current_status: 'off' })
      .eq('user_id', uid).eq('org_id', orgId).eq('date', today)
      .is('check_out', null)
      .select().single();
    if (error) throw error;
    await supabase.from('pm_attendance_logs').insert({ attendance_id: data.id, user_id: uid, org_id: orgId, type: 'check_out', timestamp: now });
    return toCamel(data);
  },
  startBreak: async () => {
    const uid = await getUid();
    const orgId = getActiveOrgId();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('pm_attendance')
      .update({ current_status: 'break' })
      .eq('user_id', uid).eq('org_id', orgId).eq('date', today)
      .is('check_out', null)
      .select().single();
    if (error) throw error;
    await supabase.from('pm_attendance_logs').insert({ attendance_id: data.id, user_id: uid, org_id: orgId, type: 'break_start', timestamp: now });
    return toCamel(data);
  },
  endBreak: async () => {
    const uid = await getUid();
    const orgId = getActiveOrgId();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('pm_attendance')
      .update({ current_status: 'working' })
      .eq('user_id', uid).eq('org_id', orgId).eq('date', today)
      .is('check_out', null)
      .select().single();
    if (error) throw error;
    await supabase.from('pm_attendance_logs').insert({ attendance_id: data.id, user_id: uid, org_id: orgId, type: 'break_end', timestamp: now });
    return toCamel(data);
  },
  getAttendanceLogs: async (attendanceId: string) => {
    const { data, error } = await supabase.from('pm_attendance_logs')
      .select('*').eq('attendance_id', attendanceId).order('timestamp', { ascending: true });
    if (error) throw error;
    return (data || []).map(toCamel);
  },
  // Stamp config
  getStampConfig: async () => {
    const uid = await getUid();
    const orgId = getActiveOrgId();
    const { data } = await supabase.from('pm_org_members')
      .select('stamp_config').eq('user_id', uid).eq('org_id', orgId).maybeSingle();
    return data?.stamp_config || {};
  },
  saveStampConfig: async (config: any) => {
    const uid = await getUid();
    const orgId = getActiveOrgId();
    const { error } = await supabase.from('pm_org_members')
      .update({ stamp_config: config })
      .eq('user_id', uid).eq('org_id', orgId);
    if (error) throw error;
  },
  getOrgStampConfigs: async () => {
    const orgId = getActiveOrgId();
    const { data, error } = await supabase.from('pm_org_members')
      .select('user_id, stamp_config').eq('org_id', orgId);
    if (error) throw error;
    const map: Record<string, any> = {};
    (data || []).forEach((r: any) => { if (r.stamp_config && Object.keys(r.stamp_config).length) map[r.user_id] = r.stamp_config; });
    return map;
  },
  updateAttendance: async (id: string, updates: any) => {
    const { data, error } = await supabase.from('pm_attendance').update(toSnake(updates)).eq('id', id).select().single();
    if (error) throw error;
    return toCamel(data);
  },
};
