// ─── Poten Manager API Client ───────────────────────────────────────
// Centralized API communication with the Supabase Edge Function server.
// All CRUD operations for tasks, goals, and activity logs go through here.

import { projectId, publicAnonKey } from '/utils/supabase/info';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-f580d5ca`;

const AUTH_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${publicAnonKey}`,
};

function isDemo() {
  try { return localStorage.getItem('poten_demo_mode') === 'true'; } catch { return false; }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const sep = path.includes('?') ? '&' : '?';
  const url = isDemo() ? `${BASE}${path}${sep}scope=demo` : `${BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { ...AUTH_HEADERS, ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error(`[API ${res.status}] ${init?.method || 'GET'} ${path}:`, body);
    throw new Error(body.message || body.error || res.statusText);
  }
  return res.json();
}

// ─── Date Parsing ───────────────────────────────────────────────────
// KV store serializes Dates as ISO strings. Convert them back on read.
const DATE_FIELDS = ['dueDate', 'startDate', 'endDate', 'deadline', 'timestamp'];

function parseItemDates<T>(item: T): T {
  if (!item || typeof item !== 'object') return item;
  const copy = { ...item } as any;
  for (const f of DATE_FIELDS) {
    if (copy[f] && typeof copy[f] === 'string') {
      copy[f] = new Date(copy[f]);
    }
  }
  return copy;
}

// ─── API Methods ────────────────────────────────────────────────────
export const api = {
  // Health
  health: () => request<{ status: string }>('/health'),

  // ── Tasks ──
  getTasks: async () => {
    const data = await request<any[]>('/tasks');
    return data.map(parseItemDates);
  },
  createTask: (task: any) =>
    request<any>('/tasks', { method: 'POST', body: JSON.stringify(task) }),
  updateTask: (id: string, data: any) =>
    request<any>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (id: string) =>
    request<any>(`/tasks/${id}`, { method: 'DELETE' }),

  // ── Goals (regular + urgent) ──
  getGoals: async () => {
    const data = await request<any[]>('/goals');
    return data.map(parseItemDates);
  },
  createGoal: (goal: any) =>
    request<any>('/goals', { method: 'POST', body: JSON.stringify(goal) }),
  updateGoal: (id: string, data: any) =>
    request<any>(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGoal: (id: string) =>
    request<any>(`/goals/${id}`, { method: 'DELETE' }),

  // ── Activity Logs ──
  getLogs: async (entityId: string) => {
    const data = await request<any[]>(`/logs/${entityId}`);
    return data.map(parseItemDates);
  },
  createLog: (log: any) =>
    request<any>('/logs', { method: 'POST', body: JSON.stringify(log) }),

  // ── Seed / Init ──
  checkSeeded: () => request<{ seeded: boolean }>('/seeded'),
  seed: (data: { tasks: any[]; goals: any[]; members: any[] }) =>
    request<{ success: boolean }>('/seed', { method: 'POST', body: JSON.stringify(data) }),

  // ── Onboarding ──
  getOnboarding: (userId: string) =>
    request<{ exists: boolean; data: any }>(`/onboarding/${userId}`),
  saveOnboarding: (userId: string, data: any) =>
    request<{ success: boolean }>(`/onboarding/${userId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Team ──
  getTeamMembers: async () => {
    const data = await request<any[]>('/team/members');
    return data;
  },
  createTeamMember: (member: any) =>
    request<any>('/team/members', { method: 'POST', body: JSON.stringify(member) }),
  updateTeamMember: (id: string, data: any) =>
    request<any>(`/team/members/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTeamMember: (id: string) =>
    request<any>(`/team/members/${id}`, { method: 'DELETE' }),

  // ── Profile ──
  getProfile: (userId: string) =>
    request<{ phone: string; company: string; location: string; jobTitle: string; jobRole?: string }>(`/profile/${userId}`),
  updateProfile: (userId: string, data: { phone?: string; company?: string; location?: string; jobTitle?: string; jobRole?: string; avatar?: string; calendarColor?: string }) =>
    request<{ success: boolean }>(`/profile/${userId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Organization ──
  createOrg: (data: { name: string; ownerId: string; ownerName?: string }) =>
    request<any>('/org', { method: 'POST', body: JSON.stringify(data) }),
  getOrg: (orgId: string) =>
    request<any>(`/org/${orgId}`),
  updateOrg: (orgId: string, data: Record<string, any>) =>
    request<any>(`/org/${orgId}/update`, { method: 'POST', body: JSON.stringify(data) }),
  getUserOrg: (userId: string) =>
    request<{ org: any; userRole?: string; allOrgs?: Array<{ orgId: string; orgName: string; role: string }>; activeOrgId?: string }>(`/user-org/${userId}`),
  switchActiveOrg: (userId: string, orgId: string) =>
    request<{ org: any; userRole?: string }>(`/user-org/${userId}/active`, { method: 'PUT', body: JSON.stringify({ orgId }) }),

  // ── Invite System ──
  generateInvite: (orgId: string, data: { createdBy: string; createdByName?: string; role?: string }) =>
    request<any>(`/org/${orgId}/invite`, { method: 'POST', body: JSON.stringify(data) }),
  lookupInvite: (code: string) =>
    request<any>(`/invite/${code.toUpperCase()}`),
  joinViaInvite: (code: string, data: { userId: string; userName?: string }) =>
    request<any>(`/invite/${code.toUpperCase()}/join`, { method: 'POST', body: JSON.stringify(data) }),
  directJoin: (code: string, data: { userId: string; userName?: string; avatar?: string }) =>
    request<any>(`/invite/${code.toUpperCase()}/direct-join`, { method: 'POST', body: JSON.stringify(data) }),
  getJoinRequests: (orgId: string) =>
    request<any[]>(`/org/${orgId}/join-requests`),
  processJoinRequest: (orgId: string, userId: string, action: 'approve' | 'reject') =>
    request<any>(`/org/${orgId}/join-requests/${userId}`, { method: 'PUT', body: JSON.stringify({ action }) }),
  getOrgInvites: (orgId: string) =>
    request<any[]>(`/org/${orgId}/invites`),

  // ── Team Board ──
  getTeamBoardItems: (orgId: string) =>
    request<any[]>(`/team-board/${orgId}`),
  getTeamBoardItem: (orgId: string, id: string) =>
    request<any>(`/team-board/${orgId}/${id}`),
  createTeamBoardItem: (orgId: string, item: any) =>
    request<any>(`/team-board/${orgId}`, { method: 'POST', body: JSON.stringify(item) }),
  updateTeamBoardItem: (orgId: string, id: string, data: any) =>
    request<any>(`/team-board/${orgId}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTeamBoardItem: (orgId: string, id: string) =>
    request<any>(`/team-board/${orgId}/${id}`, { method: 'DELETE' }),

  // ── Biz Radar ──
  getRadarItems: async () => {
    const data = await request<any[]>('/radar');
    return data.map(parseItemDates);
  },
  createRadarItem: (item: any) =>
    request<any>('/radar', { method: 'POST', body: JSON.stringify(item) }),
  updateRadarItem: (id: string, data: any) =>
    request<any>(`/radar/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRadarItem: (id: string) =>
    request<any>(`/radar/${id}`, { method: 'DELETE' }),
  fetchWishketProjects: () =>
    request<any>('/radar/wishket'),
  fetchWishketProjectsRefresh: () =>
    request<any>('/radar/wishket?refresh=true'),
  fetchFreemoaProjects: () =>
    request<any>('/radar/freemoa'),
  fetchFreemoaProjectsRefresh: () =>
    request<any>('/radar/freemoa?refresh=true'),

  // ── Meetings ──
  getMeetings: async () => {
    const data = await request<any[]>('/meetings');
    return data.map(parseItemDates);
  },
  createMeeting: (meeting: any) =>
    request<any>('/meetings', { method: 'POST', body: JSON.stringify(meeting) }),
  updateMeeting: (id: string, data: any) =>
    request<any>(`/meetings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMeeting: (id: string) =>
    request<any>(`/meetings/${id}`, { method: 'DELETE' }),

  // ── Library ──
  getLibraryItems: async () => {
    const data = await request<any[]>('/library');
    return data;
  },
  createLibraryItem: (item: any) =>
    request<any>('/library', { method: 'POST', body: JSON.stringify(item) }),
  updateLibraryItem: (id: string, data: any) =>
    request<any>(`/library/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLibraryItem: (id: string) =>
    request<any>(`/library/${id}`, { method: 'DELETE' }),
  fetchOgMetadata: (url: string) =>
    request<any>('/library/og', { method: 'POST', body: JSON.stringify({ url }) }),
  getLibraryCategories: () =>
    request<string[]>('/library/categories'),
  saveLibraryCategories: (categories: string[]) =>
    request<any>('/library/categories', { method: 'PUT', body: JSON.stringify(categories) }),

  // ── AI Strategy ──
  generateStrategy: (data: {
    goal: string;
    timeline: string;
    metric: string;
    current?: string;
    obstacle?: string;
    strength?: string;
    action?: string;
  }) =>
    request<any>('/ai/strategy', { method: 'POST', body: JSON.stringify(data) }),

  // ── AI Task Assistance ──
  aiDecomposeTask: (data: { taskTitle: string; taskDescription?: string; taskCategory?: string }) =>
    request<{ subtasks: Array<{ title: string; titleEn: string; estimatedMinutes: number; priority: string }> }>(
      '/ai/task-decompose', { method: 'POST', body: JSON.stringify(data) }
    ),
  aiDescribeTask: (data: { taskTitle: string; taskCategory?: string; taskPriority?: string; existingDescription?: string }) =>
    request<{ description: string }>(
      '/ai/task-describe', { method: 'POST', body: JSON.stringify(data) }
    ),
  aiRecommendTask: (data: { taskTitle: string; taskDescription?: string; availableCategories: string[] }) =>
    request<{ priority: string; category: string; reasoning: string }>(
      '/ai/task-recommend', { method: 'POST', body: JSON.stringify(data) }
    ),
  aiSearchExternal: (data: { query: string; language?: string }) =>
    request<{ resources: Array<{ title: string; description: string; type: string; suggestedUrl?: string }> }>(
      '/ai/search-external', { method: 'POST', body: JSON.stringify(data) }
    ),
  aiCategoryAnalyze: (data: { taskTitle: string; taskDescription?: string; category: string }) =>
    request<{ summary: string; insights: string[]; suggestions: string[]; risks: string[]; nextSteps: string[] }>(
      '/ai/category-analyze', { method: 'POST', body: JSON.stringify(data) }
    ),
  aiCategoryChat: (data: {
    category: string;
    taskTitle: string;
    taskDescription?: string;
    messages: Array<{ role: "user" | "model"; text: string }>;
  }) =>
    request<{ reply: string }>(
      '/ai/category-chat', { method: 'POST', body: JSON.stringify(data) }
    ),

  // ── Demo ──
  setupDemo: () =>
    request<{ success: boolean; userId: string }>('/demo/setup', { method: 'POST' }),

  // ── Files (Cloudflare R2) ──
  uploadFile: async (file: File): Promise<{ url: string; key: string; fileName: string; fileSize: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    const sep = '/files/upload';
    const demoSuffix = isDemo() ? '?scope=demo' : '';
    const res = await fetch(`${BASE}${sep}${demoSuffix}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || body.error || res.statusText);
    }
    return res.json();
  },
  deleteFile: (key: string) =>
    request<{ success: boolean }>(`/files/${key}`, { method: 'DELETE' }),
};