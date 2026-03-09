import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import {
  Globe, Lock,
  FolderOpen, Loader2,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useLibrary, LibraryItem } from "../context/LibraryContext";
import { useTeam } from "../context/TeamContext";
import { useTrash } from "../context/TrashContext";
import { NotionBlockEditor } from "../components/NotionBlockEditor";
import { UrlPreviewSection } from "../components/detail/UrlPreviewCard";
import { DetailPageShell } from "../components/detail/DetailPageShell";
import { ARCHIVE_CATEGORIES, isPredefinedCategory } from "./LibraryPage";
import { InlineText } from "../components/detail/InlineText";
import { PropertyItem } from "../components/detail/PropertyItem";

const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/;

function getYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
  } catch { /* ignore */ }
  return null;
}


// ─── Category Select ───────────────────────────────────────────────
function CategorySelect({ value, onChange, ko }: { value: string; onChange: (v: string) => void; ko: boolean }) {
  const isCustom = !!value && !isPredefinedCategory(value);
  const [showCustom, setShowCustom] = useState(isCustom);
  const [customValue, setCustomValue] = useState(isCustom ? value : "");

  return (
    <div className="flex items-center gap-2">
      <select
        value={isCustom ? "other" : value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "other") {
            setShowCustom(true);
            if (customValue) onChange(customValue);
          } else {
            setShowCustom(false);
            setCustomValue("");
            onChange(v);
          }
        }}
        className="text-sm px-2 py-1 rounded-md border border-transparent hover:border-gray-200 bg-transparent outline-none focus:ring-2 focus:ring-blue-100 text-gray-700 font-medium"
      >
        <option value="">{ko ? "선택" : "Select"}</option>
        {ARCHIVE_CATEGORIES.map((cat) => (
          <option key={cat.value} value={cat.value}>
            {ko ? cat.labelKo : cat.labelEn}
          </option>
        ))}
        <option value="other">{ko ? "기타 (직접 입력)" : "Other (custom)"}</option>
      </select>
      {showCustom && (
        <input
          type="text"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onBlur={(e) => {
            const v = e.target.value.trim();
            onChange(v || "");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder={ko ? "직접 입력" : "Custom"}
          className="text-sm px-2 py-1 rounded-md border border-gray-200 outline-none focus:ring-2 focus:ring-blue-100 text-gray-700 w-32"
          autoFocus
        />
      )}
    </div>
  );
}

// ─── Main Detail Page ──────────────────────────────────────────────
export function LibraryDetailPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const ko = language === 'ko';
  const { addItem, updateItem, removeItem, getItem, fetchOgMetadata } = useLibrary();
  const { currentUser } = useTeam();
  const { moveToTrash } = useTrash();

  const isNew = itemId === "new" || !itemId;
  const existing = isNew ? null : getItem(itemId!);

  const [localId, setLocalId] = useState<string | null>(null);
  useEffect(() => {
    if (isNew && !localId) {
      const id = `lib-${Date.now()}`;
      const now = new Date().toISOString();
      const categoryParam = searchParams.get("category") || undefined;
      const newItem: LibraryItem = {
        id,
        title: '',
        type: 'url',
        visibility: 'private',
        category: categoryParam,
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
  const lastFetchedUrlRef = useRef<string>(item?.url || '');

  const handleUpdate = useCallback((updates: Partial<LibraryItem>) => {
    if (item) updateItem(item.id, updates);
  }, [item, updateItem]);

  // Auto-fetch OG metadata for a URL
  const triggerOgFetch = useCallback(async (url: string) => {
    if (!url) return;
    setOgLoading(true);
    const ytId = getYouTubeVideoId(url);
    if (ytId) {
      const ytThumb = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
      handleUpdate({ ogMetadata: { ogImage: ytThumb, ogSiteName: 'YouTube' } });
    }
    const og = await fetchOgMetadata(url);
    if (og) {
      const ytFallback = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : undefined;
      const updates: Partial<LibraryItem> = {
        ogMetadata: { ...og, ogImage: og.ogImage || ytFallback },
      };
      if (!item?.title && og.ogTitle) updates.title = og.ogTitle;
      handleUpdate(updates);
    }
    setOgLoading(false);
  }, [item, fetchOgMetadata, handleUpdate]);

  // Content change handler with URL auto-detection
  const handleContentChange = useCallback((v: string) => {
    handleUpdate({ description: v || undefined });

    const match = v?.match(URL_REGEX);
    if (match) {
      const detectedUrl = match[0];
      if (detectedUrl !== lastFetchedUrlRef.current) {
        lastFetchedUrlRef.current = detectedUrl;
        handleUpdate({ url: detectedUrl, type: 'url' });
        triggerOgFetch(detectedUrl);
      }
    }
  }, [handleUpdate, triggerOgFetch]);

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
    <DetailPageShell
      shareType="library"
      itemId={item.id}
      currentUserId={currentUser.id}
      backPath="/library"
      backLabel={ko ? '아카이빙' : 'Archive'}
      onDelete={handleDelete}
      title={
        <InlineText
          value={item.title}
          onChange={(v) => handleUpdate({ title: v })}
          placeholder={ko ? '제목을 입력하세요' : 'Enter title'}
          className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight tracking-tight focus:ring-0 focus:bg-transparent hover:bg-transparent border-b-2 border-transparent focus:border-gray-200 rounded-none pb-0.5"
          as="h1"
        />
      }
      properties={
        <>
          {/* Category */}
          <PropertyItem icon={<FolderOpen size={14} />} label={ko ? '카테고리' : 'Category'}>
            <CategorySelect
              value={item.category || ''}
              onChange={(v) => handleUpdate({ category: v || undefined })}
              ko={ko}
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
        </>
      }
      collapsedPreview={
        <span className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded",
          item.visibility === 'published' ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
        )}>
          {item.visibility === 'published' ? (ko ? '공개' : 'Public') : (ko ? '비공개' : 'Private')}
        </span>
      }
    >
      {/* OG Preview Card (auto-detected URL) */}
      {item.url && item.ogMetadata && (item.ogMetadata.ogTitle || item.ogMetadata.ogImage) && (
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

      {/* OG loading indicator */}
      {ogLoading && (
        <div className="flex items-center gap-2 text-sm text-blue-500 px-1">
          <Loader2 size={14} className="animate-spin" />
          {ko ? '미리보기 불러오는 중...' : 'Loading preview...'}
        </div>
      )}

      {/* Content — NotionBlockEditor (paste URL here to auto-detect) */}
      <div className="min-h-[200px] border-t border-gray-100 pt-5">
        <NotionBlockEditor
          initialContent={item.description || ''}
          onChange={handleContentChange}
          placeholder={ko ? 'URL을 붙여넣거나 메모를 입력하세요...' : 'Paste a URL or write a note...'}
          parentType="library"
          parentId={item.id}
        />

        <UrlPreviewSection content={item.description || ''} language={language} />
      </div>
    </DetailPageShell>
  );
}
