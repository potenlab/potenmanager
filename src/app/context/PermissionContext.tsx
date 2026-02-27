import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from "react";
import { Role, Permission, hasPermission, canManageRole, getRoleInfo } from "../../lib/permissions";
import { useTeam } from "./TeamContext";
import { User } from "../../lib/mockData";
import { notificationBus } from "../../lib/notificationEvents";

interface PermissionContextType {
  currentUser: User;
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  canManage: (targetUserId: string) => boolean;
  getMemberRole: (userId: string) => Role;
  changeMemberRole: (userId: string, newRole: Role) => boolean;
  members: User[];
  auditLog: AuditLogEntry[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  actorId: string;
  actorName: string;
  action: 'role_changed' | 'member_invited' | 'member_removed';
  targetId?: string;
  targetName?: string;
  details: string;
  detailsKo: string;
}

const PermissionContext = createContext<PermissionContextType | null>(null);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { members: teamMembers, currentUser, updateMember } = useTeam();
  
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);

  const getMemberRole = useCallback((userId: string): Role => {
    const member = teamMembers.find((m) => m.id === userId);
    return (member?.role as Role) ?? 'viewer';
  }, [teamMembers]);

  const myRole = getMemberRole(currentUser.id);

  const can = useCallback((permission: Permission): boolean => {
    return hasPermission(myRole, permission);
  }, [myRole]);

  const canAny = useCallback((permissions: Permission[]): boolean => {
    return permissions.some((p) => hasPermission(myRole, p));
  }, [myRole]);

  const canManage = useCallback((targetUserId: string): boolean => {
    if (targetUserId === currentUser.id) return false;
    const targetRole = getMemberRole(targetUserId);
    return canManageRole(myRole, targetRole);
  }, [myRole, getMemberRole]);

  const changeMemberRole = useCallback((userId: string, newRole: Role): boolean => {
    if (!hasPermission(myRole, 'team.editRole')) return false;
    if (userId === currentUser.id) return false;
    const targetCurrentRole = getMemberRole(userId);
    if (!canManageRole(myRole, targetCurrentRole)) return false;
    if (newRole === 'owner') return false;

    const targetMember = teamMembers.find((m) => m.id === userId);
    const oldRoleInfo = getRoleInfo(targetCurrentRole);
    const newRoleInfo = getRoleInfo(newRole);

    updateMember(userId, { role: newRole });

    const newLogEntry = {
      id: `audit_${Date.now()}`,
      timestamp: new Date(),
      actorId: currentUser.id,
      actorName: currentUser.name,
      action: 'role_changed' as const,
      targetId: userId,
      targetName: targetMember?.name ?? userId,
      details: `Changed role from ${oldRoleInfo.labelEn} to ${newRoleInfo.labelEn}`,
      detailsKo: `역할을 ${oldRoleInfo.labelKo}에서 ${newRoleInfo.labelKo}로 변경`,
    };

    setAuditLog((prev) => [newLogEntry, ...prev]);

    // Emit notification event
    notificationBus.emit({
      type: 'role.changed',
      data: {
        targetId: userId,
        targetName: targetMember?.name ?? userId,
        actorName: currentUser.name,
        oldRole: oldRoleInfo.labelEn,
        newRole: newRoleInfo.labelEn,
        oldRoleKo: oldRoleInfo.labelKo,
        newRoleKo: newRoleInfo.labelKo,
      },
    });

    return true;
  }, [myRole, getMemberRole, teamMembers, currentUser, updateMember]);

  const value = useMemo<PermissionContextType>(() => ({
    currentUser,
    can,
    canAny,
    canManage,
    getMemberRole,
    changeMemberRole,
    members: teamMembers,
    auditLog,
  }), [currentUser, can, canAny, canManage, getMemberRole, changeMemberRole, teamMembers, auditLog]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermission() {
  const ctx = useContext(PermissionContext);
  if (!ctx) {
    console.warn("[usePermission] Context is null. Returning safe fallback. Ensure PermissionProvider is an ancestor.");
    // Return a safe fallback to prevent crashes during initial render / HMR
    const fallback: PermissionContextType = {
      currentUser: { id: '', name: '', avatar: '', role: 'viewer' },
      can: () => false,
      canAny: () => false,
      canManage: () => false,
      getMemberRole: () => 'viewer' as Role,
      changeMemberRole: () => false,
      members: [],
      auditLog: [],
    };
    return fallback;
  }
  return ctx;
}