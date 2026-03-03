import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  Plus, Search, BookMarked, Globe, FileText, Link as LinkIcon,
  Trash2, X, ExternalLink, Check, Archive, Lock,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useLibrary, LibraryItem } from "../context/LibraryContext";
import { useTeam } from "../context/TeamContext";

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

export function getCategoryLabel(value: string | undefined, ko: boolean): string {
  if (!value) return "";
  const cat = ARCHIVE_CATEGORIES.find((c) => c.value === value);
  if (cat) return ko ? cat.labelKo : cat.labelEn;
  return value;
}

export function isPredefinedCategory(cat: string): boolean {
  return ARCHIVE_CATEGORIES.some((c) => c.value === cat);
}

// ─── Archive Card ────────────────────────────────────────────────
function ArchiveCard({
  item,
  onClick,
  isSelected,
  isSelecting,
  onToggleSelect,
  onToggleVisibility,
  isOwner,
}: {
  item: LibraryItem;
  onClick: () => void;
  isSelected?: boolean;
  isSelecting?: boolean;
  onToggleSelect?: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
  isOwner?: boolean;
}) {
  const { language } = useLanguage();
  const ko = language === "ko";

  const domain = item.url
    ? (() => {
        try {
          return new URL(item.url).hostname.replace("www.", "");
        } catch {
          return "";
        }
      })()
    : "";

  const categoryLabel = getCategoryLabel(item.category, ko);

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer group p-3 relative",
        isSelected
          ? "border-blue-400 ring-2 ring-blue-100"
          : "border-gray-100 hover:border-blue-200"
      )}
    >
      {/* Checkbox */}
      <div
        className={cn(
          "absolute top-2 right-2 z-10 transition-all",
          isSelecting || isSelected
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100"
        )}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(item.id);
          }}
          className={cn(
            "w-5 h-5 rounded border-2 flex items-center justify-center shadow-sm transition-all",
            isSelected
              ? "bg-blue-500 border-blue-500"
              : "border-gray-300 bg-white hover:border-blue-400"
          )}
        >
          {isSelected && (
            <Check size={12} className="text-white" strokeWidth={3} />
          )}
        </button>
      </div>

      <div className="flex items-start gap-3">
        {/* Thumbnail */}
        {item.type === "url" && item.ogMetadata?.ogImage ? (
          <img
            src={item.ogMetadata.ogImage}
            alt=""
            className="w-12 h-12 rounded-lg object-cover shrink-0 bg-gray-100"
          />
        ) : (
          <div
            className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center shrink-0",
              item.type === "url" ? "bg-blue-50" : "bg-amber-50"
            )}
          >
            {item.type === "url" ? (
              <LinkIcon size={18} className="text-blue-400" />
            ) : (
              <FileText size={18} className="text-amber-400" />
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
            {item.title || (ko ? "제목 없음" : "Untitled")}
          </p>
          {domain && (
            <p className="text-[11px] text-gray-400 truncate flex items-center gap-1 mt-0.5">
              <ExternalLink size={9} /> {domain}
            </p>
          )}
          {item.description && !domain && (
            <p className="text-[11px] text-gray-400 truncate mt-0.5">
              {item.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {categoryLabel && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {categoryLabel}
              </span>
            )}
            <span className="text-[9px] text-gray-300">
              {new Date(item.createdAt).toLocaleDateString(
                ko ? "ko-KR" : "en-US",
                { month: "short", day: "numeric" }
              )}
            </span>
            {/* Visibility toggle */}
            {isOwner ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisibility?.(item.id);
                }}
                className={cn(
                  "flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full transition-colors",
                  item.visibility === "published"
                    ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                    : "text-gray-400 bg-gray-50 hover:bg-gray-100"
                )}
              >
                {item.visibility === "published" ? (
                  <Globe size={8} />
                ) : (
                  <Lock size={8} />
                )}
                {item.visibility === "published"
                  ? ko
                    ? "공개"
                    : "Public"
                  : ko
                    ? "비공개"
                    : "Private"}
              </button>
            ) : (
              item.visibility === "published" && (
                <span className="flex items-center gap-0.5 text-[9px] text-emerald-500 font-medium">
                  <Globe size={8} /> {ko ? "공개" : "Public"}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Selection Toolbar ───────────────────────────────────────────
function SelectionToolbar({
  count,
  language,
  onPublish,
  onUnpublish,
  onDelete,
  onClear,
}: {
  count: number;
  language: string;
  onPublish: () => void;
  onUnpublish: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;
  const ko = language === "ko";
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-4">
      <span className="text-sm font-bold">
        {count}
        {ko ? "개 선택" : " selected"}
      </span>
      <div className="w-px h-5 bg-gray-700" />
      <button
        onClick={onPublish}
        className="text-xs px-2.5 py-1 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1"
      >
        <Globe size={12} /> {ko ? "공개" : "Publish"}
      </button>
      <button
        onClick={onUnpublish}
        className="text-xs px-2.5 py-1 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1"
      >
        <BookMarked size={12} /> {ko ? "비공개" : "Private"}
      </button>
      <div className="w-px h-5 bg-gray-700" />
      <button
        onClick={onDelete}
        className="text-xs px-2.5 py-1 rounded-lg text-red-400 hover:bg-red-900/40 transition-colors flex items-center gap-1"
      >
        <Trash2 size={12} /> {ko ? "삭제" : "Delete"}
      </button>
      <button
        onClick={onClear}
        className="p-1 text-gray-400 hover:text-white rounded transition-colors ml-1"
      >
        <X size={14} />
      </button>
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
    isLoading,
    updateItem,
    removeItem,
  } = useLibrary();
  const { currentUser } = useTeam();

  const [activeTab, setActiveTab] = useState<"all" | "my" | "team">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // All visible items (my items + others' published items)
  const allVisibleItems = useMemo(
    () =>
      items.filter(
        (i) =>
          i.ownerId === currentUser.id || i.visibility === "published"
      ),
    [items, currentUser.id]
  );

  const baseItems =
    activeTab === "all"
      ? allVisibleItems
      : activeTab === "my"
        ? myItems
        : teamItems;

  // Filter by category + search
  const filteredItems = useMemo(() => {
    let result = baseItems;

    if (categoryFilter) {
      if (categoryFilter === "other") {
        result = result.filter(
          (i) => i.category && !isPredefinedCategory(i.category)
        );
      } else {
        result = result.filter((i) => i.category === categoryFilter);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q) ||
          i.url?.toLowerCase().includes(q)
      );
    }

    return result.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [baseItems, categoryFilter, searchQuery]);

  // Category counts for filter badges
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    baseItems.forEach((i) => {
      if (!i.category) return;
      if (isPredefinedCategory(i.category)) {
        counts[i.category] = (counts[i.category] || 0) + 1;
      } else {
        counts["other"] = (counts["other"] || 0) + 1;
      }
    });
    return counts;
  }, [baseItems]);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isSelecting = selectedIds.size > 0;
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedIds.size > 0) clearSelection();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIds, clearSelection]);

  // Visibility toggle
  const handleToggleVisibility = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id);
      if (item) {
        updateItem(id, {
          visibility:
            item.visibility === "published" ? "private" : "published",
        });
      }
    },
    [items, updateItem]
  );

  // Bulk operations
  const handleBulkPublish = useCallback(() => {
    selectedIds.forEach((id) =>
      updateItem(id, { visibility: "published" })
    );
    clearSelection();
  }, [selectedIds, updateItem, clearSelection]);

  const handleBulkUnpublish = useCallback(() => {
    selectedIds.forEach((id) =>
      updateItem(id, { visibility: "private" })
    );
    clearSelection();
  }, [selectedIds, updateItem, clearSelection]);

  const handleBulkDelete = useCallback(() => {
    if (
      !confirm(
        ko
          ? `${selectedIds.size}개 자료를 삭제하시겠습니까?`
          : `Delete ${selectedIds.size} items?`
      )
    )
      return;
    selectedIds.forEach((id) => removeItem(id));
    clearSelection();
  }, [selectedIds, removeItem, clearSelection, ko]);

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
      <header className="mb-5 shrink-0">
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
              onClick={() => {
                setActiveTab("all");
                setSearchQuery("");
                setCategoryFilter("");
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border",
                activeTab === "all"
                  ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                  : "bg-white text-gray-500 border-gray-100 hover:border-gray-300"
              )}
            >
              <Archive size={15} />
              {ko ? "전체" : "All"}
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                  activeTab === "all"
                    ? "bg-gray-700 text-gray-200"
                    : "bg-gray-100 text-gray-500"
                )}
              >
                {allVisibleItems.length}
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab("my");
                setSearchQuery("");
                setCategoryFilter("");
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border",
                activeTab === "my"
                  ? "bg-blue-50 text-blue-700 border-blue-200 shadow-sm"
                  : "bg-white text-gray-500 border-gray-100 hover:border-gray-300"
              )}
            >
              <BookMarked size={15} />
              {ko ? "내 자료" : "Mine"}
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                  activeTab === "my"
                    ? "bg-blue-200 text-blue-700"
                    : "bg-gray-100 text-gray-500"
                )}
              >
                {myItems.length}
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab("team");
                setSearchQuery("");
                setCategoryFilter("");
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border",
                activeTab === "team"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm"
                  : "bg-white text-gray-500 border-gray-100 hover:border-gray-300"
              )}
            >
              <Globe size={15} />
              {ko ? "팀 공유" : "Team"}
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                  activeTab === "team"
                    ? "bg-emerald-200 text-emerald-700"
                    : "bg-gray-100 text-gray-500"
                )}
              >
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

        {/* Category filter chips */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setCategoryFilter("")}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
              !categoryFilter
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
            )}
          >
            {ko ? "전체" : "All"}
          </button>
          {ARCHIVE_CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.value] || 0;
            return (
              <button
                key={cat.value}
                onClick={() =>
                  setCategoryFilter(
                    categoryFilter === cat.value ? "" : cat.value
                  )
                }
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border flex items-center gap-1",
                  categoryFilter === cat.value
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                )}
              >
                {ko ? cat.labelKo : cat.labelEn}
                {count > 0 && (
                  <span className="text-[9px] font-bold">{count}</span>
                )}
              </button>
            );
          })}
          {(categoryCounts["other"] || 0) > 0 && (
            <button
              onClick={() =>
                setCategoryFilter(
                  categoryFilter === "other" ? "" : "other"
                )
              }
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border flex items-center gap-1",
                categoryFilter === "other"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
              )}
            >
              {ko ? "기타" : "Other"}
              <span className="text-[9px] font-bold">
                {categoryCounts["other"]}
              </span>
            </button>
          )}
        </div>
      </header>

      {/* Card Grid */}
      <div className="flex-1 overflow-y-auto pb-20">
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredItems.map((item) => (
              <ArchiveCard
                key={item.id}
                item={item}
                onClick={() => navigate(`/library/${item.id}`)}
                isSelected={selectedIds.has(item.id)}
                isSelecting={isSelecting}
                onToggleSelect={toggleSelect}
                onToggleVisibility={handleToggleVisibility}
                isOwner={item.ownerId === currentUser.id}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <Archive size={40} className="mb-3 opacity-50" />
            <p className="text-sm font-medium">
              {ko ? "자료가 없습니다" : "No items yet"}
            </p>
            <button
              onClick={() => navigate("/library/new")}
              className="mt-3 text-sm text-blue-500 hover:text-blue-600 font-medium"
            >
              {ko ? "+ 자료 추가하기" : "+ Add an item"}
            </button>
          </div>
        )}
      </div>

      {/* Selection toolbar */}
      <SelectionToolbar
        count={selectedIds.size}
        language={language}
        onPublish={handleBulkPublish}
        onUnpublish={handleBulkUnpublish}
        onDelete={handleBulkDelete}
        onClear={clearSelection}
      />
    </div>
  );
}
