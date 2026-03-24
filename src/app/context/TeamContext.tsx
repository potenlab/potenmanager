import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { User, setUserColor } from "../../lib/mockData";
import { api } from "../../lib/api";
import { notificationBus } from "../../lib/notificationEvents";
import { useAuth } from "./AuthContext";
import { useWorkspace } from "./WorkspaceContext";

/** Supabase auth 유저 → 앱 내 User 객체 변환 */
function userFromAuth(authUser: { id: string; user_metadata?: Record<string, any>; email?: string } | null): User {
  if (!authUser) return { id: '', name: 'Guest', avatar: '', role: 'owner' };
  const meta = authUser.user_metadata || {};
  return {
    id: authUser.id,
    name: meta.full_name || meta.name || authUser.email || 'User',
    avatar: meta.avatar_url || meta.picture || '',
    role: 'owner',
    email: authUser.email || '',
    jobTitle: '',
  };
}

interface TeamContextType {
  members: User[];
  currentUser: User;
  isLoading: boolean;
  isSynced: boolean;
  addMember: (member: User) => Promise<void>;
  updateMember: (id: string, updates: Partial<User>) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  getMember: (id: string) => User | undefined;
  refreshMembers: () => Promise<void>;
}

// Default fallback value prevents crashes during HMR re-mounts
const noop = async () => {};
const defaultValue: TeamContextType = {
  members: [],
  currentUser: { id: '', name: '', avatar: '', role: 'owner' },
  isLoading: true,
  isSynced: false,
  addMember: noop,
  updateMember: noop,
  removeMember: noop,
  getMember: () => undefined,
  refreshMembers: noop,
};

const TeamContext = createContext<TeamContextType>(defaultValue);

export function TeamProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth();
  const { currentOrg } = useWorkspace();
  const [members, setMembers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User>(() => userFromAuth(null));
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);
  const initRef = useRef(false);

  // auth 세션이 로드되면 currentUser 동기화
  useEffect(() => {
    if (authUser) {
      setCurrentUser(prev => {
        if (prev.id === authUser.id && prev.name !== 'Guest') return prev;
        return userFromAuth(authUser);
      });
    }
  }, [authUser]);

  const fetchMembers = useCallback(async () => {
    try {
      const serverMembers = await api.getTeamMembers();
      if (serverMembers && serverMembers.length > 0) {
        const myId = authUser?.id;
        const myEmail = authUser?.email;
        // Patch current user's email if missing on server
        if (myId && myEmail) {
          const me = serverMembers.find((m: any) => m.id === myId);
          if (me && !me.email) {
            me.email = myEmail;
            api.updateTeamMember(myId, { email: myEmail }).catch(() => {});
          }
        }
        setMembers(serverMembers);
        if (myId) {
          const foundMe = serverMembers.find((m: any) => m.id === myId);
          if (foundMe) setCurrentUser(foundMe);
        }
      } else if (authUser) {
        // 서버에 멤버가 없으면 인증된 유저를 sole member로 설정 + 서버에 저장
        const me = userFromAuth(authUser);
        setMembers([me]);
        setCurrentUser(me);
        try { await api.createTeamMember(me); } catch {}
      }
      setIsSynced(true);

      // Load all members' calendar colors on init
      const memberList = serverMembers && serverMembers.length > 0 ? serverMembers : (authUser ? [userFromAuth(authUser)] : []);
      memberList.forEach((m: any) => {
        api.getProfile(m.id).then((profile: any) => {
          if (profile?.calendarColor) {
            setUserColor(m.id, profile.calendarColor);
          }
        }).catch(() => {});
      });
    } catch (err) {
      console.error("[TeamContext] Failed to fetch members:", err);
    } finally {
      setIsLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return;          // auth 로드 전이면 대기
    fetchMembers();
  }, [fetchMembers, authUser, currentOrg?.id]);

  const addMember = useCallback(async (member: User) => {
    setMembers((prev) => [...prev, member]);
    notificationBus.emit({
      type: 'team.member_joined',
      data: { memberId: member.id, memberName: member.name },
    });
    try {
      await api.createTeamMember(member);
    } catch (err) {
      console.error("[TeamContext] Failed to add member:", err);
      setMembers((prev) => prev.filter(m => m.id !== member.id));
    }
  }, []);

  const updateMember = useCallback(async (id: string, updates: Partial<User>) => {
    // Store snapshot for rollback
    const snapshot = members.find(m => m.id === id);
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
    if (currentUser.id === id) {
      setCurrentUser(prev => ({ ...prev, ...updates }));
    }
    try {
      await api.updateTeamMember(id, updates);
    } catch (err) {
      console.error("[TeamContext] Failed to update member, rolling back:", err);
      // Rollback on failure
      if (snapshot) {
        setMembers((prev) => prev.map((m) => (m.id === id ? snapshot : m)));
        if (currentUser.id === id) {
          setCurrentUser(snapshot);
        }
      }
    }
  }, [currentUser.id, members]);

  const removeMember = useCallback(async (id: string) => {
    const member = members.find(m => m.id === id);
    setMembers((prev) => prev.filter((m) => m.id !== id));
    if (member) {
      notificationBus.emit({
        type: 'team.member_removed',
        data: { memberId: id, memberName: member.name },
      });
    }
    try {
      await api.deleteTeamMember(id);
    } catch (err) {
      console.error("[TeamContext] Failed to remove member, rolling back:", err);
      // Rollback: re-add the member
      if (member) {
        setMembers((prev) => [...prev, member]);
      }
    }
  }, [members]);

  const getMember = useCallback((id: string) => {
    return members.find(m => m.id === id);
  }, [members]);

  return (
    <TeamContext.Provider
      value={{
        members,
        currentUser,
        isLoading,
        isSynced,
        addMember,
        updateMember,
        removeMember,
        getMember,
        refreshMembers: fetchMembers,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  return useContext(TeamContext);
}