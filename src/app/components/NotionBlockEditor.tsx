import React, { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import { cn } from "../../lib/utils";
import { GripVertical, Plus, Trash2, Type, Heading1, Heading2, Heading3, List, ListOrdered, Minus, FileText, ArrowRight } from "lucide-react";
import { createPortal } from "react-dom";
import { createSubPage, getSubPage } from "../../lib/subPages";

type BlockType = "text" | "h1" | "h2" | "h3" | "bullet" | "numbered" | "divider" | "page";

interface Block {
  id: string;
  content: string;
  type: BlockType;
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
  { type: "bullet", label: "Bullet List", labelKo: "글머리 기호", desc: "Unordered list", descKo: "순서 없는 목록", icon: <List size={16} /> },
  { type: "numbered", label: "Numbered List", labelKo: "번호 매기기", desc: "Ordered list", descKo: "순서 있는 목록", icon: <ListOrdered size={16} /> },
  { type: "divider", label: "Divider", labelKo: "구분선", desc: "Horizontal line", descKo: "수평선", icon: <Minus size={16} /> },
  { type: "page", label: "Page", labelKo: "페이지", desc: "Embed a sub-page", descKo: "하위 페이지 만들기", icon: <FileText size={16} /> },
];

// Markdown-like serialization: # H1, ## H2, ### H3, - bullet, 1. numbered, --- divider
function serializeBlock(b: Block): string {
  switch (b.type) {
    case "h1": return `# ${b.content}`;
    case "h2": return `## ${b.content}`;
    case "h3": return `### ${b.content}`;
    case "bullet": return `- ${b.content}`;
    case "numbered": return `1. ${b.content}`;
    case "divider": return "---";
    case "page": return `[page:${b.content}]`;
    default: return b.content;
  }
}

function parseBlockLine(line: string): { type: BlockType; content: string } {
  const pageMatch = line.match(/^\[page:([^\]]+)\]$/);
  if (pageMatch) return { type: "page", content: pageMatch[1] };
  if (line === "---") return { type: "divider", content: "" };
  if (line.startsWith("### ")) return { type: "h3", content: line.slice(4) };
  if (line.startsWith("## ")) return { type: "h2", content: line.slice(3) };
  if (line.startsWith("# ")) return { type: "h1", content: line.slice(2) };
  if (/^\d+\.\s/.test(line)) return { type: "numbered", content: line.replace(/^\d+\.\s/, "") };
  if (line.startsWith("- ")) return { type: "bullet", content: line.slice(2) };
  return { type: "text", content: line };
}

function parseBlocks(value?: string): Block[] {
  if (!value || !value.trim()) return [{ id: genId(), content: "", type: "text" }];
  return value.split("\n").map((line) => {
    const { type, content } = parseBlockLine(line);
    return { id: genId(), content, type };
  });
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function readText(el: HTMLElement): string {
  const text = el.innerText ?? el.textContent ?? "";
  return text.endsWith("\n") ? text.slice(0, -1) : text;
}

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

  // Wrapper ref for focus when block-level selection is active
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Undo/Redo system
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

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    redoStackRef.current.push(blocksRef.current.map(b => ({ ...b })));
    setBlocks(undoStackRef.current.pop()!);
    setSelectedIds(new Set());
  }, []);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    undoStackRef.current.push(blocksRef.current.map(b => ({ ...b })));
    setBlocks(redoStackRef.current.pop()!);
    setSelectedIds(new Set());
  }, []);

  // Slash command menu state
  const [slashMenu, setSlashMenu] = useState<{ blockIdx: number; filter: string; selectedIdx: number; pos: { top: number; left: number } } | null>(null);

  const ko = language === "ko";

  // Close slash menu on unmount (prevents portal orphan on navigation)
  useEffect(() => {
    return () => { setSlashMenu(null); };
  }, []);

  // Sync blocks → parent onChange
  const prevTextRef = useRef(seed);
  useEffect(() => {
    const text = blocks.map(serializeBlock).join("\n");
    if (text !== prevTextRef.current) {
      prevTextRef.current = text;
      onChangeRef.current(text);
    }
  }, [blocks]);

  // Focus a block by index after render
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
        if (el.textContent !== block.content) {
          el.textContent = block.content;
        }
      }
    });
  }, [blocks]);

  const updateBlock = (id: string, content: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, content } : b))
    );
  };

  const setBlockType = (id: string, type: BlockType) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, type } : b))
    );
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

  // Slash menu helpers
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
      // Replace block content, set type + clear DOM
      const divEl = blockRefs.current.get(block.id);
      if (divEl) divEl.textContent = "";
      setBlocks((prev) =>
        prev.map((b) => (b.id === block.id ? { ...b, type: "divider", content: "" } : b))
      );
    } else {
      // Clear the "/" from content and set type
      const el = blockRefs.current.get(block.id);
      const currentText = el ? readText(el) : block.content;
      const cleaned = currentText.replace(/^\/\S*/, "");
      setBlocks((prev) =>
        prev.map((b) => (b.id === block.id ? { ...b, type: item.type, content: cleaned } : b))
      );
      // Update DOM directly (sync effect skips focused elements)
      if (el) el.textContent = cleaned;
      // Refocus
      requestAnimationFrame(() => {
        const blockEl = blockRefs.current.get(block.id);
        if (blockEl) {
          blockEl.focus();
          const range = document.createRange();
          const sel = window.getSelection();
          if (blockEl.childNodes.length > 0) {
            range.setStartAfter(blockEl.lastChild!);
          } else {
            range.setStart(blockEl, 0);
          }
          range.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      });
    }
    closeSlashMenu();
  };

  // Parse HTML clipboard into blocks with formatting
  const parseHtmlToBlocks = (html: string): { type: BlockType; content: string }[] => {
    const container = document.createElement("div");
    container.innerHTML = html;
    const result: { type: BlockType; content: string }[] = [];

    const getTextContent = (el: Element): string => {
      // Preserve text, stripping tags but keeping content
      return (el.textContent || "").trim();
    };

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

      if (tag === "ul") {
        el.querySelectorAll(":scope > li").forEach((li) => {
          result.push({ type: "bullet", content: getTextContent(li) });
        });
        return;
      }
      if (tag === "ol") {
        el.querySelectorAll(":scope > li").forEach((li) => {
          result.push({ type: "numbered", content: getTextContent(li) });
        });
        return;
      }
      if (tag === "li") {
        // Standalone li (e.g. from Notion)
        const parentTag = el.parentElement?.tagName.toLowerCase();
        const listType: BlockType = parentTag === "ol" ? "numbered" : "bullet";
        result.push({ type: listType, content: getTextContent(el) });
        return;
      }

      if (["p", "div", "blockquote", "section", "article"].includes(tag)) {
        const text = getTextContent(el);
        if (text) result.push({ type: "text", content: text });
        return;
      }
      if (tag === "br") return;

      // For other elements (span, strong, em, etc.), recurse into children
      // but if it looks like an inline element with text, just grab the text
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

  // Paste handler — supports HTML (rich text) and plain text
  const handlePaste = useCallback(
    (e: React.ClipboardEvent, idx: number) => {
      e.preventDefault();
      const html = e.clipboardData.getData("text/html");
      const text = e.clipboardData.getData("text/plain");

      // Try HTML first for rich paste
      if (html) {
        const parsed = parseHtmlToBlocks(html);
        if (parsed.length > 0) {
          const block = blocks[idx];
          const cursorPos = getCursorPos(block.id);
          const before = block.content.slice(0, cursorPos);
          const after = block.content.slice(cursorPos);

          // If single inline paste, just insert text
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

          // Multi-block paste
          const newBlocks: Block[] = parsed.map((p, i) => {
            if (i === 0) return { id: block.id, content: before + p.content, type: before ? block.type : p.type };
            if (i === parsed.length - 1) return { id: genId(), content: p.content + after, type: p.type };
            return { id: genId(), content: p.content, type: p.type };
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

      // Fallback: plain text
      if (!text) return;
      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");

      if (lines.length === 1) {
        document.execCommand("insertText", false, text);
        return;
      }

      const block = blocks[idx];
      const cursorPos = getCursorPos(block.id);
      const before = block.content.slice(0, cursorPos);
      const after = block.content.slice(cursorPos);

      const newBlocks: Block[] = lines.map((line, i) => {
        const parsed = parseBlockLine(line);
        if (i === 0) return { id: block.id, content: before + parsed.content, type: block.type };
        if (i === lines.length - 1) return { id: genId(), content: parsed.content + after, type: parsed.type };
        return { id: genId(), content: parsed.content, type: parsed.type };
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

  const handleKeyDown = (e: KeyboardEvent, idx: number) => {
    const block = blocks[idx];

    // Slash menu keyboard navigation
    if (slashMenu) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashMenu((s) => s ? { ...s, selectedIdx: Math.min(s.selectedIdx + 1, filteredSlashItems.length - 1) } : null);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashMenu((s) => s ? { ...s, selectedIdx: Math.max(s.selectedIdx - 1, 0) } : null);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (filteredSlashItems[slashMenu.selectedIdx]) {
          selectSlashItem(filteredSlashItems[slashMenu.selectedIdx]);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        closeSlashMenu();
        return;
      }
    }

    // Ctrl+Z: undo
    if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }
    // Ctrl+Y or Ctrl+Shift+Z: redo
    if ((e.key === "y" && (e.ctrlKey || e.metaKey)) || (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
      e.preventDefault();
      redo();
      return;
    }

    // Ctrl+A: select all blocks
    if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const ids = new Set(blocks.map((b) => b.id));
      setSelectedIds(ids);
      lastClickedIdx.current = 0;
      window.getSelection()?.removeAllRanges();
      wrapperRef.current?.focus();
      return;
    }

    // Ctrl+C / Ctrl+X: copy / cut selected blocks
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
      e.preventDefault();
      pushUndo();
      deleteSelectedBlocks();
      return;
    }

    // Typing over selection — replace selected blocks with typed character
    if (selectedIds.size > 1 && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      pushUndo();
      const firstIdx = blocks.findIndex(b => selectedIds.has(b.id));
      const newId = genId();
      setBlocks(prev => {
        const remaining = prev.filter(b => !selectedIds.has(b.id));
        const newBlock: Block = { id: newId, content: e.key, type: "text" };
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

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (slashMenu) return;
      pushUndo();

      const cursorPos = getCursorPos(block.id);
      const before = block.content.slice(0, cursorPos);
      const after = block.content.slice(cursorPos);

      // Update DOM immediately so onBlur reads the correct (split) text
      const el = blockRefs.current.get(block.id);
      if (el) el.textContent = before;

      // Continue list type for new blocks, otherwise default to text
      const newType: BlockType = (block.type === "bullet" || block.type === "numbered") ? block.type : "text";
      const newBlock: Block = { id: genId(), content: after, type: newType };

      setBlocks((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], content: before };
        next.splice(idx + 1, 0, newBlock);
        return next;
      });
      pendingFocusIdx.current = idx + 1;
    }

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
        // If block has a non-text type, first convert to text
        if (block.type !== "text") {
          e.preventDefault();
          pushUndo();
          setBlockType(block.id, "text");
          return;
        }
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
                if (remaining <= textNode.length) {
                  node = textNode;
                  offset = remaining;
                  break;
                }
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

    // Escape: clear selection
    if (e.key === "Escape" && selectedIds.size > 0 && !slashMenu) {
      e.preventDefault();
      clearSelection();
      return;
    }

    // Shift+Arrow: extend block selection
    if (e.shiftKey && (e.key === "ArrowUp" || e.key === "ArrowDown") && !slashMenu) {
      e.preventDefault();
      const anchor = lastClickedIdx.current ?? idx;
      const newIdx = e.key === "ArrowUp" ? Math.max(0, idx - 1) : Math.min(blocks.length - 1, idx + 1);
      selectRange(anchor, newIdx);
      window.getSelection()?.removeAllRanges();
      wrapperRef.current?.focus();
      return;
    }

    if (e.key === "ArrowUp" && !slashMenu) {
      const el = blockRefs.current.get(block.id);
      const sel = window.getSelection();
      if (sel && el) {
        const range = sel.getRangeAt(0);
        const preRange = document.createRange();
        preRange.selectNodeContents(el);
        preRange.setEnd(range.startContainer, range.startOffset);
        const atFirstLine = preRange.toString().indexOf("\n") === -1;
        if (atFirstLine && idx > 0) {
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
        const atLastLine = postRange.toString().indexOf("\n") === -1;
        if (atLastLine && idx < blocks.length - 1) {
          e.preventDefault();
          pendingFocusIdx.current = idx + 1;
          setBlocks((prev) => [...prev]);
        }
      }
    }
  };

  const deleteBlock = (idx: number) => {
    pushUndo();
    if (blocks.length <= 1) {
      setBlocks([{ id: blocks[0].id, content: "", type: "text" }]);
      return;
    }
    setBlocks((prev) => prev.filter((_, i) => i !== idx));
    pendingFocusIdx.current = Math.max(0, idx - 1);
  };

  const addBlockAfter = (idx: number) => {
    const newBlock: Block = { id: genId(), content: "", type: "text" };
    setBlocks((prev) => {
      const next = [...prev];
      next.splice(idx + 1, 0, newBlock);
      return next;
    });
    pendingFocusIdx.current = idx + 1;
  };

  // Multi-select helpers
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectRange = useCallback((fromIdx: number, toIdx: number) => {
    const start = Math.min(fromIdx, toIdx);
    const end = Math.max(fromIdx, toIdx);
    const ids = new Set<string>();
    for (let i = start; i <= end; i++) {
      ids.add(blocks[i].id);
    }
    setSelectedIds(ids);
  }, [blocks]);

  const handleBlockMouseDown = useCallback((e: React.MouseEvent, idx: number) => {
    if (readOnly) return;
    if (e.shiftKey && lastClickedIdx.current !== null) {
      e.preventDefault();
      selectRange(lastClickedIdx.current, idx);
      window.getSelection()?.removeAllRanges();
    } else if (!e.shiftKey) {
      if (selectedIds.size > 0) {
        clearSelection();
      }
      lastClickedIdx.current = idx;
      dragStartIdx.current = idx;
      isDragging.current = false; // becomes true only when entering another block
    }
  }, [readOnly, selectedIds, selectRange, clearSelection]);

  const handleBlockMouseEnter = useCallback((idx: number) => {
    if (readOnly) return;
    setHoveredIdx(idx);
    // If mouse button is held and moved to a different block → drag select
    if (dragStartIdx.current !== null && dragStartIdx.current !== idx) {
      isDragging.current = true;
      selectRange(dragStartIdx.current, idx);
      window.getSelection()?.removeAllRanges();
    }
  }, [readOnly, selectRange]);

  // Global mouseup to end drag
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
      }
      dragStartIdx.current = null;
    };
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const deleteSelectedBlocks = useCallback(() => {
    if (selectedIds.size === 0) return;
    setBlocks((prev) => {
      const remaining = prev.filter((b) => !selectedIds.has(b.id));
      if (remaining.length === 0) return [{ id: genId(), content: "", type: "text" as BlockType }];
      return remaining;
    });
    const firstSelectedIdx = blocks.findIndex((b) => selectedIds.has(b.id));
    pendingFocusIdx.current = Math.max(0, firstSelectedIdx - 1);
    clearSelection();
  }, [selectedIds, blocks, clearSelection]);

  // Get numbered list index for display
  const getNumberedIndex = (idx: number): number => {
    let count = 1;
    for (let i = idx - 1; i >= 0; i--) {
      if (blocks[i].type === "numbered") count++;
      else break;
    }
    return count;
  };

  // Wrapper-level keyDown: handles keys when wrapper has focus (after Ctrl+A or clicking embedded blocks)
  const handleWrapperKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).getAttribute("contenteditable")) return;

    // Ctrl+Z / Ctrl+Y
    if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); undo(); return; }
    if ((e.key === "y" && (e.ctrlKey || e.metaKey)) || (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey)) { e.preventDefault(); redo(); return; }

    if (selectedIds.size === 0) return;

    // Ctrl+A
    if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setSelectedIds(new Set(blocks.map(b => b.id)));
      return;
    }
    // Ctrl+C/X
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
    // Escape
    if (e.key === "Escape") { e.preventDefault(); setSelectedIds(new Set()); return; }
    // Delete/Backspace
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      pushUndo();
      deleteSelectedBlocks();
      return;
    }
    // Printable char — replace selection with new typed block
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      pushUndo();
      const firstIdx = blocks.findIndex(b => selectedIds.has(b.id));
      const newId = genId();
      setBlocks(prev => {
        const remaining = prev.filter(b => !selectedIds.has(b.id));
        const newBlock: Block = { id: newId, content: e.key, type: "text" };
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

  return (
    <div ref={wrapperRef} className="space-y-0 outline-none" tabIndex={-1} onKeyDown={handleWrapperKeyDown}>
      {blocks.map((block, idx) => (
        <div
          key={block.id}
          className={cn(
            "group/block relative flex items-start",
            selectedIds.has(block.id) && "bg-blue-50 rounded-[4px]"
          )}
          onMouseDown={(e) => handleBlockMouseDown(e, idx)}
          onMouseEnter={() => handleBlockMouseEnter(idx)}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {/* Left handle area */}
          {!readOnly && (
            <div
              className={cn(
                "absolute -left-14 flex items-center gap-0.5 shrink-0 transition-opacity duration-100",
                block.type === "h1" ? "pt-[8px]" : block.type === "h2" ? "pt-[6px]" : "pt-[5px]",
                hoveredIdx === idx || focusedIdx === idx ? "opacity-100" : "opacity-0"
              )}
            >
              <button
                onClick={() => addBlockAfter(idx)}
                className="p-0.5 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-colors"
                tabIndex={-1}
              >
                <Plus size={14} />
              </button>
              <div className="text-gray-300 cursor-grab active:cursor-grabbing p-0.5">
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
                  if (e.shiftKey && lastClickedIdx.current !== null) {
                    selectRange(lastClickedIdx.current, idx);
                  } else {
                    setSelectedIds(new Set([block.id]));
                    lastClickedIdx.current = idx;
                  }
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
                if (e.shiftKey && lastClickedIdx.current !== null) {
                  selectRange(lastClickedIdx.current, idx);
                } else {
                  setSelectedIds(new Set([block.id]));
                  lastClickedIdx.current = idx;
                }
                wrapperRef.current?.focus();
              }}
            >
              <hr className="border-gray-200" />
            </div>
          ) : (
            <div
              ref={(el) => {
                if (el) {
                  blockRefs.current.set(block.id, el);
                  if (el.textContent !== block.content && document.activeElement !== el) {
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
                  // Debounced undo snapshot on focus
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
                    if (text !== block.content) {
                      updateBlock(block.id, text);
                    }
                  }
                }
              }}
              onCompositionStart={() => { isComposingRef.current = true; }}
              onCompositionEnd={() => {
                isComposingRef.current = false;
                if (!readOnly) {
                  const el = blockRefs.current.get(block.id);
                  if (el) {
                    updateBlock(block.id, readText(el));
                  }
                }
              }}
              onInput={() => {
                if (!readOnly && !isComposingRef.current) {
                  const el = blockRefs.current.get(block.id);
                  if (el) {
                    const text = readText(el);
                    // Check for slash command at start
                    if (text.startsWith("/")) {
                      const filter = text.slice(1).split(/\s/)[0] || "";
                      if (!slashMenu) {
                        openSlashMenu(idx);
                      }
                      setSlashMenu((s) => s ? { ...s, filter, selectedIdx: 0 } : null);
                    } else if (slashMenu) {
                      closeSlashMenu();
                    }
                    // Split newlines
                    if (text.includes("\n")) {
                      const lines = text.split("\n");
                      setBlocks((prev) => {
                        const next = [...prev];
                        const newBlocks = lines.map((line, i) => ({
                          id: i === 0 ? block.id : genId(),
                          content: line,
                          type: (i === 0 ? block.type : "text") as BlockType,
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
