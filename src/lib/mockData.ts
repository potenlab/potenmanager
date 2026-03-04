export type User = {
  id: string;
  name: string;
  avatar: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  color?: string;
  jobTitle?: string;
  jobRole?: JobRole;
};

// ─── Member Color System ────────────────────────────────────────────
export const MEMBER_COLORS = [
  { id: 'mc1', hex: '#0079FF', label: 'Blue', labelKo: '파란색', bg: 'rgba(0,121,255,0.10)', text: '#0060CC' },
  { id: 'mc2', hex: '#7C3AED', label: 'Purple', labelKo: '보라색', bg: 'rgba(124,58,237,0.10)', text: '#6529C9' },
  { id: 'mc3', hex: '#E11D48', label: 'Rose', labelKo: '로즈', bg: 'rgba(225,29,72,0.10)', text: '#BE123C' },
  { id: 'mc4', hex: '#EA580C', label: 'Orange', labelKo: '주황색', bg: 'rgba(234,88,12,0.10)', text: '#C2410C' },
  { id: 'mc5', hex: '#D97706', label: 'Orange', labelKo: '오랜지', bg: 'rgba(217,119,6,0.10)', text: '#B45309' },
  { id: 'mc6', hex: '#059669', label: 'Emerald', labelKo: '에메랄드', bg: 'rgba(5,150,105,0.10)', text: '#047857' },
  { id: 'mc7', hex: '#0891B2', label: 'Cyan', labelKo: '시안', bg: 'rgba(8,145,178,0.10)', text: '#0E7490' },
  { id: 'mc8', hex: '#4F46E5', label: 'Indigo', labelKo: '인디고', bg: 'rgba(79,70,229,0.10)', text: '#4338CA' },
  { id: 'mc9', hex: '#DB2777', label: 'Pink', labelKo: '핑크', bg: 'rgba(219,39,119,0.10)', text: '#BE185D' },
  { id: 'mc10', hex: '#65A30D', label: 'Lime', labelKo: '라임', bg: 'rgba(101,163,13,0.10)', text: '#4D7C0F' },
];

// Mutable map: userId → color hex
const _userColorMap: Record<string, string> = {};

export function getUserColor(userId: string): string | null {
  return _userColorMap[userId] ?? null;
}

export function setUserColor(userId: string, hex: string | null) {
  if (hex === null) {
    delete _userColorMap[userId];
  } else {
    _userColorMap[userId] = hex;
  }
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
  status: 'pending' | 'in-progress' | 'completed';
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
