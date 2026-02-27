// ─── Permission System for Poten Manager ─────────────────────────────────────
// Role-based access control (RBAC) with 4 tiers:
//   Owner  > Admin > Member > Viewer

export type Role = 'owner' | 'admin' | 'member' | 'viewer';

// Granular permissions
export type Permission =
  // Team
  | 'team.invite'
  | 'team.remove'
  | 'team.editRole'
  | 'team.viewAll'
  // Tasks
  | 'task.create'
  | 'task.editAny'
  | 'task.editOwn'
  | 'task.deleteAny'
  | 'task.deleteOwn'
  | 'task.assignOthers'
  | 'task.changeStatus'
  // Goals & Strategy
  | 'goal.create'
  | 'goal.editAny'
  | 'goal.editOwn'
  | 'goal.delete'
  | 'strategy.create'
  | 'strategy.edit'
  // Calendar
  | 'calendar.editAny'
  | 'calendar.editOwn'
  // Settings / Workspace
  | 'settings.manage'
  | 'settings.billing'
  | 'settings.workspace'
  // AI Features
  | 'ai.recommend'
  | 'ai.strategy';

// ─── Role → Permission matrix ──────────────────────────────────────────────
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    'team.invite', 'team.remove', 'team.editRole', 'team.viewAll',
    'task.create', 'task.editAny', 'task.editOwn', 'task.deleteAny', 'task.deleteOwn',
    'task.assignOthers', 'task.changeStatus',
    'goal.create', 'goal.editAny', 'goal.editOwn', 'goal.delete',
    'strategy.create', 'strategy.edit',
    'calendar.editAny', 'calendar.editOwn',
    'settings.manage', 'settings.billing', 'settings.workspace',
    'ai.recommend', 'ai.strategy',
  ],
  admin: [
    'team.invite', 'team.remove', 'team.editRole', 'team.viewAll',
    'task.create', 'task.editAny', 'task.editOwn', 'task.deleteAny', 'task.deleteOwn',
    'task.assignOthers', 'task.changeStatus',
    'goal.create', 'goal.editAny', 'goal.editOwn', 'goal.delete',
    'strategy.create', 'strategy.edit',
    'calendar.editAny', 'calendar.editOwn',
    'settings.manage',
    'ai.recommend', 'ai.strategy',
  ],
  member: [
    'team.viewAll',
    'task.create', 'task.editOwn', 'task.deleteOwn',
    'task.changeStatus',
    'goal.editOwn',
    'calendar.editOwn',
    'ai.recommend',
  ],
  viewer: [
    'team.viewAll',
  ],
};

// ─── Helpers ────────────────────────────────────────────────────────────────
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

export function getPermissionsForRole(role: Role): Permission[] {
  return [...(ROLE_PERMISSIONS[role] ?? [])];
}

// Role hierarchy: owner(4) > admin(3) > member(2) > viewer(1)
const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

export function getRoleLevel(role: Role): number {
  return ROLE_HIERARCHY[role] ?? 0;
}

export function isRoleHigherOrEqual(a: Role, b: Role): boolean {
  return getRoleLevel(a) >= getRoleLevel(b);
}

export function canManageRole(managerRole: Role, targetRole: Role): boolean {
  // A manager can only change roles of people below them
  return getRoleLevel(managerRole) > getRoleLevel(targetRole);
}

// ─── Permission category groupings (for UI display) ────────────────────────
export interface PermissionGroup {
  key: string;
  labelEn: string;
  labelKo: string;
  icon: string; // emoji
  permissions: {
    permission: Permission;
    labelEn: string;
    labelKo: string;
    descEn: string;
    descKo: string;
  }[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: 'team',
    labelEn: 'Team Management',
    labelKo: '팀 관리',
    icon: '👥',
    permissions: [
      { permission: 'team.invite', labelEn: 'Invite Members', labelKo: '멤버 초대', descEn: 'Send invitations to new team members', descKo: '새 팀원에게 초대를 보낼 수 있습니다' },
      { permission: 'team.remove', labelEn: 'Remove Members', labelKo: '멤버 삭제', descEn: 'Remove existing team members', descKo: '기존 팀원을 삭제할 수 있습니다' },
      { permission: 'team.editRole', labelEn: 'Edit Roles', labelKo: '역할 변경', descEn: 'Change member roles and permissions', descKo: '멤버의 역할과 권한을 변경할 수 있습니다' },
      { permission: 'team.viewAll', labelEn: 'View Team', labelKo: '팀 조회', descEn: 'View all team members and their info', descKo: '모든 팀원과 정보를 확인할 수 있습니다' },
    ],
  },
  {
    key: 'task',
    labelEn: 'Task Management',
    labelKo: '업무 관리',
    icon: '✅',
    permissions: [
      { permission: 'task.create', labelEn: 'Create Tasks', labelKo: '업무 생성', descEn: 'Create new tasks', descKo: '새 업무를 생성할 수 있습니다' },
      { permission: 'task.editAny', labelEn: 'Edit All Tasks', labelKo: '모든 업무 수정', descEn: 'Edit tasks assigned to any member', descKo: '모든 멤버의 업무를 수정할 수 있습니다' },
      { permission: 'task.editOwn', labelEn: 'Edit Own Tasks', labelKo: '내 업무 수정', descEn: 'Edit only your assigned tasks', descKo: '본인에게 배정된 업무만 수정할 수 있습니다' },
      { permission: 'task.deleteAny', labelEn: 'Delete All Tasks', labelKo: '모든 업무 삭제', descEn: 'Delete any task', descKo: '모든 업무를 삭제할 수 있습니다' },
      { permission: 'task.deleteOwn', labelEn: 'Delete Own Tasks', labelKo: '내 업무 삭제', descEn: 'Delete only your tasks', descKo: '본인의 업무만 삭제할 수 있습니다' },
      { permission: 'task.assignOthers', labelEn: 'Assign to Others', labelKo: '타인에게 배정', descEn: 'Assign tasks to other team members', descKo: '다른 팀원에게 업무를 배정할 수 있습니다' },
      { permission: 'task.changeStatus', labelEn: 'Change Status', labelKo: '상태 변경', descEn: 'Change task status (drag & drop)', descKo: '업무 상태를 변경할 수 있습니다 (드래그 앤 드롭)' },
    ],
  },
  {
    key: 'goal',
    labelEn: 'Goals & Strategy',
    labelKo: '목표 & 전략',
    icon: '🎯',
    permissions: [
      { permission: 'goal.create', labelEn: 'Create Goals', labelKo: '목표 생성', descEn: 'Create new goals and milestones', descKo: '새 목표와 마일스톤을 생성할 수 있습니다' },
      { permission: 'goal.editAny', labelEn: 'Edit All Goals', labelKo: '모든 목표 수정', descEn: 'Edit any goal', descKo: '모든 목표를 수정할 수 있습니다' },
      { permission: 'goal.editOwn', labelEn: 'Edit Own Goals', labelKo: '내 목표 수정', descEn: 'Edit goals assigned to you', descKo: '본인에게 배정된 목표만 수정할 수 있습니다' },
      { permission: 'goal.delete', labelEn: 'Delete Goals', labelKo: '목표 삭제', descEn: 'Delete goals', descKo: '목표를 삭제할 수 있습니다' },
      { permission: 'strategy.create', labelEn: 'Create Strategy', labelKo: '전략 생성', descEn: 'Generate AI strategy documents', descKo: 'AI 전략 문서를 생성할 수 있습니다' },
      { permission: 'strategy.edit', labelEn: 'Edit Strategy', labelKo: '전략 수정', descEn: 'Edit existing strategy documents', descKo: '기존 전략 문서를 수정할 수 있습니다' },
    ],
  },
  {
    key: 'calendar',
    labelEn: 'Calendar',
    labelKo: '캘린더',
    icon: '📅',
    permissions: [
      { permission: 'calendar.editAny', labelEn: 'Edit All Events', labelKo: '모든 일정 수정', descEn: 'Edit calendar events for any member', descKo: '모든 멤버의 캘린더 일정을 수정할 수 있습니다' },
      { permission: 'calendar.editOwn', labelEn: 'Edit Own Events', labelKo: '내 일정 수정', descEn: 'Edit only your calendar events', descKo: '본인의 캘린더 일정만 수정할 수 있습니다' },
    ],
  },
  {
    key: 'settings',
    labelEn: 'Settings',
    labelKo: '설정',
    icon: '⚙️',
    permissions: [
      { permission: 'settings.manage', labelEn: 'General Settings', labelKo: '일반 설정', descEn: 'Manage workspace settings', descKo: '워크스페이스 설정을 관리할 수 있습니다' },
      { permission: 'settings.billing', labelEn: 'Billing', labelKo: '결제 관리', descEn: 'Access billing and subscription', descKo: '결제 및 구독을 관리할 수 있습니다' },
      { permission: 'settings.workspace', labelEn: 'Workspace', labelKo: '워크스페이스', descEn: 'Manage workspace name, delete workspace', descKo: '워크스페이스 이름 변경, 삭제 등을 관리합니다' },
    ],
  },
  {
    key: 'ai',
    labelEn: 'AI Features',
    labelKo: 'AI 기능',
    icon: '✨',
    permissions: [
      { permission: 'ai.recommend', labelEn: 'AI Task Recommendations', labelKo: 'AI 업무 추천', descEn: 'Use AI-powered task recommendations', descKo: 'AI 기반 업무 추천 기능을 사용할 수 있습니다' },
      { permission: 'ai.strategy', labelEn: 'AI Strategy Generation', labelKo: 'AI 전략 생성', descEn: 'Generate AI strategy documents', descKo: 'AI 전략 문서 생성 기능을 사용할 수 있습니다' },
    ],
  },
];

// ─── Role display info ──────────────────────────────────────────────────────
export interface RoleInfo {
  role: Role;
  labelEn: string;
  labelKo: string;
  descEn: string;
  descKo: string;
  color: string;
  bgColor: string;
  icon: string; // emoji
}

export const ROLE_INFO: RoleInfo[] = [
  {
    role: 'owner',
    labelEn: 'Owner',
    labelKo: '오너',
    descEn: 'Full control over workspace, team, and billing',
    descKo: '워크스페이스, 팀, 결제 등 모든 권한을 가집니다',
    color: '#9333EA',
    bgColor: 'rgba(147,51,234,0.08)',
    icon: '👑',
  },
  {
    role: 'admin',
    labelEn: 'Admin',
    labelKo: '관리자',
    descEn: 'Manage team, goals, and all tasks. No billing access.',
    descKo: '팀, 목표, 모든 업무를 관리합니다. 결제 권한은 없습니다.',
    color: '#0079FF',
    bgColor: 'rgba(0,121,255,0.08)',
    icon: '🛡️',
  },
  {
    role: 'member',
    labelEn: 'Member',
    labelKo: '멤버',
    descEn: 'Create and manage own tasks. View goals and team.',
    descKo: '본인의 업무를 생성·관리합니다. 목표와 팀을 조회합니다.',
    color: '#059669',
    bgColor: 'rgba(5,150,105,0.08)',
    icon: '👤',
  },
  {
    role: 'viewer',
    labelEn: 'Viewer',
    labelKo: '뷰어',
    descEn: 'View-only access. Cannot create or edit anything.',
    descKo: '조회만 가능합니다. 생성 및 수정 권한이 없습니다.',
    color: '#6B7280',
    bgColor: 'rgba(107,114,128,0.08)',
    icon: '👁️',
  },
];

export function getRoleInfo(role: Role): RoleInfo {
  return ROLE_INFO.find((r) => r.role === role) ?? ROLE_INFO[3];
}
