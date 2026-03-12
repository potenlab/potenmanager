import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import {
  ChevronDown,
  Image as ImageIcon, Camera,
  Link2, Tag, Monitor,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { NotionBlockEditor } from "../components/NotionBlockEditor";
import { UrlPreviewSection } from "../components/detail/UrlPreviewCard";
import { InlineText } from "../components/detail/InlineText";
import { AutoProperties } from "../components/detail/AutoProperties";
import { createDetailPage } from "../components/detail/createDetailPage";
import type { DetailSectionProps } from "../components/detail/createDetailPage";
import type { PropertyFieldConfig } from "../components/detail/PropertyConfig";
import { AIStrategyPanel } from "../components/AIStrategyPanel";
import { PAGE_TYPES } from "../components/detail/pageTypes";
import { api } from "../../lib/api";
import {
  BrandAsset,
  loadBrandAssets, saveBrandAssets, syncBrandAssetsFromServer, loadCards, saveCards, loadColumns,
  BRAND_PLATFORMS,
} from "./ManagementPage";

// ─── Helpers ───────────────────────────────────────────────────────

function loadBrandCategories(): string[] {
  try {
    const s = localStorage.getItem("poten_mgmt_branding_columns");
    if (s) {
      const cols = JSON.parse(s) as { name: string; order: number }[];
      return cols.sort((a, b) => a.order - b.order).map(c => c.name);
    }
  } catch {}
  return [];
}

// ─── Data Hook ─────────────────────────────────────────────────────

const isDemo = () => localStorage.getItem('poten_demo_mode') === 'true';

function useBrandData(id: string | undefined) {
  const navigate = useNavigate();
  const isNew = id === "new" || !id;

  const [assets, setAssets] = useState<BrandAsset[]>(() => {
    const existing = loadBrandAssets();
    if (!isNew && id && !existing.find(a => a.id === id)) {
      const kanbanCard = loadCards("branding").find(c => c.id === id);
      if (kanbanCard) {
        const newAsset: BrandAsset = {
          id: kanbanCard.id,
          name: kanbanCard.title || "",
          description: kanbanCard.description || "",
          createdAt: kanbanCard.createdAt || new Date().toISOString(),
        };
        const next = [...existing, newAsset];
        saveBrandAssets(next);
        if (!isDemo()) api.createBrandAsset(newAsset).catch(() => {});
        return next;
      }
    }
    return existing;
  });

  const [localId, setLocalId] = useState<string | null>(null);

  // Sync from server on mount
  useEffect(() => {
    if (isDemo()) return;
    syncBrandAssetsFromServer().then((merged) => setAssets(merged));
  }, []);

  useEffect(() => {
    if (isNew && !localId) {
      const newId = `brand-${Date.now()}`;
      const newAsset: BrandAsset = { id: newId, name: "", description: "", createdAt: new Date().toISOString() };
      setAssets((prev) => {
        const next = [...prev, newAsset];
        saveBrandAssets(next);
        return next;
      });
      if (!isDemo()) api.createBrandAsset(newAsset).catch(() => {});
      setLocalId(newId);
      navigate(`/branding/${newId}`, { replace: true });
    }
  }, [isNew, localId]);

  const currentId = isNew ? localId : id;
  const item = assets.find((a) => a.id === currentId) || null;
  const itemId = currentId || id || "";

  const handleUpdate = useCallback((updates: Partial<BrandAsset>) => {
    if (!currentId) return;
    setAssets((prev) => {
      const next = prev.map((a) => a.id === currentId ? { ...a, ...updates } : a);
      saveBrandAssets(next);
      return next;
    });
    // Sync to server
    if (!isDemo()) api.updateBrandAsset(currentId, updates).catch(() => {});
    // Sync fields to kanban card
    if (updates.name !== undefined || updates.description !== undefined) {
      const allCards = loadCards("branding");
      const card = allCards.find(c => c.id === currentId);
      if (card) {
        if (updates.name !== undefined) card.title = updates.name;
        if (updates.description !== undefined) card.description = updates.description;
        saveCards("branding", allCards);
      }
    }
  }, [currentId]);

  const handleDelete = useCallback(() => {
    if (!item) return;
    if (!confirm("삭제하시겠습니까?")) return;
    const next = assets.filter((a) => a.id !== item.id);
    saveBrandAssets(next);
    if (!isDemo()) api.deleteBrandAsset(item.id).catch(() => {});
    navigate("/branding");
  }, [item, assets, navigate]);

  return { item, itemId, handleUpdate, handleDelete };
}

// ─── Title Prefix (image + name) ───────────────────────────────────

function BrandTitlePrefix({ item, onUpdate, ko }: DetailSectionProps<BrandAsset>) {
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      alert(ko ? "500KB 이하 이미지만 가능합니다" : "Max 500KB image allowed");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onUpdate({ imageUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-start gap-4">
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      <button
        onClick={() => imageInputRef.current?.click()}
        className="w-16 h-16 rounded-2xl overflow-hidden relative group border-2 border-dashed border-gray-200 shrink-0 hover:border-blue-300 transition-colors"
      >
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
            <ImageIcon size={24} className="text-gray-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all">
          <Camera size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </button>
      <div className="flex-1 min-w-0">
        <InlineText
          value={item.name}
          onChange={(v) => onUpdate({ name: v })}
          placeholder={ko ? "채널명을 입력하세요" : "Enter channel name"}
          className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight tracking-tight focus:ring-0 focus:bg-transparent hover:bg-transparent border-b-2 border-transparent focus:border-gray-200 rounded-none pb-0.5"
          as="h1"
        />
      </div>
    </div>
  );
}

// ─── Title (empty — we use titlePrefix instead) ────────────────────

function BrandTitle() {
  return <></>;
}

// ─── Properties ────────────────────────────────────────────────────

function BrandProperties({ item, onUpdate, ko }: DetailSectionProps<BrandAsset>) {
  const [categories, setCategories] = useState<string[]>(loadBrandCategories);
  // Re-read categories after server sync may have updated localStorage
  useEffect(() => {
    const timer = setTimeout(() => setCategories(loadBrandCategories()), 500);
    return () => clearTimeout(timer);
  }, []);
  const [platformDropdownOpen, setPlatformDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const platformBtnRef = useRef<HTMLButtonElement>(null);
  const categoryBtnRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ left: 0, top: 0 });

  const [cardPlatform, setCardPlatform] = useState<string>(() => {
    const kanbanCards = loadCards("branding");
    const card = kanbanCards.find(c => c.id === item.id);
    return card?.platform || "";
  });

  const handlePlatformChange = useCallback((platformId: string) => {
    const newPlatform = cardPlatform === platformId ? "" : platformId;
    setCardPlatform(newPlatform);
    setPlatformDropdownOpen(false);
    const allCards = loadCards("branding");
    const card = allCards.find(c => c.id === item.id);
    if (card) {
      card.platform = newPlatform || undefined;
      card.thumbnailUrl = undefined;
      saveCards("branding", allCards);
      // Sync to server
      if (localStorage.getItem('poten_demo_mode') !== 'true') {
        api.updateKanbanCard("branding", card.id, card).catch(() => {});
      }
    }
  }, [item.id, cardPlatform]);

  const handleCategoryChange = useCallback((catName: string) => {
    onUpdate({ category: catName });
    const cols = loadColumns("branding");
    const targetCol = cols.find(c => c.name === catName);
    if (targetCol) {
      const allCards = loadCards("branding");
      const card = allCards.find(c => c.id === item.id);
      if (card && card.columnId !== targetCol.id) {
        card.columnId = targetCol.id;
        card.order = allCards.filter(c => c.columnId === targetCol.id && c.id !== card.id).length;
        saveCards("branding", allCards);
        // Sync to server
        if (localStorage.getItem('poten_demo_mode') !== 'true') {
          api.updateKanbanCard("branding", card.id, card).catch(() => {});
        }
      }
    }
  }, [item.id, onUpdate]);

  return (
    <AutoProperties fields={[
      {
        key: "platform",
        type: "custom",
        icon: <Monitor size={14} />,
        label: ko ? "플랫폼" : "Platform",
        render: () => (
          <div>
            <button
              ref={platformBtnRef}
              onClick={() => {
                setCategoryDropdownOpen(false);
                if (!platformDropdownOpen && platformBtnRef.current) {
                  const r = platformBtnRef.current.getBoundingClientRect();
                  setDropdownPos({ left: r.left, top: r.bottom + 4 });
                }
                setPlatformDropdownOpen(!platformDropdownOpen);
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 hover:border-gray-400 bg-white transition-all min-w-[120px]"
            >
              {cardPlatform ? (() => {
                const pf = BRAND_PLATFORMS.find(p => p.id === cardPlatform);
                return pf ? (
                  <>
                    {pf.icon && <img src={pf.icon} alt={pf.label} className="w-4 h-4 object-contain" />}
                    <span className="text-gray-700">{pf.label}</span>
                  </>
                ) : <span className="text-gray-400">{ko ? "선택" : "Select"}</span>;
              })() : (
                <span className="text-gray-400">{ko ? "플랫폼 선택" : "Select platform"}</span>
              )}
              <ChevronDown size={12} className={cn("ml-auto text-gray-400 transition-transform", platformDropdownOpen && "rotate-180")} />
            </button>
            {platformDropdownOpen && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setPlatformDropdownOpen(false)} />
                <div
                  className="fixed z-[61] bg-white border border-gray-200 rounded-xl shadow-xl py-1 w-52 max-h-64 overflow-y-auto"
                  style={{ left: dropdownPos.left, top: dropdownPos.top }}
                >
                  {cardPlatform && (
                    <button onClick={() => handlePlatformChange("")} className="w-full px-3 py-2 text-xs text-left text-gray-400 hover:bg-gray-50 transition-colors">
                      {ko ? "선택 해제" : "Clear"}
                    </button>
                  )}
                  {BRAND_PLATFORMS.filter(p => p.id !== "other").map(p => (
                    <button
                      key={p.id}
                      onClick={() => handlePlatformChange(p.id)}
                      className={cn("w-full px-3 py-2 text-xs text-left flex items-center gap-2 transition-colors", cardPlatform === p.id ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50")}
                    >
                      {p.icon && <img src={p.icon} alt={p.label} className="w-4 h-4 object-contain" />}
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ),
      },
      {
        key: "category",
        type: "custom",
        icon: <Tag size={14} />,
        label: ko ? "카테고리" : "Category",
        render: () => (
          <div>
            <button
              ref={categoryBtnRef}
              onClick={() => {
                setPlatformDropdownOpen(false);
                if (!categoryDropdownOpen && categoryBtnRef.current) {
                  const r = categoryBtnRef.current.getBoundingClientRect();
                  setDropdownPos({ left: r.left, top: r.bottom + 4 });
                }
                setCategoryDropdownOpen(!categoryDropdownOpen);
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 hover:border-gray-400 bg-white transition-all min-w-[120px]"
            >
              <span className={item.category ? "text-gray-700" : "text-gray-400"}>
                {item.category || (ko ? "카테고리 선택" : "Select category")}
              </span>
              <ChevronDown size={12} className={cn("ml-auto text-gray-400 transition-transform", categoryDropdownOpen && "rotate-180")} />
            </button>
            {categoryDropdownOpen && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setCategoryDropdownOpen(false)} />
                <div className="fixed z-[61] bg-white border border-gray-200 rounded-xl shadow-xl py-1 w-48 max-h-64 overflow-y-auto" style={{ left: dropdownPos.left, top: dropdownPos.top }}>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { handleCategoryChange(cat); setCategoryDropdownOpen(false); }}
                      className={cn("w-full px-3 py-2 text-xs text-left transition-colors", item.category === cat ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50")}
                    >
                      {cat}
                    </button>
                  ))}
                  {categories.length === 0 && (
                    <span className="block px-3 py-2 text-xs text-gray-400">{ko ? "칼럼을 먼저 추가하세요" : "Add columns first"}</span>
                  )}
                </div>
              </>
            )}
          </div>
        ),
      },
      {
        key: "url",
        type: "text",
        icon: <Link2 size={14} />,
        label: "URL",
        value: item.url || "",
        onChange: (v) => onUpdate({ url: v }),
        placeholder: "https://...",
        mono: true,
        suffix: item.url ? (
          <a href={item.url.startsWith("http") ? item.url : `https://${item.url}`} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs text-blue-500 hover:text-blue-700 font-medium">
            {ko ? "열기" : "Open"}
          </a>
        ) : undefined,
      },
    ] as PropertyFieldConfig[]} />
  );
}

// ─── Body ──────────────────────────────────────────────────────────

function BrandBody({ item, onUpdate, ko, language }: DetailSectionProps<BrandAsset>) {
  const [notes, setNotes] = useState(item.description || "");

  useEffect(() => {
    setNotes(item.description || "");
  }, [item.id]);

  return (
    <>
      <div className="min-h-[200px] border-t border-gray-100 pt-5">
        <NotionBlockEditor
          initialContent={notes}
          onChange={(v) => onUpdate({ description: v || "" })}
          placeholder={ko ? "채널에 대한 메모를 작성하세요..." : "Write notes about this channel..."}
          parentType="brand"
          parentId={item.id}
        />
        <UrlPreviewSection content={notes} language={language} />
      </div>
      <AIStrategyPanel
        name={item.name}
        description={item.description}
        type="brand"
        context={{ category: item.category, url: item.url }}
      />
    </>
  );
}

// ─── Export ────────────────────────────────────────────────────────

export const BrandDetailPage = createDetailPage<BrandAsset>({
  meta: PAGE_TYPES.brand,
  useData: useBrandData,
  TitlePrefixComponent: BrandTitlePrefix,
  TitleComponent: BrandTitle,
  PropertiesComponent: BrandProperties,
  BodyComponent: BrandBody,
  getBreadcrumbs: (item, ko) => [{ label: item.name || (ko ? "새 채널" : "New Channel") }],
});
