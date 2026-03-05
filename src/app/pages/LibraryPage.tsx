import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import {
  Plus, Search, BookMarked, Globe, FileText, Link as LinkIcon,
  Trash2, X, ExternalLink, Check, Archive, Lock, Pencil, MoreHorizontal,
  LayoutGrid, List,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useLibrary, LibraryItem } from "../context/LibraryContext";
import { useTeam } from "../context/TeamContext";
import { useTrash } from "../context/TrashContext";

// ─── Predefined Archive Categories ──────────────────────────────
export const ARCHIVE_CATEGORIES = [
  { value: "development", labelKo: "개발", labelEn: "Dev" },
  { value: "content_writing", labelKo: "콘텐츠(글쓰기)", labelEn: "Content (Writing)" },
  { value: "content_video", labelKo: "콘텐츠(영상)", labelEn: "Content (Video)" },
  { value: "marketing", labelKo: "마케팅", labelEn: "Marketing" },
  { value: "design", labelKo: "디자인", labelEn: "Design" },
  { value: "planning", labelKo: "기획", labelEn: "Planning" },
  { value: "sales", labelKo: "영업", labelEn: "Sales" },
  { value: "operations", labelKo: "운영/관리", labelEn: "Ops" },
  { value: "learning", labelKo: "학습", labelEn: "Learning" },
];

const MAX_CATEGORIES = 20;

export function getCategoryLabel(value: string | undefined, ko: boolean): string {
  if (!value) return "";
  const cat = ARCHIVE_CATEGORIES.find((c) => c.value === value);
  if (cat) return ko ? cat.labelKo : cat.labelEn;
  return value;
}

export function isPredefinedCategory(cat: string): boolean {
  return ARCHIVE_CATEGORIES.some((c) => c.value === cat);
}

// ─── Compact Kanban Card ──────────────────────────────────────────
function KanbanCard({
  item,
  onClick,
  isOwner,
  onContextMenu,
}: {
  item: LibraryItem;
  onClick: () => void;
  isOwner?: boolean;
  onContextMenu?: (e: React.MouseEvent, id: string) => void;
}) {
  const { language } = useLanguage();
  const ko = language === "ko";

  const domain = item.url
    ? (() => {
        try { return new URL(item.url).hostname.replace("www.", ""); }
        catch { return ""; }
      })()
    : "";

  const hasOgImage = item.type === "url" && item.ogMetadata?.ogImage;
  const ogDesc = item.ogMetadata?.ogDescription || item.description;
  const favicon = item.ogMetadata?.favicon;

  return (
    <div
      onClick={onClick}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(e, item.id); }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group overflow-hidden"
    >
      {/* OG image thumbnail */}
      {hasOgImage && (
        <div className="h-28 bg-gray-100 overflow-hidden">
          <img src={item.ogMetadata!.ogImage} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-3">
        <p className="text-[13px] font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
          {item.title || (ko ? "제목 없음" : "Untitled")}
        </p>
        {ogDesc && (
          <p className="text-[11px] text-gray-500 line-clamp-2 mt-1 leading-relaxed">{ogDesc}</p>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {domain && (
            <span className="flex items-center gap-1 text-[10px] text-gray-400 min-w-0 truncate">
              {favicon ? (
                <img src={favicon} alt="" className="w-3 h-3 rounded-sm shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <LinkIcon size={10} className="shrink-0" />
              )}
              <span className="truncate">{domain}</span>
            </span>
          )}
          {!domain && item.type === "note" && (
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <FileText size={10} /> {ko ? "노트" : "Note"}
            </span>
          )}
          {isOwner && (
            <span className={cn(
              "flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ml-auto",
              item.visibility === "published"
                ? "text-emerald-600 bg-emerald-50"
                : "text-gray-400 bg-gray-50"
            )}>
              {item.visibility === "published" ? <Globe size={8} /> : <Lock size={8} />}
              {item.visibility === "published" ? (ko ? "공개" : "Public") : (ko ? "비공개" : "Private")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────
function KanbanColumn({
  title,
  items,
  onCardClick,
  onAddItem,
  isOwnerFn,
  onContextMenu,
  onRemoveColumn,
  isCustom,
}: {
  title: string;
  items: LibraryItem[];
  onCardClick: (id: string) => void;
  onAddItem?: (category: string) => void;
  isOwnerFn: (item: LibraryItem) => boolean;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  onRemoveColumn?: () => void;
  isCustom?: boolean;
}) {
  return (
    <div className="flex flex-col w-[280px] shrink-0 bg-gray-50/70 rounded-2xl border border-gray-100">
      {/* Column header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[13px] font-bold text-gray-700 truncate">{title}</span>
          <span className="text-[11px] font-semibold text-gray-400 bg-gray-200/60 rounded-full px-1.5 min-w-[20px] text-center">
            {items.length}
          </span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {onAddItem && (
            <button
              onClick={() => onAddItem(title)}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            >
              <Plus size={14} />
            </button>
          )}
          {isCustom && onRemoveColumn && items.length === 0 && (
            <button
              onClick={onRemoveColumn}
              className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px] max-h-[calc(100vh-240px)] scrollbar-hide">
        {items.map((item) => (
          <KanbanCard
            key={item.id}
            item={item}
            onClick={() => onCardClick(item.id)}
            isOwner={isOwnerFn(item)}
            onContextMenu={onContextMenu}
          />
        ))}
        {items.length === 0 && (
          <div className="flex items-center justify-center py-8 text-gray-300 text-[11px]">
            비어 있음
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
export function LibraryPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const ko = language === "ko";
  const {
    items,
    myItems,
    teamItems,
    customCategories,
    isLoading,
    updateItem,
    removeItem,
    getItem,
    addCategory,
    removeCategory,
  } = useLibrary();
  const { currentUser } = useTeam();
  const { moveToTrash } = useTrash();

  const [activeTab, setActiveTab] = useState<"all" | "my" | "team">("all");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"kanban" | "compact">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const newCatInputRef = useRef<HTMLInputElement>(null);

  // ── Right-click context menu ──
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const handleCardContextMenu = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, id });
  }, []);
  const closeCtxMenu = useCallback(() => setCtxMenu(null), []);

  // All visible items
  const allVisibleItems = useMemo(
    () => items.filter((i) => i.ownerId === currentUser.id || i.visibility === "published"),
    [items, currentUser.id]
  );

  const baseItems = activeTab === "all" ? allVisibleItems : activeTab === "my" ? myItems : teamItems;

  // Search filter
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return baseItems;
    const q = searchQuery.toLowerCase();
    return baseItems.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.url?.toLowerCase().includes(q)
    );
  }, [baseItems, searchQuery]);

  // Build column list: uncategorized + predefined + custom
  const allColumns = useMemo(() => {
    const cols: { key: string; label: string; isCustom: boolean }[] = [];
    // Uncategorized
    cols.push({ key: "__uncategorized__", label: ko ? "미분류" : "Uncategorized", isCustom: false });
    // Predefined
    ARCHIVE_CATEGORIES.forEach((cat) => {
      cols.push({ key: cat.value, label: ko ? cat.labelKo : cat.labelEn, isCustom: false });
    });
    // Custom
    customCategories.forEach((name) => {
      cols.push({ key: name, label: name, isCustom: true });
    });
    return cols;
  }, [ko, customCategories]);

  // Group items into columns
  const columnItems = useMemo(() => {
    const map: Record<string, LibraryItem[]> = {};
    allColumns.forEach((col) => { map[col.key] = []; });

    filteredItems.forEach((item) => {
      const cat = item.category;
      if (!cat) {
        map["__uncategorized__"]?.push(item);
      } else if (map[cat]) {
        map[cat].push(item);
      } else {
        // Custom category from item that isn't in our column list (e.g. from "other" input)
        if (!map[cat]) map[cat] = [];
        map[cat].push(item);
      }
    });

    // Sort each column by date
    Object.values(map).forEach((arr) => {
      arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });

    return map;
  }, [filteredItems, allColumns]);

  // Extra columns from items with categories not in allColumns
  const extraColumns = useMemo(() => {
    const knownKeys = new Set(allColumns.map((c) => c.key));
    const extras: { key: string; label: string; isCustom: boolean }[] = [];
    Object.keys(columnItems).forEach((key) => {
      if (!knownKeys.has(key) && columnItems[key].length > 0) {
        extras.push({ key, label: key, isCustom: true });
      }
    });
    return extras;
  }, [allColumns, columnItems]);

  const displayColumns = useMemo(() => {
    const all = [...allColumns, ...extraColumns];
    if (selectedCategories.size === 0) return all;
    return all.filter((col) => selectedCategories.has(col.key));
  }, [allColumns, extraColumns, selectedCategories]);

  const totalCatCount = ARCHIVE_CATEGORIES.length + customCategories.length + extraColumns.length;

  const handleAddCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    if (totalCatCount >= MAX_CATEGORIES) return;
    addCategory(name);
    setNewCatName("");
    setAddingCategory(false);
  };

  const isOwnerFn = useCallback(
    (item: LibraryItem) => item.ownerId === currentUser.id,
    [currentUser.id]
  );

  useEffect(() => {
    if (addingCategory && newCatInputRef.current) {
      newCatInputRef.current.focus();
    }
  }, [addingCategory]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="mb-4 shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
              <Archive className="inline-block mr-2 -mt-0.5" size={22} />
              {ko ? "아카이빙" : "Archive"}
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm">
              {ko
                ? `전체 ${allVisibleItems.length}건 · 내 자료 ${myItems.length}건 · 팀 공유 ${teamItems.length}건`
                : `All ${allVisibleItems.length} · Mine ${myItems.length} · Team ${teamItems.length}`}
            </p>
          </div>
          <button
            onClick={() => navigate("/library/new")}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all"
          >
            <Plus size={16} />
            {ko ? "자료 추가" : "Add Item"}
          </button>
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setActiveTab("all"); setSearchQuery(""); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border",
                activeTab === "all"
                  ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                  : "bg-white text-gray-500 border-gray-100 hover:border-gray-300"
              )}
            >
              <Archive size={15} />
              {ko ? "전체" : "All"}
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold", activeTab === "all" ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-500")}>
                {allVisibleItems.length}
              </span>
            </button>
            <button
              onClick={() => { setActiveTab("my"); setSearchQuery(""); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border",
                activeTab === "my"
                  ? "bg-blue-50 text-blue-700 border-blue-200 shadow-sm"
                  : "bg-white text-gray-500 border-gray-100 hover:border-gray-300"
              )}
            >
              <BookMarked size={15} />
              {ko ? "내 자료" : "Mine"}
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold", activeTab === "my" ? "bg-blue-200 text-blue-700" : "bg-gray-100 text-gray-500")}>
                {myItems.length}
              </span>
            </button>
            <button
              onClick={() => { setActiveTab("team"); setSearchQuery(""); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border",
                activeTab === "team"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm"
                  : "bg-white text-gray-500 border-gray-100 hover:border-gray-300"
              )}
            >
              <Globe size={15} />
              {ko ? "팀 공유" : "Team"}
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold", activeTab === "team" ? "bg-emerald-200 text-emerald-700" : "bg-gray-100 text-gray-500")}>
                {teamItems.length}
              </span>
            </button>
          </div>
          <div className="flex-1 sm:max-w-xs">
            <div className="flex items-center w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all shadow-sm">
              <Search className="text-gray-400 mr-2 shrink-0" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={ko ? "검색..." : "Search..."}
                className="w-full text-sm outline-none bg-transparent placeholder-gray-400 text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* Category tabs + view toggle */}
        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSelectedCategories(new Set())}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border",
                  selectedCategories.size === 0
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                )}
              >
                {ko ? "전체" : "All"}
              </button>
              {[...allColumns, ...extraColumns].map((col) => {
                const count = (columnItems[col.key] || []).length;
                const isSelected = selectedCategories.has(col.key);
                return (
                  <button
                    key={col.key}
                    onClick={() => {
                      const next = new Set(selectedCategories);
                      if (next.has(col.key)) next.delete(col.key);
                      else next.add(col.key);
                      setSelectedCategories(next);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border",
                      isSelected
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                    )}
                  >
                    {col.label}
                    {count > 0 && (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                        isSelected ? "bg-blue-200 text-blue-700" : "bg-gray-100 text-gray-400"
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
              {totalCatCount < MAX_CATEGORIES && (
                <button
                  onClick={() => setAddingCategory(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 border border-dashed border-gray-200 hover:border-blue-300 whitespace-nowrap transition-all"
                >
                  <Plus size={12} />
                  {ko ? "추가" : "Add"}
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 border border-gray-200 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("kanban")}
              className={cn(
                "p-1.5 rounded-md transition-all",
                viewMode === "kanban" ? "bg-gray-900 text-white" : "text-gray-400 hover:text-gray-600"
              )}
              title={ko ? "칸반 보기" : "Kanban view"}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode("compact")}
              className={cn(
                "p-1.5 rounded-md transition-all",
                viewMode === "compact" ? "bg-gray-900 text-white" : "text-gray-400 hover:text-gray-600"
              )}
              title={ko ? "작게 보기" : "Compact view"}
            >
              <List size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Add category inline input (shown when adding from tab bar) */}
      {addingCategory && (
        <div className="shrink-0 mb-3 flex items-center gap-2 px-1">
          <input
            ref={newCatInputRef}
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddCategory();
              if (e.key === "Escape") { setAddingCategory(false); setNewCatName(""); }
            }}
            placeholder={ko ? "카테고리 이름" : "Category name"}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-100 w-48"
            maxLength={30}
          />
          <button
            onClick={handleAddCategory}
            disabled={!newCatName.trim()}
            className="px-3 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {ko ? "추가" : "Add"}
          </button>
          <button
            onClick={() => { setAddingCategory(false); setNewCatName(""); }}
            className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            {ko ? "취소" : "Cancel"}
          </button>
          <span className="text-[10px] text-gray-400">
            {totalCatCount}/{MAX_CATEGORIES}
          </span>
        </div>
      )}

      {viewMode === "kanban" ? (
        /* Kanban Board */
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
          <div className="flex gap-3 h-full min-w-max pr-4">
            {displayColumns.map((col) => (
              <KanbanColumn
                key={col.key}
                title={col.label}
                items={columnItems[col.key] || []}
                onCardClick={(id) => navigate(`/library/${id}`)}
                isOwnerFn={isOwnerFn}
                onContextMenu={handleCardContextMenu}
                isCustom={col.isCustom}
                onRemoveColumn={col.isCustom ? () => removeCategory(col.key) : undefined}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Compact List View */
        <div className="flex-1 overflow-y-auto pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 px-1">
            {displayColumns.flatMap((col) =>
              (columnItems[col.key] || []).map((item) => {
                const domain = item.url
                  ? (() => { try { return new URL(item.url).hostname.replace("www.", ""); } catch { return ""; } })()
                  : "";
                const favicon = item.ogMetadata?.favicon;
                return (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/library/${item.id}`)}
                    onContextMenu={(e) => { e.preventDefault(); handleCardContextMenu(e, item.id); }}
                    className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl border border-gray-100 hover:border-gray-300 hover:shadow-sm cursor-pointer transition-all group"
                  >
                    {item.ogMetadata?.ogImage && (
                      <img src={item.ogMetadata.ogImage} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {item.title || (ko ? "제목 없음" : "Untitled")}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {domain && (
                          <span className="flex items-center gap-1 text-[10px] text-gray-400 truncate">
                            {favicon ? (
                              <img src={favicon} alt="" className="w-3 h-3 rounded-sm shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                              <LinkIcon size={9} className="shrink-0" />
                            )}
                            {domain}
                          </span>
                        )}
                        {!domain && item.type === "note" && (
                          <span className="flex items-center gap-1 text-[10px] text-gray-400">
                            <FileText size={9} /> {ko ? "노트" : "Note"}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-300">
                          {getCategoryLabel(item.category, ko) || (ko ? "미분류" : "Uncategorized")}
                        </span>
                      </div>
                    </div>
                    {isOwnerFn(item) && (
                      <span className={cn(
                        "shrink-0 w-2 h-2 rounded-full",
                        item.visibility === "published" ? "bg-emerald-400" : "bg-gray-300"
                      )} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Right-click context menu */}
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-[70]" onClick={closeCtxMenu} onContextMenu={(e) => { e.preventDefault(); closeCtxMenu(); }} />
          <div
            className="fixed z-[71] bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-100"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            <button
              onClick={() => { navigate(`/library/${ctxMenu.id}`); closeCtxMenu(); }}
              className="w-full px-3 py-2 text-xs text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <Pencil size={13} /> {ko ? '수정' : 'Edit'}
            </button>
            <div className="mx-2 my-0.5 border-t border-gray-100" />
            <button
              onClick={() => {
                const item = getItem(ctxMenu.id);
                if (item) {
                  moveToTrash({ id: item.id, type: 'library', title: item.title, data: item, deletedAt: new Date().toISOString() });
                }
                removeItem(ctxMenu.id);
                closeCtxMenu();
              }}
              className="w-full px-3 py-2 text-xs text-left text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
            >
              <Trash2 size={13} /> {ko ? '삭제' : 'Delete'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
