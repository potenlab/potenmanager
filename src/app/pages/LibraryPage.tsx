import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Plus, Search, BookMarked, Globe, FileText, Link as LinkIcon,
  Trash2, X, ExternalLink, ChevronDown,
  FolderPlus, MoreHorizontal, Pencil, Archive,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useLibrary, LibraryItem } from "../context/LibraryContext";

const STORAGE_KEY = "archive-categories";

function loadCategories(): string[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}
function saveCategories(cats: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cats));
}

// ─── Compact Card ────────────────────────────────────────────────────
function ArchiveCard({ item, onClick }: { item: LibraryItem; onClick: () => void }) {
  const { language } = useLanguage();
  const ko = language === "ko";

  const domain = item.url
    ? (() => { try { return new URL(item.url).hostname.replace("www.", ""); } catch { return ""; } })()
    : "";

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group p-3"
    >
      <div className="flex items-start gap-3">
        {/* Thumbnail / icon */}
        {item.type === "url" && item.ogMetadata?.ogImage ? (
          <img src={item.ogMetadata.ogImage} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 bg-gray-100" />
        ) : (
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center shrink-0",
            item.type === "url" ? "bg-blue-50" : "bg-amber-50"
          )}>
            {item.type === "url" ? <LinkIcon size={18} className="text-blue-400" /> : <FileText size={18} className="text-amber-400" />}
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
            <p className="text-[11px] text-gray-400 truncate mt-0.5">{item.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            {item.visibility === "published" && (
              <span className="flex items-center gap-0.5 text-[9px] text-emerald-500 font-medium">
                <Globe size={8} /> {ko ? "공개" : "Public"}
              </span>
            )}
            <span className="text-[9px] text-gray-300">
              {new Date(item.createdAt).toLocaleDateString(ko ? "ko-KR" : "en-US", { month: "short", day: "numeric" })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Category Board Column ───────────────────────────────────────────
function CategoryBoard({
  title,
  items,
  onAddItem,
  onRename,
  onDelete,
  isDefault,
}: {
  title: string;
  items: LibraryItem[];
  onAddItem: (category: string) => void;
  onRename?: (oldName: string) => void;
  onDelete?: (name: string) => void;
  isDefault?: boolean;
}) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const ko = language === "ko";
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-gray-50/80 rounded-2xl border border-gray-100 flex flex-col min-w-[280px] max-w-[340px] w-full shrink-0">
      {/* Board Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-700">{title}</h3>
          <span className="text-[10px] font-bold text-gray-400 bg-gray-200/70 px-1.5 py-0.5 rounded-full">
            {items.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onAddItem(isDefault ? "" : title)}
            className="p-1 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Plus size={14} />
          </button>
          {!isDefault && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <MoreHorizontal size={14} />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-[61] py-1 min-w-[120px] animate-in fade-in slide-in-from-top-1">
                    <button
                      onClick={() => { setShowMenu(false); onRename?.(title); }}
                      className="w-full px-3 py-2 text-xs text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Pencil size={12} /> {ko ? "이름 변경" : "Rename"}
                    </button>
                    <button
                      onClick={() => { setShowMenu(false); onDelete?.(title); }}
                      className="w-full px-3 py-2 text-xs text-left text-red-500 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 size={12} /> {ko ? "삭제" : "Delete"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="px-3 pb-3 space-y-2 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
        {items.map((item) => (
          <ArchiveCard
            key={item.id}
            item={item}
            onClick={() => navigate(`/library/${item.id}`)}
          />
        ))}
        {items.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-xs text-gray-300">{ko ? "아직 자료가 없습니다" : "No items yet"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Month Picker ────────────────────────────────────────────────────
function MonthPicker({
  value,
  onChange,
  availableMonths,
}: {
  value: string;  // "" for all, "2026-03" for specific
  onChange: (v: string) => void;
  availableMonths: string[];
}) {
  const { language } = useLanguage();
  const ko = language === "ko";
  const [open, setOpen] = useState(false);

  const formatMonth = (ym: string) => {
    const [y, m] = ym.split("-");
    if (ko) return `${y}년 ${parseInt(m)}월`;
    const d = new Date(parseInt(y), parseInt(m) - 1);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
      >
        <Archive size={14} className="text-gray-400" />
        {value ? formatMonth(value) : (ko ? "전체 기간" : "All time")}
        <ChevronDown size={14} className="text-gray-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-[61] py-1 min-w-[160px] max-h-[300px] overflow-y-auto animate-in fade-in slide-in-from-top-1">
            <button
              onClick={() => { onChange(""); setOpen(false); }}
              className={cn(
                "w-full px-4 py-2 text-sm text-left hover:bg-gray-50 transition-colors",
                !value ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-700"
              )}
            >
              {ko ? "전체 기간" : "All time"}
            </button>
            {availableMonths.map((ym) => (
              <button
                key={ym}
                onClick={() => { onChange(ym); setOpen(false); }}
                className={cn(
                  "w-full px-4 py-2 text-sm text-left hover:bg-gray-50 transition-colors",
                  value === ym ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-700"
                )}
              >
                {formatMonth(ym)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────
export function LibraryPage() {
  const { language } = useLanguage();
  const ko = language === "ko";
  const navigate = useNavigate();
  const { myItems, teamItems, isLoading, updateItem } = useLibrary();

  const [activeTab, setActiveTab] = useState<"my" | "team">("my");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [categories, setCategories] = useState<string[]>(loadCategories);

  // Persist categories
  useEffect(() => { saveCategories(categories); }, [categories]);

  const baseItems = activeTab === "my" ? myItems : teamItems;

  // Available months from items
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    baseItems.forEach((i) => {
      const d = new Date(i.createdAt);
      months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    });
    return Array.from(months).sort().reverse();
  }, [baseItems]);

  // Filter by search + month
  const filteredItems = useMemo(() => {
    let result = baseItems;
    if (selectedMonth) {
      const [y, m] = selectedMonth.split("-").map(Number);
      result = result.filter((i) => {
        const d = new Date(i.createdAt);
        return d.getFullYear() === y && d.getMonth() + 1 === m;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q) ||
          i.url?.toLowerCase().includes(q) ||
          i.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [baseItems, selectedMonth, searchQuery]);

  // Merge user categories + categories from items
  const allCategoryNames = useMemo(() => {
    const fromItems = new Set<string>();
    baseItems.forEach((i) => { if (i.category) fromItems.add(i.category); });
    const merged = new Set([...categories, ...fromItems]);
    return Array.from(merged).sort();
  }, [categories, baseItems]);

  // Group items by category
  const uncategorized = useMemo(
    () => filteredItems.filter((i) => !i.category),
    [filteredItems]
  );

  const groupedByCategory = useMemo(() => {
    const map: Record<string, LibraryItem[]> = {};
    allCategoryNames.forEach((c) => { map[c] = []; });
    filteredItems.forEach((i) => {
      if (i.category && map[i.category] !== undefined) {
        map[i.category].push(i);
      } else if (i.category) {
        map[i.category] = [i];
      }
    });
    return map;
  }, [filteredItems, allCategoryNames]);

  // Add category
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const handleAddCategory = () => {
    const name = newCatName.trim();
    if (!name || categories.includes(name)) return;
    setCategories((prev) => [...prev, name]);
    setNewCatName("");
    setAddingCategory(false);
  };

  const handleRenameCategory = (oldName: string) => {
    const newName = prompt(ko ? `"${oldName}" → 새 이름:` : `Rename "${oldName}" to:`, oldName);
    if (!newName || newName === oldName) return;
    setCategories((prev) => prev.map((c) => (c === oldName ? newName : c)));
    // Update items with old category
    filteredItems.forEach((item) => {
      if (item.category === oldName) updateItem(item.id, { category: newName });
    });
  };

  const handleDeleteCategory = (name: string) => {
    if (!confirm(ko ? `"${name}" 카테고리를 삭제하시겠습니까? 자료는 미분류로 이동됩니다.` : `Delete "${name}"? Items will become uncategorized.`)) return;
    setCategories((prev) => prev.filter((c) => c !== name));
    filteredItems.forEach((item) => {
      if (item.category === name) updateItem(item.id, { category: "" });
    });
  };

  const handleAddItem = (category: string) => {
    const params = category ? `?category=${encodeURIComponent(category)}` : "";
    navigate(`/library/new${params}`);
  };

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
                ? `내 자료 ${myItems.length}건 · 팀 공유 ${teamItems.length}건`
                : `My ${myItems.length} · Team ${teamItems.length}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <MonthPicker
              value={selectedMonth}
              onChange={setSelectedMonth}
              availableMonths={availableMonths}
            />
            <button
              onClick={() => navigate("/library/new")}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
            >
              <Plus size={16} /> {ko ? "추가" : "Add"}
            </button>
          </div>
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex items-center gap-2">
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
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                activeTab === "my" ? "bg-blue-200 text-blue-700" : "bg-gray-100 text-gray-500"
              )}>{myItems.length}</span>
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
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                activeTab === "team" ? "bg-emerald-200 text-emerald-700" : "bg-gray-100 text-gray-500"
              )}>{teamItems.length}</span>
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
      </header>

      {/* Board Content */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 min-h-[400px]">
          {/* Uncategorized board */}
          <CategoryBoard
            title={ko ? "미분류" : "Uncategorized"}
            items={uncategorized}
            onAddItem={handleAddItem}
            isDefault
          />

          {/* Category boards */}
          {allCategoryNames.map((cat) => (
            <CategoryBoard
              key={cat}
              title={cat}
              items={groupedByCategory[cat] || []}
              onAddItem={handleAddItem}
              onRename={handleRenameCategory}
              onDelete={handleDeleteCategory}
            />
          ))}

          {/* Add category column */}
          <div className="min-w-[200px] shrink-0">
            {addingCategory ? (
              <div className="bg-gray-50/80 rounded-2xl border border-dashed border-blue-300 p-3">
                <input
                  autoFocus
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder={ko ? "카테고리 이름" : "Category name"}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddCategory();
                    if (e.key === "Escape") { setAddingCategory(false); setNewCatName(""); }
                  }}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-100 mb-2"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddCategory}
                    disabled={!newCatName.trim()}
                    className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-40"
                  >
                    {ko ? "추가" : "Add"}
                  </button>
                  <button
                    onClick={() => { setAddingCategory(false); setNewCatName(""); }}
                    className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs hover:bg-gray-200"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingCategory(true)}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/30 transition-all text-sm font-medium"
              >
                <FolderPlus size={16} />
                {ko ? "카테고리 추가" : "Add Category"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
