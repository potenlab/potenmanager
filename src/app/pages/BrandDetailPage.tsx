import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Trash2, ChevronDown, LayoutGrid, ChevronRight,
  Image as ImageIcon, Camera, ArrowLeft,
  Link2, Tag,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { NotionBlockEditor } from "../components/NotionBlockEditor";
import { UrlPreviewSection } from "../components/detail/UrlPreviewCard";
import { InlineText } from "../components/detail/InlineText";
import { PropertyItem } from "../components/detail/PropertyItem";
import { AIStrategyPanel } from "../components/AIStrategyPanel";
import {
  BrandAsset,
  loadBrandAssets, saveBrandAssets, loadCards, saveCards, loadColumns,
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

  const [propsExpanded, setPropsExpanded] = useState(true);
  const [notes, setNotes] = useState(asset?.description || "");
  const imageInputRef = useRef<HTMLInputElement>(null);

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
    const newCat = asset?.category === catName ? "" : catName;
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
    <div className="h-full overflow-y-auto bg-white scrollbar-hide">
      <div className="max-w-6xl mx-auto py-4 sm:py-7 px-4 sm:px-8 pb-64">
        <div className="max-w-3xl">
          <div className="space-y-6">
            {/* Back + Breadcrumb Navigation */}
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-2 -ml-0.5"
            >
              <ArrowLeft size={14} />
              <span>{ko ? "뒤로가기" : "Back"}</span>
            </button>
            <div className="flex items-center justify-between">
              <nav className="flex items-center gap-1 text-sm">
                <button
                  onClick={() => navigate("/branding")}
                  className="text-gray-400 hover:text-blue-600 transition-colors font-medium"
                >
                  {ko ? "브랜딩" : "Branding"}
                </button>
                <ChevronRight size={14} className="text-gray-300 shrink-0" />
                <span className="text-gray-700 font-semibold truncate max-w-[200px]">
                  {asset.name || (ko ? "새 채널" : "New Channel")}
                </span>
              </nav>
              <button
                onClick={handleDelete}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>

            {/* Image + Title */}
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

            {/* Properties */}
            <div className="bg-gray-50/50 rounded-2xl border border-gray-100 overflow-hidden">
              <button
                onClick={() => setPropsExpanded((p) => !p)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-100/50 transition-colors"
              >
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <LayoutGrid size={12} />
                  {ko ? "속성" : "Properties"}
                </span>
                <ChevronDown size={14} className={cn("text-gray-400 transition-transform duration-200", propsExpanded && "rotate-180")} />
              </button>

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
                      {/* Category (카테고리) — select only, creation happens in list page */}
                      <PropertyItem icon={<Tag size={14} />} label={ko ? "카테고리" : "Category"}>
                        <div className="flex flex-wrap gap-1.5">
                          {categories.length === 0 && (
                            <span className="text-xs text-gray-400">
                              {ko ? "카테고리가 없습니다. 목록 페이지에서 추가하세요." : "No categories. Add from the list page."}
                            </span>
                          )}
                          {categories.map((cat) => (
                            <button
                              key={cat}
                              onClick={() => handleCategoryChange(cat)}
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-xs font-medium transition-all border",
                                asset.category === cat
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                              )}
                            >
                              {cat}
                            </button>
                          ))}
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
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

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
          </div>
        </div>
      </div>
    </div>
  );
}
