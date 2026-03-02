import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Plus, Search, BookMarked, Globe, FileText, Link as LinkIcon,
  LayoutGrid, List as ListIcon, Trash2, X, Check, ExternalLink,
  Filter, User as UserIcon,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useLibrary, LibraryItem, LibraryItemType } from "../context/LibraryContext";
import { useTeam } from "../context/TeamContext";
import { useTrash } from "../context/TrashContext";

const TYPE_CONFIG: Record<LibraryItemType, { label: string; labelKo: string; icon: React.ReactNode; bg: string; text: string }> = {
  url:  { label: "URL",  labelKo: "URL",  icon: <LinkIcon size={14} />,  bg: "bg-blue-50",   text: "text-blue-600" },
  note: { label: "Note", labelKo: "메모", icon: <FileText size={14} />, bg: "bg-amber-50",  text: "text-amber-600" },
};

// ─── Library Card ──────────────────────────────────────────────────
function LibraryCard({ item, isSelecting, isSelected, onToggleSelect }: {
  item: LibraryItem;
  isSelecting: boolean; isSelected: boolean; onToggleSelect: (id: string) => void;
}) {
  const { language } = useLanguage();
  const ko = language === 'ko';
  const navigate = useNavigate();
  const { members } = useTeam();
  const tc = TYPE_CONFIG[item.type];
  const owner = item.ownerId ? members.find(m => m.id === item.ownerId) : null;

  const handleClick = () => {
    if (isSelecting) onToggleSelect(item.id);
    else navigate(`/library/${item.id}`);
  };

  const domain = item.url ? (() => {
    try { return new URL(item.url).hostname.replace('www.', ''); } catch { return ''; }
  })() : '';

  return (
    <div
      onClick={handleClick}
      className={cn(
        "bg-white rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden flex flex-col",
        isSelected ? "border-blue-400 ring-2 ring-blue-100 bg-blue-50/30" : "border-gray-100"
      )}
    >
      {/* Selection checkbox */}
      <div className={cn("absolute top-3 left-3 z-10 transition-all",
        isSelecting || isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )}>
        <button onClick={(e) => { e.stopPropagation(); onToggleSelect(item.id); }}
          className={cn("w-5 h-5 rounded border-2 flex items-center justify-center shadow-sm transition-all",
            isSelected ? "bg-blue-500 border-blue-500" : "border-gray-300 bg-white hover:border-blue-400")}>
          {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
        </button>
      </div>

      {/* OG Image preview (URL type) */}
      {item.type === 'url' && item.ogMetadata?.ogImage ? (
        <div className="h-36 bg-gray-100 overflow-hidden">
          <img src={item.ogMetadata.ogImage} alt="" className="w-full h-full object-cover" />
        </div>
      ) : item.type === 'url' ? (
        <div className="h-36 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <LinkIcon size={32} className="text-gray-300" />
        </div>
      ) : (
        <div className="h-36 bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
          <FileText size={32} className="text-amber-300" />
        </div>
      )}

      <div className="p-4 flex-1 flex flex-col">
        {/* Type badge + published */}
        <div className="flex items-center justify-between mb-2">
          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider", tc.bg, tc.text)}>
            {ko ? tc.labelKo : tc.label}
          </span>
          {item.visibility === 'published' && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
              <Globe size={10} /> {ko ? '공개' : 'Public'}
            </span>
          )}
        </div>

        {/* Title */}
        <h4 className="font-semibold text-sm text-gray-900 leading-snug line-clamp-2 mb-1">
          {item.title || (ko ? '제목 없음' : 'Untitled')}
        </h4>

        {/* Domain or description */}
        {item.type === 'url' && domain && (
          <p className="text-[11px] text-gray-400 truncate mb-1 flex items-center gap-1">
            <ExternalLink size={10} /> {domain}
          </p>
        )}
        {item.description && (
          <p className="text-xs text-gray-500 line-clamp-1 mb-2">{item.description}</p>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {item.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                {tag}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded">
                +{item.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer: owner */}
        <div className="mt-auto pt-2 border-t border-gray-50 flex items-center gap-1.5">
          {owner ? (
            <>
              {owner.avatar ? (
                <img src={owner.avatar} alt="" className="w-4 h-4 rounded-full border border-gray-200" />
              ) : (
                <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center"><UserIcon size={8} className="text-gray-400" /></div>
              )}
              <span className="text-[11px] text-gray-400">{item.ownerName || owner.name}</span>
            </>
          ) : (
            <span className="text-[11px] text-gray-300">{item.ownerName || '-'}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── List View ──────────────────────────────────────────────────────
function LibraryListView({ items }: { items: LibraryItem[] }) {
  const { language } = useLanguage();
  const ko = language === 'ko';
  const navigate = useNavigate();
  const { members } = useTeam();

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50/80 border-b border-gray-100">
            <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs w-8">#</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">{ko ? '제목' : 'Title'}</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">{ko ? '유형' : 'Type'}</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">{ko ? '카테고리' : 'Category'}</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">{ko ? '작성자' : 'Owner'}</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">{ko ? '공개' : 'Visibility'}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const tc = TYPE_CONFIG[item.type];
            const owner = item.ownerId ? members.find(m => m.id === item.ownerId) : null;
            return (
              <tr key={item.id} onClick={() => navigate(`/library/${item.id}`)}
                className="border-b border-gray-50 hover:bg-blue-50/30 cursor-pointer transition-colors">
                <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 truncate max-w-[250px]">{item.title || (ko ? '제목 없음' : 'Untitled')}</div>
                  {item.url && <div className="text-[11px] text-gray-400 truncate max-w-[250px]">{item.url}</div>}
                </td>
                <td className="px-4 py-3">
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", tc.bg, tc.text)}>
                    {ko ? tc.labelKo : tc.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{item.category || '-'}</td>
                <td className="px-4 py-3">
                  {owner ? (
                    <div className="flex items-center gap-1.5">
                      {owner.avatar ? <img src={owner.avatar} alt="" className="w-5 h-5 rounded-full" /> : null}
                      <span className="text-xs text-gray-600">{owner.name}</span>
                    </div>
                  ) : <span className="text-xs text-gray-300">-</span>}
                </td>
                <td className="px-4 py-3">
                  {item.visibility === 'published' ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium"><Globe size={10} /> {ko ? '공개' : 'Public'}</span>
                  ) : (
                    <span className="text-[10px] text-gray-400">{ko ? '비공개' : 'Private'}</span>
                  )}
                </td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">
              {ko ? '자료가 없습니다' : 'No items yet'}
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Selection Toolbar ──────────────────────────────────────────────
function LibrarySelectionToolbar({ count, language, onDelete, onClear }: {
  count: number; language: string; onDelete: () => void; onClear: () => void;
}) {
  if (count === 0) return null;
  const ko = language === 'ko';
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-3">
      <span className="text-sm font-bold">{count}{ko ? '개 선택' : ' selected'}</span>
      <div className="w-px h-5 bg-gray-700" />
      <button onClick={onDelete} className="text-xs px-2.5 py-1 rounded-lg text-red-400 hover:bg-red-900/40 transition-colors flex items-center gap-1">
        <Trash2 size={12} /> {ko ? '삭제' : 'Delete'}
      </button>
      <button onClick={onClear} className="p-1 text-gray-400 hover:text-white rounded transition-colors ml-1">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────
export function LibraryPage() {
  const { language } = useLanguage();
  const ko = language === 'ko';
  const navigate = useNavigate();
  const { myItems, teamItems, removeItem, getItem, isLoading } = useLibrary();
  const { moveToTrash } = useTrash();
  const { currentUser } = useTeam();

  const [activeTab, setActiveTab] = useState<'my' | 'team'>('my');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<LibraryItemType | ''>('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isSelecting = selectedIds.size > 0;
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') clearSelection(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [clearSelection]);

  const handleBulkDelete = useCallback(() => {
    selectedIds.forEach(id => {
      const item = getItem(id);
      if (item) {
        moveToTrash({ id: item.id, type: 'library' as any, title: item.title, data: item, deletedAt: new Date().toISOString() });
      }
      removeItem(id);
    });
    clearSelection();
  }, [selectedIds, removeItem, getItem, moveToTrash, clearSelection]);

  const baseItems = activeTab === 'my' ? myItems : teamItems;

  const categories = useMemo(() => {
    const cats = new Set<string>();
    baseItems.forEach(i => { if (i.category) cats.add(i.category); });
    return Array.from(cats).sort();
  }, [baseItems]);

  const filteredItems = useMemo(() => {
    let result = baseItems;
    if (selectedType) result = result.filter(i => i.type === selectedType);
    if (selectedCategory) result = result.filter(i => i.category === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.url?.toLowerCase().includes(q) ||
        i.tags?.some(t => t.toLowerCase().includes(q)) ||
        i.ogMetadata?.ogTitle?.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [baseItems, selectedType, selectedCategory, searchQuery]);

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="h-full flex flex-col">
      <header className="mb-6 shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
              <BookMarked className="inline-block mr-2 -mt-0.5" size={22} />
              {ko ? '자료모음집' : 'Library'}
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm">
              {ko
                ? `내 자료 ${myItems.length}건 · 팀 공유 ${teamItems.length}건`
                : `My ${myItems.length} · Team ${teamItems.length}`}
            </p>
          </div>
          <button onClick={() => navigate('/library/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
            <Plus size={16} /> {ko ? '자료 추가' : 'Add Reference'}
          </button>
        </div>

        {/* Tabs: 내 자료 / 팀 공유 */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => { setActiveTab('my'); clearSelection(); setSearchQuery(''); setSelectedCategory(''); setSelectedType(''); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border",
              activeTab === 'my'
                ? "bg-blue-50 text-blue-700 border-blue-200 shadow-sm"
                : "bg-white text-gray-500 border-gray-100 hover:border-gray-300 hover:text-gray-700"
            )}
          >
            <BookMarked size={16} />
            {ko ? '내 자료' : 'My Library'}
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold",
              activeTab === 'my' ? "bg-blue-200 text-blue-700" : "bg-gray-100 text-gray-500"
            )}>
              {myItems.length}
            </span>
          </button>
          <button
            onClick={() => { setActiveTab('team'); clearSelection(); setSearchQuery(''); setSelectedCategory(''); setSelectedType(''); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border",
              activeTab === 'team'
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm"
                : "bg-white text-gray-500 border-gray-100 hover:border-gray-300 hover:text-gray-700"
            )}
          >
            <Globe size={16} />
            {ko ? '팀 공유' : 'Team'}
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold",
              activeTab === 'team' ? "bg-emerald-200 text-emerald-700" : "bg-gray-100 text-gray-500"
            )}>
              {teamItems.length}
            </span>
          </button>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
          <div className="flex-1 sm:max-w-md">
            <div className="flex items-center w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all shadow-sm">
              <Search className="text-gray-400 mr-2 shrink-0" size={18} />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={ko ? "자료 검색..." : "Search library..."}
                className="w-full text-sm outline-none bg-transparent placeholder-gray-400 text-gray-900" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Type filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as LibraryItemType | '')}
              className="text-xs px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-700 outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">{ko ? '전체 유형' : 'All Types'}</option>
              <option value="url">URL</option>
              <option value="note">{ko ? '메모' : 'Note'}</option>
            </select>

            {/* Category filter */}
            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-700 outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">{ko ? '전체 카테고리' : 'All Categories'}</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}

            {/* View toggle */}
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button onClick={() => setViewMode('grid')}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  viewMode === 'grid' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900")}>
                <LayoutGrid size={14} />
              </button>
              <button onClick={() => setViewMode('list')}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  viewMode === 'list' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900")}>
                <ListIcon size={14} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-4">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <BookMarked size={48} className="mb-4 opacity-30" />
            <p className="text-sm font-medium mb-1">
              {activeTab === 'my'
                ? (ko ? '아직 저장한 자료가 없습니다' : 'No items in your library yet')
                : (ko ? '팀에서 공유한 자료가 없습니다' : 'No published items from the team yet')}
            </p>
            {activeTab === 'my' && (
              <button onClick={() => navigate('/library/new')}
                className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                <Plus size={14} /> {ko ? '첫 자료를 추가해보세요' : 'Add your first reference'}
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map(item => (
              <LibraryCard key={item.id} item={item}
                isSelecting={isSelecting} isSelected={selectedIds.has(item.id)} onToggleSelect={toggleSelect} />
            ))}
          </div>
        ) : (
          <LibraryListView items={filteredItems} />
        )}
      </div>

      <LibrarySelectionToolbar count={selectedIds.size} language={language} onDelete={handleBulkDelete} onClear={clearSelection} />
    </div>
  );
}
