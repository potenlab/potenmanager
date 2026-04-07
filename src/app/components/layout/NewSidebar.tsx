/**
 * NewSidebar — 개인/조직 모드 대응 사이드바
 *
 * 개인 모드: 내 업무, 캘린더, 자료실, 프로젝트, 도구
 * 조직 모드: + 팀, 채널관리, 비즈레이더
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { NavLink, useNavigate, useLocation } from "react-router";
import { useDrag, useDrop } from "react-dnd";
import {
  CheckSquare, Calendar, BookMarked, FolderKanban,
  Users, Palette, Radar, Crown,
  Wrench, ChevronDown, ChevronRight, Plus, Building2,
  User, Settings, Zap, LogOut, DollarSign, FileText, BarChart3, PenTool,
  Layers, X, MoreHorizontal, Trash2, Edit2,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { useSidebar } from "../../context/SidebarContext";
import { useTeam } from "../../context/TeamContext";
import { api } from "../../../lib/api";
import { supabase } from "../../context/AuthContext";
import { getEnabledTools } from "../../pages/ToolsPage";

interface NavItem {
  id: string;
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
  collapsible?: boolean;
}

// ─── Drag & Drop for sidebar menu reordering ──────────────────
const SIDEBAR_DND_TYPE = "SIDEBAR_NAV_ITEM";
const TOOL_DND_TYPE = "SIDEBAR_TOOL_ITEM";
const NAV_ORDER_KEY = "pm_sidebar_nav_order";

function loadNavOrder(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(NAV_ORDER_KEY) || '{}'); } catch { return {}; }
}
function saveNavOrder(orders: Record<string, string[]>) {
  localStorage.setItem(NAV_ORDER_KEY, JSON.stringify(orders));
}
function getOrderedItems(groupId: string, items: NavItem[]): NavItem[] {
  const stored = loadNavOrder()[groupId];
  if (!stored) return items;
  const itemMap = new Map(items.map(i => [i.id, i]));
  const ordered = stored.filter(id => itemMap.has(id)).map(id => itemMap.get(id)!);
  const missing = items.filter(i => !stored.includes(i.id));
  return [...ordered, ...missing];
}

function DraggableNavItem({ id, groupId, moveItem, children }: {
  id: string; groupId: string;
  moveItem: (fromId: string, toId: string) => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isDragging }, drag] = useDrag({
    type: `${SIDEBAR_DND_TYPE}_${groupId}`,
    item: { id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });
  const [, drop] = useDrop({
    accept: `${SIDEBAR_DND_TYPE}_${groupId}`,
    hover(dragItem: { id: string }) {
      if (dragItem.id !== id) moveItem(dragItem.id, id);
    },
  });
  drag(drop(ref));
  return (
    <div ref={ref} className={cn("cursor-grab active:cursor-grabbing", isDragging && "opacity-40")}>
      {children}
    </div>
  );
}

// ─── Draggable tool item (cross-section) ──────────────────
function DraggableToolItem({ toolId, fromSection, children }: {
  toolId: string; fromSection: string; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isDragging }, drag] = useDrag({
    type: TOOL_DND_TYPE,
    item: { toolId, fromSection },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });
  drag(ref);
  return (
    <div ref={ref} className={cn("cursor-grab active:cursor-grabbing", isDragging && "opacity-40")}>
      {children}
    </div>
  );
}

// ─── Drop zone for a section that accepts tools ──────────────────
function SectionDropZone({ sectionId, onDropTool, children }: {
  sectionId: string;
  onDropTool: (toolId: string, fromSection: string, toSection: string) => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isOver }, drop] = useDrop({
    accept: TOOL_DND_TYPE,
    drop(item: { toolId: string; fromSection: string }) {
      if (item.fromSection !== sectionId) {
        onDropTool(item.toolId, item.fromSection, sectionId);
      }
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });
  drop(ref);
  return (
    <div ref={ref} className={cn(isOver && "bg-blue-50/50 rounded-lg transition-colors")}>
      {children}
    </div>
  );
}

export function NewSidebar() {
  const { language } = useLanguage();
  const { mode, currentOrg, orgs, switchToPersonal, switchToOrg, isPersonal } = useWorkspace();
  const { signOut, user } = useAuth();
  const { isMobile, isCollapsed } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const ko = language === "ko";

  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false);
  const [salesExpanded, setSalesExpanded] = useState(false);
  const [teamExpanded, setTeamExpanded] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [sidebarMembers, setSidebarMembers] = useState<any[]>([]);
  const [enabledTools, setEnabledTools] = useState<string[]>(() => getEnabledTools());

  // ── Categories ──
  interface Category { id: string; name: string; memberIds: string[]; toolIds: string[]; orgId: string | null; }
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryMembers, setCategoryMembers] = useState<string[]>([]);
  const [categoryTools, setCategoryTools] = useState<string[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryMenuId, setCategoryMenuId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string> | null>(null);
  const [renamingCategoryId, setRenamingCategoryId] = useState<string | null>(null);
  const [renamingCategoryName, setRenamingCategoryName] = useState("");

  // ── Section ordering (개인 + categories) ──
  const SECTION_ORDER_KEY = "pm_sidebar_section_order";
  const loadSectionOrder = useCallback((): string[] => {
    try { return JSON.parse(localStorage.getItem(SECTION_ORDER_KEY) || '[]'); } catch { return []; }
  }, []);
  const [sectionOrder, setSectionOrder] = useState<string[]>(() => loadSectionOrder());

  const moveSectionItem = useCallback((fromId: string, toId: string) => {
    setSectionOrder(prev => {
      const items = [...prev];
      const fromIdx = items.indexOf(fromId);
      const toIdx = items.indexOf(toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      items.splice(fromIdx, 1);
      items.splice(toIdx, 0, fromId);
      localStorage.setItem(SECTION_ORDER_KEY, JSON.stringify(items));
      return items;
    });
  }, []);

  const { members: teamMembers } = useTeam();

  // Load categories (org or personal)
  useEffect(() => {
    if (!user?.id) { setCategories([]); return; }
    let query = supabase.from("pm_categories").select("*");
    if (currentOrg) {
      query = query.eq("org_id", currentOrg.id);
    } else {
      query = query.is("org_id", null).eq("created_by", user.id);
    }
    query.then(({ data }) => {
      if (data) {
        const cats = data.map((r: any) => ({ id: r.id, name: r.name, memberIds: r.member_ids || [], toolIds: r.tool_ids || [], orgId: r.org_id }));
        setCategories(cats);
        // Default: all categories expanded
        setExpandedCategories(prev => prev === null ? new Set(cats.map((c: any) => c.id)) : prev);
      }
    });
  }, [currentOrg, user?.id]);

  const saveCategory = async () => {
    if (!categoryName.trim() || !user?.id) return;
    if (editingCategory) {
      const { data, error } = await supabase.from("pm_categories").update({ name: categoryName.trim(), member_ids: categoryMembers, tool_ids: categoryTools }).eq("id", editingCategory.id).select().single();
      if (error) { console.error("카테고리 수정 실패:", error); alert(`카테고리 수정 실패: ${error.message}`); return; }
      if (data) setCategories(p => p.map(c => c.id === editingCategory.id ? { id: data.id, name: data.name, memberIds: data.member_ids || [], toolIds: data.tool_ids || [], orgId: data.org_id } : c));
    } else {
      const { data, error } = await supabase.from("pm_categories").insert({ name: categoryName.trim(), member_ids: categoryMembers, tool_ids: categoryTools, org_id: currentOrg?.id || null, created_by: user.id }).select().single();
      if (error) { console.error("카테고리 생성 실패:", JSON.stringify(error)); alert(`카테고리 생성 실패: ${error.message || error.code || JSON.stringify(error)}`); return; }
      if (data) {
        setCategories(p => [...p, { id: data.id, name: data.name, memberIds: data.member_ids || [], toolIds: data.tool_ids || [], orgId: data.org_id }]);
        setExpandedCategories(prev => new Set([...(prev || []), data.id]));
      }
    }
    setCategoryName(""); setCategoryMembers([]); setCategoryTools([]); setShowCategoryForm(false); setEditingCategory(null);
  };

  const toggleCategoryExpand = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev || []);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const renameCategory = async (id: string) => {
    const trimmed = renamingCategoryName.trim();
    if (!trimmed) { setRenamingCategoryId(null); return; }
    await supabase.from("pm_categories").update({ name: trimmed }).eq("id", id);
    setCategories(p => p.map(c => c.id === id ? { ...c, name: trimmed } : c));
    setRenamingCategoryId(null);
  };

  const deleteCategory = async (id: string) => {
    await supabase.from("pm_categories").delete().eq("id", id);
    setCategories(p => p.filter(c => c.id !== id));
    setCategoryMenuId(null);
  };

  // ── Move tool between sections (cross-section DnD) ──
  const moveToolToSection = useCallback(async (toolId: string, fromSection: string, toSection: string) => {
    // Remove from old category
    if (fromSection !== "personal") {
      const oldCat = categories.find(c => c.id === fromSection);
      if (oldCat) {
        const newToolIds = oldCat.toolIds.filter(t => t !== toolId);
        await supabase.from("pm_categories").update({ tool_ids: newToolIds }).eq("id", fromSection);
        setCategories(p => p.map(c => c.id === fromSection ? { ...c, toolIds: newToolIds } : c));
      }
    }
    // Add to new category
    if (toSection !== "personal") {
      const newCat = categories.find(c => c.id === toSection);
      if (newCat && !newCat.toolIds.includes(toolId)) {
        const newToolIds = [...newCat.toolIds, toolId];
        await supabase.from("pm_categories").update({ tool_ids: newToolIds }).eq("id", toSection);
        setCategories(p => p.map(c => c.id === toSection ? { ...c, toolIds: newToolIds } : c));
      }
    }
  }, [categories]);

  // Tools in any category → excluded from personal display
  const toolsInCategories = new Set(categories.flatMap(c => c.toolIds));

  // Load team members + attendance for sidebar
  useEffect(() => {
    if (isPersonal || !currentOrg) { setSidebarMembers([]); return; }
    // Fetch members directly for sidebar (in case TeamContext hasn't loaded yet)
    api.getTeamMembers().then(m => setSidebarMembers(m || [])).catch(() => {});
    const today = new Date().toISOString().split('T')[0];
    api.getAttendance(today).then(setTodayAttendance).catch(() => {});
    const interval = setInterval(() => {
      api.getAttendance(today).then(setTodayAttendance).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [isPersonal, currentOrg]);

  // Sync from TeamContext when it loads
  useEffect(() => {
    if (teamMembers.length > 0) setSidebarMembers(teamMembers);
  }, [teamMembers]);

  // Listen for attendance changes (immediate update)
  useEffect(() => {
    const handler = () => {
      const today = new Date().toISOString().split('T')[0];
      api.getAttendance(today).then(setTodayAttendance).catch(() => {});
    };
    window.addEventListener('attendance-changed', handler);
    return () => window.removeEventListener('attendance-changed', handler);
  }, []);

  // Listen for tools changes
  useEffect(() => {
    const handler = () => setEnabledTools(getEnabledTools());
    window.addEventListener('tools-changed', handler);
    return () => window.removeEventListener('tools-changed', handler);
  }, []);

  const members = sidebarMembers;

  // Compute ordered sections: "personal" + visible category IDs
  const visibleCategories = currentOrg
    ? categories.filter(cat => cat.memberIds.includes(user?.id || ""))
    : categories;
  const allSectionIds = ["personal", ...visibleCategories.map(c => c.id)];

  // Sync section order when categories change
  useEffect(() => {
    setSectionOrder(prev => {
      const known = prev.filter(id => allSectionIds.includes(id));
      const missing = allSectionIds.filter(id => !known.includes(id));
      const merged = [...known, ...missing];
      localStorage.setItem(SECTION_ORDER_KEY, JSON.stringify(merged));
      return merged;
    });
  }, [categories.length, isPersonal, currentOrg?.id, user?.id]);

  const orderedSectionIds = sectionOrder.length > 0
    ? sectionOrder.filter(id => allSectionIds.includes(id))
    : allSectionIds;
  // Add any missing
  const finalSectionIds = [
    ...orderedSectionIds,
    ...allSectionIds.filter(id => !orderedSectionIds.includes(id)),
  ];

  if (isMobile) return null;

  // ── Path prefix: personal = "/" , org = "/:slug/" ──
  const slug = currentOrg?.slug;
  const p = (path: string) => isPersonal ? path : `/${slug}${path}`;

  // Tool items that can be dynamically added to sidebar
  const TOOL_NAV_ITEMS: Record<string, NavItem> = {
    projects: { id: "projects", to: p("/projects"), icon: <FolderKanban size={16} />, label: ko ? "프로젝트" : "Projects" },
    branding: { id: "branding", to: p("/branding"), icon: <Palette size={16} />, label: ko ? "채널관리" : "Channels" },
    sales: { id: "sales", to: p("/sales"), icon: <DollarSign size={16} />, label: ko ? "고객관리" : "Clients" },
    "biz-radar": { id: "biz-radar", to: p("/radar"), icon: <BarChart3 size={16} />, label: ko ? "비즈 레이더" : "Biz Radar" },
    finance: { id: "finance", to: p("/finance"), icon: <BarChart3 size={16} />, label: ko ? "재무 관리" : "Finance" },
  };

  const personalToolIds = enabledTools.filter(t => TOOL_NAV_ITEMS[t] && !toolsInCategories.has(t));

  // ── Menu structure ──
  const personalItemsDef: NavItem[] = [
    { id: "tasks", to: p("/tasks"), icon: <CheckSquare size={16} />, label: ko ? "내 업무" : "My Tasks" },
    { id: "calendar", to: p("/calendar"), icon: <Calendar size={16} />, label: ko ? "캘린더" : "Calendar" },
    { id: "library", to: p("/library"), icon: <BookMarked size={16} />, label: ko ? "자료실" : "Library" },
  ];

  const orgItemsDef: NavItem[] = [
    // Only team is always shown in org mode
    ...(!isPersonal ? [{ id: "team", to: p("/team"), icon: <Users size={16} />, label: ko ? "팀" : "Team" }] : []),
  ];

  const [personalItems, setPersonalItems] = useState(() => getOrderedItems("personal", personalItemsDef));
  const [orgItems, setOrgItems] = useState(() => getOrderedItems("org", orgItemsDef));

  // Re-sync when language/org changes
  useEffect(() => { setPersonalItems(getOrderedItems("personal", personalItemsDef)); }, [ko, isPersonal, currentOrg?.slug]);
  useEffect(() => { setOrgItems(getOrderedItems("org", orgItemsDef)); }, [ko, isPersonal, currentOrg?.slug]);

  const moveItem = useCallback((groupId: string, fromId: string, toId: string) => {
    const setter = groupId === "personal" ? setPersonalItems : setOrgItems;
    setter(prev => {
      const items = [...prev];
      const fromIdx = items.findIndex(i => i.id === fromId);
      const toIdx = items.findIndex(i => i.id === toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = items.splice(fromIdx, 1);
      items.splice(toIdx, 0, moved);
      // Save order
      const orders = loadNavOrder();
      orders[groupId] = items.map(i => i.id);
      saveNavOrder(orders);
      return items;
    });
  }, []);

  const toolItems: NavItem[] = [
    // 나중에 하나씩 추가
    // { id: "card-news", to: "/tools/card-news", icon: <Zap size={16} />, label: ko ? "카드뉴스 생성기" : "Card News" },
  ];

  const isActive = (path: string) => {
    // Strip query params for comparison
    const clean = path.split("?")[0];
    return location.pathname === clean || location.pathname.startsWith(clean + "/");
  };

  // ── Render ──
  return (
    <aside className="fixed inset-y-0 left-0 z-[70] flex w-[260px] flex-col bg-[#FBFBFA] border-r border-gray-200">
      {/* Workspace Switcher */}
      <div className="px-3 pt-4 pb-2">
        <button
          onClick={() => setOrgSwitcherOpen(!orgSwitcherOpen)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white shrink-0">
            {isPersonal ? <User size={12} /> : <Building2 size={12} />}
          </div>
          <span className="text-sm font-semibold text-gray-900 truncate flex-1 text-left">
            {isPersonal ? (ko ? "개인 워크스페이스" : "Personal") : currentOrg?.name}
          </span>
          <ChevronDown size={14} className="text-gray-400 shrink-0" />
        </button>

        {/* Workspace Switcher Dropdown */}
        {orgSwitcherOpen && (
          <div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
            <button
              onClick={() => { switchToPersonal(); setOrgSwitcherOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors",
                isPersonal && "bg-blue-50 text-blue-600 font-semibold"
              )}
            >
              <User size={14} />
              {ko ? "개인 워크스페이스" : "Personal Workspace"}
            </button>

            {orgs.length > 0 && <div className="border-t border-gray-100 my-1" />}

            {orgs.map(({ org }) => (
              <button
                key={org.id}
                onClick={() => { switchToOrg(org.id); setOrgSwitcherOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors",
                  currentOrg?.id === org.id && "bg-blue-50 text-blue-600 font-semibold"
                )}
              >
                <Building2 size={14} />
                {org.name}
              </button>
            ))}

            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={() => { setOrgSwitcherOpen(false); navigate("/org/new"); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
            >
              <Plus size={14} />
              {ko ? "조직 만들기" : "Create Organization"}
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5 scrollbar-hide">
        {/* ── Sections: 개인 + categories, draggable to reorder ── */}
        {finalSectionIds.map(sectionId => {
          if (sectionId === "personal") {
            return (
              <DraggableNavItem key="personal" id="personal" groupId="sections" moveItem={(f, t) => moveSectionItem(f, t)}>
                <SectionDropZone sectionId="personal" onDropTool={moveToolToSection}>
                  <div>
                    <p className="px-2 mb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {ko ? "개인" : "Personal"}
                    </p>
                    <div className="space-y-0.5">
                      {/* Fixed items */}
                      <NavLink to={p("/tasks")} className={cn("flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[14px] transition-all duration-100", isActive("/tasks") ? "bg-gray-200/70 text-gray-900 font-semibold" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900")}>
                        <div className="shrink-0 text-gray-500"><CheckSquare size={16} /></div>
                        <span>{ko ? "내 업무" : "My Tasks"}</span>
                      </NavLink>
                      <NavLink to="/calendar" className={cn("flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[14px] transition-all duration-100", isActive("/calendar") ? "bg-gray-200/70 text-gray-900 font-semibold" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900")}>
                        <div className="shrink-0 text-gray-500"><Calendar size={16} /></div>
                        <span>{ko ? "캘린더" : "Calendar"}</span>
                      </NavLink>
                      <NavLink to={p("/library")} className={cn("flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[14px] transition-all duration-100", isActive("/library") ? "bg-gray-200/70 text-gray-900 font-semibold" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900")}>
                        <div className="shrink-0 text-gray-500"><BookMarked size={16} /></div>
                        <span>{ko ? "자료실" : "Library"}</span>
                      </NavLink>
                    </div>
                    {/* Draggable tool items (not in any category) */}
                    {personalToolIds.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {personalToolIds.map(toolId => {
                          const item = TOOL_NAV_ITEMS[toolId];
                          return (
                            <DraggableToolItem key={toolId} toolId={toolId} fromSection="personal">
                              <NavLink to={item.to} className={cn("flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[14px] transition-all duration-100", isActive(item.to) ? "bg-gray-200/70 text-gray-900 font-semibold" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900")}>
                                <div className="shrink-0 text-gray-500">{item.icon}</div>
                                <span>{item.label}</span>
                              </NavLink>
                            </DraggableToolItem>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </SectionDropZone>
              </DraggableNavItem>
            );
          }
          // Category section
          const cat = visibleCategories.find(c => c.id === sectionId);
          if (!cat) return null;
          return (
            <DraggableNavItem key={cat.id} id={cat.id} groupId="sections" moveItem={(f, t) => moveSectionItem(f, t)}>
              <SectionDropZone sectionId={cat.id} onDropTool={moveToolToSection}>
                <div>
                  <div className="flex items-center justify-between px-2 mb-1 group/cat-header">
                    {renamingCategoryId === cat.id ? (
                      <input
                        autoFocus
                        value={renamingCategoryName}
                        onChange={e => setRenamingCategoryName(e.target.value)}
                        onBlur={() => renameCategory(cat.id)}
                        onKeyDown={e => { if (e.key === "Enter") renameCategory(cat.id); if (e.key === "Escape") setRenamingCategoryId(null); }}
                        className="text-[10px] font-bold text-gray-600 uppercase tracking-wider bg-white border border-blue-300 rounded px-1 py-0.5 outline-none w-24"
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <button
                        onClick={() => toggleCategoryExpand(cat.id)}
                        onDoubleClick={(e) => { e.stopPropagation(); setRenamingCategoryId(cat.id); setRenamingCategoryName(cat.name); }}
                        className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
                      >
                        <span>{cat.name}</span>
                        <ChevronDown size={10} className={cn("transition-transform", !expandedCategories?.has(cat.id) && "-rotate-90")} />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setCategoryMenuId(categoryMenuId === cat.id ? null : cat.id); }}
                      className="p-0.5 text-gray-300 hover:text-gray-600 rounded opacity-0 group-hover/cat-header:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal size={12} />
                    </button>
                  </div>
                  {categoryMenuId === cat.id && (
                    <div className="mx-2 mb-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 min-w-[120px]">
                      <button onClick={() => { setEditingCategory(cat); setCategoryName(cat.name); setCategoryMembers(cat.memberIds); setCategoryTools(cat.toolIds); setShowCategoryForm(true); setCategoryMenuId(null); }}
                        className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Edit2 size={12} /> {ko ? "수정" : "Edit"}</button>
                      <button onClick={() => deleteCategory(cat.id)}
                        className="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"><Trash2 size={12} /> {ko ? "삭제" : "Delete"}</button>
                    </div>
                  )}
                  {expandedCategories?.has(cat.id) && (
                    <div className="space-y-0.5">
                      {cat.toolIds.length > 0 ? cat.toolIds.filter(t => TOOL_NAV_ITEMS[t]).map(toolId => {
                        const item = TOOL_NAV_ITEMS[toolId];
                        return (
                          <DraggableToolItem key={toolId} toolId={toolId} fromSection={cat.id}>
                            <NavLink to={item.to} className={cn("flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[14px] transition-all duration-100", isActive(item.to) ? "bg-gray-200/70 text-gray-900 font-semibold" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900")}>
                              <div className="shrink-0 text-gray-500">{item.icon}</div>
                              <span>{item.label}</span>
                            </NavLink>
                          </DraggableToolItem>
                        );
                      }) : (
                        <p className="px-2 py-1 text-[12px] text-gray-400 italic">
                          {ko ? "도구를 드래그해서 추가하세요" : "Drag tools here"}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </SectionDropZone>
            </DraggableNavItem>
          );
        })}

        {/* Category add button (inline, below categories) */}
        <div>
          {!showCategoryForm && (
            <button onClick={() => { setShowCategoryForm(true); setEditingCategory(null); setCategoryName(""); setCategoryMembers([]); setCategoryTools([]); }}
              className="flex items-center gap-2 px-2 py-1.5 text-[12px] text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors w-full">
              <Plus size={14} />
              <span>{ko ? "카테고리 추가" : "Add category"}</span>
            </button>
          )}
          {/* Category form */}
          {showCategoryForm && (
            <div className="p-3 bg-white border border-blue-200 rounded-xl shadow-sm">
              <input
                autoFocus
                value={categoryName}
                onChange={e => setCategoryName(e.target.value)}
                onKeyDown={e => { if (e.key === "Escape") setShowCategoryForm(false); }}
                placeholder={ko ? (currentOrg ? "카테고리 이름 (예: A부서, 마케팅팀)" : "카테고리 이름 (예: 업무, 개인)") : "Category name"}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-300 mb-2"
              />
              <p className="text-[10px] text-gray-400 font-medium mb-1">{ko ? "도구 선택" : "Select tools"}</p>
              <div className="max-h-[100px] overflow-y-auto space-y-1 mb-2">
                {Object.entries(TOOL_NAV_ITEMS).map(([toolId, item]) => (
                  <label key={toolId} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 cursor-pointer text-sm">
                    <input type="checkbox" checked={categoryTools.includes(toolId)}
                      onChange={e => setCategoryTools(e.target.checked ? [...categoryTools, toolId] : categoryTools.filter(id => id !== toolId))}
                      className="rounded border-gray-300" />
                    <div className="shrink-0 text-gray-500">{item.icon}</div>
                    <span className="text-gray-700 truncate">{item.label}</span>
                  </label>
                ))}
              </div>
              {currentOrg && (
                <>
                  <p className="text-[10px] text-gray-400 font-medium mb-1">{ko ? "멤버 선택" : "Select members"}</p>
                  <div className="max-h-[120px] overflow-y-auto space-y-1 mb-2">
                    {teamMembers.map(m => (
                      <label key={m.id} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 cursor-pointer text-sm">
                        <input type="checkbox" checked={categoryMembers.includes(m.id)}
                          onChange={e => setCategoryMembers(e.target.checked ? [...categoryMembers, m.id] : categoryMembers.filter(id => id !== m.id))}
                          className="rounded border-gray-300" />
                        <img src={m.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${m.name}`} alt="" className="w-5 h-5 rounded-full" />
                        <span className="text-gray-700 truncate">{m.name}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
              <div className="flex gap-1.5 justify-end">
                <button onClick={() => setShowCategoryForm(false)} className="px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-lg">{ko ? "취소" : "Cancel"}</button>
                <button onClick={saveCategory} className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">{ko ? "저장" : "Save"}</button>
              </div>
            </div>
          )}
        </div>

        {/* Upgrade to Org (personal mode only) */}
        {isPersonal && orgs.length === 0 && (
          <div className="px-2">
            <button
              onClick={() => navigate("/org/new")}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Zap size={14} />
              {ko ? "조직으로 확장하기" : "Upgrade to Organization"}
            </button>
          </div>
        )}
      </nav>

      {/* ── Bottom area ── */}
      <div className="border-t border-gray-200 px-3 py-3 space-y-1">
        {/* Org section: team */}
        {!isPersonal && currentOrg && (
          <div className="mb-2">
            <p className="px-2 mb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              {currentOrg.name}
            </p>
            <button
              onClick={() => { setTeamExpanded(!teamExpanded); navigate(p("/team")); }}
              className={cn(
                "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[14px] transition-all duration-100",
                isActive(p("/team"))
                  ? "bg-gray-200/70 text-gray-900 font-semibold"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <div className="shrink-0 text-gray-500"><Users size={16} /></div>
              <span className="flex-1 text-left">{ko ? "팀" : "Team"}</span>
              <ChevronDown size={14} className={cn("text-gray-400 transition-transform", !teamExpanded && "-rotate-90")} />
            </button>
            {teamExpanded && members.length > 0 && (
              <div className="ml-4 mt-0.5 space-y-0.5">
                {members.map(m => {
                  const att = todayAttendance.find((a: any) => a.userId === m.id);
                  const status = att?.currentStatus || (att?.checkOut ? 'off' : att?.checkIn ? 'working' : null);
                  return (
                    <div key={m.id} className="flex items-center gap-2 px-2 py-1 rounded-md text-[13px] text-gray-500">
                      <div className={cn("w-2 h-2 rounded-full shrink-0",
                        status === 'working' ? "bg-green-500" :
                        status === 'break' ? "bg-amber-400" :
                        status === 'off' ? "bg-gray-300" : "bg-gray-200"
                      )} />
                      <span className="truncate">{m.name || m.email?.split('@')[0]}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* User Profile */}
        {user && (
          <NavLink to="/mypage" className="flex items-center gap-2.5 px-2 py-2 mb-1 rounded-lg hover:bg-gray-100 transition-all cursor-pointer group">
            <img
              src={user.user_metadata?.avatar_url || user.user_metadata?.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email || 'U'}`}
              alt=""
              className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0 group-hover:ring-2 group-hover:ring-blue-200"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '사용자'}
              </p>
              <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
            </div>
          </NavLink>
        )}

        {/* 도구 */}
        <NavLink to="/tools" className={cn("flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[14px] transition-all", isActive("/tools") ? "bg-gray-200/70 text-gray-900 font-semibold" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700")}>
          <Wrench size={16} />
          {ko ? "도구" : "Tools"}
        </NavLink>
        <NavLink to="/settings" className={cn("flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[14px] transition-all", isActive("/settings") ? "bg-gray-200/70 text-gray-900 font-semibold" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700")}>
          <Settings size={16} />
          {ko ? "설정" : "Settings"}
        </NavLink>
        <button
          onClick={async () => { await signOut(); navigate("/login"); }}
          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[14px] text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all"
        >
          <LogOut size={16} />
          {ko ? "로그아웃" : "Sign Out"}
        </button>
      </div>
    </aside>
  );
}
