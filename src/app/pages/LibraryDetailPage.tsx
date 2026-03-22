import { useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Globe, Lock, FolderOpen, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { useLibrary, LibraryItem } from "../context/LibraryContext";
import { useTeam } from "../context/TeamContext";
import { useTrash } from "../context/TrashContext";
import { NotionBlockEditor } from "../components/NotionBlockEditor";
import { UrlPreviewSection } from "../components/detail/UrlPreviewCard";
import { ARCHIVE_CATEGORIES, isPredefinedCategory } from "./LibraryPage";
import { InlineText } from "../components/detail/InlineText";
import { AutoProperties } from "../components/detail/AutoProperties";
import { createDetailPage } from "../components/detail/createDetailPage";
import type { DetailSectionProps } from "../components/detail/createDetailPage";
import type { PropertyFieldConfig } from "../components/detail/PropertyConfig";
import { useOrgPath } from "../hooks/useOrgPath";
import { PAGE_TYPES } from "../components/detail/pageTypes";

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
          onBlur={(e) => onChange(e.target.value.trim() || "")}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          placeholder={ko ? "직접 입력" : "Custom"}
          className="text-sm px-2 py-1 rounded-md border border-gray-200 outline-none focus:ring-2 focus:ring-blue-100 text-gray-700 w-32"
          autoFocus
        />
      )}
    </div>
  );
}

// ─── Data Hook ─────────────────────────────────────────────────────
function useLibraryData(id: string | undefined) {
  const navigate = useNavigate();
  const p = useOrgPath();
  const [searchParams] = useSearchParams();
  const { addItem, updateItem, removeItem, getItem } = useLibrary();
  const { currentUser } = useTeam();
  const { moveToTrash } = useTrash();

  const isNew = id === "new" || !id;
  const existing = isNew ? null : getItem(id!);

  const [localId, setLocalId] = useState<string | null>(() => {
    if (isNew) {
      const newId = `lib-${Date.now()}`;
      const now = new Date().toISOString();
      const newItem: LibraryItem = {
        id: newId,
        title: '',
        type: 'url',
        visibility: 'private',
        category: searchParams.get("category") || undefined,
        ownerId: currentUser.id,
        ownerName: currentUser.name,
        createdAt: now,
        updatedAt: now,
      };
      addItem(newItem);
      // Navigate will happen in effect
      setTimeout(() => navigate(p(`/library/${newId}`), { replace: true }), 0);
      return newId;
    }
    return null;
  });

  const item = existing || (localId ? getItem(localId) : null);
  const itemId = item?.id || localId || id || "";

  const handleUpdate = useCallback((updates: Partial<LibraryItem>) => {
    if (item) updateItem(item.id, updates);
  }, [item, updateItem]);

  const handleDelete = useCallback(() => {
    if (!item) return;
    if (!confirm('정말 삭제하시겠습니까?')) return;
    moveToTrash({ id: item.id, type: 'library' as any, title: item.title, data: item, deletedAt: new Date().toISOString() });
    removeItem(item.id);
    navigate(p('/library'));
  }, [item, moveToTrash, removeItem, navigate]);

  return { item, itemId, handleUpdate, handleDelete };
}

// ─── Section Components ────────────────────────────────────────────

function LibraryTitle({ item, onUpdate, ko }: DetailSectionProps<LibraryItem>) {
  return (
    <InlineText
      value={item.title}
      onChange={(v) => onUpdate({ title: v })}
      placeholder={ko ? '제목을 입력하세요' : 'Enter title'}
      className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight tracking-tight focus:ring-0 focus:bg-transparent hover:bg-transparent border-b-2 border-transparent focus:border-gray-200 rounded-none pb-0.5"
      as="h1"
    />
  );
}

function LibraryProperties({ item, onUpdate, ko }: DetailSectionProps<LibraryItem>) {
  return (
    <AutoProperties fields={[
      {
        key: "category",
        type: "custom",
        icon: <FolderOpen size={14} />,
        label: ko ? '카테고리' : 'Category',
        render: () => (
          <CategorySelect
            value={item.category || ''}
            onChange={(v) => onUpdate({ category: v || undefined })}
            ko={ko}
          />
        ),
      },
      {
        key: "visibility",
        type: "toggle",
        icon: item.visibility === 'published' ? <Globe size={14} /> : <Lock size={14} />,
        label: ko ? '공개' : 'Visibility',
        value: item.visibility === 'published',
        onChange: (v) => onUpdate({ visibility: v ? 'published' : 'private' }),
        onLabel: ko ? '팀에 공유됨' : 'Published to Team',
        offLabel: ko ? '비공개 (나만 보기)' : 'Private (only you)',
        onIcon: <Globe size={14} />,
        offIcon: <Lock size={14} />,
      },
    ] as PropertyFieldConfig[]} />
  );
}

function LibraryBody({ item, onUpdate, ko, language }: DetailSectionProps<LibraryItem>) {
  const { fetchOgMetadata } = useLibrary();
  const [ogLoading, setOgLoading] = useState(false);
  const lastFetchedUrlRef = useRef<string>(item?.url || '');

  const triggerOgFetch = useCallback(async (url: string) => {
    if (!url) return;
    setOgLoading(true);
    const ytId = getYouTubeVideoId(url);
    if (ytId) {
      onUpdate({ ogMetadata: { ogImage: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`, ogSiteName: 'YouTube' } });
    }
    const og = await fetchOgMetadata(url);
    if (og) {
      const ytFallback = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : undefined;
      const updates: Partial<LibraryItem> = {
        ogMetadata: { ...og, ogImage: og.ogImage || ytFallback },
      };
      if (!item?.title && og.ogTitle) updates.title = og.ogTitle;
      onUpdate(updates);
    }
    setOgLoading(false);
  }, [item, fetchOgMetadata, onUpdate]);

  const handleContentChange = useCallback((v: string) => {
    onUpdate({ description: v || undefined });
    const match = v?.match(URL_REGEX);
    if (match) {
      const detectedUrl = match[0];
      if (detectedUrl !== lastFetchedUrlRef.current) {
        lastFetchedUrlRef.current = detectedUrl;
        onUpdate({ url: detectedUrl, type: 'url' });
        triggerOgFetch(detectedUrl);
      }
    }
  }, [onUpdate, triggerOgFetch]);

  return (
    <>
      {/* OG loading */}
      {ogLoading && (
        <div className="flex items-center gap-2 text-sm text-blue-500 px-1">
          <Loader2 size={14} className="animate-spin" />
          {ko ? '미리보기 불러오는 중...' : 'Loading preview...'}
        </div>
      )}

      {/* Content — same as TaskDetailPage style */}
      <div className="min-h-[200px]">
        <NotionBlockEditor
          initialContent={item.description || ''}
          onChange={handleContentChange}
          placeholder={ko ? 'URL을 붙여넣거나 메모를 입력하세요...' : 'Paste a URL or write a note...'}
          parentType="library"
          parentId={item.id}
        />
        <UrlPreviewSection content={item.description || ''} language={language} />
      </div>
    </>
  );
}

function LibraryCollapsedPreview({ item, ko }: { item: LibraryItem; ko: boolean }) {
  return (
    <span className={cn(
      "text-[10px] font-bold px-1.5 py-0.5 rounded",
      item.visibility === 'published' ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
    )}>
      {item.visibility === 'published' ? (ko ? '공개' : 'Public') : (ko ? '비공개' : 'Private')}
    </span>
  );
}

// ─── Export ────────────────────────────────────────────────────────

export const LibraryDetailPage = createDetailPage<LibraryItem>({
  meta: PAGE_TYPES.library,
  useData: useLibraryData,
  TitleComponent: LibraryTitle,
  PropertiesComponent: LibraryProperties,
  BodyComponent: LibraryBody,
  CollapsedPreviewComponent: LibraryCollapsedPreview,
});
