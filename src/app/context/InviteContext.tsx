import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { api } from "../../lib/api";
import { useTeam } from "./TeamContext";
import { notificationBus } from "../../lib/notificationEvents";

// ─── Types ──────────────────────────────────────────────────────────
export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  ownerName?: string;
  memberIds: string[];
  createdAt: string;
}

export interface Invite {
  code: string;
  orgId: string;
  orgName: string;
  createdBy: string;
  createdByName?: string;
  role: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
  usedBy?: string | null;
}

export interface JoinRequest {
  id: string;
  orgId: string;
  orgName: string;
  userId: string;
  userName: string;
  inviteCode?: string;
  requestedRole: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  processedAt?: string;
}

export interface OrgSummary {
  orgId: string;
  orgName: string;
  role: string;
}

interface InviteContextType {
  // Org state
  org: Organization | null;
  isLoading: boolean;

  // Multi-org
  allOrgs: OrgSummary[];
  activeOrgId: string | null;
  switchOrg: (orgId: string) => Promise<void>;

  // Org actions
  createOrg: (name: string) => Promise<Organization | null>;

  // Invite actions
  generateInvite: (role?: string) => Promise<Invite | null>;
  lookupInvite: (code: string) => Promise<(Invite & { valid: boolean }) | null>;
  joinViaCode: (code: string) => Promise<{ success: boolean; error?: string }>;

  // Join request management (admin)
  joinRequests: JoinRequest[];
  pendingCount: number;
  fetchJoinRequests: () => Promise<void>;
  approveRequest: (userId: string) => Promise<boolean>;
  rejectRequest: (userId: string) => Promise<boolean>;

  // Active invites
  invites: Invite[];
  fetchInvites: () => Promise<void>;
}

const InviteContext = createContext<InviteContextType | null>(null);

export function InviteProvider({ children }: { children: ReactNode }) {
  const { currentUser, refreshMembers } = useTeam();
  const [org, setOrg] = useState<Organization | null>(null);
  const [allOrgs, setAllOrgs] = useState<OrgSummary[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const initRef = useRef<string | null>(null);

  // ── Load current user's org when userId is available ─────────────
  useEffect(() => {
    // Skip if no real user id yet
    if (!currentUser.id) return;
    // Only fetch once per user id
    if (initRef.current === currentUser.id) return;
    initRef.current = currentUser.id;

    const init = async () => {
      setIsLoading(true);
      try {
        const result = await api.getUserOrg(currentUser.id);
        if (result.org) {
          setOrg(result.org);
          console.log(`[InviteContext] User belongs to org: ${result.org.name}`);
        }
        if (result.allOrgs) setAllOrgs(result.allOrgs);
        if (result.activeOrgId) setActiveOrgId(result.activeOrgId);
      } catch (err) {
        console.error("[InviteContext] Failed to fetch user org:", err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [currentUser.id]);

  // ── Switch active organization ────────────────────────────────────
  const switchOrg = useCallback(async (orgId: string) => {
    try {
      const result = await api.switchActiveOrg(currentUser.id, orgId);
      if (result.org) {
        setOrg(result.org);
        setActiveOrgId(orgId);
        console.log(`[InviteContext] Switched to org: ${result.org.name}`);
        await refreshMembers();
      }
    } catch (err) {
      console.error("[InviteContext] Failed to switch org:", err);
    }
  }, [currentUser.id, refreshMembers]);

  // ── Create Organization ───────────────────────────────────────────
  const createOrgFn = useCallback(async (name: string): Promise<Organization | null> => {
    try {
      const newOrg = await api.createOrg({
        name,
        ownerId: currentUser.id,
        ownerName: currentUser.name,
      });
      setOrg(newOrg);
      setActiveOrgId(newOrg.id);
      setAllOrgs(prev => [...prev, { orgId: newOrg.id, orgName: newOrg.name, role: 'owner' }]);
      console.log(`[InviteContext] Created org: ${name}`);
      return newOrg;
    } catch (err) {
      console.error("[InviteContext] Failed to create org:", err);
      return null;
    }
  }, [currentUser]);

  // ── Generate Invite Code ──────────────────────────────────────────
  const generateInviteFn = useCallback(async (role: string = 'member'): Promise<Invite | null> => {
    if (!org) {
      console.error("[InviteContext] No org to generate invite for");
      return null;
    }
    try {
      const invite = await api.generateInvite(org.id, {
        createdBy: currentUser.id,
        createdByName: currentUser.name,
        role,
      });
      setInvites(prev => [invite, ...prev]);
      console.log(`[InviteContext] Invite generated: ${invite.code}`);
      notificationBus.emit({
        type: 'invite.created',
        data: { code: invite.code, orgId: org.id, role },
      });
      return invite;
    } catch (err) {
      console.error("[InviteContext] Failed to generate invite:", err);
      return null;
    }
  }, [org, currentUser]);

  // ── Look Up Invite Code ───────────────────────────────────────────
  const lookupInviteFn = useCallback(async (code: string) => {
    try {
      const result = await api.lookupInvite(code);
      return result;
    } catch (err) {
      console.error("[InviteContext] Failed to lookup invite:", err);
      return null;
    }
  }, []);

  // ── Join via Invite Code ──────────────────────────────────────────
  const joinViaCodeFn = useCallback(async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await api.joinViaInvite(code, {
        userId: currentUser.id,
        userName: currentUser.name,
      });
      if (result.success) {
        notificationBus.emit({
          type: 'invite.joined',
          data: { userId: currentUser.id, userName: currentUser.name, code },
        });
        // Refresh org data
        const refreshed = await api.getUserOrg(currentUser.id);
        if (refreshed.org) setOrg(refreshed.org);
        if (refreshed.allOrgs) setAllOrgs(refreshed.allOrgs);
        if (refreshed.activeOrgId) setActiveOrgId(refreshed.activeOrgId);
      }
      return { success: true };
    } catch (err: any) {
      console.error("[InviteContext] Failed to join via invite:", err);
      return { success: false, error: err.message || 'Failed to join' };
    }
  }, [currentUser]);

  // ── Fetch Join Requests ───────────────────────────────────────────
  const fetchJoinRequests = useCallback(async () => {
    if (!org) return;
    try {
      const requests = await api.getJoinRequests(org.id);
      setJoinRequests(requests || []);
    } catch (err) {
      console.error("[InviteContext] Failed to fetch join requests:", err);
    }
  }, [org]);

  // ── Approve Request ───────────────────────────────────────────────
  const approveRequest = useCallback(async (userId: string): Promise<boolean> => {
    if (!org) return false;
    try {
      const request = joinRequests.find(r => r.userId === userId);
      await api.processJoinRequest(org.id, userId, 'approve');
      setJoinRequests(prev => prev.map(r =>
        r.userId === userId ? { ...r, status: 'approved' as const } : r
      ));
      // Emit notification for the new member joining
      if (request) {
        notificationBus.emit({
          type: 'team.member_joined',
          data: { memberId: userId, memberName: request.userName || userId },
        });
      }
      // Refresh team members
      await refreshMembers();
      return true;
    } catch (err) {
      console.error("[InviteContext] Failed to approve request:", err);
      return false;
    }
  }, [org, joinRequests, refreshMembers]);

  // ── Reject Request ────────────────────────────────────────────────
  const rejectRequest = useCallback(async (userId: string): Promise<boolean> => {
    if (!org) return false;
    try {
      await api.processJoinRequest(org.id, userId, 'reject');
      setJoinRequests(prev => prev.map(r =>
        r.userId === userId ? { ...r, status: 'rejected' as const } : r
      ));
      return true;
    } catch (err) {
      console.error("[InviteContext] Failed to reject request:", err);
      return false;
    }
  }, [org]);

  // ── Fetch Invites ─────────────────────────────────────────────────
  const fetchInvites = useCallback(async () => {
    if (!org) return;
    try {
      const result = await api.getOrgInvites(org.id);
      setInvites(result || []);
    } catch (err) {
      console.error("[InviteContext] Failed to fetch invites:", err);
    }
  }, [org]);

  // Auto-fetch join requests when org loads
  useEffect(() => {
    if (org) {
      fetchJoinRequests();
    }
  }, [org, fetchJoinRequests]);

  const pendingCount = joinRequests.filter(r => r.status === 'pending').length;

  return (
    <InviteContext.Provider value={{
      org,
      isLoading,
      allOrgs,
      activeOrgId,
      switchOrg,
      createOrg: createOrgFn,
      generateInvite: generateInviteFn,
      lookupInvite: lookupInviteFn,
      joinViaCode: joinViaCodeFn,
      joinRequests,
      pendingCount,
      fetchJoinRequests,
      approveRequest,
      rejectRequest,
      invites,
      fetchInvites,
    }}>
      {children}
    </InviteContext.Provider>
  );
}

export function useInvite() {
  const ctx = useContext(InviteContext);
  if (!ctx) throw new Error("useInvite must be used within InviteProvider");
  return ctx;
}