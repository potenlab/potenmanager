import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import {
  ArrowLeft, Globe, Lock, Link as LinkIcon, FileText,
  ExternalLink, Trash2, Tag, FolderOpen, Loader2,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useLibrary, LibraryItem, LibraryItemType, OgMetadata } from "../context/LibraryContext";
import { useTeam } from "../context/TeamContext";
import { useTrash } from "../context/TrashContext";

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
      className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight outline-none rounded-lg transition-colors
        empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 empty:before:pointer-events-none
        hover:bg-gray-50/50 focus:bg-gray-50 focus:ring-2 focus:ring-blue-100 px-1 -mx-1"
    />
  );
}

// ─── Property Row ──────────────────────────────────────────────────
function PropertyItem({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50/80 transition-colors group">
      <div className="flex items-center gap-2 w-[100px] shrink-0 text-gray-400 font-medium text-xs pt-1">
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
      // delay to let the update propagate
      setTimeout(async () => {
        setOgLoading(true);
        const og = await fetchOgMetadata(url);
        if (og) {
          const updates: Partial<LibraryItem> = { ogMetadata: og };
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
      <div className="max-w-3xl mx-auto py-4 sm:py-7 px-4 sm:px-8 pb-32">

        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
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
        <div className="mb-6">
          <InlineTitle
            value={item.title}
            onChange={(v) => handleUpdate({ title: v })}
            placeholder={ko ? '제목을 입력하세요' : 'Enter title'}
          />
        </div>

        {/* Properties */}
        <div className="bg-gray-50/50 rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden mb-6">
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

          {/* URL (for URL type) */}
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
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer"
                    className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                    onClick={(e) => e.stopPropagation()}>
                    <ExternalLink size={14} />
                  </a>
                )}
                {ogLoading && <Loader2 size={14} className="animate-spin text-blue-500" />}
              </div>
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

        {/* OG Preview Card (URL type) */}
        {item.type === 'url' && item.ogMetadata && (item.ogMetadata.ogTitle || item.ogMetadata.ogImage) && (
          <div className="mb-6 rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
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
                  className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                  <ExternalLink size={12} /> {ko ? '링크 열기' : 'Open link'}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Fetch OG button (URL type, no preview yet) */}
        {item.type === 'url' && item.url && !item.ogMetadata?.ogTitle && !ogLoading && (
          <button
            onClick={handleFetchOg}
            className="mb-6 flex items-center gap-2 px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors font-medium"
          >
            <LinkIcon size={14} /> {ko ? '미리보기 가져오기' : 'Fetch Preview'}
          </button>
        )}

        {/* Description / Memo */}
        <div className="mb-6">
          <label className="text-xs font-medium text-gray-400 mb-2 block">
            {ko ? '설명 / 메모' : 'Description / Memo'}
          </label>
          <textarea
            defaultValue={item.description || ''}
            onBlur={(e) => handleUpdate({ description: e.target.value.trim() || undefined })}
            placeholder={ko ? '메모를 입력하세요...' : 'Add a note...'}
            rows={3}
            className="w-full text-sm px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 resize-none text-gray-700 placeholder-gray-300"
          />
        </div>

        {/* Content (Note type) */}
        {item.type === 'note' && (
          <div className="mb-6">
            <label className="text-xs font-medium text-gray-400 mb-2 block">
              {ko ? '내용' : 'Content'}
            </label>
            <textarea
              defaultValue={item.content || ''}
              onBlur={(e) => handleUpdate({ content: e.target.value || undefined })}
              placeholder={ko ? '내용을 작성하세요...' : 'Write your note...'}
              rows={10}
              className="w-full text-sm px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 resize-y text-gray-700 placeholder-gray-300 min-h-[200px]"
            />
          </div>
        )}
      </div>
    </div>
  );
}
