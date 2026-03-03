import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { cn } from "../../lib/utils";
import { GripVertical, Plus, Trash2 } from "lucide-react";

interface Block {
  id: string;
  content: string;
}

function parseBlocks(value?: string): Block[] {
  if (!value || !value.trim()) return [{ id: genId(), content: "" }];
  return value.split("\n").map((line) => ({ id: genId(), content: line }));
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

// Read text from contentEditable, respecting <br> and block elements as newlines
function readText(el: HTMLElement): string {
  const text = el.innerText ?? el.textContent ?? "";
  // contentEditable sometimes appends a trailing newline
  return text.endsWith("\n") ? text.slice(0, -1) : text;
}

export function NotionBlockEditor({
  value,
  initialContent,
  onChange,
  placeholder,
  readOnly = false,
}: {
  value?: string;
  initialContent?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  const seed = value ?? initialContent ?? "";
  const [blocks, setBlocks] = useState<Block[]>(() => parseBlocks(seed));
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const pendingFocusIdx = useRef<number | null>(null);
  const isComposingRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Sync blocks → parent onChange via effect
  const prevTextRef = useRef(seed);
  useEffect(() => {
    const text = blocks.map((b) => b.content).join("\n");
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

  // Sync contentEditable DOM to block state (only when content changed externally)
  useEffect(() => {
    blocks.forEach((block) => {
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

  // Get cursor position within a block
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

  // Paste handler: split multi-line text into blocks, force plain text
  const handlePaste = useCallback(
    (e: React.ClipboardEvent, idx: number) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      if (!text) return;

      const lines = text.split(/\r?\n/);

      if (lines.length === 1) {
        // Single line: insert as plain text at cursor
        document.execCommand("insertText", false, text);
        return;
      }

      // Multi-line paste: split into blocks
      const block = blocks[idx];
      const cursorPos = getCursorPos(block.id);
      const before = block.content.slice(0, cursorPos);
      const after = block.content.slice(cursorPos);

      const newBlocks: Block[] = lines.map((line, i) => {
        if (i === 0) return { id: block.id, content: before + line };
        if (i === lines.length - 1) return { id: genId(), content: line + after };
        return { id: genId(), content: line };
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

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      const cursorPos = getCursorPos(block.id);
      const before = block.content.slice(0, cursorPos);
      const after = block.content.slice(cursorPos);
      const newBlock: Block = { id: genId(), content: after };

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

      if (atStart && idx > 0) {
        e.preventDefault();
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

    if (e.key === "ArrowUp") {
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

    if (e.key === "ArrowDown") {
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
    if (blocks.length <= 1) {
      setBlocks([{ id: blocks[0].id, content: "" }]);
      return;
    }
    setBlocks((prev) => prev.filter((_, i) => i !== idx));
    pendingFocusIdx.current = Math.max(0, idx - 1);
  };

  const addBlockAfter = (idx: number) => {
    const newBlock: Block = { id: genId(), content: "" };
    setBlocks((prev) => {
      const next = [...prev];
      next.splice(idx + 1, 0, newBlock);
      return next;
    });
    pendingFocusIdx.current = idx + 1;
  };

  return (
    <div className="space-y-0">
      {blocks.map((block, idx) => (
        <div
          key={block.id}
          className="group/block relative flex items-start"
          onMouseEnter={() => !readOnly && setHoveredIdx(idx)}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {/* Left handle area - only in edit mode */}
          {!readOnly && (
            <div
              className={cn(
                "absolute -left-14 flex items-center gap-0.5 pt-[5px] shrink-0 transition-opacity duration-100",
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

          {/* Block content */}
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
            onFocus={() => !readOnly && setFocusedIdx(idx)}
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
                  // If text contains newlines (from <br> etc.), split into blocks
                  if (text.includes("\n")) {
                    const lines = text.split("\n");
                    setBlocks((prev) => {
                      const next = [...prev];
                      const newBlocks = lines.map((line, i) => ({
                        id: i === 0 ? block.id : genId(),
                        content: line,
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
            data-placeholder={idx === 0 && blocks.length === 1 ? placeholder : ""}
            className={cn(
              "flex-1 outline-none text-[15px] text-gray-700 leading-relaxed py-[3px] px-1 rounded-[4px] min-h-[28px]",
              "empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 empty:before:pointer-events-none",
              "transition-colors duration-75",
              readOnly && "cursor-default"
            )}
          />

          {/* Delete button - only in edit mode */}
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
    </div>
  );
}
