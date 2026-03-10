import React, { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import { cn } from "../../lib/utils";
import { GripVertical, Plus, Trash2, Type, Heading1, Heading2, Heading3, List, ListOrdered, Minus, FileText, ArrowRight, Bold, Italic, Underline, Image as ImageIcon, Link2, ExternalLink, Loader2 } from "lucide-react";
import { createPortal } from "react-dom";
import { createSubPage, getSubPage } from "../../lib/subPages";
import { api } from "../../lib/api";

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
  type: BlockType;
  label: string;
  labelKo: string;
  desc: string;
  descKo: string;
  icon: React.ReactNode;
}

const SLASH_MENU_ITEMS: SlashMenuItem[] = [
  { type: "text", label: "Text", labelKo: "텍스트", desc: "Plain text", descKo: "일반 텍스트", icon: <Type size={16} /> },
  { type: "h1", label: "Heading 1", labelKo: "제목 1", desc: "Large heading", descKo: "큰 제목", icon: <Heading1 size={16} /> },
  { type: "h2", label: "Heading 2", labelKo: "제목 2", desc: "Medium heading", descKo: "중간 제목", icon: <Heading2 size={16} /> },
  { type: "h3", label: "Heading 3", labelKo: "제목 3", desc: "Small heading", descKo: "작은 제목", icon: <Heading3 size={16} /> },
  { type: "bullet", label: "Bullet List", labelKo: "글머리 기호", desc: "Bullet point", descKo: "점 목록", icon: <List size={16} /> },
  { type: "numbered", label: "Numbered List", labelKo: "번호 매기기", desc: "Numbered list", descKo: "순서 목록", icon: <ListOrdered size={16} /> },
  { type: "divider", label: "Divider", labelKo: "구분선", desc: "Horizontal line", descKo: "가로 구분선", icon: <Minus size={16} /> },
  { type: "image", label: "Image", labelKo: "이미지", desc: "Upload or paste image", descKo: "이미지 업로드", icon: <ImageIcon size={16} /> },
  { type: "bookmark", label: "Bookmark", labelKo: "북마크", desc: "Embed a link preview", descKo: "링크 미리보기", icon: <Link2 size={16} /> },
  { type: "page", label: "Sub Page", labelKo: "하위 페이지", desc: "Embedded page", descKo: "내부 페이지", icon: <FileText size={16} /> },
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
function ImageBlock({ block, readOnly, onResize, onDelete, onSelect }: {
  block: Block;
  readOnly: boolean;
  onResize: (width: number) => void;
  onDelete: () => void;
  onSelect: () => void;
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
            hovered ? "border-blue-300 shadow-md" : "border-gray-200"
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

function BookmarkBlock({ block, readOnly, onDelete, onSelect, onDragStart, onDragEnd }: {
  block: Block;
  readOnly: boolean;
  onDelete: () => void;
  onSelect: () => void;
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
      className="flex-1 relative group/bm flex items-stretch"
      draggable={!readOnly}
      onDragStart={(e) => {
        if (readOnly) return;
        onDragStart?.(e);
      }}
      onDragEnd={() => onDragEnd?.()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        if (e.shiftKey || e.ctrlKey || e.metaKey) { e.preventDefault(); onSelect(); return; }
      }}
    >
      {/* Drag handle (visual hint) */}
      {!readOnly && (
        <div className="flex items-center justify-center w-7 shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover/bm:opacity-100 transition-opacity text-gray-400 hover:text-gray-600">
          <GripVertical size={14} />
        </div>
      )}
      <a
        href={block.content}
        target="_blank"
        rel="noopener noreferrer"
        draggable={false}
        className="flex-1 flex rounded-md border border-gray-200 overflow-hidden bg-white hover:bg-gray-50 transition-colors min-w-0"
      >
        {loading ? (
          <div className="flex items-center gap-2 px-3 py-3 text-sm text-gray-400">
            <Loader2 size={14} className="animate-spin" />
            <span className="truncate">{block.content}</span>
          </div>
        ) : (
          <>
            <div className="flex-1 min-w-0 px-3.5 py-3 flex flex-col justify-center gap-0.5">
              <p className="text-sm font-medium text-gray-900 truncate leading-snug">
                {og?.ogTitle || block.content}
              </p>
              {og?.ogDescription && (
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{og.ogDescription}</p>
              )}
              <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
                {og?.favicon ? (
                  <img src={og.favicon} alt="" className="w-3.5 h-3.5 rounded-sm shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <ExternalLink size={12} className="shrink-0" />
                )}
                <span className="truncate">{block.content}</span>
              </div>
            </div>
            {og?.ogImage && (
              <div className="w-[120px] shrink-0">
                <img src={og.ogImage} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </>
        )}
      </a>
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
function FloatingToolbar({ pos, onFormat, onToggleList, activeFormats }: {
  pos: { top: number; left: number };
  onFormat: (cmd: string) => void;
  onToggleList: (type: "bullet" | "numbered") => void;
  activeFormats: { bold: boolean; italic: boolean; underline: boolean };
}) {
  return createPortal(
    <div
      className="fixed z-[10000] flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg shadow-xl px-1.5 py-1 animate-in fade-in slide-in-from-bottom-1 duration-150"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button
        onClick={() => onToggleList("numbered")}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        title="Numbered List"
      >
        <ListOrdered size={16} />
      </button>
      <button
        onClick={() => onToggleList("bullet")}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        title="Bullet List"
      >
        <List size={16} />
      </button>
      <div className="w-px h-5 bg-gray-200 mx-0.5" />
      <button
        onClick={() => onFormat("bold")}
        className={cn("p-1.5 rounded transition-colors", activeFormats.bold ? "bg-gray-200 text-gray-900" : "hover:bg-gray-100 text-gray-500 hover:text-gray-700")}
        title="Bold (Ctrl+B)"
      >
        <Bold size={16} />
      </button>
      <button
        onClick={() => onFormat("italic")}
        className={cn("p-1.5 rounded transition-colors", activeFormats.italic ? "bg-gray-200 text-gray-900" : "hover:bg-gray-100 text-gray-500 hover:text-gray-700")}
        title="Italic (Ctrl+I)"
      >
        <Italic size={16} />
      </button>
      <button
        onClick={() => onFormat("underline")}
        className={cn("p-1.5 rounded transition-colors", activeFormats.underline ? "bg-gray-200 text-gray-900" : "hover:bg-gray-100 text-gray-500 hover:text-gray-700")}
        title="Underline (Ctrl+U)"
      >
        <Underline size={16} />
      </button>
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
  const seed = value ?? initialContent ?? "";
  const [blocks, setBlocks] = useState<Block[]>(() => parseBlocks(seed));
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastClickedIdx = useRef<number | null>(null);
  const dragStartIdx = useRef<number | null>(null);
  const isDragging = useRef(false);
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const pendingFocusIdx = useRef<number | null>(null);
  const isComposingRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Drag-and-drop block reorder state
  const [dragBlockIdx, setDragBlockIdx] = useState<number | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);

  // Floating toolbar state
  const [toolbar, setToolbar] = useState<{ top: number; left: number; blockIdx: number } | null>(null);
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false });

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
    });
  }, [readOnly, blocks]);

  useEffect(() => {
    document.addEventListener("selectionchange", checkSelection);
    return () => document.removeEventListener("selectionchange", checkSelection);
  }, [checkSelection]);

  const handleFormat = useCallback((cmd: string) => {
    document.execCommand(cmd, false);
    // Update active format state
    requestAnimationFrame(() => {
      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
      });
    });
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
    setSlashMenu({
      blockIdx: idx,
      filter: "",
      selectedIdx: 0,
      pos: { top: rect.bottom + 4, left: rect.left },
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
      if (["p", "div", "blockquote", "section", "article"].includes(tag)) {
        const text = getTextContent(el);
        if (text) result.push({ type: "text", content: text });
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

      // Get text early for URL detection
      const text = e.clipboardData.getData("text/plain");
      const trimmedText = (text || "").trim();

      // URL paste → bookmark (highest priority, check before anything else)
      // Strip trailing newlines/whitespace, and if the text is a single URL, convert to bookmark
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

    // Ctrl+C/X
    if ((e.key === "c" || e.key === "x") && (e.ctrlKey || e.metaKey) && selectedIds.size > 1) {
      e.preventDefault();
      const selected = blocks.filter((b) => selectedIds.has(b.id));
      const plain = selected.map(serializeBlock).join("\n");
      const html = selected.map((b) => {
        const c = b.content || "";
        switch (b.type) {
          case "h1": return `<h1>${c}</h1>`;
          case "h2": return `<h2>${c}</h2>`;
          case "h3": return `<h3>${c}</h3>`;
          case "bullet": return `<ul><li>${c}</li></ul>`;
          case "numbered": return `<ol><li>${c}</li></ol>`;
          case "divider": return `<hr>`;
          default: return `<p>${c}</p>`;
        }
      }).join("\n");
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
    if (e.shiftKey && lastClickedIdx.current !== null) {
      e.preventDefault();
      selectRange(lastClickedIdx.current, idx);
      window.getSelection()?.removeAllRanges();
    } else if (!e.shiftKey) {
      if (selectedIds.size > 0) clearSelection();
      lastClickedIdx.current = idx;
      // Only start multi-select drag from non-editable areas (e.g., the row container itself)
      dragStartIdx.current = isContentEditable ? null : idx;
      isDragging.current = false;
    }
  }, [readOnly, selectedIds, selectRange, clearSelection]);

  const handleBlockMouseEnter = useCallback((idx: number) => {
    if (readOnly) return;
    setHoveredIdx(idx);
    if (dragStartIdx.current !== null && dragStartIdx.current !== idx) {
      isDragging.current = true;
      selectRange(dragStartIdx.current, idx);
      window.getSelection()?.removeAllRanges();
    }
  }, [readOnly, selectRange]);

  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging.current) isDragging.current = false;
      dragStartIdx.current = null;
    };
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

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

  // Numbered list index
  const getNumberedIndex = (idx: number): number => {
    let count = 1;
    const indent = blocks[idx].indent;
    for (let i = idx - 1; i >= 0; i--) {
      if (blocks[i].type === "numbered" && blocks[i].indent === indent) count++;
      else break;
    }
    return count;
  };

  // ─── Block Drag & Drop ─────────────────────────────────────────
  const handleGripDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
    setDragBlockIdx(idx);
    // Prevent text selection during drag
    if (wrapperRef.current) wrapperRef.current.style.userSelect = "none";
  };

  const handleBlockDragOver = (e: React.DragEvent, idx: number) => {
    if (dragBlockIdx === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetIdx(idx);
  };

  const handleBlockDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (dragBlockIdx === null || dragBlockIdx === targetIdx) {
      setDragBlockIdx(null);
      setDropTargetIdx(null);
      return;
    }
    pushUndo();
    setBlocks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragBlockIdx, 1);
      const insertIdx = dragBlockIdx < targetIdx ? targetIdx - 1 : targetIdx;
      next.splice(insertIdx, 0, moved);
      return next;
    });
    setDragBlockIdx(null);
    setDropTargetIdx(null);
  };

  const handleBlockDragEnd = () => {
    setDragBlockIdx(null);
    setDropTargetIdx(null);
    if (wrapperRef.current) wrapperRef.current.style.userSelect = "";
  };

  // Wrapper-level keyDown
  const handleWrapperKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).getAttribute("contenteditable")) return;
    if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); undo(); return; }
    if ((e.key === "y" && (e.ctrlKey || e.metaKey)) || (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey)) { e.preventDefault(); redo(); return; }
    if (selectedIds.size === 0) return;
    if (e.key === "a" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setSelectedIds(new Set(blocks.map(b => b.id))); return; }
    if ((e.key === "c" || e.key === "x") && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const selected = blocks.filter(b => selectedIds.has(b.id));
      const plain = selected.map(serializeBlock).join("\n");
      const html = selected.map((b) => {
        const c = b.content || "";
        switch (b.type) {
          case "h1": return `<h1>${c}</h1>`;
          case "h2": return `<h2>${c}</h2>`;
          case "h3": return `<h3>${c}</h3>`;
          case "bullet": return `<ul><li>${c}</li></ul>`;
          case "numbered": return `<ol><li>${c}</li></ol>`;
          case "divider": return `<hr>`;
          default: return `<p>${c}</p>`;
        }
      }).join("\n");
      navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([plain], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]).catch(() => { navigator.clipboard.writeText(plain); });
      if (e.key === "x") { pushUndo(); deleteSelectedBlocks(); }
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
    <div ref={wrapperRef} className="space-y-0 outline-none" tabIndex={-1} onKeyDown={handleWrapperKeyDown}>
      {blocks.map((block, idx) => (
        <div
          key={block.id}
          className={cn(
            "group/block relative flex items-start",
            selectedIds.has(block.id) && "bg-blue-50 rounded-[4px]",
            dragBlockIdx === idx && "opacity-40",
            dropTargetIdx === idx && dragBlockIdx !== null && dragBlockIdx !== idx && "border-t-2 border-blue-400"
          )}
          style={{ paddingLeft: block.indent * 24 }}
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
            <span className="shrink-0 w-6 text-center text-gray-400 leading-relaxed py-[3px] text-[13px] select-none font-medium">
              {getNumberedIndex(idx)}.
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
                navigate(`/pages/${block.content}`);
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
              onResize={(width) => {
                setBlocks((prev) => prev.map((b) => b.id === block.id ? { ...b, imageWidth: width } : b));
              }}
              onDelete={() => deleteBlock(idx)}
              onSelect={() => {
                setSelectedIds(new Set([block.id]));
                lastClickedIdx.current = idx;
                wrapperRef.current?.focus();
              }}
            />
          ) : block.type === "bookmark" ? (
            <div onDoubleClick={() => {
              if (readOnly) return;
              // Insert empty text block below and focus it
              const newBlock: Block = { id: genId(), content: "", type: "text", indent: 0 };
              setBlocks((prev) => { const next = [...prev]; next.splice(idx + 1, 0, newBlock); return next; });
              pendingFocusIdx.current = idx + 1;
            }}>
              <BookmarkBlock
                block={block}
                readOnly={readOnly}
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
              data-placeholder={idx === 0 && blocks.length === 1 ? placeholder : block.type === "h1" ? (ko ? "제목 1" : "Heading 1") : block.type === "h2" ? (ko ? "제목 2" : "Heading 2") : block.type === "h3" ? (ko ? "제목 3" : "Heading 3") : ""}
              className={cn(
                "flex-1 outline-none px-1 rounded-[4px]",
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

      {/* Bottom drop zone — allows dropping blocks at the end */}
      {!readOnly && dragBlockIdx !== null && (
        <div
          className={cn(
            "h-16 rounded-lg transition-colors",
            dropTargetIdx === blocks.length && "border-2 border-dashed border-blue-300 bg-blue-50/30"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setDropTargetIdx(blocks.length);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragBlockIdx === null) { setDragBlockIdx(null); setDropTargetIdx(null); return; }
            pushUndo();
            setBlocks((prev) => {
              const next = [...prev];
              const [moved] = next.splice(dragBlockIdx, 1);
              next.push(moved);
              return next;
            });
            setDragBlockIdx(null);
            setDropTargetIdx(null);
          }}
        />
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
          activeFormats={activeFormats}
        />
      )}

      {/* Slash command menu */}
      {slashMenu && filteredSlashItems.length > 0 && createPortal(
        <div
          className="fixed bg-white border border-gray-200 rounded-xl shadow-xl z-[9999] w-[220px] py-1.5 max-h-[300px] overflow-y-auto"
          style={{ top: slashMenu.pos.top, left: slashMenu.pos.left }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {ko ? "블록 유형" : "Block Type"}
          </div>
          {filteredSlashItems.map((item, i) => (
            <button
              key={item.type}
              onClick={() => selectSlashItem(item)}
              className={cn(
                "w-full px-3 py-2 flex items-center gap-3 text-left transition-colors",
                i === slashMenu.selectedIdx ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
              )}
            >
              <span className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                i === slashMenu.selectedIdx ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"
              )}>
                {item.icon}
              </span>
              <div>
                <div className="text-sm font-medium">{ko ? item.labelKo : item.label}</div>
                <div className="text-[10px] text-gray-400">{ko ? item.descKo : item.desc}</div>
              </div>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
