import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft, Trash2, ChevronDown, Layout,
  Image as ImageIcon, Palette, Globe, FolderKanban,
  Camera, FileText, Plus, X, Upload,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { NotionBlockEditor } from "../components/NotionBlockEditor";
import { UrlPreviewSection } from "../components/detail/UrlPreviewCard";
import { InlineText } from "../components/detail/InlineText";
import { PropertyItem } from "../components/detail/PropertyItem";
import {
  BrandAsset, BRAND_TYPE_CONFIG,
  loadBrandAssets, saveBrandAssets,
} from "./ManagementPage";

const BRAND_TYPE_ICONS: Record<BrandAsset["type"], React.ReactNode> = {
  logo: <ImageIcon size={14} />,
  color: <Palette size={14} />,
  font: <span className="text-xs font-bold">Aa</span>,
  guideline: <Globe size={14} />,
  template: <FolderKanban size={14} />,
};

export function BrandDetailPage() {
  const { brandId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const ko = language === "ko";

  const isNew = brandId === "new" || !brandId;

  const [assets, setAssets] = useState<BrandAsset[]>(loadBrandAssets);
  const [localId, setLocalId] = useState<string | null>(null);

  // Create new asset on mount if "new"
  useEffect(() => {
    if (isNew && !localId) {
      const id = `brand-${Date.now()}`;
      const newAsset: BrandAsset = {
        id,
        type: "color",
        name: "",
        value: "#3B82F6",
        description: "",
        createdAt: new Date().toISOString(),
      };
      setAssets((prev) => {
        const next = [...prev, newAsset];
        saveBrandAssets(next);
        return next;
      });
      setLocalId(id);
      navigate(`/management/branding/${id}`, { replace: true });
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

  const handleDelete = () => {
    if (!asset) return;
    if (!confirm(ko ? "삭제하시겠습니까?" : "Delete this asset?")) return;
    const next = assets.filter((a) => a.id !== asset.id);
    saveBrandAssets(next);
    navigate("/management");
  };

  if (!asset) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const typeCfg = BRAND_TYPE_CONFIG[asset.type];

  return (
    <div className="h-full overflow-y-auto bg-white scrollbar-hide">
      <div className="max-w-6xl mx-auto py-4 sm:py-7 px-4 sm:px-8 pb-64">
        <div className="max-w-3xl">
          <div className="space-y-6">
            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate("/management")}
                className="flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors text-sm group"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                {ko ? "관리" : "Management"}
              </button>
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
                  placeholder={ko ? "브랜드 자산 이름을 입력하세요" : "Enter brand asset name"}
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
                  <Layout size={12} />
                  {ko ? "속성" : "Properties"}
                </span>
                <div className="flex items-center gap-2">
                  {!propsExpanded && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                      {ko ? typeCfg.label : typeCfg.labelEn}
                    </span>
                  )}
                  <ChevronDown size={14} className={cn("text-gray-400 transition-transform duration-200", propsExpanded && "rotate-180")} />
                </div>
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
                      {/* Type */}
                      <PropertyItem icon={<FolderKanban size={14} />} label={ko ? "유형" : "Type"}>
                        <div className="flex flex-wrap gap-1.5">
                          {(Object.keys(BRAND_TYPE_CONFIG) as BrandAsset["type"][]).map((k) => {
                            const cfg = BRAND_TYPE_CONFIG[k];
                            return (
                              <button
                                key={k}
                                onClick={() => handleUpdate({ type: k })}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                                  asset.type === k
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                                )}
                              >
                                {BRAND_TYPE_ICONS[k]} {ko ? cfg.label : cfg.labelEn}
                              </button>
                            );
                          })}
                        </div>
                      </PropertyItem>

                      {/* Value */}
                      <PropertyItem
                        icon={BRAND_TYPE_ICONS[asset.type]}
                        label={
                          asset.type === "color"
                            ? (ko ? "컬러 코드" : "Color Code")
                            : asset.type === "font"
                            ? (ko ? "폰트 이름" : "Font Name")
                            : (ko ? "URL / 값" : "URL / Value")
                        }
                      >
                        <div className="flex items-center gap-2">
                          {asset.type === "color" && (
                            <input
                              type="color"
                              value={asset.value}
                              onChange={(e) => handleUpdate({ value: e.target.value })}
                              className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer"
                            />
                          )}
                          <input
                            value={asset.value}
                            onChange={(e) => handleUpdate({ value: e.target.value })}
                            className="flex-1 text-sm px-2 py-1 rounded-md border border-transparent hover:border-gray-200 bg-transparent outline-none focus:ring-2 focus:ring-blue-100 text-gray-700 font-mono"
                            placeholder={
                              asset.type === "color"
                                ? "#000000"
                                : asset.type === "font"
                                ? "Pretendard"
                                : "https://..."
                            }
                          />
                        </div>
                      </PropertyItem>

                      {/* Guidelines */}
                      <PropertyItem icon={<FileText size={14} />} label={ko ? "사용 가이드라인" : "Usage Guidelines"}>
                        <textarea
                          value={asset.guidelines || ""}
                          onChange={(e) => handleUpdate({ guidelines: e.target.value })}
                          className="w-full text-sm px-2 py-1 rounded-md border border-transparent hover:border-gray-200 bg-transparent outline-none focus:ring-2 focus:ring-blue-100 text-gray-700 resize-none min-h-[60px]"
                          placeholder={ko ? "사용처, 금지사항 등..." : "Usage rules, restrictions..."}
                          rows={2}
                        />
                      </PropertyItem>

                      {/* Attachments */}
                      <PropertyItem icon={<Upload size={14} />} label={ko ? "첨부 파일" : "Attachments"}>
                        <div className="space-y-2">
                          {(asset.attachments || []).map((att, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input
                                value={att.name}
                                onChange={(e) => {
                                  const attachments = [...(asset.attachments || [])];
                                  attachments[i] = { ...attachments[i], name: e.target.value };
                                  handleUpdate({ attachments });
                                }}
                                className="text-xs px-2 py-1 rounded-md border border-gray-200 bg-transparent outline-none focus:ring-2 focus:ring-blue-100 text-gray-700 w-28"
                                placeholder={ko ? "파일명" : "File name"}
                              />
                              <input
                                value={att.url}
                                onChange={(e) => {
                                  const attachments = [...(asset.attachments || [])];
                                  attachments[i] = { ...attachments[i], url: e.target.value };
                                  handleUpdate({ attachments });
                                }}
                                className="flex-1 text-xs px-2 py-1 rounded-md border border-gray-200 bg-transparent outline-none focus:ring-2 focus:ring-blue-100 text-gray-700 font-mono"
                                placeholder="https://..."
                              />
                              <button
                                onClick={() => {
                                  const attachments = (asset.attachments || []).filter((_, j) => j !== i);
                                  handleUpdate({ attachments });
                                }}
                                className="p-1 text-gray-300 hover:text-red-400 transition-colors"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => handleUpdate({ attachments: [...(asset.attachments || []), { name: "", url: "" }] })}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors"
                          >
                            <Plus size={12} />
                            {ko ? "파일 추가" : "Add file"}
                          </button>
                        </div>
                      </PropertyItem>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Preview for color type */}
            {asset.type === "color" && asset.value && (
              <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
                <div
                  className="w-16 h-16 rounded-xl border border-gray-200 shadow-sm"
                  style={{ backgroundColor: asset.value }}
                />
                <div>
                  <p className="text-sm font-mono font-semibold text-gray-800">{asset.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{ko ? "브랜드 컬러 미리보기" : "Brand color preview"}</p>
                </div>
              </div>
            )}

            {/* Preview for logo type */}
            {asset.type === "logo" && asset.value && asset.value.startsWith("http") && (
              <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
                <img src={asset.value} alt="" className="w-16 h-16 rounded-xl object-contain bg-white border border-gray-200" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{asset.name || (ko ? "로고" : "Logo")}</p>
                  <a href={asset.value} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate block max-w-[300px]">
                    {asset.value}
                  </a>
                </div>
              </div>
            )}

            {/* Content — NotionBlockEditor */}
            <div className="min-h-[200px] border-t border-gray-100 pt-5">
              <NotionBlockEditor
                initialContent={notes}
                onChange={(v) => handleUpdate({ description: v || "" })}
                placeholder={ko ? "브랜드 자산에 대한 메모를 작성하세요..." : "Write notes about this brand asset..."}
                parentType="brand"
                parentId={currentId}
              />

              <UrlPreviewSection content={notes} language={language} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
