import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Task, getMainAssigneeId, getAllAssigneeIds } from "../../../lib/mockData";
import { getUserColor, getMemberColorConfig, getTaskCalendarColor } from "../../../lib/mockData";
import { useNavigate } from "react-router";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Clock,
  CheckCircle2,
  Circle,
  Loader2,
  Flag,
  X,
  ArrowRight,
  MoreHorizontal,
  Maximize2,
  User as UserIcon,
  CircleDot,
  Video,
  Palette,
  AlignJustify,
  LayoutList,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isToday,
  isSameMonth,
  isSameDay,
  startOfDay,
  addDays,
  differenceInDays,
  differenceInCalendarDays,
  isWithinInterval,
  isAfter,
  isBefore,
  subDays,
} from "date-fns";
import { ko } from "date-fns/locale";
import { useLanguage } from "../../context/LanguageContext";
import { useTaskContext } from "../../context/TaskContext";
import { useMeetingContext, Meeting } from "../../context/MeetingContext";
import { usePermission } from "../../context/PermissionContext";
import { useDrag, useDrop } from "react-dnd";
import { createPortal } from "react-dom";

type ViewMode = "month" | "3week";

const ITEM_TYPE = "CALENDAR_TASK";
const MEETING_DRAG_TYPE = "CALENDAR_MEETING";

// Track Alt key for clone-on-drop
const calAltKeyRef = { current: false };
if (typeof window !== "undefined") {
  window.addEventListener("keydown", (e) => { if (e.altKey) calAltKeyRef.current = true; });
  window.addEventListener("keyup", (e) => { if (!e.altKey) calAltKeyRef.current = false; });
}

const STATUS_CONFIG: Record<string, { label: string; labelKo: string; icon: React.ReactNode; color: string; bg: string }> = {
  pending: { label: "To Do", labelKo: "할 일", icon: <Circle size={12} />, color: "text-gray-500", bg: "bg-gray-100" },
  "in-progress": { label: "In Progress", labelKo: "진행 중", icon: <CircleDot size={12} />, color: "text-blue-600", bg: "bg-blue-50" },
  routine: { label: "Routine", labelKo: "루틴", icon: <Clock size={12} />, color: "text-purple-600", bg: "bg-purple-50" },
  completed: { label: "Done", labelKo: "완료", icon: <CheckCircle2 size={12} />, color: "text-emerald-600", bg: "bg-emerald-50" },
};

const PRIORITY_CONFIG: Record<string, { label: string; labelKo: string; color: string; dot: string }> = {
  low: { label: "Low", labelKo: "낮음", color: "text-blue-600", dot: "bg-blue-400" },
  medium: { label: "Medium", labelKo: "보통", color: "text-green-600", dot: "bg-green-400" },
  high: { label: "High", labelKo: "높음", color: "text-red-600", dot: "bg-red-400" },
  delayed: { label: "Delayed", labelKo: "지연", color: "text-orange-600", dot: "bg-orange-400" },
};

const getAssigneeInitials = (id: string, members: { id: string; name: string }[]) => {
  const member = members.find((m) => m.id === id);
  if (!member) return null;
  return member.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

// ── Helper: get effective date range for a task ────────────────────
function getTaskDateRange(task: Task): { start: Date; end: Date } | null {
  const due = task.dueDate ? startOfDay(new Date(task.dueDate)) : null;
  const start = task.startDate ? startOfDay(new Date(task.startDate)) : null;
  const end = task.endDate ? startOfDay(new Date(task.endDate)) : null;

  if (start && end) return { start, end };
  if (start && due) return { start, end: due };
  if (due) return { start: due, end: due };
  return null;
}

// ─── Resize state type ──────────────────────────────────────────────

// ─── Status stripe colors ───────────────────────────────────────────
const STATUS_STRIPE_COLOR: Record<string, string> = {
  pending: "#EAB308",      // Yellow
  "in-progress": "#3B82F6", // Blue
  completed: "#22C55E",     // Green
};

// ─── Hex to RGBA helper ─────────────────────────────────────────────
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Calendar card style ──────────────────────────────────────────────
type CalendarCardStyle = "compact" | "detailed";
const CAL_CARD_STYLE_KEY = "poten_calendar_card_style";
const CAL_ORDER_KEY = "poten_cal_task_order";

function loadCalOrder(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(CAL_ORDER_KEY) || "{}"); } catch { return {}; }
}
function saveCalOrder(order: Record<string, number>) {
  try { localStorage.setItem(CAL_ORDER_KEY, JSON.stringify(order)); } catch {}
}

interface ResizeState {
  taskId: string;
  edge: "left" | "right";
  previewDate: Date | null;
}

// ─── Resizable Task Bar ─────────────────────────────────────────────
function ResizableTaskBar({
  task,
  language,
  position,
  isResizing,
  isSelected,
  selectedIds,
  onClick,
  onSelect,
  onResizeStart,
  onContextMenu,
  canDragTask = true,
  cardStyle = "compact",
}: {
  task: Task;
  language: string;
  position: "single" | "start" | "middle" | "end";
  isResizing: boolean;
  isSelected: boolean;
  selectedIds: Set<string>;
  onClick: (task: Task, rect: DOMRect) => void;
  onSelect: (taskId: string, multi: boolean) => void;
  onResizeStart: (taskId: string, edge: "left" | "right", e: React.MouseEvent) => void;
  onContextMenu: (task: Task, x: number, y: number) => void;
  canDragTask?: boolean;
  cardStyle?: CalendarCardStyle;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const title = language === "ko" ? task.titleKo || task.title : task.title;
  const { members } = usePermission();

  // When dragging a selected task, carry all selected task IDs
  const dragIds = isSelected && selectedIds.size > 1
    ? Array.from(selectedIds)
    : [task.id];

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: ITEM_TYPE,
      item: { taskId: task.id, taskIds: dragIds },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
      canDrag: () => !isResizing && canDragTask,
    }),
    [task.id, isResizing, dragIds, canDragTask]
  );

  drag(ref);

  const handleClick = (e: React.MouseEvent) => {
    if (isResizing) return;
    e.preventDefault();
    e.stopPropagation();
    // Ctrl/Cmd+Click → toggle selection
    if (e.ctrlKey || e.metaKey) {
      onSelect(task.id, true);
      return;
    }
    // Plain click: if multiple selected, deselect and open quick view
    if (ref.current) {
      onSelect(task.id, false);
      onClick(task, ref.current.getBoundingClientRect());
    }
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(task, e.clientX, e.clientY);
  };

  const showLeftHandle = canDragTask && (position === "single" || position === "start");
  const showRightHandle = canDragTask && (position === "single" || position === "end");

  // All assignees for color-dot display
  const allIds = getAllAssigneeIds(task);

  const borderRadius =
    position === "single"
      ? "rounded"
      : position === "start"
      ? "rounded-l rounded-r-none"
      : position === "end"
      ? "rounded-r rounded-l-none"
      : "rounded-none";

  const borderStyle =
    position === "single"
      ? "border"
      : position === "start"
      ? "border-y border-l border-r-0"
      : position === "end"
      ? "border-y border-r border-l-0"
      : "border-y border-l-0 border-r-0";

  const isUrgent = !!task.isUrgent && task.status !== "completed";

  // Get the effective calendar color for background (team member color)
  const calColor = getTaskCalendarColor(task);
  // Get status stripe color
  const statusStripeColor = STATUS_STRIPE_COLOR[task.status] || STATUS_STRIPE_COLOR.pending;

  // Check if other selected tasks are being dragged (dim them)
  const isBatchDragged = !isDragging && selectedIds.size > 1 && isSelected && selectedIds.has(task.id);

  return (
    <div
      ref={ref}
      data-task-id={task.id}
      onClick={handleClick}
      onContextMenu={handleRightClick}
      className={cn(
        "text-[10px] font-medium transition-all relative group/bar overflow-hidden",
        cardStyle === "detailed" ? "min-h-[52px] flex flex-col justify-center" : "h-[26px] flex items-center",
        position === "single" && "shadow-sm",
        isDragging && "opacity-40 ring-2 ring-blue-300",
        !isResizing && canDragTask && "cursor-grab active:cursor-grabbing",
        !canDragTask && "cursor-default",
        isResizing && "cursor-col-resize",
        borderRadius,
        isUrgent
          ? ""
          : borderStyle,
        !isUrgent && "text-gray-700 border-gray-200/60 hover:border-gray-300",
        task.status === "completed" && "opacity-70 line-through decoration-green-300",
        isSelected && !isDragging && "ring-2 ring-blue-400 ring-offset-1 z-[3]"
      )}
      style={
        isUrgent
          ? {
              background: "linear-gradient(135deg, #FF6B35 0%, #F72585 100%)",
              color: "#ffffff",
              borderWidth: position === "single" ? 1 : undefined,
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderLeftWidth: position === "single" || position === "start" ? 1 : 0,
              borderRightWidth: position === "single" || position === "end" ? 1 : 0,
              borderStyle: "solid",
              borderColor: "rgba(247,37,133,0.3)",
              boxShadow: "0 1px 3px rgba(247,37,133,0.2)",
            }
          : {
              backgroundColor: calColor ? hexToRgba(calColor, 0.1) : "rgba(229,231,235,0.3)",
            }
      }
      title={title}
    >
      {/* Left color stripe – status color */}
      {!isUrgent && (position === "single" || position === "start") && (
        <span
          className="absolute left-0 top-0 bottom-0 w-[3px] z-[1]"
          style={{ backgroundColor: statusStripeColor }}
        />
      )}

      {/* Left resize handle */}
      {showLeftHandle && (
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onResizeStart(task.id, "left", e);
          }}
          className="absolute left-0 top-0 bottom-0 w-[5px] cursor-col-resize z-10 group/handle"
        >
          <div className="absolute left-0 top-[3px] bottom-[3px] w-[3px] rounded-full bg-blue-400 opacity-0 group-hover/bar:opacity-60 group-hover/handle:!opacity-100 transition-opacity" />
        </div>
      )}

      {/* Content */}
      {cardStyle === "detailed" ? (
        <div className="px-2 py-1 overflow-hidden">
          {(position === "single" || position === "start") ? (
            <>
              <div className="flex items-center gap-1 mb-0.5">
                {task.priority && task.priority !== "low" && (
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    task.priority === "high" ? "bg-red-400" : "bg-amber-400"
                  )} />
                )}
                {task.category && (
                  <span className="text-[8px] text-gray-400 truncate">{task.category}</span>
                )}
              </div>
              <div className="flex justify-between items-start gap-1">
                <span className="truncate font-semibold text-[11px] leading-tight">{title}</span>
                <div className="flex items-center shrink-0 gap-0.5 mt-0.5">
                  {allIds.slice(0, 3).map((id) => {
                    const memberColor = getUserColor(id);
                    return (
                      <span key={id} className="relative flex items-center justify-center">
                        <span className="w-4 h-4 rounded-full bg-white text-[8px] flex items-center justify-center border border-gray-100 text-gray-500 font-bold">
                          {getAssigneeInitials(id, members)}
                        </span>
                        {memberColor && (
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-[6px] h-[6px] rounded-full ring-1 ring-white"
                            style={{ backgroundColor: memberColor }}
                          />
                        )}
                      </span>
                    );
                  })}
                  {allIds.length > 3 && (
                    <span className="text-[8px] text-gray-400">+{allIds.length - 3}</span>
                  )}
                </div>
              </div>
              {task.description && (
                <p className="text-[9px] text-gray-400 truncate mt-0.5 leading-tight">{task.description}</p>
              )}
            </>
          ) : (
            <span className="truncate opacity-0 select-none">&nbsp;</span>
          )}
        </div>
      ) : (
        <div className="flex justify-between items-center gap-1 px-2 overflow-hidden">
          {(position === "single" || position === "start") && (
            <>
              <span className="truncate">{title}</span>
              <div className="flex items-center shrink-0 gap-0.5">
                {allIds.map((id) => {
                  const memberColor = getUserColor(id);
                  return (
                    <span key={id} className="relative flex items-center justify-center">
                      <span className="w-4 h-4 rounded-full bg-white text-[8px] flex items-center justify-center border border-gray-100 text-gray-500 font-bold">
                        {getAssigneeInitials(id, members)}
                      </span>
                      {memberColor && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-[6px] h-[6px] rounded-full ring-1 ring-white"
                          style={{ backgroundColor: memberColor }}
                        />
                      )}
                    </span>
                  );
                })}
              </div>
            </>
          )}
          {position === "middle" && (
            <span className="truncate opacity-0 select-none">&nbsp;</span>
          )}
          {position === "end" && (
            <span className="truncate opacity-0 select-none">&nbsp;</span>
          )}
        </div>
      )}

      {/* Right resize handle */}
      {showRightHandle && (
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onResizeStart(task.id, "right", e);
          }}
          className="absolute right-0 top-0 bottom-0 w-[5px] cursor-col-resize z-10 group/handle"
        >
          <div className="absolute right-0 top-[3px] bottom-[3px] w-[3px] rounded-full bg-blue-400 opacity-0 group-hover/bar:opacity-60 group-hover/handle:!opacity-100 transition-opacity" />
        </div>
      )}
    </div>
  );
}

// ─── Draggable Meeting Bar ──────────────────────────────────────────
function DraggableMeetingBar({ meeting, language, onClick, onContextMenu }: {
  meeting: Meeting;
  language: string;
  onClick: () => void;
  onContextMenu?: (x: number, y: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isDragging }, drag] = useDrag(() => ({
    type: MEETING_DRAG_TYPE,
    item: { meetingId: meeting.id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [meeting.id]);
  drag(ref);

  return (
    <div
      ref={ref}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onContextMenu={(e) => {
        if (!onContextMenu) return;
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e.clientX, e.clientY);
      }}
      className={cn(
        "mx-1.5 h-[26px] flex items-center gap-1 px-2 rounded-md cursor-grab active:cursor-grabbing transition-colors text-[11px] font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/60",
        isDragging && "opacity-40"
      )}
    >
      <Video size={11} className="shrink-0 text-purple-400" />
      <span className="truncate">{meeting.title || (language === 'ko' ? '제목없음' : 'Untitled')}</span>
    </div>
  );
}

// ─── Droppable Day Cell ─────────────────────────────────────────────
function DroppableDayCell({
  day,
  isCurrentMonth,
  isTodayDate,
  dayTasks,
  dayMeetings,
  viewMode,
  language,
  selectedIds,
  onDropTask,
  onDropMeeting,
  onTaskClick,
  onSelectTask,
  resizeState,
  onResizeStart,
  onAddTask,
  onAddMeeting,
  onDeselectAll,
  onMeetingClick,
  onContextMenu,
  onMeetingContextMenu,
  canDragTaskFn,
  cardStyle = "compact",
}: {
  day: Date;
  isCurrentMonth: boolean;
  isTodayDate: boolean;
  dayTasks: { task: Task | null; position: "single" | "start" | "middle" | "end" }[];
  dayMeetings: Meeting[];
  viewMode: ViewMode;
  language: string;
  selectedIds: Set<string>;
  onDropTask: (taskIds: string[], newDate: Date, clientY?: number, altKey?: boolean) => void;
  onDropMeeting: (meetingId: string, newDate: Date) => void;
  onTaskClick: (task: Task, rect: DOMRect) => void;
  onSelectTask: (taskId: string, multi: boolean) => void;
  resizeState: ResizeState | null;
  onResizeStart: (taskId: string, edge: "left" | "right", e: React.MouseEvent) => void;
  onAddTask: (day: Date, rect: DOMRect) => void;
  onAddMeeting?: (day: Date) => void;
  onDeselectAll: () => void;
  onMeetingClick: (meetingId: string) => void;
  onContextMenu: (task: Task, x: number, y: number) => void;
  onMeetingContextMenu?: (meeting: Meeting, x: number, y: number) => void;
  canDragTaskFn?: (task: Task) => boolean;
  cardStyle?: CalendarCardStyle;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: [ITEM_TYPE, MEETING_DRAG_TYPE],
      drop: (item: { taskId?: string; taskIds?: string[]; meetingId?: string }, monitor) => {
        const type = monitor.getItemType();
        if (type === MEETING_DRAG_TYPE && item.meetingId) {
          onDropMeeting(item.meetingId, day);
        } else {
          const ids = item.taskIds && item.taskIds.length > 0 ? item.taskIds : item.taskId ? [item.taskId] : [];
          const clientY = monitor.getClientOffset()?.y;
          if (ids.length > 0) onDropTask(ids, day, clientY, calAltKeyRef.current);
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [day, onDropTask, onDropMeeting]
  );

  drop(ref);

  // Check if this cell is part of a resize preview
  const isResizePreview = resizeState?.previewDate != null && (() => {
    // We'll highlight via parent
    return false;
  })();

  return (
    <div
      ref={ref}
      data-date={format(day, "yyyy-MM-dd")}
      onClick={() => { if (selectedIds.size > 0) onDeselectAll(); }}
      className={cn(
        "border-b border-r border-gray-100 py-1.5 transition-colors flex flex-col gap-0.5 relative group",
        !isCurrentMonth && viewMode === "month" && "bg-gray-50/30 text-gray-400",
        viewMode === "month" ? "min-h-[130px]" : "min-h-[160px]",
        isOver && canDrop && "bg-blue-50/60 ring-2 ring-inset ring-blue-200",
        !isOver && canDrop && "bg-blue-50/20"
      )}
    >
      <div className="flex justify-between items-start mb-0.5 shrink-0 px-1.5">
        <span
          className={cn(
            "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full transition-colors",
            isTodayDate
              ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
              : "text-gray-700 group-hover:bg-gray-100"
          )}
        >
          {format(day, "d")}
        </span>
        {(dayTasks.filter(t => t.task !== null).length + dayMeetings.length) > 0 && (
          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 rounded-full">
            {dayTasks.filter(t => t.task !== null).length + dayMeetings.length}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-0.5 flex-1 overflow-y-auto no-scrollbar">
        {/* Priority order: 1) Multi-day spanning tasks  2) Meetings  3) Single-day tasks */}
        {(() => {
          // Find split point: last multi-day entry (non-single position or placeholder in multi-day zone)
          let lastMultiIdx = -1;
          for (let i = dayTasks.length - 1; i >= 0; i--) {
            const { task, position } = dayTasks[i];
            if (position !== "single" || (task === null && i <= lastMultiIdx)) {
              lastMultiIdx = i;
              break;
            }
            // Also check if a null placeholder precedes a multi-day entry
            if (task === null) {
              for (let j = i - 1; j >= 0; j--) {
                if (dayTasks[j].position !== "single") { lastMultiIdx = i; break; }
              }
              if (lastMultiIdx >= i) break;
            }
          }
          const multiDayEntries = dayTasks.slice(0, lastMultiIdx + 1);
          const singleDayEntries = dayTasks.slice(lastMultiIdx + 1).filter(e => e.task !== null);

          return (
            <>
              {/* 1) Multi-day spanning tasks with placeholders */}
              {multiDayEntries.map(({ task, position }, idx) =>
                task ? (
                  <div
                    key={task.id}
                    className={cn(
                      "relative",
                      position === "single" && "mx-1.5",
                      position === "start" && "ml-1.5 -mr-[3px] z-[2]",
                      position === "middle" && "-mx-[3px] z-[2]",
                      position === "end" && "-ml-[3px] mr-1.5 z-[2]"
                    )}
                  >
                    <ResizableTaskBar
                      task={task} language={language} position={position}
                      isResizing={resizeState?.taskId === task.id}
                      isSelected={selectedIds.has(task.id)} selectedIds={selectedIds}
                      onClick={onTaskClick} onSelect={onSelectTask}
                      onResizeStart={onResizeStart} onContextMenu={onContextMenu}
                      canDragTask={canDragTaskFn ? canDragTaskFn(task) : true}
                      cardStyle={cardStyle}
                    />
                  </div>
                ) : (
                  <div key={`ph-${idx}`} className={cn(
                    "mx-1.5 pointer-events-none invisible",
                    cardStyle === "detailed" ? "min-h-[52px]" : "h-[26px]"
                  )} />
                )
              )}

              {/* 2) Meetings */}
              {dayMeetings.map((meeting) => (
                <DraggableMeetingBar
                  key={meeting.id} meeting={meeting} language={language}
                  onClick={() => onMeetingClick(meeting.id)}
                  onContextMenu={onMeetingContextMenu ? (x, y) => onMeetingContextMenu(meeting, x, y) : undefined}
                />
              ))}

              {/* 3) Single-day tasks */}
              {singleDayEntries.map(({ task, position }) =>
                task && (
                  <div key={task.id} className="relative mx-1.5">
                    <ResizableTaskBar
                      task={task} language={language} position={position}
                      isResizing={resizeState?.taskId === task.id}
                      isSelected={selectedIds.has(task.id)} selectedIds={selectedIds}
                      onClick={onTaskClick} onSelect={onSelectTask}
                      onResizeStart={onResizeStart} onContextMenu={onContextMenu}
                      canDragTask={canDragTaskFn ? canDragTaskFn(task) : true}
                      cardStyle={cardStyle}
                    />
                  </div>
                )
              )}
            </>
          );
        })()}

        {/* Hover add buttons */}
        <div className="flex-1 min-h-[24px] flex items-end justify-center pb-1 gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddTask(day, e.currentTarget.getBoundingClientRect());
            }}
            className="text-[10px] text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded px-1.5 py-0.5 transition-all opacity-0 group-hover:opacity-60 hover:!opacity-100 flex items-center gap-0.5"
          >
            <Plus size={9} />
            업무
          </button>
          {onAddMeeting && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddMeeting(day);
              }}
              className="text-[10px] text-gray-400 hover:text-purple-500 hover:bg-purple-50 rounded px-1.5 py-0.5 transition-all opacity-0 group-hover:opacity-60 hover:!opacity-100 flex items-center gap-0.5"
            >
              <Video size={9} />
              회의
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Task Quick View Modal ──────────────────────────────────────────
function TaskQuickViewModal({
  task,
  anchorRect,
  language,
  onClose,
  onExpand,
}: {
  task: Task;
  anchorRect: DOMRect;
  language: string;
  onClose: () => void;
  onExpand: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const { members } = usePermission();

  useEffect(() => {
    const w = 340;
    const h = 300;
    let top = anchorRect.bottom + 8;
    let left = anchorRect.left;

    if (left + w > window.innerWidth - 16) {
      left = window.innerWidth - w - 16;
    }
    if (left < 16) left = 16;

    if (top + h > window.innerHeight - 16) {
      top = anchorRect.top - h - 8;
    }
    if (top < 16) top = 16;

    setPos({ top, left });
  }, [anchorRect]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const title = language === "ko" ? task.titleKo || task.title : task.title;
  const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
  const priorityCfg = PRIORITY_CONFIG[task.priority || "low"] || PRIORITY_CONFIG["low"];
  const mainId = getMainAssigneeId(task);
  const mainAssignee = mainId ? members.find((m) => m.id === mainId) : null;
  const allIds = getAllAssigneeIds(task);
  const otherAssignees = allIds.slice(1).map((id) => members.find((m) => m.id === id)).filter(Boolean);
  const dueDateStr = task.dueDate
    ? format(
        new Date(task.dueDate),
        language === "ko" ? "yyyy년 M월 d일" : "MMM d, yyyy",
        language === "ko" ? { locale: ko } : undefined
      )
    : language === "ko"
    ? "미정"
    : "Not set";

  // Show date range if exists
  const range = getTaskDateRange(task);
  const dateDisplay = range
    ? isSameDay(range.start, range.end)
      ? dueDateStr
      : `${format(range.start, language === "ko" ? "M/d" : "MMM d", language === "ko" ? { locale: ko } : undefined)} → ${format(range.end, language === "ko" ? "M/d" : "MMM d", language === "ko" ? { locale: ko } : undefined)}`
    : dueDateStr;

  return createPortal(
    <div className="fixed inset-0 z-[9998]">
      <div className="absolute inset-0" />
      <div
        ref={modalRef}
        className="fixed w-[340px] bg-white rounded-xl shadow-2xl border border-gray-200 z-[9999] animate-in fade-in zoom-in-95 duration-150"
        style={{ top: pos.top, left: pos.left }}
      >
        <div className="flex items-start justify-between p-4 pb-2">
          <h3 className="text-sm font-bold text-gray-900 leading-snug pr-8 line-clamp-2">
            {title}
          </h3>
          <div className="flex items-center gap-1 shrink-0 -mt-0.5 -mr-1">
            <button
              onClick={onExpand}
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title={language === "ko" ? "전체 페이지로 열기" : "Open full page"}
            >
              <Maximize2 size={14} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="px-4 py-2 space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 w-[80px] shrink-0 text-gray-400">
              <Clock size={12} />
              <span className="text-[11px] font-medium">
                {language === "ko" ? "상태" : "Status"}
              </span>
            </div>
            <span
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md",
                statusCfg.bg,
                statusCfg.color
              )}
            >
              {statusCfg.icon}
              {language === "ko" ? statusCfg.labelKo : statusCfg.label}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 w-[80px] shrink-0 text-gray-400">
              <Flag size={12} />
              <span className="text-[11px] font-medium">
                {language === "ko" ? "우선순위" : "Priority"}
              </span>
            </div>
            <span className={cn("flex items-center gap-1.5 text-xs font-medium", priorityCfg.color)}>
              <span className={cn("w-2 h-2 rounded-full", priorityCfg.dot)} />
              {language === "ko" ? priorityCfg.labelKo : priorityCfg.label}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 w-[80px] shrink-0 text-gray-400">
              <UserIcon size={12} />
              <span className="text-[11px] font-medium">
                {language === "ko" ? "참여자" : "Participant"}
              </span>
            </div>
            {mainAssignee ? (
              <div className="flex items-center gap-2 flex-wrap">
                {allIds.map((id) => {
                  const member = members.find((m) => m.id === id);
                  if (!member) return null;
                  const memberColor = getUserColor(id);
                  const isMain = id === mainId;
                  return (
                    <div key={id} className="flex items-center gap-1.5">
                      <span className="relative">
                        <img
                          src={member.avatar}
                          alt=""
                          className={cn(
                            "rounded-full object-cover",
                            isMain ? "w-5 h-5" : "w-4 h-4"
                          )}
                        />
                        {memberColor && (
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-[7px] h-[7px] rounded-full ring-1 ring-white"
                            style={{ backgroundColor: memberColor }}
                          />
                        )}
                      </span>
                      <span className={cn(
                        "font-medium",
                        isMain ? "text-xs text-gray-700" : "text-[11px] text-gray-500"
                      )}>
                        {member.name}
                      </span>
                      {isMain && allIds.length > 1 && (
                        <span className="text-[9px] font-semibold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                          {language === "ko" ? "메인" : "Main"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <span className="text-xs text-gray-400">
                {language === "ko" ? "나" : "Me"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 w-[80px] shrink-0 text-gray-400">
              <CalendarIcon size={12} />
              <span className="text-[11px] font-medium">
                {language === "ko" ? "날짜" : "Date"}
              </span>
            </div>
            <span className="text-xs font-medium text-gray-700">{dateDisplay}</span>
          </div>
        </div>

        {task.description && (
          <div className="px-4 py-2 border-t border-gray-100 mt-1">
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
              {task.description}
            </p>
          </div>
        )}

        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-end">
          <button
            onClick={onExpand}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Maximize2 size={12} />
            {language === "ko" ? "상세 페이지 열기" : "Open full page"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Resize Overlay (shows during resize) ───────────────────────────
function ResizeOverlay({
  resizeState,
  task,
  language,
}: {
  resizeState: ResizeState;
  task: Task;
  language: string;
}) {
  const range = getTaskDateRange(task);
  if (!range || !resizeState.previewDate) return null;

  const newStart = resizeState.edge === "left" ? resizeState.previewDate : range.start;
  const newEnd = resizeState.edge === "right" ? resizeState.previewDate : range.end;
  const days = differenceInCalendarDays(newEnd, newStart) + 1;

  return createPortal(
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] bg-gray-900/90 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg backdrop-blur-sm flex items-center gap-2 pointer-events-none">
      <CalendarIcon size={12} />
      <span>
        {format(newStart, language === "ko" ? "M/d" : "MMM d", language === "ko" ? { locale: ko } : undefined)}
        {!isSameDay(newStart, newEnd) && (
          <> → {format(newEnd, language === "ko" ? "M/d" : "MMM d", language === "ko" ? { locale: ko } : undefined)}</>
        )}
      </span>
      <span className="text-gray-300">
        ({days}{language === "ko" ? "일" : days === 1 ? " day" : " days"})
      </span>
    </div>,
    document.body
  );
}

// ─── Quick Add Popover ──────────────────────────────────────────────
function QuickAddPopover({
  anchorRect,
  date,
  language,
  onSubmit,
  onClose,
}: {
  anchorRect: DOMRect;
  date: Date;
  language: string;
  onSubmit: (title: string) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("");
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    const w = 280;
    let top = anchorRect.top;
    let left = anchorRect.left;

    if (left + w > window.innerWidth - 16) {
      left = window.innerWidth - w - 16;
    }
    if (left < 16) left = 16;

    // If not enough space below, show above
    if (top + 60 > window.innerHeight - 16) {
      top = anchorRect.top - 60;
    }
    if (top < 16) top = 16;

    setPos({ top, left });
  }, [anchorRect]);

  useEffect(() => {
    // Focus input on mount
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.trim()) {
      e.preventDefault();
      onSubmit(value.trim());
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const dateLabel = format(
    date,
    language === "ko" ? "M월 d일" : "MMM d",
    language === "ko" ? { locale: ko } : undefined
  );

  return createPortal(
    <div className="fixed inset-0 z-[9998]">
      <div
        ref={popoverRef}
        className="fixed w-[280px] bg-white rounded-xl shadow-2xl border border-gray-200 z-[9999] animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
        style={{ top: pos.top, left: pos.left }}
      >
        <div className="px-3 pt-3 pb-1.5 flex items-center gap-2">
          <CalendarIcon size={12} className="text-blue-500 shrink-0" />
          <span className="text-[11px] font-medium text-gray-400">{dateLabel}</span>
        </div>
        <div className="px-3 pb-3">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={language === "ko" ? "새 업무 제목 입력 후 Enter" : "Type task title, press Enter"}
            className="w-full text-sm text-gray-900 placeholder:text-gray-300 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main CalendarView ──────────────────────────────────────────────
export function CalendarView({ taskFilter }: { taskFilter?: (task: Task) => boolean } = {}) {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const { tasks: allContextTasks, addTask: addTaskToContext, updateTask, removeTask } = useTaskContext();
  const calTasks = useMemo(() => taskFilter ? allContextTasks.filter(taskFilter) : allContextTasks, [allContextTasks, taskFilter]);
  const { meetings, addMeeting, updateMeeting, removeMeeting } = useMeetingContext();
  const { can, members: teamMembers, currentUser } = usePermission();

  // Calendar edit permission: can edit any = full drag, can edit own = own tasks only
  const canEditAnyCalendar = can('calendar.editAny');
  const canEditOwnCalendar = can('calendar.editOwn');

  const [viewMode, setViewMode] = useState<ViewMode>("3week");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Card style toggle (compact / detailed)
  const [cardStyle, setCardStyle] = useState<CalendarCardStyle>(() => {
    try { return (localStorage.getItem(CAL_CARD_STYLE_KEY) as CalendarCardStyle) || "compact"; } catch { return "compact"; }
  });
  const toggleCardStyle = useCallback((style: CalendarCardStyle) => {
    setCardStyle(style);
    try { localStorage.setItem(CAL_CARD_STYLE_KEY, style); } catch {}
  }, []);

  // Calendar task order for vertical reordering
  const [calOrder, setCalOrder] = useState<Record<string, number>>(loadCalOrder);

  // Expand state – show 2 extra weeks from next month
  const [isExpanded, setIsExpanded] = useState(false);

  // Reset expanded when navigating months
  const prevDateRef = useRef(currentDate);
  useEffect(() => {
    if (startOfMonth(prevDateRef.current).getTime() !== startOfMonth(currentDate).getTime()) {
      setIsExpanded(false);
    }
    prevDateRef.current = currentDate;
  }, [currentDate]);

  // Quick view modal state
  const [quickViewTask, setQuickViewTask] = useState<Task | null>(null);
  const [quickViewRect, setQuickViewRect] = useState<DOMRect | null>(null);

  // Context menu state (right-click) — tasks
  const [ctxMenu, setCtxMenu] = useState<{ task: Task; x: number; y: number } | null>(null);
  const ctxMenuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback((task: Task, x: number, y: number) => {
    setCtxMenu({ task, x, y });
    setMtgCtxMenu(null);
    setQuickViewTask(null);
  }, []);

  // Context menu state (right-click) — meetings
  const [mtgCtxMenu, setMtgCtxMenu] = useState<{ meeting: Meeting; x: number; y: number } | null>(null);
  const mtgCtxMenuRef = useRef<HTMLDivElement>(null);

  const handleMeetingContextMenu = useCallback((meeting: Meeting, x: number, y: number) => {
    setMtgCtxMenu({ meeting, x, y });
    setCtxMenu(null);
    setQuickViewTask(null);
  }, []);

  // Close context menu on outside click or Escape
  useEffect(() => {
    if (!ctxMenu && !mtgCtxMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (ctxMenu && ctxMenuRef.current && !ctxMenuRef.current.contains(e.target as Node)) setCtxMenu(null);
      if (mtgCtxMenu && mtgCtxMenuRef.current && !mtgCtxMenuRef.current.contains(e.target as Node)) setMtgCtxMenu(null);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setCtxMenu(null); setMtgCtxMenu(null); }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [ctxMenu, mtgCtxMenu]);

  // Resize state
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const resizeRef = useRef<{
    taskId: string;
    edge: "left" | "right";
    originalStart: Date;
    originalEnd: Date;
  } | null>(null);

  // Auto-scroll on drag/resize near edges
  const calendarGridRef = useRef<HTMLDivElement>(null);
  const autoScrollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [autoScrollDirection, setAutoScrollDirection] = useState<"left" | "right" | null>(null);
  const autoScrollActiveRef = useRef(false);
  const isDraggingRef = useRef(false);

  // Edge zone width in pixels for auto-scroll trigger
  const EDGE_ZONE = 60;
  const AUTO_SCROLL_INTERVAL = 600; // ms between auto-scroll steps

  const formatOptions = language === "ko" ? { locale: ko } : undefined;
  const weekOpts = { weekStartsOn: 0 as const }; // Always start weeks on Sunday

  const days = useMemo(() => {
    if (viewMode === "3week") {
      // 5 weeks total: 1 week before + current week + 3 weeks after (centered on today)
      const weekStart = startOfWeek(currentDate, weekOpts);
      return eachDayOfInterval({
        start: subWeeks(weekStart, 1),
        end: addDays(addWeeks(weekStart, 4), -1),
      });
    }
    // month view
    const monthEnd = endOfWeek(endOfMonth(currentDate), weekOpts);
    const baseDays = eachDayOfInterval({
      start: startOfWeek(startOfMonth(currentDate), weekOpts),
      end: monthEnd,
    });
    if (!isExpanded) return baseDays;
    // Add 2 extra weeks after the last day shown
    const extendedEnd = addDays(monthEnd, 14);
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(currentDate), weekOpts),
      end: extendedEnd,
    });
  }, [viewMode, currentDate, isExpanded]);

  // Next month label for the expand button
  const nextMonthLabel = useMemo(() => {
    const next = addMonths(currentDate, 1);
    return format(next, language === "ko" ? "M월" : "MMM", formatOptions);
  }, [currentDate, language, formatOptions]);

  const weekDays =
    language === "ko"
      ? ["일", "월", "화", "수", "목", "금", "토"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const onNext = useCallback(() => {
    setCurrentDate((prev) =>
      viewMode === "month" ? addMonths(prev, 1) : addWeeks(prev, 1)
    );
  }, [viewMode]);

  const onPrev = useCallback(() => {
    setCurrentDate((prev) =>
      viewMode === "month" ? subMonths(prev, 1) : subWeeks(prev, 1)
    );
  }, [viewMode]);

  // Auto-scroll effect: when direction is set during drag/resize, auto advance
  useEffect(() => {
    if (autoScrollDirection && (isDraggingRef.current || resizeState)) {
      if (autoScrollTimerRef.current) clearInterval(autoScrollTimerRef.current);

      // Immediately advance once
      if (autoScrollDirection === "right") {
        onNext();
      } else {
        onPrev();
      }

      // Then keep advancing on interval
      autoScrollTimerRef.current = setInterval(() => {
        if (autoScrollDirection === "right") {
          onNext();
        } else {
          onPrev();
        }
      }, AUTO_SCROLL_INTERVAL);

      return () => {
        if (autoScrollTimerRef.current) {
          clearInterval(autoScrollTimerRef.current);
          autoScrollTimerRef.current = null;
        }
      };
    } else {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
        autoScrollTimerRef.current = null;
      }
    }
  }, [autoScrollDirection, resizeState, onNext, onPrev]);

  // Detect edge proximity during drag
  const checkAutoScroll = useCallback((clientX: number) => {
    const grid = calendarGridRef.current;
    if (!grid) return;

    const rect = grid.getBoundingClientRect();
    const relX = clientX - rect.left;

    if (relX < EDGE_ZONE && relX >= 0) {
      if (!autoScrollActiveRef.current || autoScrollDirection !== "left") {
        autoScrollActiveRef.current = true;
        setAutoScrollDirection("left");
      }
    } else if (relX > rect.width - EDGE_ZONE && relX <= rect.width) {
      if (!autoScrollActiveRef.current || autoScrollDirection !== "right") {
        autoScrollActiveRef.current = true;
        setAutoScrollDirection("right");
      }
    } else {
      if (autoScrollActiveRef.current) {
        autoScrollActiveRef.current = false;
        setAutoScrollDirection(null);
      }
    }
  }, [autoScrollDirection]);

  // Clear auto-scroll when drag ends
  const clearAutoScroll = useCallback(() => {
    autoScrollActiveRef.current = false;
    isDraggingRef.current = false;
    setAutoScrollDirection(null);
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
      autoScrollTimerRef.current = null;
    }
  }, []);

  // Monitor drag events on the calendar grid for auto-scroll
  useEffect(() => {
    const grid = calendarGridRef.current;
    if (!grid) return;

    const handleDragOver = (e: DragEvent) => {
      isDraggingRef.current = true;
      checkAutoScroll(e.clientX);
    };

    const handleDragLeave = (e: DragEvent) => {
      // Only clear if actually leaving the grid
      const rect = grid.getBoundingClientRect();
      if (
        e.clientX < rect.left || e.clientX > rect.right ||
        e.clientY < rect.top || e.clientY > rect.bottom
      ) {
        clearAutoScroll();
      }
    };

    const handleDragEnd = () => {
      clearAutoScroll();
    };

    const handleDrop = () => {
      clearAutoScroll();
    };

    grid.addEventListener("dragover", handleDragOver);
    grid.addEventListener("dragleave", handleDragLeave);
    grid.addEventListener("dragend", handleDragEnd);
    grid.addEventListener("drop", handleDrop);

    return () => {
      grid.removeEventListener("dragover", handleDragOver);
      grid.removeEventListener("dragleave", handleDragLeave);
      grid.removeEventListener("dragend", handleDragEnd);
      grid.removeEventListener("drop", handleDrop);
    };
  }, [checkAutoScroll, clearAutoScroll]);

  // Handle drop: update task dates and persist to server (or reorder within same day)
  const handleDropTask = useCallback(
    (taskIds: string[], newDate: Date, clientY?: number, altKey?: boolean) => {
      const isAlt = altKey || calAltKeyRef.current;
      const anchorTask = allContextTasks.find((t) => t.id === taskIds[0]) || calTasks.find((t) => t.id === taskIds[0]);
      if (!anchorTask) return;
      const range = getTaskDateRange(anchorTask);
      if (!range) return;
      const anchorStart = range.start;
      const anchorDelta = newDate.getTime() - anchorStart.getTime();

      // Alt+drag → clone tasks (works even on same day)
      if (isAlt) {
        for (const tid of taskIds) {
          const t = allContextTasks.find((tk) => tk.id === tid);
          if (!t) continue;
          const taskDue = t.dueDate ? new Date(t.dueDate) : null;
          if (!taskDue) continue;
          // Find next copy number: "Title" → "Title (1)" → "Title (2)"
          const baseTitle = t.title.replace(/\s*\(\d+\)$/, '');
          const existing = allContextTasks.filter(tk => tk.title === baseTitle || tk.title.match(new RegExp(`^${baseTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\(\\d+\\)$`)));
          const nextNum = existing.length;
          const cloned: Omit<Task, "id"> = {
            ...t,
            title: `${baseTitle} (${nextNum})`,
            titleKo: t.titleKo ? `${t.titleKo.replace(/\s*\(\d+\)$/, '')} (${nextNum})` : undefined,
            dueDate: new Date(taskDue.getTime() + anchorDelta),
            startDate: t.startDate ? new Date(new Date(t.startDate).getTime() + anchorDelta) : undefined,
            endDate: t.endDate ? new Date(new Date(t.endDate).getTime() + anchorDelta) : undefined,
          };
          delete (cloned as any).id;
          addTaskToContext(cloned as any);
        }
        setQuickViewTask(null);
        return;
      }

      // Same day drop → reorder vertically
      if (anchorDelta === 0 && clientY != null) {
        const dayKey = format(newDate, "yyyy-MM-dd");
        // Find all task bars in this day cell
        const cellEl = document.querySelector(`[data-date="${dayKey}"]`);
        if (!cellEl) return;
        const taskEls = cellEl.querySelectorAll("[data-task-id]");
        const dayTaskIds: string[] = [];
        let insertIdx = -1;

        taskEls.forEach((el) => {
          const tid = el.getAttribute("data-task-id");
          if (tid && !taskIds.includes(tid)) dayTaskIds.push(tid);
          if (tid) {
            const rect = el.getBoundingClientRect();
            const mid = rect.top + rect.height / 2;
            if (clientY > mid) insertIdx = dayTaskIds.length;
          }
        });

        // Insert dragged task(s) at the determined position
        if (insertIdx < 0) insertIdx = 0;
        const newOrder: string[] = [
          ...dayTaskIds.slice(0, insertIdx),
          ...taskIds,
          ...dayTaskIds.slice(insertIdx),
        ];

        // Update calOrder with new positions
        const updated = { ...calOrder };
        newOrder.forEach((tid, i) => {
          updated[tid] = i;
        });
        setCalOrder(updated);
        saveCalOrder(updated);
        return;
      }

      if (anchorDelta === 0) return;

      // Different day → move task dates
      for (const tid of taskIds) {
        const t = calTasks.find((tk) => tk.id === tid);
        if (!t) continue;
        const taskDue = t.dueDate ? new Date(t.dueDate) : null;
        if (!taskDue) continue;
        const updates: Partial<Task> = {
          dueDate: new Date(taskDue.getTime() + anchorDelta),
        };
        if (t.startDate) updates.startDate = new Date(new Date(t.startDate).getTime() + anchorDelta);
        if (t.endDate) updates.endDate = new Date(new Date(t.endDate).getTime() + anchorDelta);
        updateTask(tid, updates);
      }
      setQuickViewTask(null);
    },
    [calTasks, allContextTasks, updateTask, addTaskToContext, calOrder]
  );

  // Handle drop: update meeting date
  const handleDropMeeting = useCallback(
    (meetingId: string, newDate: Date) => {
      const meeting = meetings.find((m) => m.id === meetingId);
      if (!meeting) return;
      const oldDate = new Date(meeting.date);
      // Preserve time, change only the date
      newDate.setHours(oldDate.getHours(), oldDate.getMinutes(), oldDate.getSeconds(), 0);
      if (oldDate.getTime() === newDate.getTime()) return;
      updateMeeting(meetingId, { date: newDate.toISOString() });
    },
    [meetings, updateMeeting]
  );

  const handleTaskClick = useCallback((task: Task, rect: DOMRect) => {
    setQuickViewTask(task);
    setQuickViewRect(rect);
  }, []);

  const handleExpandToPage = useCallback(() => {
    if (quickViewTask) {
      navigate(`/tasks/${quickViewTask.id}`);
    }
  }, [quickViewTask, navigate]);

  const handleCloseQuickView = useCallback(() => {
    setQuickViewTask(null);
    setQuickViewRect(null);
  }, []);

  // ─── Resize handlers ────────────────────────────────────────────
  const handleResizeStart = useCallback(
    (taskId: string, edge: "left" | "right", e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const task = calTasks.find((t) => t.id === taskId);
      if (!task) return;

      const range = getTaskDateRange(task);
      if (!range) return;

      resizeRef.current = {
        taskId,
        edge,
        originalStart: range.start,
        originalEnd: range.end,
      };

      setResizeState({ taskId, edge, previewDate: null });
    },
    [calTasks]
  );

  // Global mousemove/mouseup for resize
  useEffect(() => {
    if (!resizeState) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;

      // Auto-scroll during resize near edges
      checkAutoScroll(e.clientX);

      // Find the day cell under the cursor
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el) return;

      const cellEl = (el as HTMLElement).closest("[data-date]");
      if (!cellEl) return;

      const dateStr = cellEl.getAttribute("data-date");
      if (!dateStr) return;

      const hoverDate = startOfDay(new Date(dateStr));
      const { edge, originalStart, originalEnd } = resizeRef.current;

      let previewDate = hoverDate;

      // Ensure left handle doesn't go past right, and vice versa
      if (edge === "left") {
        if (isAfter(previewDate, originalEnd)) {
          previewDate = originalEnd;
        }
      } else {
        if (isBefore(previewDate, originalStart)) {
          previewDate = originalStart;
        }
      }

      setResizeState((prev) =>
        prev ? { ...prev, previewDate } : null
      );
    };

    const handleMouseUp = () => {
      // Clear auto-scroll on resize end
      clearAutoScroll();

      if (!resizeRef.current || !resizeState?.previewDate) {
        setResizeState(null);
        resizeRef.current = null;
        return;
      }

      const { taskId, edge, originalStart, originalEnd } = resizeRef.current;
      const previewDate = resizeState.previewDate;

      // Persist to server via updateTask
      if (edge === "left") {
        updateTask(taskId, { startDate: previewDate, dueDate: originalEnd, endDate: originalEnd });
      } else {
        updateTask(taskId, { startDate: originalStart, dueDate: previewDate, endDate: previewDate });
      }

      setResizeState(null);
      resizeRef.current = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    // Add cursor style to body during resize
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [resizeState, checkAutoScroll, clearAutoScroll]);

  // ─── Build day → slotted tasks mapping (consistent vertical alignment) ──
  type SlottedEntry = { task: Task | null; position: "single" | "start" | "middle" | "end" };

  const slottedDayTasks = useMemo(() => {
    const result = new Map<string, SlottedEntry[]>();

    // Group visible days into week rows (7 days each)
    const weekRows: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weekRows.push(days.slice(i, Math.min(i + 7, days.length)));
    }

    // Cross-week slot persistence: tasks spanning multiple weeks keep their slot
    const persistentSlots = new Map<string, number>();

    for (const weekDays of weekRows) {
      if (weekDays.length === 0) continue;
      const wStart = startOfDay(weekDays[0]);
      const wEnd = startOfDay(weekDays[weekDays.length - 1]);

      // Collect tasks intersecting this week
      interface WTask {
        task: Task;
        range: { start: Date; end: Date };
        dayIndices: number[];
        isMultiDay: boolean;
      }
      const weekTasks: WTask[] = [];

      for (const task of calTasks) {
        let range = getTaskDateRange(task);
        if (!range) continue;

        if (resizeState && resizeState.taskId === task.id && resizeState.previewDate) {
          if (resizeState.edge === "left") {
            range = { start: resizeState.previewDate, end: range.end };
          } else {
            range = { start: range.start, end: resizeState.previewDate };
          }
        }

        const rs = startOfDay(range.start);
        const re = startOfDay(range.end);

        if (isAfter(rs, wEnd) || isBefore(re, wStart)) continue;

        const dayIndices: number[] = [];
        for (let i = 0; i < weekDays.length; i++) {
          const d = startOfDay(weekDays[i]);
          if ((isSameDay(d, rs) || isAfter(d, rs)) && (isSameDay(d, re) || isBefore(d, re))) {
            dayIndices.push(i);
          }
        }
        if (dayIndices.length === 0) continue;

        weekTasks.push({
          task,
          range: { start: rs, end: re },
          dayIndices,
          isMultiDay: !isSameDay(rs, re),
        });
      }

      // Sort: multi-day first (longer → earlier start), then single-day by calOrder then date
      // Additionally, tasks with persistent slots come first to reserve their positions
      weekTasks.sort((a, b) => {
        const aHasSlot = persistentSlots.has(a.task.id) ? 1 : 0;
        const bHasSlot = persistentSlots.has(b.task.id) ? 1 : 0;
        if (aHasSlot !== bHasSlot) return bHasSlot - aHasSlot; // persistent first
        if (a.isMultiDay && !b.isMultiDay) return -1;
        if (!a.isMultiDay && b.isMultiDay) return 1;
        if (a.isMultiDay && b.isMultiDay) {
          const lenDiff = b.dayIndices.length - a.dayIndices.length;
          if (lenDiff !== 0) return lenDiff;
          return a.range.start.getTime() - b.range.start.getTime();
        }
        // Single-day: use calendarOrder if available
        const aOrd = calOrder[a.task.id];
        const bOrd = calOrder[b.task.id];
        if (aOrd != null && bOrd != null) return aOrd - bOrd;
        if (aOrd != null) return -1;
        if (bOrd != null) return 1;
        return a.range.start.getTime() - b.range.start.getTime();
      });

      // Greedy slot allocation with cross-week persistence
      const slotGrid: (string | null)[][] = weekDays.map(() => []);
      const MAX_SLOTS = 30;

      for (const wt of weekTasks) {
        let slot: number;
        const prevSlot = persistentSlots.get(wt.task.id);

        // If this task had a slot in a previous week and it's still free, reuse it
        if (prevSlot !== undefined && wt.dayIndices.every((di) => !slotGrid[di][prevSlot])) {
          slot = prevSlot;
        } else {
          slot = 0;
          while (slot < MAX_SLOTS) {
            if (wt.dayIndices.every((di) => !slotGrid[di][slot])) break;
            slot++;
          }
        }

        for (const di of wt.dayIndices) {
          while (slotGrid[di].length <= slot) slotGrid[di].push(null);
          slotGrid[di][slot] = wt.task.id;
        }

        // If task continues beyond this week, remember its slot
        if (isAfter(wt.range.end, wEnd)) {
          persistentSlots.set(wt.task.id, slot);
        }
      }

      // Find max slot used across the whole week
      let maxSlot = -1;
      for (const daySlots of slotGrid) {
        for (let s = daySlots.length - 1; s >= 0; s--) {
          if (daySlots[s]) { maxSlot = Math.max(maxSlot, s); break; }
        }
      }

      // Build per-day slotted entries with placeholders
      for (let di = 0; di < weekDays.length; di++) {
        const day = weekDays[di];
        const dayKey = format(day, "yyyy-MM-dd");
        const dayStart2 = startOfDay(day);
        const entries: SlottedEntry[] = [];

        for (let s = 0; s <= maxSlot; s++) {
          const taskId = slotGrid[di]?.[s];
          if (!taskId) {
            entries.push({ task: null, position: "single" });
            continue;
          }
          const wt = weekTasks.find((w) => w.task.id === taskId);
          if (!wt) {
            entries.push({ task: null, position: "single" });
            continue;
          }

          const isStartDay = isSameDay(dayStart2, wt.range.start);
          const isEndDay = isSameDay(dayStart2, wt.range.end);
          // Clip to week boundary for visual continuity
          const isWeekStart = di === 0;
          const isWeekEnd = di === weekDays.length - 1;
          const visualStart = isStartDay || (isWeekStart && isBefore(wt.range.start, wStart));
          const visualEnd = isEndDay || (isWeekEnd && isAfter(wt.range.end, wEnd));

          let position: "single" | "start" | "middle" | "end";
          if (visualStart && visualEnd) position = "single";
          else if (visualStart) position = "start";
          else if (visualEnd) position = "end";
          else position = "middle";

          entries.push({ task: wt.task, position });
        }

        result.set(dayKey, entries);
      }
    }

    return result;
  }, [days, calTasks, resizeState, calOrder]);

  // Find the resizing task for the overlay
  const resizingTask = resizeState ? calTasks.find((t) => t.id === resizeState.taskId) : null;

  // ─── Task selection state ───────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const onSelectTask = useCallback((taskId: string, multi: boolean) => {
    if (multi) {
      const newSet = new Set(selectedIds);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      setSelectedIds(newSet);
    } else {
      setSelectedIds(new Set([taskId]));
    }
  }, [selectedIds]);

  const onDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Escape key to deselect all, Delete key to bulk delete
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedIds.size > 0) {
        setSelectedIds(new Set());
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.size > 0) {
        // Don't trigger when typing in an input
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;

        const selectedTasks = calTasks.filter(t => selectedIds.has(t.id));
        const count = selectedIds.size;
        const ko = language === "ko";

        // Check if any selected tasks belong to other members
        const othersTasks = selectedTasks.filter(t => t.assigneeId && t.assigneeId !== currentUser.id);
        if (othersTasks.length > 0) {
          const ownerNames = [...new Set(othersTasks.map(t => {
            const m = teamMembers.find(m => m.id === t.assigneeId);
            return m?.name || (ko ? "다른 팀원" : "other member");
          }))].join(", ");
          const msg = ko
            ? `선택된 ${count}개 업무 중 ${ownerNames}님의 업무가 포함되어 있습니다. 정말 삭제하시겠습니까?`
            : `${count} selected task(s) include tasks assigned to ${ownerNames}. Are you sure you want to delete?`;
          if (!confirm(msg)) return;
        } else {
          const msg = ko
            ? `선택된 ${count}개 업무를 삭제하시겠습니까?`
            : `Delete ${count} selected task(s)?`;
          if (!confirm(msg)) return;
        }

        selectedIds.forEach(id => removeTask(id));
        setSelectedIds(new Set());
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selectedIds, calTasks, language, removeTask]);

  // ─── Lasso (rubber-band) selection ─────────────────────────────
  const [lasso, setLasso] = useState<{ startX: number; startY: number; curX: number; curY: number } | null>(null);
  const lassoRef = useRef(lasso);
  lassoRef.current = lasso;

  const handleGridMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start lasso on left button, on empty space (not on task bars or buttons)
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    // Don't start lasso on task bars, buttons, resize handles
    if (target.closest("[data-task-id]") || target.closest("button") || target.closest("[class*='cursor-col-resize']")) return;

    const grid = calendarGridRef.current;
    if (!grid) return;

    const gridRect = grid.getBoundingClientRect();
    const startX = e.clientX - gridRect.left + grid.scrollLeft;
    const startY = e.clientY - gridRect.top + grid.scrollTop;

    setLasso({ startX, startY, curX: startX, curY: startY });
    // Clear previous selection unless Ctrl/Cmd held
    if (!e.ctrlKey && !e.metaKey) {
      setSelectedIds(new Set());
    }
  }, []);

  useEffect(() => {
    if (!lasso) return;

    const grid = calendarGridRef.current;
    if (!grid) return;

    const handleMouseMove = (e: MouseEvent) => {
      const gridRect = grid.getBoundingClientRect();
      const curX = e.clientX - gridRect.left + grid.scrollLeft;
      const curY = e.clientY - gridRect.top + grid.scrollTop;
      setLasso(prev => prev ? { ...prev, curX, curY } : null);
    };

    const handleMouseUp = () => {
      const cur = lassoRef.current;
      if (!cur) return;

      // Calculate lasso rectangle in grid-relative coords
      const lx = Math.min(cur.startX, cur.curX);
      const ly = Math.min(cur.startY, cur.curY);
      const lw = Math.abs(cur.curX - cur.startX);
      const lh = Math.abs(cur.curY - cur.startY);

      // Only select if dragged more than 5px (avoid accidental clicks)
      if (lw > 5 || lh > 5) {
        const gridRect = grid.getBoundingClientRect();
        const taskEls = grid.querySelectorAll("[data-task-id]");
        const newIds = new Set<string>(selectedIds);

        taskEls.forEach((el) => {
          const elRect = (el as HTMLElement).getBoundingClientRect();
          // Convert element rect to grid-relative coords
          const ex = elRect.left - gridRect.left + grid.scrollLeft;
          const ey = elRect.top - gridRect.top + grid.scrollTop;
          const ew = elRect.width;
          const eh = elRect.height;

          // Check intersection
          if (ex < lx + lw && ex + ew > lx && ey < ly + lh && ey + eh > ly) {
            const tid = (el as HTMLElement).getAttribute("data-task-id");
            if (tid) newIds.add(tid);
          }
        });

        setSelectedIds(newIds);
      }

      setLasso(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [lasso, selectedIds]);

  // Compute lasso rect for rendering
  const lassoRect = lasso ? {
    left: Math.min(lasso.startX, lasso.curX),
    top: Math.min(lasso.startY, lasso.curY),
    width: Math.abs(lasso.curX - lasso.startX),
    height: Math.abs(lasso.curY - lasso.startY),
  } : null;

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 bg-white shrink-0">
          <div className="flex items-center gap-1 w-full sm:w-auto">
            <CalendarIcon className="text-blue-600 hidden sm:block mr-1 shrink-0" size={20} />
            <button
              onClick={onPrev}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors shrink-0"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-bold text-gray-900 text-sm sm:text-lg px-1 min-w-fit whitespace-nowrap">
              {viewMode === "3week" ? (() => {
                const weekStart = startOfWeek(currentDate, weekOpts);
                const rangeStart = subWeeks(weekStart, 1);
                const rangeEnd = addDays(addWeeks(weekStart, 4), -1);
                const startStr = format(rangeStart, language === "ko" ? "M/d" : "MMM d", formatOptions);
                const endStr = format(rangeEnd, language === "ko" ? "M/d" : "MMM d", formatOptions);
                return language === "ko"
                  ? `${startStr} — ${endStr}`
                  : `${startStr} — ${endStr}`;
              })() : format(
                currentDate,
                language === "ko" ? "yyyy년 MMMM" : "MMMM yyyy",
                formatOptions
              )}
            </span>
            <button
              onClick={onNext}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors shrink-0"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {/* Card style toggle */}
            <div className="flex items-center bg-gray-50 rounded-lg p-0.5 border border-gray-200">
              <button
                onClick={() => toggleCardStyle("compact")}
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  cardStyle === "compact"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                )}
                title={language === "ko" ? "간결 카드" : "Compact"}
              >
                <AlignJustify size={14} />
              </button>
              <button
                onClick={() => toggleCardStyle("detailed")}
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  cardStyle === "detailed"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                )}
                title={language === "ko" ? "상세 카드" : "Detailed"}
              >
                <LayoutList size={14} />
              </button>
            </div>

            {/* View mode toggle */}
            <div className="flex items-center bg-gray-50 rounded-lg p-0.5 border border-gray-200">
              <button
                onClick={() => setViewMode("3week")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                  viewMode === "3week"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                )}
              >
                {t("3week")}
              </button>
              <button
                onClick={() => setViewMode("month")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                  viewMode === "month"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                )}
              >
                {t("month")}
              </button>
            </div>
          </div>
        </div>

        {/* Team member color legend */}
        <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/30 flex items-center gap-4 flex-wrap shrink-0">
          {teamMembers.map((member) => {
            const color = getUserColor(member.id);
            const config = color ? getMemberColorConfig(color) : null;
            if (!color || !config) return null;
            return (
              <div key={member.id} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/5"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs font-medium text-gray-600">
                  {member.name}
                </span>
              </div>
            );
          })}
          <div className="flex items-center gap-1.5 ml-auto">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/5"
              style={{ backgroundColor: "#7C3AED" }}
            />
            <span className="text-xs font-medium text-gray-500">
              {language === "ko" ? "회의" : "Meeting"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/5"
              style={{ background: "linear-gradient(135deg, #FF6B35, #F72585)" }}
            />
            <span className="text-xs font-medium text-gray-500">
              {language === "ko" ? "긴급" : "Urgent"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 border-l border-gray-200 pl-4">
            <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/5" style={{ backgroundColor: "#EAB308" }} />
            <span className="text-xs font-medium text-gray-500">
              {language === "ko" ? "할 일" : "To Do"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/5" style={{ backgroundColor: "#3B82F6" }} />
            <span className="text-xs font-medium text-gray-500">
              {language === "ko" ? "진행 중" : "In Progress"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/5" style={{ backgroundColor: "#22C55E" }} />
            <span className="text-xs font-medium text-gray-500">
              {language === "ko" ? "완료" : "Done"}
            </span>
          </div>
        </div>

        {/* Grid Header */}
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50 shrink-0">
          {weekDays.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grid Content */}
        <div
          ref={calendarGridRef}
          onMouseDown={handleGridMouseDown}
          className={cn(
            "grid grid-cols-7 flex-1 overflow-y-auto overflow-x-hidden min-h-0 relative no-scrollbar select-none",
            "auto-rows-fr"
          )}
        >
          {/* Lasso selection rectangle */}
          {lassoRect && lassoRect.width > 5 && lassoRect.height > 5 && (
            <div
              className="absolute border-2 border-blue-400 bg-blue-100/30 rounded-sm z-30 pointer-events-none"
              style={{
                left: lassoRect.left,
                top: lassoRect.top,
                width: lassoRect.width,
                height: lassoRect.height,
              }}
            />
          )}

          {/* Auto-scroll edge indicators */}
          {autoScrollDirection === "left" && (
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-blue-100/60 to-transparent z-20 pointer-events-none flex items-center justify-start pl-2">
              <div className="animate-pulse">
                <ChevronLeft size={20} className="text-blue-500" />
              </div>
            </div>
          )}
          {autoScrollDirection === "right" && (
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-blue-100/60 to-transparent z-20 pointer-events-none flex items-center justify-end pr-2">
              <div className="animate-pulse">
                <ChevronRight size={20} className="text-blue-500" />
              </div>
            </div>
          )}

          {days.map((day) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);
            const dayTasks = slottedDayTasks.get(format(day, "yyyy-MM-dd")) || [];
            const dayMeetings = meetings.filter(m => isSameDay(new Date(m.date), day));

            return (
              <DroppableDayCell
                key={day.toString()}
                day={day}
                isCurrentMonth={isCurrentMonth}
                isTodayDate={isTodayDate}
                dayTasks={dayTasks}
                dayMeetings={dayMeetings}
                viewMode={viewMode}
                language={language}
                selectedIds={selectedIds}
                onDropTask={handleDropTask}
                onDropMeeting={handleDropMeeting}
                onTaskClick={handleTaskClick}
                onSelectTask={onSelectTask}
                resizeState={resizeState}
                onResizeStart={handleResizeStart}
                onAddTask={(d) => {
                  const newId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                  addTaskToContext({
                    id: newId,
                    title: "제목없음",
                    titleKo: "제목없음",
                    level: "Day",
                    progress: 0,
                    status: "pending",
                    priority: "medium",
                    dueDate: d,
                    startDate: d,
                    assigneeIds: [currentUser.id],
                  } as Task);
                  navigate(`/tasks/${newId}`);
                }}
                onAddMeeting={(d) => {
                  const id = `mt-${Date.now()}`;
                  const meetingDate = new Date(d);
                  meetingDate.setHours(10, 0, 0, 0);
                  addMeeting({
                    id,
                    title: language === 'ko' ? '제목없음' : 'Untitled',
                    date: meetingDate.toISOString(),
                    duration: 60,
                    type: 'external',
                    status: 'scheduled',
                    attendeeIds: [currentUser.id],
                    organizerId: currentUser.id,
                    notes: '',
                    actionItems: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  });
                  navigate(`/meetings/${id}`);
                }}
                onDeselectAll={onDeselectAll}
                onMeetingClick={(meetingId) => {
                  navigate(`/meetings/${meetingId}`);
                }}
                onContextMenu={handleContextMenu}
                onMeetingContextMenu={handleMeetingContextMenu}
                cardStyle={cardStyle}
                canDragTaskFn={(task: Task) => {
                  if (canEditAnyCalendar) return true;
                  if (canEditOwnCalendar) {
                    const assigneeIds = getAllAssigneeIds(task);
                    return assigneeIds.includes(currentUser.id);
                  }
                  return false;
                }}
              />
            );
          })}
        </div>

        {/* Expand / Collapse button – only in month view */}
        {viewMode === "month" && (
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="w-full shrink-0 flex items-center justify-center gap-2 py-2 text-xs font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50/50 border-t border-gray-100 transition-colors group"
          >
            {isExpanded ? (
              <>
                <ChevronUp size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                {language === "ko" ? "접기" : "Collapse"}
              </>
            ) : (
              <>
                <ChevronDown size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                {language === "ko"
                  ? `${nextMonthLabel} 2주 더 보기`
                  : `Show 2 more weeks of ${nextMonthLabel}`}
              </>
            )}
          </button>
        )}
      </div>

      {/* Resize Overlay */}
      {resizeState && resizingTask && (
        <ResizeOverlay
          resizeState={resizeState}
          task={resizingTask}
          language={language}
        />
      )}

      {/* Quick View Modal */}
      {quickViewTask && quickViewRect && !resizeState && (
        <TaskQuickViewModal
          task={quickViewTask}
          anchorRect={quickViewRect}
          language={language}
          onClose={handleCloseQuickView}
          onExpand={handleExpandToPage}
        />
      )}

      {/* Multi-select floating badge */}
      {selectedIds.size > 1 && createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg shadow-blue-200/50 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="bg-white/20 rounded-full w-6 h-6 flex items-center justify-center text-[11px] font-bold">
            {selectedIds.size}
          </span>
          <span>
            {language === "ko"
              ? `개 업무 선택됨 — 드래그하여 일괄 이동`
              : `tasks selected — drag to move together`}
          </span>
          <button
            onClick={onDeselectAll}
            className="ml-1 p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={14} />
          </button>
        </div>,
        document.body
      )}

      {/* Right-click context menu */}
      {ctxMenu && createPortal(
        <div
          ref={ctxMenuRef}
          className="fixed z-[10001] bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
        >
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => {
              navigate(`/tasks/${ctxMenu.task.id}`);
              setCtxMenu(null);
            }}
          >
            <Maximize2 size={14} className="text-gray-400" />
            {language === "ko" ? "상세 보기" : "Open detail"}
          </button>
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => {
              const task = ctxMenu.task;
              const next = task.status === "completed" ? "pending" : task.status === "in-progress" ? "completed" : "in-progress";
              updateTask(task.id, { status: next });
              setCtxMenu(null);
            }}
          >
            {ctxMenu.task.status === "completed"
              ? <Circle size={14} className="text-gray-400" />
              : <CheckCircle2 size={14} className="text-green-500" />}
            {language === "ko"
              ? ctxMenu.task.status === "completed" ? "미완료로 변경" : ctxMenu.task.status === "in-progress" ? "완료로 변경" : "진행 중으로 변경"
              : ctxMenu.task.status === "completed" ? "Mark incomplete" : ctxMenu.task.status === "in-progress" ? "Mark complete" : "Mark in progress"}
          </button>
          <div className="border-t border-gray-100 my-1" />
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            onClick={() => {
              const ko = language === "ko";
              if (ctxMenu.task.assigneeId && ctxMenu.task.assigneeId !== currentUser.id) {
                const owner = teamMembers.find(m => m.id === ctxMenu.task.assigneeId);
                const name = owner?.name || (ko ? "다른 팀원" : "other member");
                if (!confirm(ko ? `${name}님의 업무입니다. 정말 삭제하시겠습니까?` : `This task is assigned to ${name}. Are you sure you want to delete?`)) return;
              }
              removeTask(ctxMenu.task.id);
              setCtxMenu(null);
            }}
          >
            <X size={14} />
            {language === "ko" ? "삭제" : "Delete"}
          </button>
        </div>,
        document.body
      )}

      {/* Meeting right-click context menu */}
      {mtgCtxMenu && createPortal(
        <div
          ref={mtgCtxMenuRef}
          className="fixed z-[10001] bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
          style={{ left: mtgCtxMenu.x, top: mtgCtxMenu.y }}
        >
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => {
              navigate(`/meetings/${mtgCtxMenu.meeting.id}`);
              setMtgCtxMenu(null);
            }}
          >
            <Maximize2 size={14} className="text-gray-400" />
            {language === "ko" ? "상세 보기" : "Open detail"}
          </button>
          {mtgCtxMenu.meeting.organizerId === currentUser.id && (
            <>
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => {
                  const m = mtgCtxMenu.meeting;
                  const next = m.status === 'completed' ? 'scheduled' : 'completed';
                  updateMeeting(m.id, { status: next });
                  setMtgCtxMenu(null);
                }}
              >
                {mtgCtxMenu.meeting.status === "completed"
                  ? <Circle size={14} className="text-gray-400" />
                  : <CheckCircle2 size={14} className="text-green-500" />}
                {language === "ko"
                  ? mtgCtxMenu.meeting.status === "completed" ? "미완료로 변경" : "완료로 변경"
                  : mtgCtxMenu.meeting.status === "completed" ? "Mark incomplete" : "Mark complete"}
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                onClick={() => {
                  removeMeeting(mtgCtxMenu.meeting.id);
                  setMtgCtxMenu(null);
                }}
              >
                <X size={14} />
                {language === "ko" ? "삭제" : "Delete"}
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
}