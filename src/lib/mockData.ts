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
  { id: 'mc1', hex: '#0891B2', label: 'Cyan', labelKo: '시안', bg: 'rgba(8,145,178,0.10)', text: '#0E7490' },
  { id: 'mc2', hex: '#0D9488', label: 'Teal', labelKo: '틸', bg: 'rgba(13,148,136,0.10)', text: '#0F766E' },
  { id: 'mc3', hex: '#4F46E5', label: 'Indigo', labelKo: '인디고', bg: 'rgba(79,70,229,0.10)', text: '#4338CA' },
  { id: 'mc4', hex: '#0284C7', label: 'Sky', labelKo: '스카이블루', bg: 'rgba(2,132,199,0.10)', text: '#0369A1' },
  { id: 'mc5', hex: '#475569', label: 'Slate', labelKo: '슬레이트', bg: 'rgba(71,85,105,0.10)', text: '#334155' },
  { id: 'mc6', hex: '#B45309', label: 'Amber', labelKo: '앰버', bg: 'rgba(180,83,9,0.10)', text: '#92400E' },
  { id: 'mc7', hex: '#059669', label: 'Emerald', labelKo: '에메랄드', bg: 'rgba(5,150,105,0.10)', text: '#047857' },
  { id: 'mc8', hex: '#65A30D', label: 'Lime', labelKo: '라임', bg: 'rgba(101,163,13,0.10)', text: '#4D7C0F' },
  { id: 'mc9', hex: '#7E22CE', label: 'Violet', labelKo: '바이올렛', bg: 'rgba(126,34,206,0.10)', text: '#6B21A8' },
  { id: 'mc10', hex: '#BE185D', label: 'Pink', labelKo: '핑크', bg: 'rgba(190,24,93,0.10)', text: '#9D174D' },
  { id: 'mc11', hex: '#1D4ED8', label: 'Blue', labelKo: '블루', bg: 'rgba(29,78,216,0.10)', text: '#1E40AF' },
  { id: 'mc12', hex: '#9333EA', label: 'Purple', labelKo: '퍼플', bg: 'rgba(147,51,234,0.10)', text: '#7E22CE' },
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
