/**
 * WorkspaceContext — 개인/조직 모드 관리
 *
 * 개인 모드: org = null, 메뉴 4개 (내 업무, 캘린더, 자료실, 프로젝트)
 * 조직 모드: org = PmOrg, 메뉴 확장 (+ 채팅, 회의, 팀, 브랜딩, 비즈레이더...)
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { pmApi, PmOrg } from "../../lib/supabase-api";
import { supabase } from "./AuthContext";

type WorkspaceMode = "personal" | "org";

interface WorkspaceContextType {
  mode: WorkspaceMode;
  currentOrg: PmOrg | null;
  orgs: { org: PmOrg; role: string }[];
  isLoading: boolean;

  // Actions
  switchToPersonal: () => void;
  switchToOrg: (orgId: string) => void;
  createOrg: (name: string, slug: string, industry?: string) => Promise<PmOrg>;
  refreshOrgs: () => Promise<void>;

  // Helpers
  orgId: string | null; // shortcut: currentOrg?.id || null
  isPersonal: boolean;
  isOrg: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

const ACTIVE_WORKSPACE_KEY = "pm_active_workspace";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [orgs, setOrgs] = useState<{ org: PmOrg; role: string }[]>([]);
  const [currentOrg, setCurrentOrg] = useState<PmOrg | null>(null);
  const [mode, setMode] = useState<WorkspaceMode>("personal");
  const [isLoading, setIsLoading] = useState(true);

  // Load orgs on mount
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) { setIsLoading(false); return; }

        const myOrgs = await pmApi.getMyOrgs();
        if (cancelled) return;
        setOrgs(myOrgs);

        // Restore last active workspace, or default to first org
        const saved = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
        if (saved && saved !== "personal") {
          const found = myOrgs.find((o) => o.org.id === saved);
          if (found) {
            setCurrentOrg(found.org);
            setMode("org");
            localStorage.setItem("pm_active_org_id", found.org.id);
            localStorage.setItem("poten_active_org_id", found.org.id);
          }
        } else if (!saved && myOrgs.length > 0) {
          // First visit: default to first org (team workspace)
          const first = myOrgs[0];
          setCurrentOrg(first.org);
          setMode("org");
          localStorage.setItem(ACTIVE_WORKSPACE_KEY, first.org.id);
          localStorage.setItem("pm_active_org_id", first.org.id);
          localStorage.setItem("poten_active_org_id", first.org.id);
        } else {
          localStorage.removeItem("pm_active_org_id");
          localStorage.removeItem("poten_active_org_id");
        }
      } catch (e) {
        console.error("[WorkspaceContext] Failed to load orgs:", e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();

    // Re-load on auth change
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const switchToPersonal = useCallback(() => {
    setCurrentOrg(null);
    setMode("personal");
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, "personal");
    localStorage.removeItem("pm_active_org_id");
    localStorage.removeItem("poten_active_org_id");
  }, []);

  const switchToOrg = useCallback((orgId: string) => {
    const found = orgs.find((o) => o.org.id === orgId);
    if (found) {
      setCurrentOrg(found.org);
      setMode("org");
      localStorage.setItem(ACTIVE_WORKSPACE_KEY, orgId);
      localStorage.setItem("pm_active_org_id", orgId);
      localStorage.setItem("poten_active_org_id", orgId);
    }
  }, [orgs]);

  const createOrg = useCallback(async (name: string, slug: string, industry?: string) => {
    const org = await pmApi.createOrg({ name, slug, industry });
    setOrgs((prev) => [...prev, { org, role: "owner" }]);
    setCurrentOrg(org);
    setMode("org");
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, org.id);
    localStorage.setItem("pm_active_org_id", org.id);
    localStorage.setItem("poten_active_org_id", org.id);
    return org;
  }, []);

  const refreshOrgs = useCallback(async () => {
    const myOrgs = await pmApi.getMyOrgs();
    setOrgs(myOrgs);
    // Update currentOrg if it still exists
    if (currentOrg) {
      const found = myOrgs.find((o) => o.org.id === currentOrg.id);
      if (found) setCurrentOrg(found.org);
      else { setCurrentOrg(null); setMode("personal"); }
    }
  }, [currentOrg]);

  return (
    <WorkspaceContext.Provider value={{
      mode,
      currentOrg,
      orgs,
      isLoading,
      switchToPersonal,
      switchToOrg,
      createOrg,
      refreshOrgs,
      orgId: currentOrg?.id || null,
      isPersonal: mode === "personal",
      isOrg: mode === "org",
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
