import { useState, useRef, useCallback } from "react";
import { X, Upload, ImageIcon, Check, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "../../lib/utils";

// ─── Shared types ───────────────────────────────────────────────────
export interface ExtractedProject {
  name: string;
  description?: string;
  status?: "planning" | "active" | "paused" | "completed";
  client?: string;
  startDate?: string;
  endDate?: string;
  budget?: string;
  category?: string;
  team?: string;
  goal?: string;
}

export interface ExtractedClient {
  name: string;
  company?: string;
  stage?: string;
  value?: number;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
}

type ImportType = "project" | "client";

interface ScreenshotImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (items: any[]) => void;
  type?: ImportType;
  ko?: boolean;
}

// ─── Config per type ────────────────────────────────────────────────
const TYPE_CONFIG: Record<ImportType, {
  titleKo: string; titleEn: string;
  itemKo: string; itemEn: string;
  descKo: string; descEn: string;
  emptyKo: string; emptyEn: string;
  loadingKo: string; loadingEn: string;
}> = {
  project: {
    titleKo: "캡쳐로 프로젝트 가져오기", titleEn: "Import Projects from Screenshot",
    itemKo: "프로젝트", itemEn: "projects",
    descKo: "구글시트, 노션 등의 스크린샷을 올려주세요", descEn: "Upload a screenshot of your project list",
    emptyKo: "프로젝트 정보를 찾지 못했습니다. 다른 캡쳐를 시도해주세요.", emptyEn: "No projects found. Try a different screenshot.",
    loadingKo: "AI가 프로젝트 정보를 분석하고 있어요...", loadingEn: "AI is analyzing the screenshot...",
  },
  client: {
    titleKo: "캡쳐로 고객 가져오기", titleEn: "Import Clients from Screenshot",
    itemKo: "고객", itemEn: "clients",
    descKo: "구글시트, 노션 등의 고객 리스트 스크린샷을 올려주세요", descEn: "Upload a screenshot of your client list",
    emptyKo: "고객 정보를 찾지 못했습니다. 다른 캡쳐를 시도해주세요.", emptyEn: "No clients found. Try a different screenshot.",
    loadingKo: "AI가 고객 정보를 분석하고 있어요...", loadingEn: "AI is analyzing the screenshot...",
  },
};

const PROJECT_STATUS_LABELS: Record<string, { ko: string; en: string; color: string }> = {
  planning: { ko: "기획", en: "Planning", color: "bg-blue-100 text-blue-700" },
  active: { ko: "진행중", en: "Active", color: "bg-green-100 text-green-700" },
  paused: { ko: "보류", en: "Paused", color: "bg-amber-100 text-amber-700" },
  completed: { ko: "완료", en: "Completed", color: "bg-gray-100 text-gray-600" },
};

const CLIENT_STAGE_LABELS: Record<string, { ko: string; en: string; color: string }> = {
  inquiry: { ko: "문의", en: "Inquiry", color: "bg-blue-100 text-blue-700" },
  proposal: { ko: "제안/견적", en: "Proposal", color: "bg-purple-100 text-purple-700" },
  negotiation: { ko: "협상 중", en: "Negotiation", color: "bg-amber-100 text-amber-700" },
  contract: { ko: "계약 검토", en: "Contract", color: "bg-orange-100 text-orange-700" },
  won: { ko: "계약 완료", en: "Won", color: "bg-emerald-100 text-emerald-700" },
  lost: { ko: "반환", en: "Cancelled", color: "bg-gray-100 text-gray-500" },
};

const EDGE_URL = "https://dzxjtlwalhhqjcfdiwnv.supabase.co/functions/v1/parse-screenshot";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6eGp0bHdhbGhocWpjZmRpd252Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwOTA5OTcsImV4cCI6MjA4NzY2Njk5N30.37E5GNjAdmDAROzFhVy-lppV2FP7Du9vScFDkxS8g_0";

export function ScreenshotImportDialog({ open, onClose, onImport, type = "project", ko = true }: ScreenshotImportDialogProps) {
  const config = TYPE_CONFIG[type];
  const [step, setStep] = useState<"upload" | "loading" | "preview" | "error">("upload");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setImagePreview(null);
    setItems([]);
    setSelected(new Set());
    setError("");
  };

  const handleClose = () => { reset(); onClose(); };

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError(ko ? "이미지 파일만 업로드 가능합니다." : "Only image files are supported.");
      setStep("error");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      setStep("loading");

      const base64 = dataUrl.split(",")[1];
      const mimeType = file.type;

      try {
        const res = await fetch(EDGE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${ANON_KEY}`,
          },
          body: JSON.stringify({ imageBase64: base64, mimeType, type }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        const extracted = data.items || data.projects || [];

        if (extracted.length === 0) {
          setError(ko ? config.emptyKo : config.emptyEn);
          setStep("error");
          return;
        }

        setItems(extracted);
        setSelected(new Set(extracted.map((_: any, i: number) => i)));
        setStep("preview");
      } catch (err: any) {
        setError(err.message || "Failed to parse screenshot");
        setStep("error");
      }
    };
    reader.readAsDataURL(file);
  }, [ko, type, config]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const clipItems = e.clipboardData.items;
    for (const item of clipItems) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) processFile(file);
        return;
      }
    }
  }, [processFile]);

  const toggleSelect = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i); else next.add(i);
    setSelected(next);
  };

  const handleImport = () => {
    const toImport = items.filter((_: any, i: number) => selected.has(i));
    onImport(toImport);
    handleClose();
  };

  if (!open) return null;

  // ─── Item renderer per type ──────────────────────────────────────
  const renderProjectItem = (p: ExtractedProject) => (
    <>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium text-gray-900 truncate">{p.name}</span>
        {p.status && (
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md font-medium", PROJECT_STATUS_LABELS[p.status]?.color || "bg-gray-100")}>
            {ko ? PROJECT_STATUS_LABELS[p.status]?.ko : PROJECT_STATUS_LABELS[p.status]?.en}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
        {p.client && <span>{ko ? "클라이언트" : "Client"}: {p.client}</span>}
        {p.category && <span>{ko ? "카테고리" : "Category"}: {p.category}</span>}
        {p.startDate && <span>{p.startDate}{p.endDate ? ` ~ ${p.endDate}` : ""}</span>}
        {p.budget && <span>{ko ? "예산" : "Budget"}: {p.budget}</span>}
        {p.team && <span>{ko ? "담당" : "Team"}: {p.team}</span>}
      </div>
      {p.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{p.description}</p>}
    </>
  );

  const renderClientItem = (c: ExtractedClient) => (
    <>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium text-gray-900 truncate">{c.name}</span>
        {c.stage && (
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md font-medium", CLIENT_STAGE_LABELS[c.stage]?.color || "bg-gray-100")}>
            {ko ? CLIENT_STAGE_LABELS[c.stage]?.ko : CLIENT_STAGE_LABELS[c.stage]?.en}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
        {c.company && <span>{ko ? "회사" : "Company"}: {c.company}</span>}
        {c.contactName && <span>{ko ? "담당자" : "Contact"}: {c.contactName}</span>}
        {c.contactEmail && <span>{c.contactEmail}</span>}
        {c.contactPhone && <span>{c.contactPhone}</span>}
        {c.value != null && <span>{ko ? "금액" : "Value"}: {c.value.toLocaleString()}{ko ? "원" : ""}</span>}
      </div>
      {c.notes && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{c.notes}</p>}
    </>
  );

  const renderItem = (item: any) => type === "client" ? renderClientItem(item) : renderProjectItem(item);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4" onPaste={handlePaste}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {ko ? config.titleKo : config.titleEn}
          </h2>
          <button onClick={handleClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === "upload" && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all"
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                <ImageIcon size={28} className="text-blue-500" />
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                {ko ? config.descKo : config.descEn}
              </p>
              <p className="text-xs text-gray-400">
                {ko ? "드래그 앤 드롭, 클릭, 또는 Ctrl+V로 붙여넣기" : "Drag & drop, click, or paste with Ctrl+V"}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) processFile(file); }}
              />
            </div>
          )}

          {step === "loading" && (
            <div className="flex flex-col items-center py-12">
              {imagePreview && <img src={imagePreview} alt="Screenshot" className="w-full max-h-48 object-contain rounded-xl border border-gray-100 mb-6" />}
              <Loader2 size={32} className="text-blue-500 animate-spin mb-4" />
              <p className="text-sm text-gray-600">{ko ? config.loadingKo : config.loadingEn}</p>
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center py-12">
              {imagePreview && <img src={imagePreview} alt="Screenshot" className="w-full max-h-48 object-contain rounded-xl border border-gray-100 mb-6" />}
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <AlertTriangle size={24} className="text-red-500" />
              </div>
              <p className="text-sm text-gray-700 mb-1 font-medium">{ko ? "분석에 실패했어요" : "Analysis failed"}</p>
              <p className="text-xs text-gray-400 mb-6 text-center max-w-sm">{error}</p>
              <button onClick={reset} className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                {ko ? "다시 시도" : "Try again"}
              </button>
            </div>
          )}

          {step === "preview" && (
            <div>
              {imagePreview && <img src={imagePreview} alt="Screenshot" className="w-full max-h-36 object-contain rounded-xl border border-gray-100 mb-5" />}
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-600">
                  {ko
                    ? `${items.length}개 ${config.itemKo} 발견 · ${selected.size}개 선택됨`
                    : `${items.length} ${config.itemEn} found · ${selected.size} selected`}
                </p>
                <button
                  onClick={() => {
                    if (selected.size === items.length) setSelected(new Set());
                    else setSelected(new Set(items.map((_: any, i: number) => i)));
                  }}
                  className="text-xs text-blue-500 hover:text-blue-700"
                >
                  {selected.size === items.length ? (ko ? "전체 해제" : "Deselect all") : (ko ? "전체 선택" : "Select all")}
                </button>
              </div>
              <div className="space-y-2">
                {items.map((item: any, i: number) => (
                  <div
                    key={i}
                    onClick={() => toggleSelect(i)}
                    className={cn(
                      "flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all",
                      selected.has(i) ? "border-blue-200 bg-blue-50/40" : "border-gray-100 bg-white hover:border-gray-200"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 shrink-0 transition-all",
                      selected.has(i) ? "bg-blue-500 border-blue-500" : "border-gray-300"
                    )}>
                      {selected.has(i) && <Check size={12} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {renderItem(item)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "preview" && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <button onClick={reset} className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
              {ko ? "다시 캡쳐" : "Re-capture"}
            </button>
            <button
              onClick={handleImport}
              disabled={selected.size === 0}
              className={cn(
                "px-6 py-2.5 text-sm font-medium rounded-xl transition-all",
                selected.size > 0
                  ? "bg-blue-500 text-white hover:bg-blue-600 shadow-sm"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              {ko
                ? `${selected.size}개 ${config.itemKo} 가져오기`
                : `Import ${selected.size} ${config.itemEn}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
