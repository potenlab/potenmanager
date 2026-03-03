import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft, Globe, Lock, Link as LinkIcon, FileText,
  Trash2, Tag, FolderOpen, Loader2,
  ChevronDown, Layout,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useLibrary, LibraryItem, LibraryItemType } from "../context/LibraryContext";
import { useTeam } from "../context/TeamContext";
import { useTrash } from "../context/TrashContext";
import { NotionBlockEditor } from "../components/NotionBlockEditor";
import { AiAssistantSidebar } from "../components/AiAssistantSidebar";

function getYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
  } catch { /* ignore */ }
  return null;
}

// ─── Inline Editable Title ─────────────────────────────────────────
function InlineTitle({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (ref.current && !isFocused) ref.current.textContent = value;
  }, [value, isFocused]);

  const handleBlur = () => {
    setIsFocused(false);
    const v = ref.current?.textContent?.trim() || "";
    if (v !== value) onChange(v);
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ref.current?.blur(); } }}
      data-placeholder={placeholder}
      className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight tracking-tight outline-none rounded-lg transition-colors
        empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 empty:before:pointer-events-none
        hover:bg-gray-50/50 focus:bg-gray-50 focus:ring-2 focus:ring-blue-100 px-1 -mx-1
        border-b-2 border-transparent focus:border-gray-200 rounded-none pb-0.5"
    />
  );
}

// ─── Property Row ──────────────────────────────────────────────────
function PropertyItem({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50/80 transition-colors group">
      <div className="flex items-center gap-2 w-[110px] shrink-0 text-gray-400 font-medium text-xs">
        {icon} <span>{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// ─── Main Detail Page ──────────────────────────────────────────────
export function LibraryDetailPage() {
  const { itemId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const ko = language === 'ko';
  const { addItem, updateItem, removeItem, getItem, fetchOgMetadata } = useLibrary();
  const { currentUser } = useTeam();
  const { moveToTrash } = useTrash();

  const isNew = itemId === "new" || !itemId;
  const existing = isNew ? null : getItem(itemId!);

  // Create new item on mount if /library/new
  const [localId, setLocalId] = useState<string | null>(null);
  useEffect(() => {
    if (isNew && !localId) {
      const id = `lib-${Date.now()}`;
      const defaultType = (searchParams.get('type') as LibraryItemType) || 'url';
      const now = new Date().toISOString();
      const newItem: LibraryItem = {
        id,
        title: '',
        type: defaultType,
        visibility: 'private',
        ownerId: currentUser.id,
        ownerName: currentUser.name,
        createdAt: now,
        updatedAt: now,
      };
      addItem(newItem);
      setLocalId(id);
      navigate(`/library/${id}`, { replace: true });
    }
  }, [isNew, localId]);

  const item = existing || (localId ? getItem(localId) : null);

  const [ogLoading, setOgLoading] = useState(false);
  const [propsExpanded, setPropsExpanded] = useState(true);

  const handleUpdate = useCallback((updates: Partial<LibraryItem>) => {
    if (item) updateItem(item.id, updates);
  }, [item, updateItem]);

  const handleFetchOg = useCallback(async () => {
    if (!item?.url) return;
    setOgLoading(true);
    const og = await fetchOgMetadata(item.url);
    if (og) {
      const updates: Partial<LibraryItem> = { ogMetadata: og };
      if (!item.title && og.ogTitle) updates.title = og.ogTitle;
      if (!item.description && og.ogDescription) updates.description = og.ogDescription;
      handleUpdate(updates);
    }
    setOgLoading(false);
  }, [item, fetchOgMetadata, handleUpdate]);

  // Auto-fetch OG on URL blur if no ogMetadata
  const handleUrlBlur = useCallback((url: string) => {
    if (url !== item?.url) handleUpdate({ url });
    if (url && !item?.ogMetadata?.ogTitle) {
      const ytId = getYouTubeVideoId(url);
      if (ytId) {
        const ytThumb = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        handleUpdate({ ogMetadata: { ogImage: ytThumb, ogSiteName: 'YouTube' } });
      }
      setTimeout(async () => {
        setOgLoading(true);
        const og = await fetchOgMetadata(url);
        if (og) {
          const ytFallback = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : undefined;
          const updates: Partial<LibraryItem> = {
            ogMetadata: { ...og, ogImage: og.ogImage || ytFallback },
          };
          if (!item?.title && og.ogTitle) updates.title = og.ogTitle;
          if (!item?.description && og.ogDescription) updates.description = og.ogDescription;
          handleUpdate(updates);
        }
        setOgLoading(false);
      }, 100);
    }
  }, [item, fetchOgMetadata, handleUpdate]);

  const handleDelete = () => {
    if (!item) return;
    if (confirm(ko ? '정말 삭제하시겠습니까?' : 'Are you sure you want to delete this item?')) {
      moveToTrash({ id: item.id, type: 'library' as any, title: item.title, data: item, deletedAt: new Date().toISOString() });
      removeItem(item.id);
      navigate('/library');
    }
  };

  if (!item) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-white scrollbar-hide">
      <div className="max-w-6xl mx-auto py-4 sm:py-7 px-4 sm:px-8 pb-32">
        <div className="flex gap-6">
        <div className="flex-1 min-w-0 max-w-3xl">
          <div className="space-y-6">

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button onClick={() => navigate('/library')} className="flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors text-sm group">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                {ko ? '자료모음집' : 'Library'}
              </button>
              <div className="flex items-center gap-2">
                <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            {/* Title */}
            <div>
              <InlineTitle
                value={item.title}
                onChange={(v) => handleUpdate({ title: v })}
                placeholder={ko ? '제목을 입력하세요' : 'Enter title'}
              />
            </div>

            {/* Collapsible Properties */}
            <div className="bg-gray-50/50 rounded-2xl border border-gray-100 overflow-hidden">
              {/* Toggle Header */}
              <button
                onClick={() => setPropsExpanded(p => !p)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-100/50 transition-colors"
              >
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Layout size={12} />
                  {ko ? '속성' : 'Properties'}
                </span>
                <div className="flex items-center gap-2">
                  {!propsExpanded && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
                        {item.type === 'url' ? 'URL' : (ko ? '메모' : 'Note')}
                      </span>
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded",
                        item.visibility === 'published' ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
                      )}>
                        {item.visibility === 'published' ? (ko ? '공개' : 'Public') : (ko ? '비공개' : 'Private')}
                      </span>
                    </div>
                  )}
                  <ChevronDown size={14} className={cn("text-gray-400 transition-transform duration-200", propsExpanded && "rotate-180")} />
                </div>
              </button>

              {/* Animated Properties */}
              <AnimatePresence initial={false}>
                {propsExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="divide-y divide-gray-100 border-t border-gray-100">
                      {/* Type */}
                      <PropertyItem icon={<FileText size={14} />} label={ko ? '유형' : 'Type'}>
                        <select
                          value={item.type}
                          onChange={(e) => handleUpdate({ type: e.target.value as LibraryItemType })}
                          className="text-sm px-2 py-1 rounded-md border border-transparent hover:border-gray-200 bg-transparent outline-none focus:ring-2 focus:ring-blue-100 text-gray-700 font-medium"
                        >
                          <option value="url">URL</option>
                          <option value="note">{ko ? '메모' : 'Note'}</option>
                        </select>
                      </PropertyItem>

                      {/* URL */}
                      {item.type === 'url' && (
                        <PropertyItem icon={<LinkIcon size={14} />} label="URL">
                          <div className="flex items-center gap-2">
                            <input
                              type="url"
                              defaultValue={item.url || ''}
                              onBlur={(e) => handleUrlBlur(e.target.value)}
                              placeholder="https://example.com"
                              className="flex-1 text-sm px-2 py-1 rounded-md border border-transparent hover:border-gray-200 bg-transparent outline-none focus:ring-2 focus:ring-blue-100 text-gray-700"
                            />
                            {ogLoading && <Loader2 size={14} className="animate-spin text-blue-500" />}
                          </div>
                          {item.url && (
                            <a href={item.url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2 mt-0.5 truncate block max-w-[300px]">
                              {item.url}
                            </a>
                          )}
                        </PropertyItem>
                      )}

                      {/* Category */}
                      <PropertyItem icon={<FolderOpen size={14} />} label={ko ? '카테고리' : 'Category'}>
                        <input
                          type="text"
                          defaultValue={item.category || ''}
                          onBlur={(e) => handleUpdate({ category: e.target.value.trim() || undefined })}
                          placeholder={ko ? '카테고리 입력' : 'Enter category'}
                          className="w-full text-sm px-2 py-1 rounded-md border border-transparent hover:border-gray-200 bg-transparent outline-none focus:ring-2 focus:ring-blue-100 text-gray-700"
                        />
                      </PropertyItem>

                      {/* Tags */}
                      <PropertyItem icon={<Tag size={14} />} label={ko ? '태그' : 'Tags'}>
                        <input
                          type="text"
                          defaultValue={(item.tags || []).join(', ')}
                          onBlur={(e) => {
                            const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                            handleUpdate({ tags: tags.length > 0 ? tags : undefined });
                          }}
                          placeholder={ko ? '쉼표로 구분 (예: 디자인, UX)' : 'Comma separated (e.g. design, UX)'}
                          className="w-full text-sm px-2 py-1 rounded-md border border-transparent hover:border-gray-200 bg-transparent outline-none focus:ring-2 focus:ring-blue-100 text-gray-700"
                        />
                      </PropertyItem>

                      {/* Visibility toggle */}
                      <PropertyItem icon={item.visibility === 'published' ? <Globe size={14} /> : <Lock size={14} />} label={ko ? '공개' : 'Visibility'}>
                        <button
                          onClick={() => handleUpdate({ visibility: item.visibility === 'published' ? 'private' : 'published' })}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                            item.visibility === 'published'
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          )}
                        >
                          {item.visibility === 'published' ? <Globe size={14} /> : <Lock size={14} />}
                          {item.visibility === 'published'
                            ? (ko ? '팀에 공유됨' : 'Published to Team')
                            : (ko ? '비공개 (나만 보기)' : 'Private (only you)')
                          }
                        </button>
                      </PropertyItem>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* OG Preview Card (URL type) */}
            {item.type === 'url' && item.ogMetadata && (item.ogMetadata.ogTitle || item.ogMetadata.ogImage) && (
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                {item.ogMetadata.ogImage && (
                  <div className="h-48 bg-gray-100 overflow-hidden">
                    <img src={item.ogMetadata.ogImage} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-4">
                  {item.ogMetadata.ogSiteName && (
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1">
                      {item.ogMetadata.ogSiteName}
                    </p>
                  )}
                  {item.ogMetadata.ogTitle && (
                    <p className="text-sm font-semibold text-gray-900 mb-1">{item.ogMetadata.ogTitle}</p>
                  )}
                  {item.ogMetadata.ogDescription && (
                    <p className="text-xs text-gray-500 line-clamp-2">{item.ogMetadata.ogDescription}</p>
                  )}
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer"
                      className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2 truncate block">
                      {item.url}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Fetch OG button (URL type, no preview yet) */}
            {item.type === 'url' && item.url && !item.ogMetadata?.ogTitle && !item.ogMetadata?.ogImage && !ogLoading && (
              <button
                onClick={handleFetchOg}
                className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors font-medium"
              >
                <LinkIcon size={14} /> {ko ? '미리보기 가져오기' : 'Fetch Preview'}
              </button>
            )}

            {/* Description / Memo — NotionBlockEditor */}
            <div className="min-h-[120px] border-t border-gray-100 pt-5">
              <NotionBlockEditor
                initialContent={item.description || ''}
                onChange={(v) => handleUpdate({ description: v || undefined })}
                placeholder={ko ? '메모를 입력하세요...' : 'Add a note...'}
              />
            </div>

            {/* Content (Note type) — NotionBlockEditor */}
            {item.type === 'note' && (
              <div className="min-h-[200px] border-t border-gray-100 pt-5">
                <NotionBlockEditor
                  initialContent={item.content || ''}
                  onChange={(v) => handleUpdate({ content: v || undefined })}
                  placeholder={ko ? '내용을 작성하세요...' : 'Write your note...'}
                />
              </div>
            )}

          </div>
        </div>

        {/* AI Assistant Sidebar */}
        <AiAssistantSidebar
          title={item.title}
          description={item.description}
          entityType="library"
          language={language}
        />
        </div>
      </div>
    </div>
  );
}
