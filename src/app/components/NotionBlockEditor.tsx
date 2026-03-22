import React, { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import { cn } from "../../lib/utils";
import { GripVertical, Plus, Trash2, Type, Heading1, Heading2, Heading3, List, ListOrdered, Minus, FileText, ArrowRight, Bold, Italic, Underline, Strikethrough, Code, Image as ImageIcon, Link2, ExternalLink, Loader2, Highlighter, Palette } from "lucide-react";
import { createPortal } from "react-dom";
import { createSubPage, getSubPage } from "../../lib/subPages";
import { api } from "../../lib/api";
import { useOrgPath } from "../hooks/useOrgPath";

type BlockType = "text" | "h1" | "h2" | "h3" | "bullet" | "numbered" | "divider" | "page" | "image" | "bookmark";

interface Block {
  id: string;
  content: string;
  type: BlockType;
  indent: number; // 0 = root, 1+ = nested
  imageWidth?: number; // percentage width for image blocks (10-100)
}

const BLOCK_TYPE_STYLES: Record<BlockType, string> = {
  text: "text-[15px] text-gray-700 leading-relaxed min-h-[28px] py-[3px]",
  h1: "text-[28px] font-bold text-gray-900 leading-tight min-h-[40px] py-[4px]",
  h2: "text-[22px] font-semibold text-gray-800 leading-snug min-h-[34px] py-[3px]",
  h3: "text-[18px] font-semibold text-gray-800 leading-snug min-h-[30px] py-[3px]",
  bullet: "text-[15px] text-gray-700 leading-relaxed min-h-[28px] py-[3px]",
  numbered: "text-[15px] text-gray-700 leading-relaxed min-h-[28px] py-[3px]",
  divider: "min-h-[1px] py-[3px]",
  page: "min-h-[40px] py-[3px]",
  image: "min-h-[40px] py-[3px]",
  bookmark: "py-[2px]",
};

interface SlashMenuItem {
  group?: string;
  type: BlockType;
  label: string;
  labelKo: string;
  desc: string;
  descKo: string;
  icon: React.ReactNode;
}

const SLASH_MENU_ITEMS: SlashMenuItem[] = [
  { group: "추천", type: "bookmark", label: "Bookmark", labelKo: "북마크", desc: "Embed a link preview", descKo: "링크 미리보기", icon: <Link2 size={16} /> },
  { group: "추천", type: "image", label: "Image", labelKo: "이미지", desc: "Upload or paste image", descKo: "이미지 업로드", icon: <ImageIcon size={16} /> },
  { group: "추천", type: "divider", label: "Divider", labelKo: "구분선", desc: "Horizontal line", descKo: "가로 구분선", icon: <Minus size={16} /> },
  { group: "기본 블록", type: "text", label: "Text", labelKo: "텍스트", desc: "Plain text", descKo: "일반 텍스트", icon: <Type size={16} /> },
  { group: "기본 블록", type: "h1", label: "Heading 1", labelKo: "제목 1", desc: "Large heading", descKo: "큰 제목", icon: <Heading1 size={16} /> },
  { group: "기본 블록", type: "h2", label: "Heading 2", labelKo: "제목 2", desc: "Medium heading", descKo: "중간 제목", icon: <Heading2 size={16} /> },
  { group: "기본 블록", type: "h3", label: "Heading 3", labelKo: "제목 3", desc: "Small heading", descKo: "작은 제목", icon: <Heading3 size={16} /> },
  { group: "기본 블록", type: "bullet", label: "Bullet List", labelKo: "글머리 기호", desc: "Bullet point", descKo: "점 목록", icon: <List size={16} /> },
  { group: "기본 블록", type: "numbered", label: "Numbered List", labelKo: "번호 매기기", desc: "Numbered list", descKo: "순서 목록", icon: <ListOrdered size={16} /> },
  { group: "기본 블록", type: "page", label: "Sub Page", labelKo: "하위 페이지", desc: "Embedded page", descKo: "내부 페이지", icon: <FileText size={16} /> },
];

function serializeBlock(b: Block): string {
  const indentPrefix = "  ".repeat(b.indent || 0);
  switch (b.type) {
    case "h1": return `${indentPrefix}# ${b.content}`;
    case "h2": return `${indentPrefix}## ${b.content}`;
    case "h3": return `${indentPrefix}### ${b.content}`;
    case "bullet": return `${indentPrefix}- ${b.content}`;
    case "numbered": return `${indentPrefix}1. ${b.content}`;
    case "divider": return "---";
    case "page": return `[page:${b.content}]`;
    case "image": return `[img:${b.imageWidth || 100}:${b.content}]`;
    case "bookmark": return `[bookmark:${b.content}]`;
    default: return `${indentPrefix}${b.content}`;
  }
}

function parseBlockLine(line: string): { type: BlockType; content: string; indent: number } {
  // Count leading spaces for indent (2 spaces = 1 level)
  const leadingSpaces = line.match(/^( *)/)?.[1].length || 0;
  const indent = Math.floor(leadingSpaces / 2);
  const trimmed = line.replace(/^ */, "");

  const bookmarkMatch = trimmed.match(/^\[bookmark:([^\]]+)\]$/);
  if (bookmarkMatch) return { type: "bookmark", content: bookmarkMatch[1], indent: 0 };
  const pageMatch = trimmed.match(/^\[page:([^\]]+)\]$/);
  if (pageMatch) return { type: "page", content: pageMatch[1], indent: 0 };
  const imgMatch = trimmed.match(/^\[img:(\d+):(.+)\]$/);
  if (imgMatch) return { type: "image" as BlockType, content: imgMatch[2], indent: 0 };
  if (trimmed === "---") return { type: "divider", content: "", indent: 0 };
  if (trimmed.startsWith("### ")) return { type: "h3", content: trimmed.slice(4), indent };
  if (trimmed.startsWith("## ")) return { type: "h2", content: trimmed.slice(3), indent };
  if (trimmed.startsWith("# ")) return { type: "h1", content: trimmed.slice(2), indent };
  if (/^\d+\.\s/.test(trimmed)) return { type: "numbered", content: trimmed.replace(/^\d+\.\s/, ""), indent };
  if (trimmed.startsWith("- ")) return { type: "bullet", content: trimmed.slice(2), indent };
  return { type: "text", content: trimmed, indent };
}

function parseBlocks(value?: string): Block[] {
  if (!value || !value.trim()) return [{ id: genId(), content: "", type: "text", indent: 0 }];
  return value.split("\n").map((line) => {
    const { type, content, indent } = parseBlockLine(line);
    const block: Block = { id: genId(), content, type, indent };
    // Parse image width
    const imgMatch = line.trim().match(/^\[img:(\d+):/);
    if (imgMatch) block.imageWidth = parseInt(imgMatch[1], 10);
    return block;
  });
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function readText(el: HTMLElement): string {
  const text = el.innerText ?? el.textContent ?? "";
  return text.endsWith("\n") ? text.slice(0, -1) : text;
}

// ─── Image Block with Resize ───────────────────────────────────────
function ImageBlock({ block, readOnly, onResize, onDelete, onSelect, isSelected, onDragStart, onDragEnd }: {
  block: Block;
  readOnly: boolean;
  onResize: (width: number) => void;
  onDelete: () => void;
  onSelect: () => void;
  isSelected?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}) {
  const [isResizing, setIsResizing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const width = block.imageWidth || 100;

  const handleResizeStart = (e: React.MouseEvent, side: "left" | "right") => {
    e.preventDefault();
    e.stopPropagation();
    if (readOnly) return;
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = width;

    const handleMouseMove = (ev: MouseEvent) => {
      const containerWidth = containerRef.current?.parentElement?.offsetWidth || 600;
      const dx = side === "right" ? ev.clientX - startX.current : startX.current - ev.clientX;
      const deltaPercent = (dx / containerWidth) * 200; // *2 because drag on one side affects total
      const newWidth = Math.max(15, Math.min(100, startWidth.current + deltaPercent));
      onResize(Math.round(newWidth));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Scroll to resize
  const handleWheel = (e: React.WheelEvent) => {
    if (readOnly || !e.altKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -5 : 5;
    const newWidth = Math.max(15, Math.min(100, width + delta));
    onResize(newWidth);
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 flex justify-center py-2 group/img relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
      onWheel={handleWheel}
    >
      <div className="relative" style={{ width: `${width}%` }}>
        <img
          src={block.content}
          alt=""
          className={cn(
            "w-full rounded-lg border transition-all select-none",
            isSelected ? "border-blue-400 ring-2 ring-blue-100 shadow-md" : hovered ? "border-blue-300 shadow-md" : "border-gray-200"
          )}
          draggable={false}
        />

        {/* Resize handles */}
        {!readOnly && hovered && (
          <>
            <div
              onMouseDown={(e) => handleResizeStart(e, "left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-12 bg-blue-400 rounded-full cursor-col-resize opacity-80 hover:opacity-100 transition-opacity"
            />
            <div
              onMouseDown={(e) => handleResizeStart(e, "right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-2 h-12 bg-blue-400 rounded-full cursor-col-resize opacity-80 hover:opacity-100 transition-opacity"
            />
          </>
        )}

        {/* Width indicator + delete */}
        {!readOnly && hovered && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-white bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-md">
              {width}%
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 rounded-md bg-black/50 backdrop-blur-sm text-white/80 hover:text-white hover:bg-red-500/80 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}

        {/* Alt+scroll hint */}
        {!readOnly && hovered && !isResizing && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-white bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-md whitespace-nowrap">
            Alt + 스크롤로 크기 조절 · 핸들 드래그
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bookmark Block Component ─────────────────────────────────────
const bookmarkCache = new Map<string, { ogTitle?: string; ogDescription?: string; ogImage?: string; ogSiteName?: string; favicon?: string } | null>();

function BookmarkBlock({ block, readOnly, onDelete, onSelect, isSelected, onDragStart, onDragEnd }: {
  block: Block;
  readOnly: boolean;
  onDelete: () => void;
  onSelect: () => void;
  isSelected?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}) {
  const [og, setOg] = useState<{ ogTitle?: string; ogDescription?: string; ogImage?: string; ogSiteName?: string; favicon?: string } | null>(
    bookmarkCache.get(block.content) ?? null
  );
  const [loading, setLoading] = useState(!bookmarkCache.has(block.content));
  const [hovered, setHovered] = useState(false);

  let domain = "";
  try { domain = new URL(block.content).hostname.replace("www.", ""); } catch { /* */ }

  useEffect(() => {
    if (bookmarkCache.has(block.content)) {
      setOg(bookmarkCache.get(block.content) ?? null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.fetchOgMetadata(block.content).then((data) => {
      if (cancelled) return;
      bookmarkCache.set(block.content, data ?? null);
      setOg(data ?? null);
    }).catch(() => {
      if (!cancelled) bookmarkCache.set(block.content, null);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [block.content]);

  return (
    <div
      className="flex-1 w-full relative group/bm flex items-stretch"
      draggable={!readOnly}
      onDragStart={(e) => {
        if (readOnly) return;
        const ghost = document.createElement('div');
        ghost.textContent = og?.ogTitle || domain || '북마크';
        ghost.style.cssText = 'position:fixed;top:-999px;left:-999px;padding:6px 12px;background:#3b82f6;color:#fff;border-radius:6px;font-size:12px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 0, 0);
        setTimeout(() => document.body.removeChild(ghost), 0);
        onDragStart?.(e);
      }}
      onDragEnd={() => onDragEnd?.()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        // Click anywhere on bookmark = select it (like Notion)
        e.stopPropagation();
        onSelect();
      }}
    >
      <div
        className={cn(
          "w-full flex rounded-md border overflow-hidden bg-white transition-colors cursor-pointer",
          isSelected ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-200 hover:bg-gray-50"
        )}
      >
        {loading ? (
          <div className="flex-1 flex items-center gap-2 px-4 py-3.5 text-sm text-gray-400">
            <Loader2 size={14} className="animate-spin" />
            <span className="truncate">{block.content}</span>
          </div>
        ) : (
          <>
            <div className="flex-1 min-w-0 p-3 flex flex-col overflow-hidden">
              <p className="text-[13px] font-medium text-gray-900 line-clamp-2 leading-snug">
                {og?.ogTitle || block.content}
              </p>
              {og?.ogDescription && (
                <p className="text-[12px] text-gray-500 line-clamp-2 mt-1 leading-relaxed">{og.ogDescription}</p>
              )}
              <a
                href={block.content}
                target="_blank"
                rel="noopener noreferrer"
                draggable={false}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 mt-auto text-[12px] text-gray-400 hover:text-blue-500 transition-colors w-fit"
              >
                {og?.favicon ? (
                  <img src={og.favicon} alt="" className="w-4 h-4 rounded-sm shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <ExternalLink size={12} className="shrink-0" />
                )}
                <span className="truncate max-w-[300px]">{block.content}</span>
              </a>
            </div>
            {og?.ogImage && (
              <div className="w-[160px] shrink-0 border-l border-gray-200 self-stretch">
                <img src={og.ogImage} alt="" className="w-full h-full object-cover" draggable={false} onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }} />
              </div>
            )}
          </>
        )}
      </div>
      {!readOnly && hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(); }}
          className="absolute top-2 right-2 p-1 rounded-md bg-black/50 backdrop-blur-sm text-white/80 hover:text-white hover:bg-red-500/80 transition-colors z-10"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
}

// ─── Floating Toolbar Component ────────────────────────────────────
const HIGHLIGHT_COLORS = [
  { name: "노랑", color: "#fef08a" },
  { name: "초록", color: "#bbf7d0" },
  { name: "파랑", color: "#bfdbfe" },
  { name: "분홍", color: "#fbcfe8" },
  { name: "보라", color: "#ddd6fe" },
  { name: "주황", color: "#fed7aa" },
];

const TEXT_COLORS = [
  { name: "기본", color: "inherit" },
  { name: "빨강", color: "#dc2626" },
  { name: "파랑", color: "#2563eb" },
  { name: "초록", color: "#16a34a" },
  { name: "보라", color: "#9333ea" },
  { name: "주황", color: "#ea580c" },
  { name: "회색", color: "#6b7280" },
];

function FloatingToolbar({ pos, onFormat, onToggleList, onLink, activeFormats }: {
  pos: { top: number; left: number };
  onFormat: (cmd: string, value?: string) => void;
  onToggleList: (type: "bullet" | "numbered") => void;
  onLink: () => void;
  activeFormats: { bold: boolean; italic: boolean; underline: boolean; strikethrough: boolean };
}) {
  const [showColors, setShowColors] = useState<"text" | "highlight" | null>(null);
  const btnClass = (active?: boolean) => cn("p-1.5 rounded transition-colors", active ? "bg-gray-200 text-gray-900" : "hover:bg-gray-100 text-gray-500 hover:text-gray-700");

  return createPortal(
    <div
      className="fixed z-[10000] bg-white border border-gray-200 rounded-lg shadow-xl animate-in fade-in slide-in-from-bottom-1 duration-150"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="flex items-center gap-0.5 px-1.5 py-1">
        {/* Block type */}
        <button onClick={() => onToggleList("numbered")} className={btnClass()} title="번호 목록">
          <ListOrdered size={16} />
        </button>
        <button onClick={() => onToggleList("bullet")} className={btnClass()} title="글머리 기호">
          <List size={16} />
        </button>
        <div className="w-px h-5 bg-gray-200 mx-0.5" />
        {/* Text format */}
        <button onClick={() => onFormat("bold")} className={btnClass(activeFormats.bold)} title="굵게 (Ctrl+B)">
          <Bold size={16} />
        </button>
        <button onClick={() => onFormat("italic")} className={btnClass(activeFormats.italic)} title="기울임 (Ctrl+I)">
          <Italic size={16} />
        </button>
        <button onClick={() => onFormat("underline")} className={btnClass(activeFormats.underline)} title="밑줄 (Ctrl+U)">
          <Underline size={16} />
        </button>
        <button onClick={() => onFormat("strikethrough")} className={btnClass(activeFormats.strikethrough)} title="취소선">
          <Strikethrough size={16} />
        </button>
        <button onClick={() => onFormat("insertHTML", "<code style='background:#f3f4f6;padding:1px 4px;border-radius:3px;font-size:0.9em;color:#e11d48'>")} className={btnClass()} title="코드">
          <Code size={16} />
        </button>
        <div className="w-px h-5 bg-gray-200 mx-0.5" />
        {/* Link */}
        <button onClick={onLink} className={btnClass()} title="링크 (Ctrl+K)">
          <Link2 size={16} />
        </button>
        {/* Colors */}
        <button onClick={() => setShowColors(showColors === "text" ? null : "text")} className={btnClass(showColors === "text")} title="글자 색">
          <Palette size={16} />
        </button>
        <button onClick={() => setShowColors(showColors === "highlight" ? null : "highlight")} className={btnClass(showColors === "highlight")} title="형광펜">
          <Highlighter size={16} />
        </button>
      </div>
      {/* Color picker dropdown */}
      {showColors && (
        <div className="flex items-center gap-1 px-2 py-1.5 border-t border-gray-100">
          {(showColors === "text" ? TEXT_COLORS : HIGHLIGHT_COLORS).map((c) => (
            <button
              key={c.color}
              onClick={() => {
                if (showColors === "text") {
                  onFormat("foreColor", c.color === "inherit" ? "#000000" : c.color);
                } else {
                  onFormat("hiliteColor", c.color);
                }
                setShowColors(null);
              }}
              className="w-6 h-6 rounded-full border border-gray-200 hover:scale-110 transition-transform"
              style={{ backgroundColor: c.color === "inherit" ? "#000" : c.color }}
              title={c.name}
            />
          ))}
          {showColors === "highlight" && (
            <button
              onClick={() => { onFormat("removeFormat"); setShowColors(null); }}
              className="text-xs text-gray-400 hover:text-gray-600 ml-1"
              title="제거"
            >✕</button>
          )}
        </div>
      )}
    </div>,
    document.body
  );
}

// ─── Main Editor ───────────────────────────────────────────────────
export function NotionBlockEditor({
  value,
  initialContent,
  onChange,
  placeholder,
  readOnly = false,
  language = "ko",
  parentType,
  parentId,
}: {
  value?: string;
  initialContent?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  language?: string;
  parentType?: string;
  parentId?: string;
}) {
  const navigate = useNavigate();
  const p = useOrgPath();
  const seed = value ?? initialContent ?? "";
  const [blocks, setBlocks] = useState<Block[]>(() => parseBlocks(seed));
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastClickedIdx = useRef<number | null>(null);
  const dragStartIdx = useRef<number | null>(null);
  const mouseDownBlockIdx = useRef<number | null>(null); // track which block mousedown started in (even contentEditable)
  const isDragging = useRef(false);
  // Rubber band (marquee) selection visual
  const [rubberBand, setRubberBand] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const rubberBandStart = useRef<{ x: number; y: number } | null>(null);
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const pendingFocusIdx = useRef<number | null>(null);
  const isComposingRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Drag-and-drop block reorder state
  const [dragBlockIdx, setDragBlockIdx] = useState<number | null>(null);
  const dragBlockIdxRef = useRef<number | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);

  // Floating toolbar state
  const [toolbar, setToolbar] = useState<{ top: number; left: number; blockIdx: number } | null>(null);
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false, strikethrough: false });

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Undo/Redo
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const undoStackRef = useRef<Block[][]>([]);
  const redoStackRef = useRef<Block[][]>([]);
  const lastUndoPushTime = useRef(0);

  const pushUndo = useCallback(() => {
    undoStackRef.current.push(blocksRef.current.map(b => ({ ...b })));
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
    redoStackRef.current = [];
  }, []);

  const syncDomAfterUndoRedo = useCallback((newBlocks: Block[]) => {
    // Force sync ALL contentEditable elements including the active one
    requestAnimationFrame(() => {
      newBlocks.forEach((block) => {
        if (block.type === "divider" || block.type === "image" || block.type === "bookmark" || block.type === "page") return;
        const el = blockRefs.current.get(block.id);
        if (el && !el.querySelector("b, i, u, strong, em")) {
          if (el.textContent !== block.content) {
            el.textContent = block.content;
          }
        }
      });
    });
  }, []);

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    redoStackRef.current.push(blocksRef.current.map(b => ({ ...b })));
    const restored = undoStackRef.current.pop()!;
    setBlocks(restored);
    setSelectedIds(new Set());
    syncDomAfterUndoRedo(restored);
  }, [syncDomAfterUndoRedo]);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    undoStackRef.current.push(blocksRef.current.map(b => ({ ...b })));
    const restored = redoStackRef.current.pop()!;
    setBlocks(restored);
    setSelectedIds(new Set());
    syncDomAfterUndoRedo(restored);
  }, [syncDomAfterUndoRedo]);

  // Slash menu
  const [slashMenu, setSlashMenu] = useState<{ blockIdx: number; filter: string; selectedIdx: number; pos: { top: number; left: number } } | null>(null);
  const ko = language === "ko";

  useEffect(() => {
    return () => { setSlashMenu(null); };
  }, []);

  // Close slash menu on outside click
  useEffect(() => {
    if (!slashMenu) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-slash-menu]')) setSlashMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [slashMenu]);

  // Ensure there's always a text block after non-text blocks (like Notion)
  useEffect(() => {
    if (blocks.length === 0) return;
    const last = blocks[blocks.length - 1];
    if (last.type !== "text") {
      setBlocks((prev) => [...prev, { id: genId(), content: "", type: "text", indent: 0 }]);
    }
  }, [blocks]);


  // Sync blocks → parent
  const prevTextRef = useRef(seed);
  useEffect(() => {
    const text = blocks.map(serializeBlock).join("\n");
    if (text !== prevTextRef.current) {
      prevTextRef.current = text;
      onChangeRef.current(text);
    }
  }, [blocks]);

  // Focus block by index
  useEffect(() => {
    if (pendingFocusIdx.current !== null) {
      const idx = pendingFocusIdx.current;
      pendingFocusIdx.current = null;
      const block = blocks[idx];
      if (block) {
        const el = blockRefs.current.get(block.id);
        if (el) {
          el.focus();
          const range = document.createRange();
          const sel = window.getSelection();
          if (el.childNodes.length > 0) {
            range.setStartAfter(el.lastChild!);
          } else {
            range.setStart(el, 0);
          }
          range.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }
    }
  });

  // Sync contentEditable DOM
  useEffect(() => {
    blocks.forEach((block) => {
      if (block.type === "divider") return;
      const el = blockRefs.current.get(block.id);
      if (el && document.activeElement !== el) {
        // Only sync plaintext blocks (skip innerHTML for formatted blocks)
        if (!el.querySelector("b, i, u, strong, em")) {
          if (el.textContent !== block.content) {
            el.textContent = block.content;
          }
        }
      }
    });
  }, [blocks]);

  const updateBlock = (id: string, content: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content } : b)));
  };

  const setBlockType = (id: string, type: BlockType) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, type } : b)));
  };

  const getCursorPos = (blockId: string): number => {
    const el = blockRefs.current.get(blockId);
    const sel = window.getSelection();
    if (!sel || !el || sel.rangeCount === 0) return 0;
    const range = sel.getRangeAt(0);
    const preRange = document.createRange();
    preRange.selectNodeContents(el);
    preRange.setEnd(range.startContainer, range.startOffset);
    return preRange.toString().length;
  };

  // ─── Floating Toolbar Logic ────────────────────────────────────
  const checkSelection = useCallback(() => {
    if (readOnly) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setToolbar(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const text = sel.toString().trim();
    if (!text) { setToolbar(null); return; }

    const rect = range.getBoundingClientRect();
    if (rect.width === 0) { setToolbar(null); return; }

    // Find which block this is in
    let blockIdx = -1;
    for (const [id, el] of blockRefs.current.entries()) {
      if (el.contains(range.commonAncestorContainer)) {
        blockIdx = blocks.findIndex(b => b.id === id);
        break;
      }
    }
    if (blockIdx === -1) { setToolbar(null); return; }

    setToolbar({
      top: rect.top - 44,
      left: rect.left + rect.width / 2 - 100,
      blockIdx,
    });
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikethrough: document.queryCommandState("strikethrough"),
    });
  }, [readOnly, blocks]);

  useEffect(() => {
    document.addEventListener("selectionchange", checkSelection);
    return () => document.removeEventListener("selectionchange", checkSelection);
  }, [checkSelection]);

  const handleFormat = useCallback((cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    // Update active format state
    requestAnimationFrame(() => {
      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strikethrough: document.queryCommandState("strikethrough"),
      });
    });
  }, []);

  const handleLink = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const existing = document.queryCommandValue("createLink");
    const url = prompt("URL 입력", existing || "https://");
    if (url) {
      document.execCommand("createLink", false, url);
    }
  }, []);

  const handleToggleList = useCallback((type: "bullet" | "numbered") => {
    if (toolbar === null) return;
    pushUndo();
    const block = blocks[toolbar.blockIdx];
    if (!block) return;
    const newType: BlockType = block.type === type ? "text" : type;
    setBlockType(block.id, newType);
  }, [toolbar, blocks, pushUndo]);

  // ─── Slash Menu ────────────────────────────────────────────────
  const filteredSlashItems = slashMenu
    ? SLASH_MENU_ITEMS.filter((item) => {
        const q = slashMenu.filter.toLowerCase();
        if (!q) return true;
        return item.label.toLowerCase().includes(q) || item.labelKo.includes(q) || item.type.includes(q);
      })
    : [];

  const openSlashMenu = (idx: number) => {
    const block = blocks[idx];
    const el = blockRefs.current.get(block.id);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuHeight = 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < menuHeight && rect.top > menuHeight;
    setSlashMenu({
      blockIdx: idx,
      filter: "",
      selectedIdx: 0,
      pos: openUpward
        ? { top: rect.top - menuHeight - 4, left: rect.left }
        : { top: rect.bottom + 4, left: rect.left },
    });
  };

  const closeSlashMenu = () => setSlashMenu(null);

  const selectSlashItem = (item: SlashMenuItem) => {
    if (!slashMenu) return;
    pushUndo();
    const block = blocks[slashMenu.blockIdx];
    if (item.type === "image") {
      // Trigger file picker
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
          alert(ko ? "5MB 이하 이미지만 가능합니다" : "Max 5MB image allowed");
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            const el = blockRefs.current.get(block.id);
            if (el) el.textContent = "";
            setBlocks((prev) =>
              prev.map((b) => (b.id === block.id ? { ...b, type: "image", content: reader.result as string, imageWidth: 100 } : b))
            );
          }
        };
        reader.readAsDataURL(file);
      };
      input.click();
      closeSlashMenu();
      return;
    }
    if (item.type === "bookmark") {
      const url = prompt(ko ? "URL을 입력하세요:" : "Enter URL:");
      if (url && /^https?:\/\//.test(url.trim())) {
        const el = blockRefs.current.get(block.id);
        if (el) el.textContent = "";
        setBlocks((prev) =>
          prev.map((b) => (b.id === block.id ? { ...b, type: "bookmark", content: url.trim() } : b))
        );
      }
      closeSlashMenu();
      return;
    }
    if (item.type === "page") {
      const subPage = createSubPage(parentType || "unknown", parentId || "unknown");
      const el = blockRefs.current.get(block.id);
      if (el) el.textContent = "";
      setBlocks((prev) =>
        prev.map((b) => (b.id === block.id ? { ...b, type: "page", content: subPage.id } : b))
      );
      closeSlashMenu();
      return;
    }
    if (item.type === "divider") {
      const divEl = blockRefs.current.get(block.id);
      if (divEl) divEl.textContent = "";
      setBlocks((prev) =>
        prev.map((b) => (b.id === block.id ? { ...b, type: "divider", content: "" } : b))
      );
    } else {
      const el = blockRefs.current.get(block.id);
      const currentText = el ? readText(el) : block.content;
      const cleaned = currentText.replace(/^\/\S*/, "");
      setBlocks((prev) =>
        prev.map((b) => (b.id === block.id ? { ...b, type: item.type, content: cleaned } : b))
      );
      if (el) el.textContent = cleaned;
      requestAnimationFrame(() => {
        const blockEl = blockRefs.current.get(block.id);
        if (blockEl) {
          blockEl.focus();
          const range = document.createRange();
          const sel = window.getSelection();
          if (blockEl.childNodes.length > 0) range.setStartAfter(blockEl.lastChild!);
          else range.setStart(blockEl, 0);
          range.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      });
    }
    closeSlashMenu();
  };

  // ─── Paste Handler ─────────────────────────────────────────────
  const parseHtmlToBlocks = (html: string): { type: BlockType; content: string }[] => {
    const container = document.createElement("div");
    container.innerHTML = html;
    const result: { type: BlockType; content: string }[] = [];
    const getTextContent = (el: Element): string => (el.textContent || "").trim();

    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = (node.textContent || "").trim();
        if (text) result.push({ type: "text", content: text });
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as Element;
      const tag = el.tagName.toLowerCase();
      if (tag === "h1") { result.push({ type: "h1", content: getTextContent(el) }); return; }
      if (tag === "h2") { result.push({ type: "h2", content: getTextContent(el) }); return; }
      if (tag === "h3") { result.push({ type: "h3", content: getTextContent(el) }); return; }
      if (tag === "hr") { result.push({ type: "divider", content: "" }); return; }
      if (tag === "ul") { el.querySelectorAll(":scope > li").forEach((li) => result.push({ type: "bullet", content: getTextContent(li) })); return; }
      if (tag === "ol") { el.querySelectorAll(":scope > li").forEach((li) => result.push({ type: "numbered", content: getTextContent(li) })); return; }
      if (tag === "li") {
        const parentTag = el.parentElement?.tagName.toLowerCase();
        result.push({ type: parentTag === "ol" ? "numbered" : "bullet", content: getTextContent(el) });
        return;
      }
      const BLOCK_TAGS = new Set(["p", "div", "blockquote", "section", "article", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "hr"]);
      if (["p", "blockquote"].includes(tag)) {
        const text = getTextContent(el);
        if (text) result.push({ type: "text", content: text });
        return;
      }
      if (["div", "section", "article"].includes(tag)) {
        // If contains block-level children, recurse into them
        const hasBlockChildren = Array.from(el.children).some(c => BLOCK_TAGS.has(c.tagName.toLowerCase()));
        if (hasBlockChildren) {
          el.childNodes.forEach(processNode);
        } else {
          const text = getTextContent(el);
          if (text) result.push({ type: "text", content: text });
        }
        return;
      }
      if (tag === "br") return;
      if (el.children.length === 0) {
        const text = getTextContent(el);
        if (text) result.push({ type: "text", content: text });
      } else {
        el.childNodes.forEach(processNode);
      }
    };
    container.childNodes.forEach(processNode);
    return result;
  };

  const insertImageBlock = useCallback((dataUrl: string, afterIdx: number) => {
    pushUndo();
    const newBlock: Block = { id: genId(), content: dataUrl, type: "image", indent: 0, imageWidth: 100 };
    setBlocks((prev) => {
      const next = [...prev];
      next.splice(afterIdx + 1, 0, newBlock);
      return next;
    });
  }, [pushUndo]);

  const pasteGuardRef = useRef(0);
  const handlePaste = useCallback(
    (e: React.ClipboardEvent, idx: number) => {
      // Prevent double-paste within 100ms
      const now = Date.now();
      if (now - pasteGuardRef.current < 100) { e.preventDefault(); return; }
      pasteGuardRef.current = now;

      // Get text and HTML early
      const text = e.clipboardData.getData("text/plain");
      const trimmedText = (text || "").trim();
      const htmlEarly = e.clipboardData.getData("text/html");

      // Poten-blocks (lossless copy/paste within editor) — HIGHEST PRIORITY
      const potenMatchEarly = htmlEarly?.match(/data-poten-blocks="([^"]+)"/);
      if (potenMatchEarly) {
        try {
          const pastedBlocks: { type: BlockType; content: string; indent?: number; imageWidth?: number }[] = JSON.parse(decodeURIComponent(potenMatchEarly[1]));
          if (pastedBlocks.length > 0) {
            e.preventDefault();
            pushUndo();
            const block = blocks[idx];
            const isEmptyText = !block.content.trim() && block.type === "text";
            const newBlocks: Block[] = pastedBlocks.map(pb => {
              const b: Block = { id: genId(), content: pb.content, type: pb.type, indent: pb.indent || 0 };
              if (pb.imageWidth) b.imageWidth = pb.imageWidth;
              return b;
            });
            setBlocks((prev) => {
              const next = [...prev];
              if (isEmptyText) {
                next.splice(idx, 1, ...newBlocks);
              } else {
                next.splice(idx + 1, 0, ...newBlocks);
              }
              return next;
            });
            pendingFocusIdx.current = idx + newBlocks.length - (isEmptyText ? 1 : 0);
            return;
          }
        } catch { /* fall through */ }
      }

      // Bookmark block paste — restore serialized [bookmark:URL] directly
      const bookmarkMatch = trimmedText.match(/^\[bookmark:(.+)\]$/);
      if (bookmarkMatch) {
        e.preventDefault();
        const bookmarkUrl = bookmarkMatch[1];
        const block = blocks[idx];
        pushUndo();
        const newBlock: Block = { id: genId(), type: "bookmark" as BlockType, content: bookmarkUrl, indent: 0 };
        setBlocks((prev) => {
          const next = [...prev];
          const insertAt = block.content.trim() === "" && block.type === "text"
            ? prev.findIndex(b => b.id === block.id)
            : prev.findIndex(b => b.id === block.id) + 1;
          next.splice(insertAt, block.content.trim() === "" && block.type === "text" ? 1 : 0, newBlock);
          return next;
        });
        return;
      }

      // URL paste → bookmark (only when no poten-blocks data)
      const urlOnly = trimmedText.replace(/[\r\n]+$/, "").trim();
      if (/^https?:\/\/[^\s]+$/.test(urlOnly)) {
        const block = blocks[idx];
        if (!block.content.trim() && block.type === "text") {
          e.preventDefault();
          pushUndo();
          setBlocks((prev) => prev.map((b) => b.id === block.id ? { ...b, type: "bookmark" as BlockType, content: urlOnly } : b));
          return;
        }
      }

      // Check for image files in clipboard
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) {
            alert(ko ? "5MB 이하 이미지만 가능합니다" : "Max 5MB image allowed");
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              insertImageBlock(reader.result, idx);
            }
          };
          reader.readAsDataURL(file);
          return;
        }
      }

      e.preventDefault();
      const html = e.clipboardData.getData("text/html");

      if (!text && !html) return;

      // Check for our custom block data (lossless copy/paste within editor)
      const potenMatch = html?.match(/data-poten-blocks="([^"]+)"/);
      if (potenMatch) {
        try {
          const pastedBlocks: { type: BlockType; content: string; indent?: number; imageWidth?: number }[] = JSON.parse(decodeURIComponent(potenMatch[1]));
          if (pastedBlocks.length > 0) {
            pushUndo();
            const block = blocks[idx];
            const cursorPos = getCursorPos(block.id);
            const before = block.content.slice(0, cursorPos);
            const after = block.content.slice(cursorPos);
            const newBlocks: Block[] = pastedBlocks.map((pb, i) => {
              const b: Block = { id: i === 0 ? block.id : genId(), content: pb.content, type: pb.type, indent: pb.indent || 0 };
              if (pb.imageWidth) b.imageWidth = pb.imageWidth;
              // Merge text at cursor edges
              if (i === 0 && pb.type === "text" && before) b.content = before + pb.content;
              if (i === pastedBlocks.length - 1 && pb.type === "text" && after) b.content = pb.content + after;
              return b;
            });
            // If first pasted block is not text but we had text before cursor, keep the before text as a separate block
            if (pastedBlocks[0].type !== "text" && before) {
              newBlocks.unshift({ id: block.id, content: before, type: block.type, indent: block.indent });
              newBlocks[1] = { ...newBlocks[1], id: genId() };
            }
            // If last pasted block is not text but we had text after cursor, add after as separate block
            if (pastedBlocks[pastedBlocks.length - 1].type !== "text" && after) {
              newBlocks.push({ id: genId(), content: after, type: "text", indent: 0 });
            }
            setBlocks((prev) => {
              const next = [...prev];
              next.splice(idx, 1, ...newBlocks);
              return next;
            });
            pendingFocusIdx.current = idx + newBlocks.length - 1;
            return;
          }
        } catch { /* fall through to normal paste */ }
      }

      if (html) {
        const parsed = parseHtmlToBlocks(html);
        if (parsed.length > 0) {
          const block = blocks[idx];
          const cursorPos = getCursorPos(block.id);
          const before = block.content.slice(0, cursorPos);
          const after = block.content.slice(cursorPos);

          if (parsed.length === 1 && parsed[0].type === "text" && before + after === block.content) {
            const merged = before + parsed[0].content + after;
            setBlocks((prev) => prev.map((b) => b.id === block.id ? { ...b, content: merged } : b));
            requestAnimationFrame(() => {
              const el = blockRefs.current.get(block.id);
              if (el) {
                el.textContent = merged;
                const range = document.createRange();
                const sel = window.getSelection();
                const targetPos = before.length + parsed[0].content.length;
                let node: Node = el;
                let offset = 0;
                const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
                let remaining = targetPos;
                let textNode: Text | null;
                while ((textNode = walker.nextNode() as Text | null)) {
                  if (remaining <= textNode.length) { node = textNode; offset = remaining; break; }
                  remaining -= textNode.length;
                }
                range.setStart(node, offset);
                range.collapse(true);
                sel?.removeAllRanges();
                sel?.addRange(range);
              }
            });
            return;
          }

          const newBlocks: Block[] = parsed.map((p, i) => {
            if (i === 0) return { id: block.id, content: before + p.content, type: before ? block.type : p.type, indent: block.indent };
            if (i === parsed.length - 1) return { id: genId(), content: p.content + after, type: p.type, indent: block.indent };
            return { id: genId(), content: p.content, type: p.type, indent: block.indent };
          });
          setBlocks((prev) => {
            const next = [...prev];
            next.splice(idx, 1, ...newBlocks);
            return next;
          });
          pendingFocusIdx.current = idx + newBlocks.length - 1;
          return;
        }
      }

      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
      // Deduplicate consecutive identical URL lines (common copy artifact)
      const dedupedLines = lines.filter((l, i) => i === 0 || l.trim() !== lines[i - 1].trim());
      if (dedupedLines.length === 1) {
        document.execCommand("insertText", false, dedupedLines[0]);
        return;
      }
      const block = blocks[idx];
      const cursorPos = getCursorPos(block.id);
      const before = block.content.slice(0, cursorPos);
      const after = block.content.slice(cursorPos);
      const newBlocks: Block[] = dedupedLines.map((line, i) => {
        // Auto-detect URL lines as bookmarks
        const trimLine = line.trim();
        if (/^https?:\/\/[^\s]+$/.test(trimLine)) {
          return { id: i === 0 ? block.id : genId(), content: trimLine, type: "bookmark" as BlockType, indent: 0 };
        }
        const parsed = parseBlockLine(line);
        if (i === 0) return { id: block.id, content: before + parsed.content, type: block.type, indent: block.indent };
        if (i === dedupedLines.length - 1) return { id: genId(), content: parsed.content + after, type: parsed.type, indent: parsed.indent };
        return { id: genId(), content: parsed.content, type: parsed.type, indent: parsed.indent };
      });
      setBlocks((prev) => {
        const next = [...prev];
        next.splice(idx, 1, ...newBlocks);
        return next;
      });
      pendingFocusIdx.current = idx + newBlocks.length - 1;
    },
    [blocks]
  );

  // ─── Key Handler ───────────────────────────────────────────────
  const handleKeyDown = (e: KeyboardEvent, idx: number) => {
    const block = blocks[idx];

    // Slash menu keyboard navigation
    if (slashMenu) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSlashMenu((s) => s ? { ...s, selectedIdx: Math.min(s.selectedIdx + 1, filteredSlashItems.length - 1) } : null); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSlashMenu((s) => s ? { ...s, selectedIdx: Math.max(s.selectedIdx - 1, 0) } : null); return; }
      if (e.key === "Enter") { e.preventDefault(); if (filteredSlashItems[slashMenu.selectedIdx]) selectSlashItem(filteredSlashItems[slashMenu.selectedIdx]); return; }
      if (e.key === "Escape") { e.preventDefault(); closeSlashMenu(); return; }
    }

    // Ctrl+B/I/U: inline formatting
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      if (e.key === "b") { e.preventDefault(); document.execCommand("bold", false); return; }
      if (e.key === "i") { e.preventDefault(); document.execCommand("italic", false); return; }
      if (e.key === "u") { e.preventDefault(); document.execCommand("underline", false); return; }
      if (e.key === "k") { e.preventDefault(); handleLink(); return; }
    }

    // Tab: indent / Shift+Tab: outdent
    if (e.key === "Tab") {
      e.preventDefault();
      pushUndo();
      if (e.shiftKey) {
        // Outdent
        if (block.indent > 0) {
          setBlocks((prev) => prev.map((b) => b.id === block.id ? { ...b, indent: b.indent - 1 } : b));
        }
      } else {
        // Indent (max 3 levels, only if prev block has >= this indent)
        if (block.indent < 3 && idx > 0) {
          setBlocks((prev) => prev.map((b) => b.id === block.id ? { ...b, indent: b.indent + 1 } : b));
        }
      }
      return;
    }

    // Ctrl+Z/Y
    if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); undo(); return; }
    if ((e.key === "y" && (e.ctrlKey || e.metaKey)) || (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey)) { e.preventDefault(); redo(); return; }

    // Ctrl+A: first press selects all text in current block, second press selects all blocks
    if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
      const el = blockRefs.current.get(block.id);
      const sel = window.getSelection();
      // Check if all text in current block is already selected
      const allSelected = sel && el && sel.rangeCount > 0 && (() => {
        const range = sel.getRangeAt(0);
        const fullRange = document.createRange();
        fullRange.selectNodeContents(el);
        return range.toString() === fullRange.toString() && fullRange.toString().length > 0;
      })();

      if (allSelected || !block.content.trim()) {
        // All text selected or empty block → select all blocks
        e.preventDefault();
        setSelectedIds(new Set(blocks.map((b) => b.id)));
        lastClickedIdx.current = 0;
        window.getSelection()?.removeAllRanges();
        wrapperRef.current?.focus();
      }
      // else: let browser default select all text in current block
      return;
    }

    // Ctrl+C/X — works with 1+ selected blocks (including single bookmark/image)
    if ((e.key === "c" || e.key === "x") && (e.ctrlKey || e.metaKey) && selectedIds.size >= 1) {
      e.preventDefault();
      const selected = blocks.filter((b) => selectedIds.has(b.id));
      const plain = selected
        .filter(b => b.type !== "image")
        .map(b => b.type === "bookmark" ? b.content : serializeBlock(b))
        .join("\n");
      const blocksJson = encodeURIComponent(JSON.stringify(selected.map(b => ({ type: b.type, content: b.content, indent: b.indent, imageWidth: b.imageWidth }))));
      const htmlInner = selected.map((b) => {
        const c = b.content || "";
        switch (b.type) {
          case "h1": return `<h1>${c}</h1>`;
          case "h2": return `<h2>${c}</h2>`;
          case "h3": return `<h3>${c}</h3>`;
          case "bullet": return `<ul><li>${c}</li></ul>`;
          case "numbered": return `<ol><li>${c}</li></ol>`;
          case "divider": return `<hr>`;
          case "bookmark": return `<a href="${c}">${c}</a>`;
          case "image": return `<img src="${c}" />`;
          default: return `<p>${c}</p>`;
        }
      }).join("\n");
      const html = `<div data-poten-blocks="${blocksJson}">${htmlInner}</div>`;
      navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([plain], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]).catch(() => { navigator.clipboard.writeText(plain); });
      if (e.key === "x") { pushUndo(); deleteSelectedBlocks(); }
      return;
    }

    // Delete/Backspace with selection
    if ((e.key === "Backspace" || e.key === "Delete") && selectedIds.size > 0) {
      e.preventDefault(); pushUndo(); deleteSelectedBlocks(); return;
    }

    // Typing over selection
    if (selectedIds.size > 1 && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      pushUndo();
      const firstIdx = blocks.findIndex(b => selectedIds.has(b.id));
      const newId = genId();
      setBlocks(prev => {
        const remaining = prev.filter(b => !selectedIds.has(b.id));
        const newBlock: Block = { id: newId, content: e.key, type: "text", indent: 0 };
        remaining.splice(Math.min(firstIdx, remaining.length), 0, newBlock);
        return remaining.length > 0 ? remaining : [newBlock];
      });
      setSelectedIds(new Set());
      requestAnimationFrame(() => {
        const el = blockRefs.current.get(newId);
        if (el) {
          el.focus();
          const range = document.createRange();
          const sel = window.getSelection();
          if (el.childNodes.length > 0) range.setStartAfter(el.lastChild!);
          else range.setStart(el, 0);
          range.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      });
      return;
    }

    // Space: auto-convert markdown shortcuts (- → bullet, 1. → numbered, #/##/### → heading)
    if (e.key === " " && block.type === "text") {
      const el = blockRefs.current.get(block.id);
      const text = el?.textContent || "";
      const cursorPos = getCursorPos(block.id);
      const beforeCursor = text.slice(0, cursorPos);

      let newType: BlockType | null = null;
      let stripLen = 0;
      if (beforeCursor === "-") { newType = "bullet"; stripLen = 1; }
      else if (beforeCursor === "*") { newType = "bullet"; stripLen = 1; }
      else if (/^\d+\.$/.test(beforeCursor)) { newType = "numbered"; stripLen = beforeCursor.length; }
      else if (beforeCursor === "#") { newType = "h1"; stripLen = 1; }
      else if (beforeCursor === "##") { newType = "h2"; stripLen = 2; }
      else if (beforeCursor === "###") { newType = "h3"; stripLen = 3; }

      if (newType) {
        e.preventDefault();
        pushUndo();
        const remaining = text.slice(stripLen).trimStart();
        setBlocks((prev) => prev.map((b) => b.id === block.id ? { ...b, type: newType!, content: remaining } : b));
        requestAnimationFrame(() => {
          const el2 = blockRefs.current.get(block.id);
          if (el2) {
            el2.textContent = remaining;
            const range = document.createRange();
            const sel = window.getSelection();
            if (el2.childNodes.length > 0) range.setStartAfter(el2.lastChild!);
            else range.setStart(el2, 0);
            range.collapse(true);
            sel?.removeAllRanges();
            sel?.addRange(range);
          }
        });
        return;
      }
    }

    // Enter
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (slashMenu) return;
      pushUndo();

      const cursorPos = getCursorPos(block.id);
      const before = block.content.slice(0, cursorPos);
      const after = block.content.slice(cursorPos);

      const el = blockRefs.current.get(block.id);
      if (el) el.textContent = before;

      // If current block is empty list item, convert to text and reset indent
      if ((block.type === "bullet" || block.type === "numbered") && !block.content.trim()) {
        setBlocks((prev) =>
          prev.map((b) => b.id === block.id ? { ...b, type: "text", indent: 0 } : b)
        );
        return;
      }

      // Continue list type + inherit indent
      const newType: BlockType = (block.type === "bullet" || block.type === "numbered") ? block.type : "text";
      const newBlock: Block = { id: genId(), content: after, type: newType, indent: block.indent };

      setBlocks((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], content: before };
        next.splice(idx + 1, 0, newBlock);
        return next;
      });
      pendingFocusIdx.current = idx + 1;
    }

    // Backspace
    if (e.key === "Backspace") {
      const el = blockRefs.current.get(block.id);
      const sel = window.getSelection();
      const atStart =
        sel && el
          ? (() => {
              const range = sel.getRangeAt(0);
              const preRange = document.createRange();
              preRange.selectNodeContents(el);
              preRange.setEnd(range.startContainer, range.startOffset);
              return preRange.toString().length === 0 && range.collapsed;
            })()
          : block.content.length === 0;

      if (atStart) {
        // If indented, outdent first
        if (block.indent > 0) {
          e.preventDefault();
          pushUndo();
          setBlocks((prev) => prev.map((b) => b.id === block.id ? { ...b, indent: b.indent - 1 } : b));
          return;
        }
        // If non-text type, convert to text
        if (block.type !== "text") {
          e.preventDefault();
          pushUndo();
          setBlockType(block.id, "text");
          return;
        }
        // Merge with previous block
        if (idx > 0) {
          e.preventDefault();
          pushUndo();
          const prevBlock = blocks[idx - 1];
          const mergedContent = prevBlock.content + block.content;
          setBlocks((prev) => {
            const next = [...prev];
            next[idx - 1] = { ...next[idx - 1], content: mergedContent };
            next.splice(idx, 1);
            return next;
          });
          requestAnimationFrame(() => {
            const prevEl = blockRefs.current.get(prevBlock.id);
            if (prevEl) {
              prevEl.focus();
              const range = document.createRange();
              const sel = window.getSelection();
              let remaining = prevBlock.content.length;
              let node: Node = prevEl;
              let offset = 0;
              const walker = document.createTreeWalker(prevEl, NodeFilter.SHOW_TEXT);
              let textNode: Text | null;
              while ((textNode = walker.nextNode() as Text | null)) {
                if (remaining <= textNode.length) { node = textNode; offset = remaining; break; }
                remaining -= textNode.length;
              }
              range.setStart(node, offset);
              range.collapse(true);
              sel?.removeAllRanges();
              sel?.addRange(range);
            }
          });
        }
      }
    }

    // Delete (forward delete) — merge with next block
    if (e.key === "Delete" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      const el = blockRefs.current.get(block.id);
      const sel = window.getSelection();
      const atEnd =
        sel && el
          ? (() => {
              const range = sel.getRangeAt(0);
              const postRange = document.createRange();
              postRange.selectNodeContents(el);
              postRange.setStart(range.endContainer, range.endOffset);
              return postRange.toString().length === 0 && range.collapsed;
            })()
          : false;

      if (atEnd && idx < blocks.length - 1) {
        e.preventDefault();
        pushUndo();
        const nextBlock = blocks[idx + 1];
        // If next block is non-text (divider, image, bookmark, page), just delete it
        if (["divider", "image", "bookmark", "page"].includes(nextBlock.type)) {
          setBlocks((prev) => {
            const next = [...prev];
            next.splice(idx + 1, 1);
            return next;
          });
        } else {
          // Merge next block content into current
          const cursorPos = block.content.length;
          const mergedContent = block.content + nextBlock.content;
          setBlocks((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], content: mergedContent };
            next.splice(idx + 1, 1);
            return next;
          });
          requestAnimationFrame(() => {
            const curEl = blockRefs.current.get(block.id);
            if (curEl) {
              // Manually sync DOM before cursor positioning
              if (curEl.textContent !== mergedContent) curEl.textContent = mergedContent;
              curEl.focus();
              const range = document.createRange();
              const sel = window.getSelection();
              let remaining = cursorPos;
              let node: Node = curEl;
              let offset = 0;
              const walker = document.createTreeWalker(curEl, NodeFilter.SHOW_TEXT);
              let textNode: Text | null;
              while ((textNode = walker.nextNode() as Text | null)) {
                if (remaining <= textNode.length) { node = textNode; offset = remaining; break; }
                remaining -= textNode.length;
              }
              range.setStart(node, offset);
              range.collapse(true);
              sel?.removeAllRanges();
              sel?.addRange(range);
            }
          });
        }
      }
    }

    // Escape
    if (e.key === "Escape" && selectedIds.size > 0 && !slashMenu) {
      e.preventDefault(); clearSelection(); return;
    }

    // Shift+Arrow: extend selection
    if (e.shiftKey && (e.key === "ArrowUp" || e.key === "ArrowDown") && !slashMenu) {
      e.preventDefault();
      const anchor = lastClickedIdx.current ?? idx;
      const newIdx = e.key === "ArrowUp" ? Math.max(0, idx - 1) : Math.min(blocks.length - 1, idx + 1);
      selectRange(anchor, newIdx);
      window.getSelection()?.removeAllRanges();
      wrapperRef.current?.focus();
      return;
    }

    // Arrow navigation
    if (e.key === "ArrowUp" && !slashMenu) {
      const el = blockRefs.current.get(block.id);
      const sel = window.getSelection();
      if (sel && el) {
        const range = sel.getRangeAt(0);
        const preRange = document.createRange();
        preRange.selectNodeContents(el);
        preRange.setEnd(range.startContainer, range.startOffset);
        if (preRange.toString().indexOf("\n") === -1 && idx > 0) {
          e.preventDefault();
          pendingFocusIdx.current = idx - 1;
          setBlocks((prev) => [...prev]);
        }
      }
    }

    if (e.key === "ArrowDown" && !slashMenu) {
      const el = blockRefs.current.get(block.id);
      const sel = window.getSelection();
      if (sel && el) {
        const range = sel.getRangeAt(0);
        const postRange = document.createRange();
        postRange.selectNodeContents(el);
        postRange.setStart(range.endContainer, range.endOffset);
        if (postRange.toString().indexOf("\n") === -1 && idx < blocks.length - 1) {
          e.preventDefault();
          pendingFocusIdx.current = idx + 1;
          setBlocks((prev) => [...prev]);
        }
      }
    }
  };

  // ─── Block Operations ──────────────────────────────────────────
  const deleteBlock = (idx: number) => {
    pushUndo();
    if (blocks.length <= 1) {
      setBlocks([{ id: blocks[0].id, content: "", type: "text", indent: 0 }]);
      return;
    }
    setBlocks((prev) => prev.filter((_, i) => i !== idx));
    pendingFocusIdx.current = Math.max(0, idx - 1);
  };

  const addBlockAfter = (idx: number) => {
    const newBlock: Block = { id: genId(), content: "", type: "text", indent: blocks[idx]?.indent || 0 };
    setBlocks((prev) => {
      const next = [...prev];
      next.splice(idx + 1, 0, newBlock);
      return next;
    });
    pendingFocusIdx.current = idx + 1;
  };

  // Multi-select helpers
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const selectRange = useCallback((fromIdx: number, toIdx: number) => {
    const start = Math.min(fromIdx, toIdx);
    const end = Math.max(fromIdx, toIdx);
    const ids = new Set<string>();
    for (let i = start; i <= end; i++) ids.add(blocks[i].id);
    setSelectedIds(ids);
  }, [blocks]);

  const handleBlockMouseDown = useCallback((e: React.MouseEvent, idx: number) => {
    if (readOnly) return;
    // Don't start multi-select drag from inside contenteditable elements
    const target = e.target as HTMLElement;
    const isContentEditable = target.getAttribute("contenteditable") === "true" || target.closest("[contenteditable]");
    // Don't start multi-select drag from non-text blocks (image, bookmark, divider, page)
    const blockType = blocksRef.current[idx]?.type;
    const isNonTextBlock = blockType === "image" || blockType === "bookmark" || blockType === "divider" || blockType === "page";
    if (e.shiftKey && lastClickedIdx.current !== null) {
      e.preventDefault();
      selectRange(lastClickedIdx.current, idx);
      window.getSelection()?.removeAllRanges();
    } else if (!e.shiftKey) {
      lastClickedIdx.current = idx;
      mouseDownBlockIdx.current = idx; // Always track origin block for cross-block drag detection
      if (isNonTextBlock) {
        // Non-text blocks: select immediately on mousedown (like Notion)
        const blockId = blocksRef.current[idx]?.id;
        if (blockId) {
          setSelectedIds(new Set([blockId]));
        }
        // Pre-set drag ref so handleWrapperMouseMove won't start multi-select
        // (real drag starts in onDragStart; cleared in mouseup if no drag happens)
        dragBlockIdxRef.current = idx;
      } else {
        if (selectedIds.size > 0) clearSelection();
      }
      // Allow multi-select drag from text block non-editable areas; non-text blocks use HTML5 drag for reorder
      dragStartIdx.current = (isContentEditable || isNonTextBlock) ? null : idx;
      isDragging.current = false;
    }
  }, [readOnly, selectedIds, selectRange, clearSelection]);

  const handleBlockMouseEnter = useCallback((idx: number) => {
    if (readOnly) return;
    setHoveredIdx(idx);
    // If drag started in a contentEditable block (dragStartIdx is null but mouseDownBlockIdx is set),
    // and mouse moved to a different block → switch to block selection (like Notion)
    const originIdx = dragStartIdx.current ?? mouseDownBlockIdx.current;
    if (originIdx !== null && originIdx !== idx) {
      // Promote to block selection
      if (dragStartIdx.current === null) dragStartIdx.current = originIdx;
      isDragging.current = true;
      selectRange(dragStartIdx.current, idx);
      window.getSelection()?.removeAllRanges();
      // Blur any focused contentEditable to prevent text cursor remaining
      const active = document.activeElement as HTMLElement;
      if (active?.getAttribute("contenteditable") === "true") active.blur();
    }
  }, [readOnly, selectRange]);

  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging.current) isDragging.current = false;
      dragStartIdx.current = null;
      mouseDownBlockIdx.current = null;
      rubberBandStart.current = null;
      setRubberBand(null);
      // Clear pre-set drag ref if no actual HTML5 drag happened (just a click)
      if (dragBlockIdxRef.current !== null && dragBlockIdx === null) {
        dragBlockIdxRef.current = null;
      }
    };
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [dragBlockIdx]);

  // Wrapper-level mousedown: start multi-select from empty space / gaps between blocks
  const handleWrapperMouseDown = useCallback((e: React.MouseEvent) => {
    if (readOnly) return;
    const target = e.target as HTMLElement;
    // Skip if clicking on interactive content (buttons, links, images)
    if (target.tagName === "BUTTON" || target.tagName === "IMG" || target.closest("button") || target.closest("a")) return;

    // Check if click is in the left/right gutter area (within 48px of wrapper edges)
    // If so, always start multi-select regardless of block type
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const wrapperRect = wrapper.getBoundingClientRect();
    const isInGutter = e.clientX < wrapperRect.left + 48 || e.clientX > wrapperRect.right - 48;

    if (!isInGutter) {
      // Skip if clicking inside a draggable non-text block (bookmark/image) — let HTML5 drag handle it
      const closestBlockRow = target.closest("[draggable='true']") as HTMLElement;
      if (closestBlockRow && closestBlockRow !== wrapperRef.current) return;
      const isEditable = target.getAttribute("contenteditable") === "true" || target.closest("[contenteditable]");
      // Allow if clicking on empty contentEditable (empty text block between non-text blocks)
      if (isEditable) {
        const editableEl = target.getAttribute("contenteditable") === "true" ? target : target.closest("[contenteditable]") as HTMLElement;
        if (editableEl && (editableEl.textContent || "").trim().length > 0) return; // Has text content, let normal editing handle it
      }
    }

    // Find nearest block by Y position
    e.preventDefault();
    clearSelection();
    const clickY = e.clientY;
    const children = wrapper.children;
    let nearestIdx = -1;
    for (let i = 0; i < children.length && i < blocksRef.current.length; i++) {
      const rect = children[i].getBoundingClientRect();
      if (clickY <= rect.bottom) { nearestIdx = i; break; }
    }
    // Clicked below all blocks → create new text block at the end
    if (nearestIdx === -1) {
      if (isInGutter) return; // Gutter below blocks: do nothing
      const lastBlock = blocksRef.current[blocksRef.current.length - 1];
      // If last block is already an empty text block, just focus it
      if (lastBlock && lastBlock.type === "text" && !lastBlock.content.trim()) {
        const el = blockRefs.current.get(lastBlock.id);
        if (el) { el.focus(); return; }
      }
      const newId = genId();
      setBlocks(prev => [...prev, { id: newId, content: "", type: "text" as BlockType, indent: 0 }]);
      pendingFocusIdx.current = blocksRef.current.length;
      return;
    }
    // If clicking on an empty text block (not in gutter), focus it directly instead of blue selection
    if (!isInGutter) {
      const nearestBlock = blocksRef.current[nearestIdx];
      if (nearestBlock && nearestBlock.type === "text" && !nearestBlock.content.trim()) {
        const el = blockRefs.current.get(nearestBlock.id);
        if (el) { el.focus(); return; }
      }
    }
    // Start drag selection + rubber band
    rubberBandStart.current = { x: e.clientX, y: e.clientY };
    const nearestBlock = blocksRef.current[nearestIdx];
    dragStartIdx.current = nearestIdx;
    isDragging.current = false;
    lastClickedIdx.current = nearestIdx;
    setSelectedIds(new Set([nearestBlock?.id].filter(Boolean)));
    window.getSelection()?.removeAllRanges();
    wrapperRef.current?.focus();
  }, [readOnly, clearSelection]);

  // Helper: find nearest block index from clientY
  const findNearestBlockIdx = useCallback((clientY: number): number => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return -1;
    const children = wrapper.children;
    for (let i = 0; i < children.length && i < blocksRef.current.length; i++) {
      const rect = children[i].getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) return i;
    }
    // Below all blocks → last block
    if (blocksRef.current.length > 0) {
      const lastRect = children[blocksRef.current.length - 1]?.getBoundingClientRect();
      if (lastRect && clientY > lastRect.bottom) return blocksRef.current.length - 1;
    }
    // Above all blocks → first block
    if (blocksRef.current.length > 0) {
      const firstRect = children[0]?.getBoundingClientRect();
      if (firstRect && clientY < firstRect.top) return 0;
    }
    return -1;
  }, []);

  // Wrapper-level mouseMove: handle drag from outside + extend selection + rubber band
  const handleWrapperMouseMove = useCallback((e: React.MouseEvent) => {
    if (readOnly || e.buttons !== 1) return;
    if (dragBlockIdxRef.current !== null) return; // Block reorder drag in progress

    // Update rubber band visual
    if (rubberBandStart.current) {
      const dx = Math.abs(e.clientX - rubberBandStart.current.x);
      const dy = Math.abs(e.clientY - rubberBandStart.current.y);
      if (dx > 5 || dy > 5) {
        setRubberBand({
          startX: rubberBandStart.current.x,
          startY: rubberBandStart.current.y,
          endX: e.clientX,
          endY: e.clientY,
        });
      }
    }

    const currentIdx = findNearestBlockIdx(e.clientY);
    if (currentIdx < 0) return;

    const originIdx = dragStartIdx.current ?? mouseDownBlockIdx.current;
    if (originIdx === null) {
      // Mouse entered from outside with button held → start selection
      rubberBandStart.current = { x: e.clientX, y: e.clientY };
      dragStartIdx.current = currentIdx;
      mouseDownBlockIdx.current = currentIdx;
      lastClickedIdx.current = currentIdx;
      setSelectedIds(new Set([blocksRef.current[currentIdx]?.id].filter(Boolean)));
      window.getSelection()?.removeAllRanges();
      return;
    }

    // Extend selection — promote contentEditable drag to block selection if crossing blocks
    if (currentIdx !== originIdx) {
      if (dragStartIdx.current === null) dragStartIdx.current = originIdx;
      isDragging.current = true;
      selectRange(dragStartIdx.current, currentIdx);
      window.getSelection()?.removeAllRanges();
      const active = document.activeElement as HTMLElement;
      if (active?.getAttribute("contenteditable") === "true") active.blur();
    }
  }, [readOnly, dragBlockIdx, findNearestBlockIdx, selectRange]);

  const deleteSelectedBlocks = useCallback(() => {
    if (selectedIds.size === 0) return;
    setBlocks((prev) => {
      const remaining = prev.filter((b) => !selectedIds.has(b.id));
      if (remaining.length === 0) return [{ id: genId(), content: "", type: "text" as BlockType, indent: 0 }];
      return remaining;
    });
    const firstSelectedIdx = blocks.findIndex((b) => selectedIds.has(b.id));
    pendingFocusIdx.current = Math.max(0, firstSelectedIdx - 1);
    clearSelection();
  }, [selectedIds, blocks, clearSelection]);

  // Numbered list index — indent 0: 1,2,3  indent 1: a,b,c  indent 2: i,ii,iii
  const getNumberedLabel = (idx: number): string => {
    let count = 1;
    const block = blocks[idx];
    const indent = block.indent;
    for (let i = idx - 1; i >= 0; i--) {
      if (blocks[i].type === "numbered" && blocks[i].indent === indent) count++;
      else if (blocks[i].indent < indent) break; // stop at parent
      else if (blocks[i].type !== "numbered" && blocks[i].indent === indent) break;
    }
    if (indent === 0) return String(count);
    if (indent === 1) return String.fromCharCode(96 + count); // a,b,c
    if (indent === 2) {
      // roman numerals for indent 2
      const roman = ["i","ii","iii","iv","v","vi","vii","viii","ix","x"];
      return roman[count - 1] || String(count);
    }
    return String(count);
  };

  // ─── Block Drag & Drop ─────────────────────────────────────────
  const handleGripDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
    dragBlockIdxRef.current = idx;
    setDragBlockIdx(idx);
    // Prevent text selection during drag
    if (wrapperRef.current) wrapperRef.current.style.userSelect = "none";
  };

  const handleBlockDragOver = (e: React.DragEvent, idx: number) => {
    if (dragBlockIdxRef.current === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetIdx(idx);
  };

  const handleBlockDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    const fromIdx = dragBlockIdxRef.current;
    if (fromIdx === null || fromIdx === targetIdx) {
      dragBlockIdxRef.current = null;
      setDragBlockIdx(null);
      setDropTargetIdx(null);
      return;
    }
    pushUndo();
    setBlocks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      const insertIdx = fromIdx < targetIdx ? targetIdx - 1 : targetIdx;
      next.splice(insertIdx, 0, moved);
      return next;
    });
    dragBlockIdxRef.current = null;
    setDragBlockIdx(null);
    setDropTargetIdx(null);
  };

  const handleBlockDragEnd = () => {
    dragBlockIdxRef.current = null;
    setDragBlockIdx(null);
    setDropTargetIdx(null);
    if (wrapperRef.current) wrapperRef.current.style.userSelect = "";
  };

  // Wrapper-level keyDown
  const handleWrapperKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).getAttribute("contenteditable")) return;
    if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); undo(); return; }
    if ((e.key === "y" && (e.ctrlKey || e.metaKey)) || (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey)) { e.preventDefault(); redo(); return; }
    if (selectedIds.size === 0) {
      // No selection but focus on wrapper — Enter creates a new text block at the end
      if (e.key === "Enter") {
        e.preventDefault();
        const newId = genId();
        setBlocks(prev => [...prev, { id: newId, content: "", type: "text" as BlockType, indent: 0 }]);
        pendingFocusIdx.current = blocksRef.current.length; // will be the new last block
      }
      return;
    }
    // Enter on selected non-text block: insert text block below and focus it
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const lastSelectedIdx = blocks.reduce((acc, b, i) => selectedIds.has(b.id) ? i : acc, 0);
      const newId = genId();
      const newBlock: Block = { id: newId, content: "", type: "text", indent: 0 };
      setBlocks(prev => { const next = [...prev]; next.splice(lastSelectedIdx + 1, 0, newBlock); return next; });
      setSelectedIds(new Set());
      pendingFocusIdx.current = lastSelectedIdx + 1;
      return;
    }
    if (e.key === "a" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setSelectedIds(new Set(blocks.map(b => b.id))); return; }
    if ((e.key === "c" || e.key === "x") && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const selected = blocks.filter(b => selectedIds.has(b.id));
      // For plain text: bookmark → just URL, image → skip (too large)
      const plain = selected
        .filter(b => b.type !== "image")
        .map(b => b.type === "bookmark" ? b.content : serializeBlock(b))
        .join("\n");
      // Embed block data as JSON in HTML for lossless paste within our editor
      const blocksJson = encodeURIComponent(JSON.stringify(selected.map(b => ({ type: b.type, content: b.content, indent: b.indent, imageWidth: b.imageWidth }))));
      const htmlInner = selected.map((b) => {
        const c = b.content || "";
        switch (b.type) {
          case "h1": return `<h1>${c}</h1>`;
          case "h2": return `<h2>${c}</h2>`;
          case "h3": return `<h3>${c}</h3>`;
          case "bullet": return `<ul><li>${c}</li></ul>`;
          case "numbered": return `<ol><li>${c}</li></ol>`;
          case "divider": return `<hr>`;
          case "bookmark": return `<a href="${c}">${c}</a>`;
          case "image": return `<img src="${c}" />`;
          default: return `<p>${c}</p>`;
        }
      }).join("\n");
      const html = `<div data-poten-blocks="${blocksJson}">${htmlInner}</div>`;
      navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([plain], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]).catch(() => { navigator.clipboard.writeText(plain); });
      if (e.key === "x") { pushUndo(); deleteSelectedBlocks(); }
      return;
    }
    // Ctrl+V: paste, replacing selected blocks
    if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.read().then(async (items) => {
        let html = "";
        let text = "";
        for (const item of items) {
          if (item.types.includes("text/html")) {
            const blob = await item.getType("text/html");
            html = await blob.text();
          }
          if (item.types.includes("text/plain")) {
            const blob = await item.getType("text/plain");
            text = await blob.text();
          }
        }
        pushUndo();
        const firstIdx = blocks.findIndex(b => selectedIds.has(b.id));
        // Check for our custom block data
        const potenMatch = html.match(/data-poten-blocks="([^"]+)"/);
        let newBlocks: Block[] = [];
        if (potenMatch) {
          try {
            const pastedBlocks: { type: BlockType; content: string; indent?: number; imageWidth?: number }[] = JSON.parse(decodeURIComponent(potenMatch[1]));
            newBlocks = pastedBlocks.map(pb => {
              const b: Block = { id: genId(), content: pb.content, type: pb.type, indent: pb.indent || 0 };
              if (pb.imageWidth) b.imageWidth = pb.imageWidth;
              return b;
            });
          } catch { /* fall through */ }
        }
        if (newBlocks.length === 0 && text) {
          const trimmed = text.trim();
          if (/^https?:\/\/[^\s]+$/.test(trimmed)) {
            newBlocks = [{ id: genId(), content: trimmed, type: "bookmark", indent: 0 }];
          } else {
            newBlocks = text.split(/\r?\n/).filter(l => l.trim()).map(l => {
              const tl = l.trim();
              if (/^https?:\/\/[^\s]+$/.test(tl)) return { id: genId(), content: tl, type: "bookmark" as BlockType, indent: 0 };
              return { id: genId(), content: l, type: "text" as BlockType, indent: 0 };
            });
          }
        }
        if (newBlocks.length > 0) {
          setBlocks(prev => {
            const next = prev.filter(b => !selectedIds.has(b.id));
            next.splice(Math.min(firstIdx, next.length), 0, ...newBlocks);
            return next;
          });
          setSelectedIds(new Set());
          pendingFocusIdx.current = firstIdx + newBlocks.length - 1;
        }
      }).catch(() => {});
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); setSelectedIds(new Set()); return; }
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); pushUndo(); deleteSelectedBlocks(); return; }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      pushUndo();
      const firstIdx = blocks.findIndex(b => selectedIds.has(b.id));
      const newId = genId();
      setBlocks(prev => {
        const remaining = prev.filter(b => !selectedIds.has(b.id));
        const newBlock: Block = { id: newId, content: e.key, type: "text", indent: 0 };
        remaining.splice(Math.min(firstIdx, remaining.length), 0, newBlock);
        return remaining.length > 0 ? remaining : [newBlock];
      });
      setSelectedIds(new Set());
      requestAnimationFrame(() => {
        const el = blockRefs.current.get(newId);
        if (el) {
          el.focus();
          const range = document.createRange();
          const sel = window.getSelection();
          if (el.childNodes.length > 0) range.setStartAfter(el.lastChild!);
          else range.setStart(el, 0);
          range.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      });
      return;
    }
  }, [selectedIds, blocks, deleteSelectedBlocks, pushUndo, undo, redo]);

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div ref={wrapperRef} className="space-y-0 outline-none pb-8 -mx-12 px-12 relative" tabIndex={-1} onKeyDown={handleWrapperKeyDown} onMouseDown={handleWrapperMouseDown} onMouseMove={handleWrapperMouseMove}>
      {/* Rubber band selection visual (like Windows/Notion drag select) */}
      {rubberBand && (
        <div
          className="fixed pointer-events-none z-[50] border border-blue-400/60 bg-blue-400/10 rounded-sm"
          style={{
            left: Math.min(rubberBand.startX, rubberBand.endX),
            top: Math.min(rubberBand.startY, rubberBand.endY),
            width: Math.abs(rubberBand.endX - rubberBand.startX),
            height: Math.abs(rubberBand.endY - rubberBand.startY),
          }}
        />
      )}
      {blocks.map((block, idx) => (
        <div
          key={block.id}
          className={cn(
            "group/block relative flex items-start",
            selectedIds.has(block.id) && "bg-blue-50 rounded-[4px]",
            dragBlockIdx === idx && "opacity-40",
            dropTargetIdx === idx && dragBlockIdx !== null && idx === dragBlockIdx && "before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-green-300 before:rounded-full before:z-10",
            dropTargetIdx === idx && dragBlockIdx !== null && idx !== dragBlockIdx && "before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-blue-300 before:rounded-full before:z-10"
          )}
          style={{ paddingLeft: block.indent * 24 }}
          draggable={!readOnly && block.type !== "text" && block.type !== "bullet" && block.type !== "numbered" && block.type !== "h1" && block.type !== "h2" && block.type !== "h3" ? true : undefined}
          onDragStart={(e) => {
            if (!readOnly && block.type !== "text" && block.type !== "bullet" && block.type !== "numbered" && block.type !== "h1" && block.type !== "h2" && block.type !== "h3") {
              handleGripDragStart(e, idx);
            }
          }}
          onDragEnd={handleBlockDragEnd}
          onMouseDown={(e) => handleBlockMouseDown(e, idx)}
          onMouseEnter={() => handleBlockMouseEnter(idx)}
          onMouseLeave={() => setHoveredIdx(null)}
          onDragOver={(e) => handleBlockDragOver(e, idx)}
          onDrop={(e) => handleBlockDrop(e, idx)}
        >
          {/* Left handle area — positioned left of content, doesn't affect text alignment */}
          {!readOnly && (
            <div
              className={cn(
                "absolute right-full flex items-center gap-0 shrink-0 transition-opacity duration-100 mr-0.5",
                block.type === "h1" ? "pt-[8px]" : block.type === "h2" ? "pt-[6px]" : "pt-[5px]",
                hoveredIdx === idx || focusedIdx === idx ? "opacity-100" : "opacity-0"
              )}
            >
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => addBlockAfter(idx)}
                className="p-0.5 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-colors"
                tabIndex={-1}
              >
                <Plus size={14} />
              </button>
              <div
                draggable
                onMouseDown={(e) => e.stopPropagation()}
                onDragStart={(e) => handleGripDragStart(e, idx)}
                onDragEnd={handleBlockDragEnd}
                className="text-gray-300 cursor-grab active:cursor-grabbing p-0.5 hover:bg-gray-100 rounded transition-colors"
              >
                <GripVertical size={14} />
              </div>
            </div>
          )}

          {/* List prefix */}
          {block.type === "bullet" && (
            <span className="shrink-0 w-6 text-center text-gray-400 leading-relaxed py-[3px] select-none">•</span>
          )}
          {block.type === "numbered" && (
            <span className="shrink-0 w-6 text-center text-gray-900 leading-relaxed py-[3px] text-[13px] select-none font-medium">
              {getNumberedLabel(idx)}.
            </span>
          )}

          {/* Block content */}
          {block.type === "page" ? (
            <button
              onClick={(e) => {
                if (!readOnly && (e.shiftKey || e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  if (e.shiftKey && lastClickedIdx.current !== null) selectRange(lastClickedIdx.current, idx);
                  else { setSelectedIds(new Set([block.id])); lastClickedIdx.current = idx; }
                  wrapperRef.current?.focus();
                  return;
                }
                navigate(p(`/pages/${block.content}`));
              }}
              className="flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all text-left group/page cursor-pointer"
            >
              <FileText size={18} className="text-gray-400 group-hover/page:text-gray-600 shrink-0" />
              <span className="text-[15px] text-gray-700 font-medium truncate">
                {getSubPage(block.content)?.title || (ko ? "제목 없음" : "Untitled")}
              </span>
              <ArrowRight size={14} className="ml-auto text-gray-300 group-hover/page:text-gray-500 shrink-0" />
            </button>
          ) : block.type === "divider" ? (
            <div
              className="flex-1 py-3 px-1 cursor-pointer"
              onClick={(e) => {
                if (readOnly) return;
                e.stopPropagation();
                if (e.shiftKey && lastClickedIdx.current !== null) selectRange(lastClickedIdx.current, idx);
                else { setSelectedIds(new Set([block.id])); lastClickedIdx.current = idx; }
                wrapperRef.current?.focus();
              }}
            >
              <hr className="border-gray-200" />
            </div>
          ) : block.type === "image" ? (
            <ImageBlock
              block={block}
              readOnly={readOnly}
              isSelected={selectedIds.has(block.id)}
              onResize={(width) => {
                setBlocks((prev) => prev.map((b) => b.id === block.id ? { ...b, imageWidth: width } : b));
              }}
              onDelete={() => deleteBlock(idx)}
              onSelect={() => {
                setSelectedIds(new Set([block.id]));
                lastClickedIdx.current = idx;
                wrapperRef.current?.focus();
              }}
              onDragStart={(e) => handleGripDragStart(e, idx)}
              onDragEnd={handleBlockDragEnd}
            />
          ) : block.type === "bookmark" ? (
            <div className="flex-1 min-w-0" onDoubleClick={() => {
              if (readOnly) return;
              // Insert empty text block below and focus it
              const newBlock: Block = { id: genId(), content: "", type: "text", indent: 0 };
              setBlocks((prev) => { const next = [...prev]; next.splice(idx + 1, 0, newBlock); return next; });
              pendingFocusIdx.current = idx + 1;
            }}>
              <BookmarkBlock
                block={block}
                readOnly={readOnly}
                isSelected={selectedIds.has(block.id)}
                onDelete={() => deleteBlock(idx)}
                onSelect={() => {
                  setSelectedIds(new Set([block.id]));
                  lastClickedIdx.current = idx;
                  wrapperRef.current?.focus();
                }}
                onDragStart={(e) => handleGripDragStart(e, idx)}
                onDragEnd={handleBlockDragEnd}
              />
            </div>
          ) : (
            <div
              ref={(el) => {
                if (el) {
                  blockRefs.current.set(block.id, el);
                  if (!el.querySelector("b, i, u, strong, em") && el.textContent !== block.content && document.activeElement !== el) {
                    el.textContent = block.content;
                  }
                } else {
                  blockRefs.current.delete(block.id);
                }
              }}
              contentEditable={!readOnly}
              suppressContentEditableWarning
              onFocus={() => {
                if (!readOnly) {
                  setFocusedIdx(idx);
                  lastClickedIdx.current = idx;
                  const now = Date.now();
                  if (now - lastUndoPushTime.current > 1000) {
                    pushUndo();
                    lastUndoPushTime.current = now;
                  }
                }
              }}
              onBlur={() => {
                if (focusedIdx === idx) setFocusedIdx(null);
                if (!readOnly) {
                  const el = blockRefs.current.get(block.id);
                  if (el) {
                    const text = readText(el);
                    if (text !== block.content) updateBlock(block.id, text);
                  }
                }
              }}
              onCompositionStart={() => { isComposingRef.current = true; }}
              onCompositionEnd={() => {
                isComposingRef.current = false;
                if (!readOnly) {
                  const el = blockRefs.current.get(block.id);
                  if (el) updateBlock(block.id, readText(el));
                }
              }}
              onInput={() => {
                if (!readOnly && !isComposingRef.current) {
                  const el = blockRefs.current.get(block.id);
                  if (el) {
                    const text = readText(el);
                    // Push undo snapshot during typing (every 1.5s)
                    const now = Date.now();
                    if (now - lastUndoPushTime.current > 1500) {
                      pushUndo();
                      lastUndoPushTime.current = now;
                    }
                    if (text.startsWith("/")) {
                      const filter = text.slice(1).split(/\s/)[0] || "";
                      if (!slashMenu) openSlashMenu(idx);
                      setSlashMenu((s) => s ? { ...s, filter, selectedIdx: 0 } : null);
                    } else if (slashMenu) {
                      closeSlashMenu();
                    }
                    // Markdown shortcuts: auto-convert on typing
                    if (block.type === "text") {
                      let converted: { type: BlockType; trim: number } | null = null;
                      if (text === "- " || text === "- ") converted = { type: "bullet", trim: 2 };
                      else if (/^\d+\.\s$/.test(text)) converted = { type: "numbered", trim: text.length };
                      else if (text === "# ") converted = { type: "h1", trim: 2 };
                      else if (text === "## ") converted = { type: "h2", trim: 3 };
                      else if (text === "### ") converted = { type: "h3", trim: 4 };
                      else if (text === "---") converted = { type: "divider", trim: 3 };

                      if (converted) {
                        pushUndo();
                        const newContent = converted.type === "divider" ? "" : text.slice(converted.trim);
                        el.textContent = newContent;
                        setBlocks((prev) =>
                          prev.map((b) => b.id === block.id ? { ...b, type: converted!.type, content: newContent } : b)
                        );
                        // Place cursor at start of now-empty content
                        requestAnimationFrame(() => {
                          const blockEl = blockRefs.current.get(block.id);
                          if (blockEl && converted!.type !== "divider") {
                            blockEl.focus();
                            const range = document.createRange();
                            const sel = window.getSelection();
                            range.setStart(blockEl, 0);
                            range.collapse(true);
                            sel?.removeAllRanges();
                            sel?.addRange(range);
                          }
                        });
                        return;
                      }
                    }

                    if (text.includes("\n")) {
                      const lines = text.split("\n");
                      setBlocks((prev) => {
                        const next = [...prev];
                        const newBlocks = lines.map((line, i) => ({
                          id: i === 0 ? block.id : genId(),
                          content: line,
                          type: (i === 0 ? block.type : "text") as BlockType,
                          indent: block.indent,
                        }));
                        next.splice(idx, 1, ...newBlocks);
                        return next;
                      });
                      pendingFocusIdx.current = idx + lines.length - 1;
                    } else {
                      updateBlock(block.id, text);
                    }
                  }
                }
              }}
              onPaste={(e) => !readOnly && handlePaste(e, idx)}
              onKeyDown={(e) => !readOnly && handleKeyDown(e, idx)}
              data-placeholder={idx === 0 && blocks.length === 1 ? placeholder : block.type === "h1" ? (ko ? "제목 1" : "Heading 1") : block.type === "h2" ? (ko ? "제목 2" : "Heading 2") : block.type === "h3" ? (ko ? "제목 3" : "Heading 3") : (block.content === "" && focusedIdx === idx) ? (ko ? "'/' 명령어 입력..." : "Type '/' for commands...") : ""}
              className={cn(
                "flex-1 outline-none px-1 rounded-[4px] break-all [overflow-wrap:anywhere]",
                BLOCK_TYPE_STYLES[block.type],
                "empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 empty:before:pointer-events-none",
                "transition-colors duration-75",
                readOnly && "cursor-default"
              )}
            />
          )}

          {/* Delete button */}
          {!readOnly && blocks.length > 1 && (
            <button
              onClick={() => deleteBlock(idx)}
              className={cn(
                "p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all shrink-0 mt-[3px]",
                hoveredIdx === idx ? "opacity-100" : "opacity-0"
              )}
              tabIndex={-1}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ))}

      {/* Bottom virtual drop zones — 5 slots + red limit line */}
      {!readOnly && dragBlockIdx !== null && (
        <div className="select-none">
          {[0, 1, 2, 3, 4].map((offset) => {
            const virtualIdx = blocks.length + offset;
            const isActive = dropTargetIdx === virtualIdx;
            return (
              <div
                key={offset}
                className={cn(
                  "h-10 mx-1 rounded-lg border-2 border-dashed transition-all duration-100 mb-1",
                  isActive
                    ? "border-blue-400 bg-blue-50/40"
                    : "border-transparent"
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDropTargetIdx(virtualIdx);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragBlockIdx === null) { setDragBlockIdx(null); setDropTargetIdx(null); return; }
                  pushUndo();
                  setBlocks((prev) => {
                    const next = [...prev];
                    const [moved] = next.splice(dragBlockIdx, 1);
                    const emptyCount = offset;
                    for (let i = 0; i < emptyCount; i++) {
                      next.push({ id: genId(), content: "", type: "text", indent: 0 });
                    }
                    next.push(moved);
                    return next;
                  });
                  setDragBlockIdx(null);
                  setDropTargetIdx(null);
                }}
              />
            );
          })}
          {/* Red limit line */}
          <div className="px-2 py-1 select-none pointer-events-none">
            <div className="h-0.5 bg-red-300 rounded-full" />
          </div>
        </div>
      )}

      {/* Click below blocks to focus last block */}
      {!readOnly && dragBlockIdx === null && (
        <div
          className="h-32 cursor-text"
          onClick={() => {
            const lastBlock = blocks[blocks.length - 1];
            if (lastBlock) {
              const el = blockRefs.current.get(lastBlock.id);
              if (el) { el.focus(); const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); const s = window.getSelection(); s?.removeAllRanges(); s?.addRange(r); }
            }
          }}
        />
      )}

      {/* Floating formatting toolbar */}
      {toolbar && !readOnly && (
        <FloatingToolbar
          pos={toolbar}
          onFormat={handleFormat}
          onToggleList={handleToggleList}
          onLink={handleLink}
          activeFormats={activeFormats}
        />
      )}

      {/* Slash command menu */}
      {slashMenu && filteredSlashItems.length > 0 && createPortal(
        <div
          data-slash-menu
          className="fixed bg-white border border-gray-200 rounded-xl shadow-xl z-[9999] w-[240px] py-1 max-h-[400px] overflow-y-auto"
          style={{ top: slashMenu.pos.top, left: slashMenu.pos.left }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {filteredSlashItems.map((item, i) => {
            const prevGroup = i > 0 ? filteredSlashItems[i - 1].group : null;
            const showGroupHeader = item.group && item.group !== prevGroup;
            return (
              <React.Fragment key={item.type}>
                {showGroupHeader && (
                  <div className={cn("px-2.5 text-[10px] font-semibold text-gray-400 tracking-wide uppercase", i === 0 ? "pt-1.5 pb-0.5" : "pt-2 pb-0.5 border-t border-gray-100 mt-0.5")}>
                    {item.group}
                  </div>
                )}
                <button
                  onClick={() => selectSlashItem(item)}
                  className={cn(
                    "w-full px-2.5 py-1 flex items-center gap-2.5 text-left transition-colors",
                    i === slashMenu.selectedIdx ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <span className={cn(
                    "w-6 h-6 rounded flex items-center justify-center shrink-0",
                    i === slashMenu.selectedIdx ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"
                  )}>
                    {item.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium leading-tight">{ko ? item.labelKo : item.label}</div>
                    <div className="text-[10px] text-gray-400 leading-tight">{ko ? item.descKo : item.desc}</div>
                  </div>
                </button>
              </React.Fragment>
            );
          })}
          <div className="border-t border-gray-100 mt-0.5 px-2.5 py-1.5 flex items-center justify-between text-[10px] text-gray-400">
            <span>{ko ? "메뉴 닫기" : "Close menu"}</span>
            <span className="bg-gray-100 rounded px-1.5 py-0.5 font-mono">esc</span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
