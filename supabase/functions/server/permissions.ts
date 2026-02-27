// ─── Permission System for Poten Manager (Server Copy) ───────────────────────
// This file is a copy of src/lib/permissions.ts for use in Supabase Edge Functions.

export type Role = 'owner' | 'admin' | 'member' | 'viewer';

export type Permission =
  | 'team.invite' | 'team.remove' | 'team.editRole' | 'team.viewAll'
  | 'task.create' | 'task.editAny' | 'task.editOwn' | 'task.deleteAny' | 'task.deleteOwn' | 'task.assignOthers' | 'task.changeStatus'
  | 'goal.create' | 'goal.editAny' | 'goal.editOwn' | 'goal.delete' | 'strategy.create' | 'strategy.edit'
  | 'calendar.editAny' | 'calendar.editOwn'
  | 'settings.manage' | 'settings.billing' | 'settings.workspace'
  | 'ai.recommend' | 'ai.strategy';

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

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
