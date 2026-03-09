export type User = {
  id: string;
  name: string;
  avatar: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  color?: string;
  email?: string;
  jobTitle?: string;
  jobRole?: JobRole;
};

// ─── Member Color System ────────────────────────────────────────────
// Team member colors — avoids conflict with:
//   Urgent (orange-pink gradient #FF6B35→#F72585)
//   Meeting (purple #7C3AED)
//   Status stripes (yellow #EAB308, blue #3B82F6, green #22C55E) — thin bar, low conflict
export const MEMBER_COLORS = [
  // ── Vivid (distinct hues) ──
  { id: 'mc1', hex: '#E74C3C', label: 'Red', labelKo: '레드', bg: 'rgba(231,76,60,0.10)', text: '#C0392B' },
  { id: 'mc2', hex: '#E67E22', label: 'Orange', labelKo: '오렌지', bg: 'rgba(230,126,34,0.10)', text: '#D35400' },
  { id: 'mc3', hex: '#F39C12', label: 'Gold', labelKo: '골드', bg: 'rgba(243,156,18,0.10)', text: '#C77E0A' },
  { id: 'mc4', hex: '#CA8A04', label: 'Yellow', labelKo: '옐로', bg: 'rgba(202,138,4,0.10)', text: '#A16207' },
  { id: 'mc5', hex: '#27AE60', label: 'Green', labelKo: '그린', bg: 'rgba(39,174,96,0.10)', text: '#1E8449' },
  { id: 'mc6', hex: '#0D9488', label: 'Teal', labelKo: '틸', bg: 'rgba(13,148,136,0.10)', text: '#0F766E' },
  { id: 'mc7', hex: '#2980B9', label: 'Blue', labelKo: '블루', bg: 'rgba(41,128,185,0.10)', text: '#1F6F9F' },
  { id: 'mc8', hex: '#4F46E5', label: 'Indigo', labelKo: '인디고', bg: 'rgba(79,70,229,0.10)', text: '#4338CA' },
  { id: 'mc9', hex: '#8E44AD', label: 'Purple', labelKo: '퍼플', bg: 'rgba(142,68,173,0.10)', text: '#6C3483' },
  { id: 'mc10', hex: '#BE185D', label: 'Pink', labelKo: '핑크', bg: 'rgba(190,24,93,0.10)', text: '#9D174D' },
  { id: 'mc11', hex: '#475569', label: 'Slate', labelKo: '슬레이트', bg: 'rgba(71,85,105,0.10)', text: '#334155' },
  { id: 'mc12', hex: '#6D4C41', label: 'Brown', labelKo: '브라운', bg: 'rgba(109,76,65,0.10)', text: '#4E342E' },
  // ── Pastels ──
  { id: 'mc13', hex: '#F1948A', label: 'Coral', labelKo: '코랄', bg: 'rgba(241,148,138,0.12)', text: '#CB4335' },
  { id: 'mc14', hex: '#F0B27A', label: 'Peach', labelKo: '피치', bg: 'rgba(240,178,122,0.12)', text: '#CA6F1E' },
  { id: 'mc15', hex: '#82E0AA', label: 'Mint', labelKo: '민트', bg: 'rgba(130,224,170,0.12)', text: '#1E8449' },
  { id: 'mc16', hex: '#85C1E9', label: 'Sky', labelKo: '스카이', bg: 'rgba(133,193,233,0.12)', text: '#2471A3' },
  { id: 'mc17', hex: '#BB8FCE', label: 'Lavender', labelKo: '라벤더', bg: 'rgba(187,143,206,0.12)', text: '#7D3C98' },
  { id: 'mc18', hex: '#F5B7B1', label: 'Salmon', labelKo: '살몬', bg: 'rgba(245,183,177,0.12)', text: '#C0392B' },
];

// Mutable map: userId → color hex (backed by localStorage)
const COLOR_MAP_KEY = "poten_user_color_map";

function _loadColorMap(): Record<string, string> {
  try {
    const s = localStorage.getItem(COLOR_MAP_KEY);
    return s ? JSON.parse(s) : {};
  } catch { return {}; }
}

const _userColorMap: Record<string, string> = _loadColorMap();

function _persistColorMap() {
  try { localStorage.setItem(COLOR_MAP_KEY, JSON.stringify(_userColorMap)); } catch {}
}

export function getUserColor(userId: string): string | null {
  return _userColorMap[userId] ?? null;
}

export function setUserColor(userId: string, hex: string | null) {
  if (hex === null) {
    delete _userColorMap[userId];
  } else {
    _userColorMap[userId] = hex;
  }
  _persistColorMap();
}

export function getColorOwner(hex: string): string | null {
  for (const [uid, c] of Object.entries(_userColorMap)) {
    if (c === hex) return uid;
  }
  return _specialColorMap[hex] ?? null;
}

export function getMemberColorConfig(hex: string) {
  return MEMBER_COLORS.find((c) => c.hex === hex) ?? null;
}

// ─── Special Color Owner System ─────────────────────────────────────
export type SpecialColorOwner = {
  id: string;
  name: string;
  nameKo: string;
  emoji: string;
};

const SPECIAL_COLOR_OWNERS: Record<string, SpecialColorOwner> = {
  special_urgent: {
    id: 'special_urgent',
    name: 'Urgent Mission',
    nameKo: '긴급미션',
    emoji: '🔥',
  },
};

// hex → specialOwnerId
const _specialColorMap: Record<string, string> = {
  '#EA580C': 'special_urgent',
};

export function getSpecialColorOwner(hex: string): SpecialColorOwner | null {
  const id = _specialColorMap[hex];
  return id ? (SPECIAL_COLOR_OWNERS[id] ?? null) : null;
}

export function setSpecialColorOwner(hex: string, ownerId: string | null) {
  if (ownerId === null) {
    delete _specialColorMap[hex];
  } else {
    _specialColorMap[hex] = ownerId;
  }
}

export function getAllSpecialColorOwners(): Record<string, SpecialColorOwner> {
  return SPECIAL_COLOR_OWNERS;
}

// ─── Type Definitions ───────────────────────────────────────────────
export type GoalLevel = 'Year' | 'Quarter' | 'Month' | 'Week' | 'Day' | 'Urgent';

export type UrgentCategory = 'funding' | 'investment' | 'contract' | 'submission' | 'event' | 'other';

export type TaskCategory = 'sales' | 'content_writing' | 'content_video' | 'marketing' | 'development' | 'design' | 'planning' | 'operations' | 'learning';

export type JobRole = 'planner' | 'designer' | 'developer' | 'marketer' | 'content_creator' | 'salesperson' | 'operator' | 'pm' | 'data_analyst' | 'general';

export interface GoalItem {
  id: string;
  title: string;
  titleKo?: string;
  level: GoalLevel;
  progress: number; // 0-100
  status: 'pending' | 'in-progress' | 'completed' | 'delayed';
  children?: string[];
  parentId?: string;
  dueDate?: Date;
  startDate?: Date;
  endDate?: Date;
  assigneeId?: string;
  urgentCategory?: UrgentCategory;
  deadline?: Date;
  isUrgent?: boolean;
}

// ─── Attachment System ──────────────────────────────────────────────
export type AttachmentType = 'google-drive' | 'google-doc' | 'google-sheet' | 'google-slide' | 'google-form' | 'generic' | 'file';

export interface Attachment {
  id: string;
  url: string;
  title: string;
  addedAt: string; // ISO date string
  type: AttachmentType;
  fileName?: string;
  fileSize?: number; // bytes
}

export function detectAttachmentType(url: string): AttachmentType {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host === 'drive.google.com' || host === 'www.drive.google.com') return 'google-drive';
    if (host === 'docs.google.com') {
      const path = u.pathname.toLowerCase();
      if (path.startsWith('/document')) return 'google-doc';
      if (path.startsWith('/spreadsheets')) return 'google-sheet';
      if (path.startsWith('/presentation')) return 'google-slide';
      if (path.startsWith('/forms')) return 'google-form';
      return 'google-drive';
    }
    return 'generic';
  } catch {
    return 'generic';
  }
}

export interface Task extends GoalItem {
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  assigneeIds?: string[];
  colorOverride?: string | null;
  category?: TaskCategory;
  attachments?: Attachment[];
  /** Linked management board type */
  linkedBoard?: 'projects' | 'branding';
  /** Linked management card ID */
  linkedCardId?: string;
  /** Emoji icon (like Notion page icons) */
  emoji?: string;
}

// Helper: get the "main" assignee id for calendar color purposes.
export function getMainAssigneeId(task: Task | GoalItem): string | undefined {
  if ('assigneeIds' in task && (task as Task).assigneeIds?.length) {
    return (task as Task).assigneeIds![0];
  }
  return task.assigneeId;
}

// Helper: get all assignee ids (deduped, main first)
export function getAllAssigneeIds(task: Task | GoalItem): string[] {
  const ids: string[] = [];
  if ('assigneeIds' in task && (task as Task).assigneeIds?.length) {
    ids.push(...(task as Task).assigneeIds!);
  }
  if (task.assigneeId && !ids.includes(task.assigneeId)) {
    ids.unshift(task.assigneeId);
  }
  return ids;
}

// Helper: get the effective calendar color for a task.
export function getTaskCalendarColor(task: Task): string | null {
  if (task.colorOverride) return task.colorOverride;
  const mainId = getMainAssigneeId(task);
  if (mainId) return getUserColor(mainId);
  return null;
}

export interface Opportunity {
  id: string;
  title: string;
  titleKo?: string;
  description: string;
  platform: 'Upwork' | 'LinkedIn' | 'Email';
  aiScore: number;
  date: string;
}
