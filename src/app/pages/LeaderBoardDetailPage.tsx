import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { Crown, Calendar, Flag, Tag } from "lucide-react";
import { cn } from "../../lib/utils";
import { useRealtimeBroadcast } from "../../lib/realtimeSync";
import { useLanguage } from "../context/LanguageContext";
import { usePermission } from "../context/PermissionContext";
import { useInvite } from "../context/InviteContext";
import { NotionBlockEditor } from "../components/NotionBlockEditor";
import { UrlPreviewSection } from "../components/detail/UrlPreviewCard";
import { InlineText } from "../components/detail/InlineText";
import { AutoProperties } from "../components/detail/AutoProperties";
import type { PropertyFieldConfig } from "../components/detail/PropertyConfig";
import { DetailPageShell } from "../components/detail/DetailPageShell";
import { loadCards, saveCards, loadColumns, type KanbanCard } from "./ManagementPage";

const BOARD = "leaderboard" as const;

const PRIORITY_CONFIG: Record<string, { label: string; labelKo: string; color: string; bg: string }> = {
  low:     { label: "Low",     labelKo: "낮음", color: "text-green-600",  bg: "bg-green-50" },
  medium:  { label: "Medium",  labelKo: "보통", color: "text-amber-600",  bg: "bg-amber-50" },
  high:    { label: "High",    labelKo: "높음", color: "text-red-600",    bg: "bg-red-50" },
  delayed: { label: "Delayed", labelKo: "지연", color: "text-rose-600",   bg: "bg-rose-50" },
};

// ─── Detail Data ──────────────────────────────────────────────────
interface LeaderBoardItem {
  id: string;
  title: string;
  description: string;
  content: string;
  priority?: string;
  color?: string;
  columnId: string;
  createdAt: string;
}

const STORAGE_KEY = "poten_leaderboard_items";

function loadItems(): LeaderBoardItem[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

function saveItems(items: LeaderBoardItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function getOrCreateItem(id: string): LeaderBoardItem | null {
  const items = loadItems();
  const existing = items.find(i => i.id === id);
  if (existing) return existing;

  const card = loadCards(BOARD).find(c => c.id === id);
  if (!card) return null;

  const item: LeaderBoardItem = {
    id: card.id,
    title: card.title || "",
    description: card.description || "",
    content: card.description || "",
    priority: card.priority,
    color: card.color,
    columnId: card.columnId,
    createdAt: card.createdAt || new Date().toISOString(),
  };
  saveItems([...items, item]);
  return item;
}

// ─── Detail Page ──────────────────────────────────────────────────
export function LeaderBoardDetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const ko = language === "ko";
  const { currentUser } = usePermission();
  const { org } = useInvite();

  const isNew = itemId === "new";

  const [item, setItem] = useState<LeaderBoardItem | null>(() => {
    if (isNew) return null;
    return itemId ? getOrCreateItem(itemId) : null;
  });

  const [title, setTitle] = useState(item?.title || "");
  const [content, setContent] = useState(item?.content || "");
  const [priority, setPriority] = useState(item?.priority || "medium");

  // Create new item
  const createdRef = useRef(false);
  useEffect(() => {
    if (isNew && !createdRef.current) {
      createdRef.current = true;
      const columns = loadColumns(BOARD);
      const firstCol = columns[0]?.id || "col-default";
      const cards = loadCards(BOARD);
      const newCard: KanbanCard = {
        id: `lb-${Date.now()}`,
        columnId: firstCol,
        title: "",
        description: "",
        priority: "medium",
        order: cards.filter(c => c.columnId === firstCol).length,
        createdAt: new Date().toISOString(),
      };
      saveCards(BOARD, [...cards, newCard]);
      const newItem: LeaderBoardItem = {
        id: newCard.id,
        title: "",
        description: "",
        content: "",
        priority: "medium",
        columnId: firstCol,
        createdAt: newCard.createdAt,
      };
      saveItems([...loadItems(), newItem]);
      setItem(newItem);
      navigate(`/leader-board/${newCard.id}`, { replace: true });
    }
  }, [isNew]);

  // ── Realtime sync ──
  const rtChannel = org?.id && item?.id ? `lb-${item.id}-${org.id}` : null;
  const broadcast = useRealtimeBroadcast(rtChannel, currentUser.id, {
    "item-update": (payload: any) => {
      if (payload?.title !== undefined) setTitle(payload.title);
      if (payload?.content !== undefined) setContent(payload.content);
      if (payload?.priority !== undefined) setPriority(payload.priority);
      if (payload?.columnId !== undefined) {
        setItem(prev => prev ? { ...prev, columnId: payload.columnId } : null);
      }
    },
  });

  // Auto-save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!item?.id) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const items = loadItems();
      const idx = items.findIndex(i => i.id === item.id);
      const updated = { ...item, title, content, priority, description: content.slice(0, 200) };
      if (idx >= 0) items[idx] = updated;
      else items.push(updated);
      saveItems(items);

      const cards = loadCards(BOARD);
      const cardIdx = cards.findIndex(c => c.id === item.id);
      if (cardIdx >= 0) {
        cards[cardIdx] = { ...cards[cardIdx], title, description: content.slice(0, 200), priority: priority as any };
        saveCards(BOARD, cards);
      }

      // Broadcast changes to other clients
      broadcast("item-update", { title, content, priority, columnId: item.columnId });
    }, 400);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [title, content, priority, item?.id]);

  // Delete
  const handleDelete = () => {
    if (!confirm(ko ? "정말 삭제하시겠습니까?" : "Delete this item?")) return;
    if (item?.id) {
      saveItems(loadItems().filter(i => i.id !== item.id));
      saveCards(BOARD, loadCards(BOARD).filter(c => c.id !== item.id));
    }
    navigate("/leader-board");
  };

  if (!item && !isNew) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-gray-400">
        <Crown size={40} />
        <p className="text-sm">{ko ? "항목을 찾을 수 없습니다" : "Item not found"}</p>
        <button onClick={() => navigate("/leader-board")} className="text-sm text-blue-500 hover:underline">
          {ko ? "돌아가기" : "Go back"}
        </button>
      </div>
    );
  }

  const propertyFields: PropertyFieldConfig[] = [
    {
      key: "column",
      type: "dropdown",
      icon: <Tag size={14} />,
      label: ko ? "칼럼" : "Column",
      value: item?.columnId || "",
      options: loadColumns(BOARD).map(c => c.id),
      onChange: (v: string) => {
        if (!item) return;
        setItem(prev => prev ? { ...prev, columnId: v } : null);
        const cards = loadCards(BOARD);
        const idx = cards.findIndex(c => c.id === item.id);
        if (idx >= 0) {
          cards[idx] = { ...cards[idx], columnId: v, order: cards.filter(c => c.columnId === v).length };
          saveCards(BOARD, cards);
        }
      },
      renderValue: (v: string) => {
        const col = loadColumns(BOARD).find(c => c.id === v);
        return <span className="text-sm text-gray-700">{col?.name || "-"}</span>;
      },
      renderOption: (o: string) => {
        const col = loadColumns(BOARD).find(c => c.id === o);
        return <span>{col?.name || o}</span>;
      },
    },
    {
      key: "priority",
      type: "dropdown",
      icon: <Flag size={14} />,
      label: ko ? "우선순위" : "Priority",
      value: priority,
      options: ["low", "medium", "high", "delayed"],
      onChange: setPriority,
      renderValue: (v: string) => (
        <span className={cn("px-2 py-0.5 rounded-md font-bold", PRIORITY_CONFIG[v]?.bg, PRIORITY_CONFIG[v]?.color)}>
          {ko ? PRIORITY_CONFIG[v]?.labelKo : PRIORITY_CONFIG[v]?.label}
        </span>
      ),
      renderOption: (o: string) => (
        <span className={PRIORITY_CONFIG[o]?.color}>
          {ko ? PRIORITY_CONFIG[o]?.labelKo : PRIORITY_CONFIG[o]?.label}
        </span>
      ),
    },
    {
      key: "createdAt",
      type: "custom",
      icon: <Calendar size={14} />,
      label: ko ? "작성일" : "Created",
      render: () => (
        <span className="text-sm text-gray-700 px-2 py-1">
          {item?.createdAt
            ? new Date(item.createdAt).toLocaleDateString(ko ? "ko-KR" : "en-US", { year: "numeric", month: "long", day: "numeric" })
            : "-"}
        </span>
      ),
    },
  ];

  return (
    <DetailPageShell
      shareType="leaderboard"
      itemId={item?.id || ""}
      currentUserId={currentUser.id}
      backPath="/leader-board"
      backLabel={ko ? "리더 게시판" : "Leader Board"}
      breadcrumbs={title ? [{ label: title }] : undefined}
      onDelete={handleDelete}
      title={
        <InlineText
          value={title}
          onChange={setTitle}
          placeholder={ko ? "제목을 입력하세요" : "Enter title"}
          className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight tracking-tight focus:ring-0 focus:bg-transparent hover:bg-transparent border-b-2 border-transparent focus:border-gray-200 rounded-none pb-0.5"
          as="h1"
        />
      }
      properties={<AutoProperties fields={propertyFields} />}
      collapsedPreview={
        priority && PRIORITY_CONFIG[priority] ? (
          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", PRIORITY_CONFIG[priority]?.bg, PRIORITY_CONFIG[priority]?.color)}>
            {ko ? PRIORITY_CONFIG[priority]?.labelKo : PRIORITY_CONFIG[priority]?.label}
          </span>
        ) : null
      }
    >
      {/* Content editor */}
      <div className="min-h-[300px]">
        <NotionBlockEditor
          value={content}
          onChange={setContent}
          placeholder={ko ? "내용을 작성하세요..." : "Write content..."}
        />
      </div>
      <UrlPreviewSection text={content} />
    </DetailPageShell>
  );
}
