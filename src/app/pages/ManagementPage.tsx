import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { useDrag, useDrop } from "react-dnd";
import {
  Building2, FolderKanban, Palette, Plus, Trash2,
  Calendar, MoreVertical, Edit3, X, Check,
  Image as ImageIcon, Globe, GripVertical,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";

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
  type: "logo" | "color" | "font" | "guideline" | "template";
  name: string;
  value: string;
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

interface KanbanCard {
  id: string;
  columnId: string;
  title: string;
  description?: string;
  color?: string;
  imageUrl?: string;
  type: "project" | "brand" | "general";
  order: number;
  createdAt: string;
}

const STORAGE_COLUMNS = "poten_mgmt_kanban_columns";
const STORAGE_CARDS = "poten_mgmt_kanban_cards";

function loadColumns(): KanbanColumn[] {
  try {
    const s = localStorage.getItem(STORAGE_COLUMNS);
    if (s) return JSON.parse(s);
  } catch {}
  // Default columns
  return [
    { id: "col-project", name: "프로젝트", order: 0 },
    { id: "col-brand", name: "브랜딩", order: 1 },
    { id: "col-general", name: "일반", order: 2 },
  ];
}

function saveColumns(cols: KanbanColumn[]) {
  localStorage.setItem(STORAGE_COLUMNS, JSON.stringify(cols));
}

function loadCards(): KanbanCard[] {
  try {
    const s = localStorage.getItem(STORAGE_CARDS);
    if (s) return JSON.parse(s);
  } catch {}
  return [];
}

function saveCards(cards: KanbanCard[]) {
  localStorage.setItem(STORAGE_CARDS, JSON.stringify(cards));
}

// ─── Drag Types ─────────────────────────────────────────────────
const CARD_DRAG = "MGMT_CARD";
const COL_DRAG = "MGMT_COL";

interface CardDragItem { id: string; columnId: string; index: number; }
interface ColDragItem { id: string; index: number; }

// ─── Kanban Card Component ──────────────────────────────────────
function KanbanCardItem({
  card, index, columnId, ko, onDelete, onMove,
}: {
  card: KanbanCard; index: number; columnId: string; ko: boolean;
  onDelete: (id: string) => void;
  onMove: (dragId: string, targetColId: string, targetIndex: number) => void;
}) {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

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

  const handleClick = () => {
    if (card.type === "project") navigate(`/management/projects/${card.id}`);
    else if (card.type === "brand") navigate(`/management/branding/${card.id}`);
  };

  const typeBadge = card.type === "project"
    ? { label: ko ? "프로젝트" : "Project", cls: "bg-blue-50 text-blue-600" }
    : card.type === "brand"
    ? { label: ko ? "브랜딩" : "Brand", cls: "bg-purple-50 text-purple-600" }
    : null;

  return (
    <div
      ref={ref}
      onClick={handleClick}
      className={cn(
        "bg-white p-3.5 rounded-xl border shadow-sm hover:shadow-md transition-all group cursor-grab active:cursor-grabbing relative",
        isDragging ? "opacity-40 border-blue-300 ring-2 ring-blue-200" : "border-gray-100"
      )}
    >
      <div className="flex items-start gap-2">
        {card.color && (
          <div className="w-2 h-8 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: card.color }} />
        )}
        {card.imageUrl && (
          <img src={card.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0 border border-gray-100" />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
            {card.title || (ko ? "제목 없음" : "Untitled")}
          </h4>
          {card.description && (
            <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{card.description}</p>
          )}
        </div>
        <div ref={menuRef} className="relative shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-all"
          >
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-24">
              {(card.type === "project" || card.type === "brand") && (
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); handleClick(); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
                >
                  <Edit3 size={10} /> {ko ? "수정" : "Edit"}
                </button>
              )}
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

      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
        {typeBadge && (
          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", typeBadge.cls)}>
            {typeBadge.label}
          </span>
        )}
        {card.createdAt && (
          <span className="text-[10px] text-gray-400 flex items-center gap-0.5 ml-auto">
            <Calendar size={9} />
            {new Date(card.createdAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Kanban Column Component ────────────────────────────────────
function KanbanColumnComponent({
  column, cards, index, ko,
  onAddCard, onDeleteCard, onMoveCard,
  onRenameColumn, onDeleteColumn, onMoveColumn,
}: {
  column: KanbanColumn; cards: KanbanCard[]; index: number; ko: boolean;
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

  // Drop zone for cards (empty area)
  const [{ isOver }, cardDrop] = useDrop<CardDragItem, void, { isOver: boolean }>({
    accept: CARD_DRAG,
    drop(item) {
      if (item.columnId !== column.id || item.index !== cards.length) {
        onMoveCard(item.id, column.id, cards.length);
      }
    },
    collect: (m) => ({ isOver: m.isOver() }),
  });

  colDrag(colDrop(colRef));

  return (
    <div
      ref={colRef}
      className={cn(
        "flex flex-col w-72 shrink-0 rounded-2xl border p-3 transition-all h-fit max-h-[calc(100vh-200px)]",
        colDragging ? "opacity-40 ring-2 ring-blue-200" : "bg-gray-50/50 border-gray-100"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
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
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-500">
              {cards.length}
            </span>
          </div>
        )}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => setIsAdding(true)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => {
              if (cards.length > 0) {
                if (!confirm(ko ? "이 칼럼의 카드도 함께 삭제됩니다. 계속하시겠습니까?" : "Cards in this column will also be deleted. Continue?")) return;
              }
              onDeleteColumn(column.id);
            }}
            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Cards */}
      <div
        ref={cardDrop}
        className={cn(
          "flex-1 overflow-y-auto space-y-2.5 pb-2 min-h-[60px] custom-scrollbar",
          isOver && "bg-blue-50/50 rounded-xl"
        )}
      >
        {/* Inline add */}
        {isAdding && (
          <div className="bg-white rounded-xl border border-blue-200 shadow-sm ring-2 ring-blue-100 overflow-hidden">
            <input
              ref={inputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
                if (e.key === "Escape") { setNewTitle(""); setIsAdding(false); }
              }}
              onBlur={handleAdd}
              placeholder={ko ? "제목을 입력하세요..." : "Enter title..."}
              className="w-full px-3 py-2.5 text-sm outline-none bg-transparent placeholder-gray-400"
            />
            <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400">
              {ko ? "Enter 추가 · Esc 취소" : "Enter to add · Esc to cancel"}
            </div>
          </div>
        )}

        {cards.map((card, i) => (
          <KanbanCardItem
            key={card.id}
            card={card}
            index={i}
            columnId={column.id}
            ko={ko}
            onDelete={onDeleteCard}
            onMove={onMoveCard}
          />
        ))}

        {cards.length === 0 && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-6 rounded-xl text-gray-300 text-xs hover:text-blue-500 hover:bg-blue-50/50 border border-dashed border-gray-200 hover:border-blue-300 transition-all flex flex-col items-center gap-1"
          >
            <Plus size={16} />
            <span>{ko ? "카드 추가" : "Add card"}</span>
          </button>
        )}
      </div>

      {/* Bottom add (when cards exist) */}
      {cards.length > 0 && !isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="mt-1 w-full py-2 rounded-lg text-gray-400 text-xs hover:text-blue-600 hover:bg-gray-100 transition-all flex items-center justify-center gap-1"
        >
          <Plus size={12} /> {ko ? "추가" : "Add"}
        </button>
      )}
    </div>
  );
}

// ─── Main Management Page ────────────────────────────────────────
export function ManagementPage() {
  const { language } = useLanguage();
  const ko = language === "ko";

  const [columns, setColumns] = useState<KanbanColumn[]>(loadColumns);
  const [cards, setCards] = useState<KanbanCard[]>(loadCards);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColName, setNewColName] = useState("");
  const newColRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (addingColumn && newColRef.current) newColRef.current.focus(); }, [addingColumn]);

  // Persist
  const persistColumns = useCallback((cols: KanbanColumn[]) => { setColumns(cols); saveColumns(cols); }, []);
  const persistCards = useCallback((crds: KanbanCard[]) => { setCards(crds); saveCards(crds); }, []);

  // Column operations
  const handleAddColumn = () => {
    if (!newColName.trim()) { setAddingColumn(false); return; }
    const newCol: KanbanColumn = {
      id: `col-${Date.now()}`,
      name: newColName.trim(),
      order: columns.length,
    };
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
      type: "general",
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

    // Insert at target position within the column
    const colCards = next.filter(c => c.columnId === targetColId);
    const otherCards = next.filter(c => c.columnId !== targetColId);
    colCards.splice(Math.min(targetIndex, colCards.length), 0, moved);
    colCards.forEach((c, i) => c.order = i);

    persistCards([...otherCards, ...colCards]);
  };

  const sortedColumns = [...columns].sort((a, b) => a.order - b.order);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="mb-4 shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
              <Building2 className="inline-block mr-2 -mt-0.5" size={22} />
              {ko ? "관리" : "Management"}
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm">
              {ko ? "카테고리별로 프로젝트와 자산을 관리합니다" : "Manage projects and assets by category"}
            </p>
          </div>
        </div>
      </header>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 h-full items-start">
          {sortedColumns.map((col, i) => {
            const colCards = cards
              .filter(c => c.columnId === col.id)
              .sort((a, b) => a.order - b.order);
            return (
              <KanbanColumnComponent
                key={col.id}
                column={col}
                cards={colCards}
                index={i}
                ko={ko}
                onAddCard={handleAddCard}
                onDeleteCard={handleDeleteCard}
                onMoveCard={handleMoveCard}
                onRenameColumn={handleRenameColumn}
                onDeleteColumn={handleDeleteColumn}
                onMoveColumn={handleMoveColumn}
              />
            );
          })}

          {/* Add Column Button */}
          {addingColumn ? (
            <div className="w-72 shrink-0 bg-gray-50 rounded-2xl border border-gray-200 p-3">
              <input
                ref={newColRef}
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddColumn();
                  if (e.key === "Escape") { setNewColName(""); setAddingColumn(false); }
                }}
                onBlur={handleAddColumn}
                placeholder={ko ? "카테고리 이름..." : "Category name..."}
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
              className="w-72 shrink-0 py-8 rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-300 text-gray-400 hover:text-blue-500 text-sm font-medium transition-all flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              {ko ? "카테고리 추가" : "Add Category"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
