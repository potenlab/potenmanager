import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Smile, X } from "lucide-react";
import { cn } from "../../lib/utils";

const EMOJI_CATEGORIES = [
  {
    name: "Smileys",
    emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😊","😇","🥰","😍","🤩","😘","😋","😛","🤔","🤫","🤭","😐","😑","😶","😏","😒","🙄","😬","😮‍💨","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠","🥳","🥸","😎","🤓","🧐"],
  },
  {
    name: "Hands",
    emojis: ["👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏"],
  },
  {
    name: "Objects",
    emojis: ["📝","📋","📌","📎","🔗","📐","📏","🗂️","📁","📂","🗃️","📊","📈","📉","🗓️","📅","📆","🔖","🏷️","💡","🔮","🎯","🎨","🖊️","✏️","🔍","🔎","💻","🖥️","⌨️","📱","📞","📧","💬","💭","🗨️","📢","📣"],
  },
  {
    name: "Symbols",
    emojis: ["⭐","🌟","✨","💫","🔥","💥","❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","✅","❌","⚡","💪","🎉","🎊","🏆","🥇","🎖️","🏅","⚠️","🚀","💎","🔑","🎵","🎶"],
  },
  {
    name: "Nature",
    emojis: ["🌸","🌺","🌻","🌹","🌷","🌼","🌿","🍀","🍁","🍂","🌳","🌴","🌵","🌾","🍄","🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🦅","🦋","🐛","🐝","🐞"],
  },
  {
    name: "Food",
    emojis: ["🍎","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍒","🍑","🥭","🍍","🥝","🍅","🥑","🌶️","🌽","🥕","🧅","🍔","🍕","🌮","🍜","🍣","🍰","🎂","🍪","☕","🍵","🧃","🥤","🍺","🍷"],
  },
  {
    name: "Numbers",
    emojis: ["0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟","💯","🔢","#️⃣","*️⃣","🅰️","🅱️","🆎","🅾️","🔤","🔡","🔠","🆗","🆕","🆙","🆒","🆓","🆘","🈁","🈂️","📶","🔀","🔁","🔂","▶️","⏸️","⏹️","⏺️","⏭️","⏮️","🔼","🔽","➕","➖","✖️","➗","♾️"],
  },
];

interface EmojiPickerProps {
  value?: string;
  onChange: (emoji: string | undefined) => void;
  size?: "sm" | "md" | "lg";
}

export function EmojiPicker({ value, onChange, size = "lg" }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const sizeClass = size === "sm" ? "text-base w-7 h-7" : size === "md" ? "text-xl w-9 h-9" : "text-3xl w-12 h-12";

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node) || popupRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => {
    if (!open || !triggerRef.current) { setPos(null); return; }
    const rect = triggerRef.current.getBoundingClientRect();
    let top = rect.bottom + 6;
    let left = rect.left;
    if (left + 340 > window.innerWidth - 16) left = window.innerWidth - 356;
    if (top + 400 > window.innerHeight - 16) top = rect.top - 406;
    setPos({ top, left });
  }, [open]);

  const filteredCategories = search.trim()
    ? EMOJI_CATEGORIES.map((cat) => ({ ...cat, emojis: cat.emojis })) // emoji search would need a name map; for now show all
    : EMOJI_CATEGORIES;

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center justify-center rounded-xl transition-all",
          sizeClass,
          value
            ? "hover:bg-gray-100"
            : "border-2 border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-300 hover:text-gray-400"
        )}
        title="Add emoji"
      >
        {value ? (
          <span>{value}</span>
        ) : (
          <Smile size={size === "sm" ? 14 : size === "md" ? 18 : 24} />
        )}
      </button>

      {open && pos && createPortal(
        <div
          ref={popupRef}
          className="fixed bg-white border border-gray-200 rounded-2xl shadow-2xl z-[9999] w-[340px] overflow-hidden"
          style={{ top: pos.top, left: pos.left }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 pt-3 pb-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search emoji..."
              className="flex-1 px-3 py-1.5 text-sm bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
              autoFocus
            />
            {value && (
              <button
                onClick={() => { onChange(undefined); setOpen(false); }}
                className="ml-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove emoji"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category tabs */}
          <div className="flex gap-1 px-3 pb-2 overflow-x-auto scrollbar-hide">
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={cat.name}
                onClick={() => setActiveTab(i)}
                className={cn(
                  "px-2 py-1 text-[10px] font-semibold rounded-md whitespace-nowrap transition-colors",
                  activeTab === i ? "bg-blue-100 text-blue-700" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Emoji grid */}
          <div className="px-3 pb-3 max-h-[260px] overflow-y-auto">
            <div className="grid grid-cols-8 gap-0.5">
              {filteredCategories[activeTab].emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => { onChange(emoji); setOpen(false); }}
                  className={cn(
                    "w-9 h-9 flex items-center justify-center text-xl rounded-lg hover:bg-gray-100 transition-colors",
                    value === emoji && "bg-blue-50 ring-2 ring-blue-200"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
