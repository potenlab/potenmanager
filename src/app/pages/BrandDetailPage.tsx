import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ChevronDown,
  Image as ImageIcon, Camera,
  Link2, Tag, Monitor,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useTeam } from "../context/TeamContext";
import { NotionBlockEditor } from "../components/NotionBlockEditor";
import { UrlPreviewSection } from "../components/detail/UrlPreviewCard";
import { InlineText } from "../components/detail/InlineText";
import { PropertyItem } from "../components/detail/PropertyItem";
import { AIStrategyPanel } from "../components/AIStrategyPanel";
import { DetailPageShell } from "../components/detail/DetailPageShell";
import {
  BrandAsset,
  loadBrandAssets, saveBrandAssets, loadCards, saveCards, loadColumns,
  BRAND_PLATFORMS,
} from "./ManagementPage";

// Categories come from branding kanban columns
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

export function BrandDetailPage() {
  const { brandId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const ko = language === "ko";
  const { currentUser } = useTeam();

  const isNew = brandId === "new" || !brandId;

  const [assets, setAssets] = useState<BrandAsset[]>(() => {
    const existing = loadBrandAssets();
    if (!isNew && brandId && !existing.find(a => a.id === brandId)) {
      const kanbanCard = loadCards("branding").find(c => c.id === brandId);
      if (kanbanCard) {
        const newAsset: BrandAsset = {
          id: kanbanCard.id,
          name: kanbanCard.title || "",
          description: kanbanCard.description || "",
          createdAt: kanbanCard.createdAt || new Date().toISOString(),
        };
        const next = [...existing, newAsset];
        saveBrandAssets(next);
        return next;
      }
    }
    return existing;
  });
  const [localId, setLocalId] = useState<string | null>(null);

  // User-registered categories
  const [categories] = useState<string[]>(loadBrandCategories);

  useEffect(() => {
    if (isNew && !localId) {
      const id = `brand-${Date.now()}`;
      const newAsset: BrandAsset = {
        id,
        name: "",
        description: "",
        createdAt: new Date().toISOString(),
      };
      setAssets((prev) => {
        const next = [...prev, newAsset];
        saveBrandAssets(next);
        return next;
      });
      setLocalId(id);
      navigate(`/branding/${id}`, { replace: true });
    }
  }, [isNew, localId]);

  const currentId = isNew ? localId : brandId;
  const asset = assets.find((a) => a.id === currentId) || null;

  const [notes, setNotes] = useState(asset?.description || "");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [platformDropdownOpen, setPlatformDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const platformBtnRef = useRef<HTMLButtonElement>(null);
  const categoryBtnRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  // Load platform from kanban card
  const [cardPlatform, setCardPlatform] = useState<string>(() => {
    if (!currentId) return "";
    const kanbanCards = loadCards("branding");
    const card = kanbanCards.find(c => c.id === currentId);
    return card?.platform || "";
  });

  const handlePlatformChange = useCallback((platformId: string) => {
    if (!currentId) return;
    const newPlatform = cardPlatform === platformId ? "" : platformId;
    setCardPlatform(newPlatform);
    setPlatformDropdownOpen(false);
    // Sync to kanban card
    const allCards = loadCards("branding");
    const card = allCards.find(c => c.id === currentId);
    if (card) {
      card.platform = newPlatform || undefined;
      card.thumbnailUrl = undefined;
      saveCards("branding", allCards);
    }
  }, [currentId, cardPlatform]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      alert(ko ? "500KB 이하 이미지만 가능합니다" : "Max 500KB image allowed");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => handleUpdate({ imageUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (asset) setNotes(asset.description || "");
  }, [asset?.id]);

  const handleUpdate = useCallback(
    (updates: Partial<BrandAsset>) => {
      if (!currentId) return;
      setAssets((prev) => {
        const next = prev.map((a) =>
          a.id === currentId ? { ...a, ...updates } : a
        );
        saveBrandAssets(next);
        return next;
      });
    },
    [currentId]
  );

  const handleCategoryChange = useCallback((catName: string) => {
    if (!currentId) return;
    const newCat = catName;
    handleUpdate({ category: newCat });
    // Sync kanban card to matching column
    const cols = loadColumns("branding");
    const targetCol = cols.find(c => c.name === newCat);
    if (targetCol) {
      const allCards = loadCards("branding");
      const card = allCards.find(c => c.id === currentId);
      if (card && card.columnId !== targetCol.id) {
        card.columnId = targetCol.id;
        card.order = allCards.filter(c => c.columnId === targetCol.id && c.id !== card.id).length;
        saveCards("branding", allCards);
      }
    }
  }, [currentId, asset?.category, handleUpdate]);

  const handleDelete = () => {
    if (!asset) return;
    if (!confirm(ko ? "삭제하시겠습니까?" : "Delete this asset?")) return;
    const next = assets.filter((a) => a.id !== asset.id);
    saveBrandAssets(next);
    navigate("/branding");
  };


  if (!asset) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DetailPageShell
      shareType="brand"
      itemId={asset.id}
      currentUserId={currentUser.id}
      backPath="/branding"
      backLabel={ko ? "브랜딩" : "Branding"}
      breadcrumbs={[{ label: asset.name || (ko ? "새 채널" : "New Channel") }]}
      onDelete={handleDelete}
      titlePrefix={
        <div className="flex items-start gap-4">
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <button
            onClick={() => imageInputRef.current?.click()}
            className="w-16 h-16 rounded-2xl overflow-hidden relative group border-2 border-dashed border-gray-200 shrink-0 hover:border-blue-300 transition-colors"
          >
            {asset.imageUrl ? (
              <img src={asset.imageUrl} alt="" className="w-full h-full object-cover" />
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
              value={asset.name}
              onChange={(v) => handleUpdate({ name: v })}
              placeholder={ko ? "채널명을 입력하세요" : "Enter channel name"}
              className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight tracking-tight focus:ring-0 focus:bg-transparent hover:bg-transparent border-b-2 border-transparent focus:border-gray-200 rounded-none pb-0.5"
              as="h1"
            />
          </div>
        </div>
      }
      title={<></>}
      properties={
        <>
          {/* Platform (플랫폼) — dropdown */}
          <PropertyItem icon={<Monitor size={14} />} label={ko ? "플랫폼" : "Platform"}>
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
                      <button
                        onClick={() => handlePlatformChange("")}
                        className="w-full px-3 py-2 text-xs text-left text-gray-400 hover:bg-gray-50 transition-colors"
                      >
                        {ko ? "선택 해제" : "Clear"}
                      </button>
                    )}
                    {BRAND_PLATFORMS.filter(p => p.id !== "other").map(p => (
                      <button
                        key={p.id}
                        onClick={() => handlePlatformChange(p.id)}
                        className={cn(
                          "w-full px-3 py-2 text-xs text-left flex items-center gap-2 transition-colors",
                          cardPlatform === p.id ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                        )}
                      >
                        {p.icon && <img src={p.icon} alt={p.label} className="w-4 h-4 object-contain" />}
                        {p.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </PropertyItem>

          {/* Category (카테고리) — dropdown */}
          <PropertyItem icon={<Tag size={14} />} label={ko ? "카테고리" : "Category"}>
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
                <span className={asset.category ? "text-gray-700" : "text-gray-400"}>
                  {asset.category || (ko ? "카테고리 선택" : "Select category")}
                </span>
                <ChevronDown size={12} className={cn("ml-auto text-gray-400 transition-transform", categoryDropdownOpen && "rotate-180")} />
              </button>
              {categoryDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setCategoryDropdownOpen(false)} />
                  <div
                    className="fixed z-[61] bg-white border border-gray-200 rounded-xl shadow-xl py-1 w-48 max-h-64 overflow-y-auto"
                    style={{ left: dropdownPos.left, top: dropdownPos.top }}
                  >
                    {asset.category && (
                      <button
                        onClick={() => { handleCategoryChange(""); setCategoryDropdownOpen(false); }}
                        className="w-full px-3 py-2 text-xs text-left text-gray-400 hover:bg-gray-50 transition-colors"
                      >
                        {ko ? "선택 해제" : "Clear"}
                      </button>
                    )}
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { handleCategoryChange(cat); setCategoryDropdownOpen(false); }}
                        className={cn(
                          "w-full px-3 py-2 text-xs text-left transition-colors",
                          asset.category === cat ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                    {categories.length === 0 && (
                      <span className="block px-3 py-2 text-xs text-gray-400">
                        {ko ? "칼럼을 먼저 추가하세요" : "Add columns first"}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </PropertyItem>

          {/* URL */}
          <PropertyItem icon={<Link2 size={14} />} label="URL">
            <div className="flex items-center gap-2 flex-1">
              <input
                value={asset.url || ""}
                onChange={(e) => handleUpdate({ url: e.target.value })}
                className="flex-1 text-sm px-2 py-1 rounded-md border border-transparent hover:border-gray-200 bg-transparent outline-none focus:ring-2 focus:ring-blue-100 text-gray-700 font-mono"
                placeholder="https://..."
              />
              {asset.url && (
                <a
                  href={asset.url.startsWith("http") ? asset.url : `https://${asset.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs text-blue-500 hover:text-blue-700 font-medium"
                >
                  {ko ? "열기" : "Open"}
                </a>
              )}
            </div>
          </PropertyItem>
        </>
      }
    >
      {/* Content — NotionBlockEditor */}
      <div className="min-h-[200px] border-t border-gray-100 pt-5">
        <NotionBlockEditor
          initialContent={notes}
          onChange={(v) => handleUpdate({ description: v || "" })}
          placeholder={ko ? "채널에 대한 메모를 작성하세요..." : "Write notes about this channel..."}
          parentType="brand"
          parentId={currentId}
        />

        <UrlPreviewSection content={notes} language={language} />
      </div>

      {/* AI Strategy */}
      <AIStrategyPanel
        name={asset.name}
        description={asset.description}
        type="brand"
        context={{
          category: asset.category,
          url: asset.url,
        }}
      />
    </DetailPageShell>
  );
}
