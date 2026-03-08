import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import { useDrag, useDrop } from "react-dnd";
import { AnimatePresence, motion } from "motion/react";
import {
  FolderKanban, Palette, Plus, Trash2,
  Calendar as CalendarIcon, MoreHorizontal, X, Check,
  Image as ImageIcon, Globe, GripVertical, Search, Edit3,
  StickyNote,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useInvite } from "../context/InviteContext";
import { TeamBoardSidebar } from "./GoalPage";
import { format } from "date-fns";

// ─── Types (exported for detail pages) ───────────────────────────
export interface Project {
  id: string;
  name: string;
  description: string;
  status: "planning" | "active" | "paused" | "completed";
  color: string;
  startDate?: string;
  endDate?: string;
  memberIds: string[];
  createdAt: string;
  logoUrl?: string;
  client?: string;
  budget?: string;
  category?: "internal" | "outsource" | "contract" | "other";
  links?: { label: string; url: string }[];
}

export interface BrandAsset {
  id: string;
  type?: "logo" | "color" | "font" | "guideline" | "template"; // legacy
  name: string;
  value?: string; // legacy
  slogan?: string;
  category?: string;
  url?: string;
  description?: string;
  createdAt: string;
  imageUrl?: string;
  guidelines?: string;
  attachments?: { name: string; url: string }[];
}

export const PROJECT_STATUS_CONFIG = {
  planning: { label: "기획 중", labelEn: "Planning", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  active: { label: "진행 중", labelEn: "Active", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  paused: { label: "일시 중지", labelEn: "Paused", color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200" },
  completed: { label: "완료", labelEn: "Completed", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
};

export const PROJECT_CATEGORY_CONFIG = {
  internal: { label: "내부 프로젝트", labelEn: "Internal" },
  outsource: { label: "외주", labelEn: "Outsource" },
  contract: { label: "수주", labelEn: "Contract" },
  other: { label: "기타", labelEn: "Other" },
};

export const PROJECT_COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981",
  "#06B6D4", "#F97316", "#EF4444", "#6366F1", "#14B8A6",
];

export const BRAND_TYPE_CONFIG = {
  logo: { label: "로고", labelEn: "Logo", icon: <ImageIcon size={14} /> },
  color: { label: "브랜드 컬러", labelEn: "Brand Color", icon: <Palette size={14} /> },
  font: { label: "폰트", labelEn: "Font", icon: <span className="text-xs font-bold">Aa</span> },
  guideline: { label: "가이드라인", labelEn: "Guideline", icon: <Globe size={14} /> },
  template: { label: "템플릿", labelEn: "Template", icon: <FolderKanban size={14} /> },
};

export const STORAGE_KEY_PROJECTS = "poten_management_projects";
export const STORAGE_KEY_BRAND = "poten_management_brand";

export function loadProjects(): Project[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY_PROJECTS);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}
export function saveProjects(projects: Project[]) {
  localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
}
export function loadBrandAssets(): BrandAsset[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY_BRAND);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}
export function saveBrandAssets(assets: BrandAsset[]) {
  localStorage.setItem(STORAGE_KEY_BRAND, JSON.stringify(assets));
}

// ─── Kanban Data Model ──────────────────────────────────────────
interface KanbanColumn {
  id: string;
  name: string;
  order: number;
}

export interface KanbanCard {
  id: string;
  columnId: string;
  title: string;
  description?: string;
  color?: string;
  priority?: "high" | "medium" | "low";
  dueDate?: string;
  order: number;
  createdAt: string;
}

export type BoardType = "projects" | "branding";

function storageKey(board: BoardType, suffix: string) {
  return `poten_mgmt_${board}_${suffix}`;
}

function isDemo() {
  try { return localStorage.getItem("poten_demo_mode") === "true"; } catch { return false; }
}

// ─── Demo Seed Data ─────────────────────────────────────────────
const DEMO_SEED_KEY = "poten_mgmt_demo_seeded";

const DEMO_PROJECT_COLUMNS: KanbanColumn[] = [
  { id: "col-planning", name: "기획", order: 0 },
  { id: "col-progress", name: "진행 중", order: 1 },
  { id: "col-done", name: "완료", order: 2 },
];

const DEMO_PROJECT_CARDS: KanbanCard[] = [
  { id: "demo-p1", columnId: "col-planning", title: "신규 랜딩페이지 리디자인", description: "2분기 마케팅 캠페인용 랜딩페이지", color: "#3B82F6", priority: "high", order: 0, createdAt: "2026-02-10T00:00:00Z" },
  { id: "demo-p2", columnId: "col-planning", title: "사용자 온보딩 플로우 개선", description: "신규 가입자 이탈률 줄이기", color: "#8B5CF6", priority: "medium", order: 1, createdAt: "2026-02-15T00:00:00Z" },
  { id: "demo-p3", columnId: "col-progress", title: "모바일 앱 v2.0 개발", description: "React Native → Flutter 마이그레이션", color: "#10B981", priority: "high", dueDate: "2026-04-30", order: 0, createdAt: "2026-01-05T00:00:00Z" },
  { id: "demo-p4", columnId: "col-progress", title: "결제 시스템 리팩토링", description: "PG사 연동 안정화 및 에러 핸들링", color: "#F59E0B", priority: "medium", dueDate: "2026-03-20", order: 1, createdAt: "2026-01-20T00:00:00Z" },
  { id: "demo-p5", columnId: "col-done", title: "디자인 시스템 구축", description: "Figma → 코드 컴포넌트 라이브러리", color: "#EC4899", priority: "low", order: 0, createdAt: "2025-11-01T00:00:00Z" },
  { id: "demo-p6", columnId: "col-done", title: "SEO 최적화 1차", description: "메타태그, 사이트맵, 구조화 데이터 적용", color: "#06B6D4", priority: "medium", order: 1, createdAt: "2025-12-10T00:00:00Z" },
];

const DEMO_BRAND_COLUMNS: KanbanColumn[] = [
  { id: "col-instagram", name: "인스타그램", order: 0 },
  { id: "col-blog", name: "네이버 블로그", order: 1 },
  { id: "col-youtube", name: "유튜브", order: 2 },
];

const DEMO_BRAND_CARDS: KanbanCard[] = [
  { id: "demo-b1", columnId: "col-instagram", title: "@ourteam_official", description: "메인 인스타그램 계정", color: "#E11D48", priority: "high", order: 0, createdAt: "2026-01-01T00:00:00Z" },
  { id: "demo-b2", columnId: "col-instagram", title: "@ourteam_daily", description: "일상/비하인드 콘텐츠", color: "#F97316", priority: "medium", order: 1, createdAt: "2026-01-15T00:00:00Z" },
  { id: "demo-b3", columnId: "col-blog", title: "팀 공식 블로그", description: "제품 업데이트 및 기술 블로그", color: "#22C55E", priority: "high", order: 0, createdAt: "2026-01-05T00:00:00Z" },
  { id: "demo-b4", columnId: "col-blog", title: "마케팅 블로그", description: "SEO 키워드 콘텐츠 발행", color: "#3B82F6", priority: "medium", order: 1, createdAt: "2026-02-01T00:00:00Z" },
  { id: "demo-b5", columnId: "col-youtube", title: "제품 소개 채널", description: "튜토리얼 및 기능 소개 영상", color: "#EF4444", priority: "high", order: 0, createdAt: "2026-01-10T00:00:00Z" },
];

function seedDemoData() {
  if (!isDemo()) return;
  try { if (localStorage.getItem(DEMO_SEED_KEY)) return; } catch {}

  // Projects
  localStorage.setItem(storageKey("projects", "columns"), JSON.stringify(DEMO_PROJECT_COLUMNS));
  localStorage.setItem(storageKey("projects", "cards"), JSON.stringify(DEMO_PROJECT_CARDS));

  // Branding
  localStorage.setItem(storageKey("branding", "columns"), JSON.stringify(DEMO_BRAND_COLUMNS));
  localStorage.setItem(storageKey("branding", "cards"), JSON.stringify(DEMO_BRAND_CARDS));

  localStorage.setItem(DEMO_SEED_KEY, "true");
}

// Seed on module load (only runs once per demo session)
seedDemoData();

// ─────────────────────────────────────────────────────────────────

export function loadColumns(board: BoardType): KanbanColumn[] {
  try {
    const s = localStorage.getItem(storageKey(board, "columns"));
    if (s) return JSON.parse(s);
  } catch {}
  return board === "projects"
    ? [
        { id: "col-planning", name: "기획", order: 0 },
        { id: "col-progress", name: "진행 중", order: 1 },
        { id: "col-done", name: "완료", order: 2 },
      ]
    : [
        { id: "col-design", name: "디자인", order: 0 },
        { id: "col-review", name: "검토", order: 1 },
        { id: "col-approved", name: "승인", order: 2 },
      ];
}

function saveColumns(board: BoardType, cols: KanbanColumn[]) {
  localStorage.setItem(storageKey(board, "columns"), JSON.stringify(cols));
}

export function loadCards(board: BoardType): KanbanCard[] {
  try {
    const s = localStorage.getItem(storageKey(board, "cards"));
    if (s) return JSON.parse(s);
  } catch {}
  return [];
}

export function saveCards(board: BoardType, cards: KanbanCard[]) {
  localStorage.setItem(storageKey(board, "cards"), JSON.stringify(cards));
}

// ─── Drag Types ─────────────────────────────────────────────────
const CARD_DRAG = "MGMT_CARD";
const COL_DRAG = "MGMT_COL";

interface CardDragItem { id: string; columnId: string; index: number; }
interface ColDragItem { id: string; index: number; }

// ─── Card Component (TaskCard style) ────────────────────────────
function MgmtCard({
  card, index, columnId, ko, board,
  onDelete, onMove,
}: {
  card: KanbanCard; index: number; columnId: string; ko: boolean; board: BoardType;
  onDelete: (id: string) => void;
  onMove: (dragId: string, targetColId: string, targetIndex: number) => void;
}) {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [{ isDragging }, drag] = useDrag<CardDragItem, void, { isDragging: boolean }>({
    type: CARD_DRAG,
    item: { id: card.id, columnId, index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [, drop] = useDrop<CardDragItem>({
    accept: CARD_DRAG,
    hover(item) {
      if (item.id === card.id) return;
      onMove(item.id, columnId, index);
      item.columnId = columnId;
      item.index = index;
    },
  });

  drag(drop(ref));

  const detailPath = board === "projects"
    ? `/projects/${card.id}`
    : `/branding/${card.id}`;

  return (
    <div
      ref={ref}
      onClick={() => navigate(detailPath)}
      className={cn(
        "bg-white p-4 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative",
        isDragging
          ? "opacity-40 border-blue-300 shadow-lg scale-[0.97] ring-2 ring-blue-200"
          : "border-gray-100"
      )}
    >
      <div className="flex items-start gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          {card.priority && (
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
              card.priority === 'high' ? "bg-red-50 text-red-600 border border-red-100" :
              card.priority === 'medium' ? "bg-amber-50 text-amber-600 border border-amber-100" :
              "bg-blue-50 text-blue-600 border border-blue-100"
            )}>
              {card.priority}
            </span>
          )}
          {card.color && (
            <div className="w-3 h-3 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: card.color }} />
          )}
        </div>
        <div className="relative shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-24"
              onMouseLeave={() => setMenuOpen(false)}>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); navigate(detailPath); }}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
              >
                <Edit3 size={10} /> {ko ? "수정" : "Edit"}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(card.id); }}
                className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-1.5"
              >
                <Trash2 size={10} /> {ko ? "삭제" : "Delete"}
              </button>
            </div>
          )}
        </div>
      </div>

      <h4 className="font-medium text-sm text-gray-900 mb-1 leading-snug">{card.title || (ko ? "제목 없음" : "Untitled")}</h4>
      {card.description && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{card.description}</p>
      )}

      <div className="flex items-center justify-between border-t border-gray-50 pt-3 mt-2">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {card.dueDate && (
            <div className="flex items-center gap-1">
              <CalendarIcon size={12} />
              <span>{format(new Date(card.dueDate), "MMM d")}</span>
            </div>
          )}
          {!card.dueDate && card.createdAt && (
            <div className="flex items-center gap-1">
              <CalendarIcon size={12} />
              <span>{format(new Date(card.createdAt), "MMM d")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Column Component (TaskColumn style) ────────────────────────
function MgmtColumn({
  column, cards, index, ko, board,
  onAddCard, onDeleteCard, onMoveCard,
  onRenameColumn, onDeleteColumn, onMoveColumn,
}: {
  column: KanbanColumn; cards: KanbanCard[]; index: number; ko: boolean; board: BoardType;
  onAddCard: (columnId: string, title: string) => void;
  onDeleteCard: (id: string) => void;
  onMoveCard: (dragId: string, targetColId: string, targetIndex: number) => void;
  onRenameColumn: (id: string, name: string) => void;
  onDeleteColumn: (id: string) => void;
  onMoveColumn: (fromIndex: number, toIndex: number) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const colRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (isAdding && inputRef.current) inputRef.current.focus(); }, [isAdding]);
  useEffect(() => { if (isEditing && nameRef.current) nameRef.current.focus(); }, [isEditing]);

  const handleAdd = () => {
    if (newTitle.trim()) { onAddCard(column.id, newTitle.trim()); setNewTitle(""); }
    setIsAdding(false);
  };

  const handleRename = () => {
    if (editName.trim()) onRenameColumn(column.id, editName.trim());
    setIsEditing(false);
  };

  // Column drag
  const [{ isDragging: colDragging }, colDrag] = useDrag<ColDragItem, void, { isDragging: boolean }>({
    type: COL_DRAG,
    item: { id: column.id, index },
    collect: (m) => ({ isDragging: m.isDragging() }),
  });

  const [, colDrop] = useDrop<ColDragItem>({
    accept: COL_DRAG,
    hover(item) {
      if (item.id === column.id) return;
      onMoveColumn(item.index, index);
      item.index = index;
    },
  });

  // Drop zone for cards
  const [{ isOver, canDrop }, cardDrop] = useDrop<CardDragItem, void, { isOver: boolean; canDrop: boolean }>({
    accept: CARD_DRAG,
    canDrop: (item) => item.columnId !== column.id || item.index !== cards.length,
    drop(item) {
      onMoveCard(item.id, column.id, cards.length);
    },
    collect: (m) => ({ isOver: m.isOver(), canDrop: m.canDrop() }),
  });

  colDrag(colDrop(colRef));

  return (
    <div
      ref={colRef}
      className={cn(
        "flex-1 flex flex-col rounded-2xl border p-4 transition-all duration-200 h-full min-w-[280px]",
        colDragging ? "opacity-40 ring-2 ring-blue-200" :
        isOver && canDrop
          ? "bg-blue-50/80 border-blue-300 ring-2 ring-blue-200/50 shadow-lg"
          : canDrop ? "bg-gray-50/50 border-gray-200 border-dashed" : "bg-gray-50/50 border-gray-100"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        {isEditing ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              ref={nameRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setIsEditing(false); }}
              onBlur={handleRename}
              className="text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-200 flex-1"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <GripVertical size={14} className="text-gray-300 cursor-grab shrink-0" />
            <h3
              onClick={() => { setEditName(column.name); setIsEditing(true); }}
              className="font-semibold text-gray-700 text-sm truncate cursor-pointer hover:text-blue-600 transition-colors"
            >
              {column.name}
            </h3>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors",
              isOver && canDrop ? "bg-blue-200 text-blue-700" : "bg-gray-200 text-gray-600"
            )}>{cards.length}</span>
          </div>
        )}
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => setIsAdding(true)} className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors">
            <Plus size={16} />
          </button>
          <button
            onClick={() => {
              if (cards.length > 0) {
                if (!confirm(ko ? "이 칼럼의 카드도 함께 삭제됩니다. 계속하시겠습니까?" : "Cards in this column will also be deleted. Continue?")) return;
              }
              onDeleteColumn(column.id);
            }}
            className="text-gray-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Cards */}
      <div
        ref={cardDrop}
        className="flex-1 overflow-y-auto space-y-3 pr-1 pb-3 custom-scrollbar min-h-[60px]"
      >
        {isAdding && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <input
              ref={inputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
                if (e.key === "Escape") { setNewTitle(""); setIsAdding(false); }
              }}
              onBlur={() => { if (newTitle.trim()) handleAdd(); else { setNewTitle(""); setIsAdding(false); } }}
              placeholder={ko ? "제목을 입력하세요..." : "Enter title..."}
              className="w-full px-4 py-3 text-sm outline-none bg-transparent placeholder-gray-400 text-gray-900"
            />
            <div className="flex items-center px-3 py-2 bg-gray-50/80 border-t border-gray-100">
              <span className="text-[10px] text-gray-400">{ko ? "Enter로 추가 · Esc로 취소" : "Enter to add · Esc to cancel"}</span>
            </div>
          </div>
        )}

        {cards.length === 0 && isOver && canDrop && (
          <div className="border-2 border-dashed border-blue-300 rounded-xl p-6 text-center text-blue-500 text-xs font-medium animate-pulse">
            {ko ? "여기에 놓으세요" : "Drop here"}
          </div>
        )}
        {cards.length === 0 && !isOver && !isAdding && (
          <button onClick={() => setIsAdding(true)}
            className="w-full flex flex-col items-center justify-center py-8 text-gray-300 hover:text-blue-500 hover:bg-blue-50/50 rounded-xl transition-all cursor-pointer group">
            <Plus size={20} className="mb-1.5 opacity-50 group-hover:opacity-100 transition-opacity" />
            <p className="text-xs font-medium">{ko ? "카드를 추가해보세요" : "Add a card"}</p>
          </button>
        )}

        {cards.map((card, i) => (
          <MgmtCard
            key={card.id}
            card={card}
            index={i}
            columnId={column.id}
            ko={ko}
            board={board}
            onDelete={onDeleteCard}
            onMove={onMoveCard}
          />
        ))}

        {!isAdding && cards.length > 0 && (
          <button onClick={() => setIsAdding(true)}
            className="w-full py-2.5 rounded-xl text-gray-400 text-sm hover:text-blue-600 hover:bg-gray-100/80 transition-all flex items-center gap-2 px-3">
            <Plus size={14} /> <span>{ko ? "카드 추가" : "Add Card"}</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Management Page ────────────────────────────────────────
export function ManagementPage() {
  const { language } = useLanguage();
  const ko = language === "ko";
  const location = useLocation();
  const board: BoardType = location.pathname.startsWith("/branding") ? "branding" : "projects";
  const { org } = useInvite();
  const [showTeamBoard, setShowTeamBoard] = useState(false);

  const [columns, setColumns] = useState<KanbanColumn[]>(() => loadColumns(board));
  const [cards, setCards] = useState<KanbanCard[]>(() => loadCards(board));
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const newColRef = useRef<HTMLInputElement>(null);

  // Reload data when board changes
  useEffect(() => {
    setColumns(loadColumns(board));
    setCards(loadCards(board));
    setSearchQuery("");
    setAddingColumn(false);
  }, [board]);

  useEffect(() => { if (addingColumn && newColRef.current) newColRef.current.focus(); }, [addingColumn]);

  // Persist
  const persistColumns = useCallback((cols: KanbanColumn[]) => { setColumns(cols); saveColumns(board, cols); }, [board]);
  const persistCards = useCallback((crds: KanbanCard[]) => { setCards(crds); saveCards(board, crds); }, [board]);

  // Column operations
  const handleAddColumn = () => {
    if (!newColName.trim()) { setAddingColumn(false); return; }
    const newCol: KanbanColumn = { id: `col-${Date.now()}`, name: newColName.trim(), order: columns.length };
    persistColumns([...columns, newCol]);
    setNewColName("");
    setAddingColumn(false);
  };

  const handleRenameColumn = (id: string, name: string) => {
    persistColumns(columns.map(c => c.id === id ? { ...c, name } : c));
  };

  const handleDeleteColumn = (id: string) => {
    persistColumns(columns.filter(c => c.id !== id));
    persistCards(cards.filter(c => c.columnId !== id));
  };

  const handleMoveColumn = (fromIndex: number, toIndex: number) => {
    const next = [...columns];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    next.forEach((c, i) => c.order = i);
    persistColumns(next);
  };

  // Card operations
  const handleAddCard = (columnId: string, title: string) => {
    const colCards = cards.filter(c => c.columnId === columnId);
    const newCard: KanbanCard = {
      id: `card-${Date.now()}`,
      columnId,
      title,
      priority: "medium",
      order: colCards.length,
      createdAt: new Date().toISOString(),
    };
    persistCards([...cards, newCard]);
  };

  const handleDeleteCard = (id: string) => {
    if (!confirm(ko ? "삭제하시겠습니까?" : "Delete this card?")) return;
    persistCards(cards.filter(c => c.id !== id));
  };

  const handleMoveCard = (dragId: string, targetColId: string, targetIndex: number) => {
    const next = [...cards];
    const cardIndex = next.findIndex(c => c.id === dragId);
    if (cardIndex === -1) return;
    const [moved] = next.splice(cardIndex, 1);
    moved.columnId = targetColId;
    const colCards = next.filter(c => c.columnId === targetColId);
    const otherCards = next.filter(c => c.columnId !== targetColId);
    colCards.splice(Math.min(targetIndex, colCards.length), 0, moved);
    colCards.forEach((c, i) => c.order = i);
    persistCards([...otherCards, ...colCards]);

    // Sync brand asset category when moving cards between branding columns
    if (board === "branding") {
      const targetCol = columns.find(c => c.id === targetColId);
      if (targetCol) {
        const assets = loadBrandAssets();
        const asset = assets.find(a => a.id === dragId);
        if (asset) {
          asset.category = targetCol.name;
          saveBrandAssets(assets);
        }
      }
    }
  };

  const sortedColumns = useMemo(() => [...columns].sort((a, b) => a.order - b.order), [columns]);

  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return cards;
    const q = searchQuery.toLowerCase();
    return cards.filter(c => c.title.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
  }, [cards, searchQuery]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="mb-4 shrink-0 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
              {board === "projects" ? (
                <><FolderKanban className="inline-block mr-2 -mt-0.5" size={22} />{ko ? "프로젝트" : "Projects"}</>
              ) : (
                <><Palette className="inline-block mr-2 -mt-0.5" size={22} />{ko ? "브랜딩" : "Branding"}</>
              )}
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm">
              {board === "projects"
                ? (ko ? "칼럼을 자유롭게 커스텀하고 프로젝트를 관리합니다" : "Customize columns and manage projects")
                : (ko ? "칼럼을 자유롭게 커스텀하고 브랜드 자산을 관리합니다" : "Customize columns and manage brand assets")}
            </p>
          </div>
          {org && (
            <button
              onClick={() => setShowTeamBoard(v => !v)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all border shadow-sm",
                showTeamBoard
                  ? "bg-blue-50 text-blue-600 border-blue-200"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600"
              )}
            >
              <StickyNote size={16} />
              {ko ? "팀 보드" : "Team Board"}
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
          <div className="flex-1 sm:max-w-md">
            <div className="flex items-center w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all shadow-sm">
              <Search className="text-gray-400 mr-2 shrink-0" size={18} />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={ko ? "검색..." : "Search..."}
                className="w-full text-sm outline-none bg-transparent placeholder-gray-400 text-gray-900" />
            </div>
          </div>
        </div>
      </header>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 h-full items-stretch">
          {sortedColumns.map((col, i) => {
            const colCards = filteredCards
              .filter(c => c.columnId === col.id)
              .sort((a, b) => a.order - b.order);
            return (
              <MgmtColumn
                key={col.id}
                column={col}
                cards={colCards}
                index={i}
                ko={ko}
                board={board}
                onAddCard={handleAddCard}
                onDeleteCard={handleDeleteCard}
                onMoveCard={handleMoveCard}
                onRenameColumn={handleRenameColumn}
                onDeleteColumn={handleDeleteColumn}
                onMoveColumn={handleMoveColumn}
              />
            );
          })}

          {/* Add Column */}
          {addingColumn ? (
            <div className="min-w-[280px] shrink-0 bg-gray-50 rounded-2xl border border-gray-200 p-4 h-fit">
              <input
                ref={newColRef}
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddColumn();
                  if (e.key === "Escape") { setNewColName(""); setAddingColumn(false); }
                }}
                onBlur={handleAddColumn}
                placeholder={ko ? "칼럼 이름..." : "Column name..."}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
              />
              <div className="flex gap-2 mt-2">
                <button onClick={handleAddColumn} className="flex-1 text-xs font-medium px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-1">
                  <Check size={12} /> {ko ? "추가" : "Add"}
                </button>
                <button onClick={() => { setNewColName(""); setAddingColumn(false); }} className="text-xs px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg">
                  {ko ? "취소" : "Cancel"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingColumn(true)}
              className="min-w-[280px] shrink-0 py-8 rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-300 text-gray-400 hover:text-blue-500 text-sm font-medium transition-all flex items-center justify-center gap-2 h-fit"
            >
              <Plus size={16} />
              {ko ? "칼럼 추가" : "Add Column"}
            </button>
          )}
        </div>
      </div>

      {/* Team Board Overlay Panel */}
      <AnimatePresence>
        {showTeamBoard && org && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTeamBoard(false)}
              className="fixed inset-0 bg-black/10 z-[100]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="fixed top-0 right-0 h-full w-80 z-[101] shadow-2xl bg-white border-l border-gray-200"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <StickyNote size={16} className="text-blue-600" />
                  <span className="font-semibold text-gray-800 text-sm">{ko ? "팀 보드" : "Team Board"}</span>
                </div>
                <button onClick={() => setShowTeamBoard(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="h-[calc(100%-57px)] overflow-y-auto p-1">
                <TeamBoardSidebar orgId={org.id} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
