import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, ArrowRight, X, Check, Clock } from "lucide-react";
import { cn } from "../../lib/utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  isWithinInterval,
  isBefore,
} from "date-fns";
import { ko as koLocale } from "date-fns/locale";

interface NotionDateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
  language: string;
  /** Single-date mode: no range selection, one time input only */
  singleDate?: boolean;
  /** Hide time toggle and input inside the picker */
  hideTime?: boolean;
}

const WEEKDAYS_KO = ["월", "화", "수", "목", "금", "토", "일"];
const WEEKDAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// Time input helper: parse "HH:MM" or "H:MM" string to { h, m }
function parseTimeStr(str: string): { h: number; m: number } | null {
  const match = str.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

function formatTime(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function NotionDateRangePicker({
  startDate,
  endDate,
  onChange,
  language,
  singleDate = false,
  hideTime = false,
}: NotionDateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(startDate || new Date());

  // Staging state — only committed on confirm
  const [tempStart, setTempStart] = useState<Date | null>(startDate);
  const [tempEnd, setTempEnd] = useState<Date | null>(endDate);

  // Time state
  const [includeTime, setIncludeTime] = useState(() => {
    if (startDate && (startDate.getHours() !== 0 || startDate.getMinutes() !== 0)) return true;
    if (endDate && (endDate.getHours() !== 0 || endDate.getMinutes() !== 0)) return true;
    return false;
  });
  const [tempStartHour, setTempStartHour] = useState(startDate?.getHours() ?? 9);
  const [tempStartMinute, setTempStartMinute] = useState(startDate?.getMinutes() ?? 0);
  const [tempEndHour, setTempEndHour] = useState(endDate?.getHours() ?? 18);
  const [tempEndMinute, setTempEndMinute] = useState(endDate?.getMinutes() ?? 0);
  // Local text state for free-form time typing
  const [startTimeText, setStartTimeText] = useState(formatTime(startDate?.getHours() ?? 9, startDate?.getMinutes() ?? 0));
  const [endTimeText, setEndTimeText] = useState(formatTime(endDate?.getHours() ?? 18, endDate?.getMinutes() ?? 0));

  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragEnd, setDragEnd] = useState<Date | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null);

  // Sync staging when opening
  useEffect(() => {
    if (open) {
      setTempStart(startDate);
      setTempEnd(endDate);
      setViewMonth(startDate || new Date());
      const hasTime = (startDate && (startDate.getHours() !== 0 || startDate.getMinutes() !== 0)) ||
                      (endDate && (endDate.getHours() !== 0 || endDate.getMinutes() !== 0));
      setIncludeTime(!!hasTime);
      const sh = startDate?.getHours() ?? 9;
      const sm = startDate?.getMinutes() ?? 0;
      const eh = endDate?.getHours() ?? 18;
      const em = endDate?.getMinutes() ?? 0;
      setTempStartHour(sh);
      setTempStartMinute(sm);
      setTempEndHour(eh);
      setTempEndMinute(em);
      setStartTimeText(formatTime(sh, sm));
      setEndTimeText(formatTime(eh, em));
    }
  }, [open]);

  // Calculate popup position
  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popupWidth = 300;
      const popupHeight = 500;
      let top = rect.bottom + 4;
      let left = rect.left;

      if (left + popupWidth > window.innerWidth - 16) {
        left = window.innerWidth - popupWidth - 16;
      }
      if (top + popupHeight > window.innerHeight - 16) {
        top = rect.top - popupHeight - 4;
      }

      setPopupPos({ top, left });
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        popupRef.current && !popupRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Build calendar grid (Mon start)
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getRange = useCallback(() => {
    const s = dragStart || tempStart;
    const e = dragEnd || tempEnd;
    if (!s) return { rangeStart: null, rangeEnd: null };
    if (!e) return { rangeStart: s, rangeEnd: s };
    if (isBefore(e, s)) return { rangeStart: e, rangeEnd: s };
    return { rangeStart: s, rangeEnd: e };
  }, [dragStart, dragEnd, tempStart, tempEnd]);

  const handleMouseDown = (day: Date) => {
    setIsDragging(true);
    setDragStart(day);
    setDragEnd(null);
  };

  const handleMouseEnter = (day: Date) => {
    if (!isDragging) return;
    setDragEnd(day);
  };

  const handleMouseUp = () => {
    if (!isDragging || !dragStart) {
      setIsDragging(false);
      return;
    }
    setIsDragging(false);

    const s = dragStart;
    const e = dragEnd || dragStart;

    if (singleDate) {
      // Single date mode: always pick just one date, no range
      setTempStart(s);
      setTempEnd(null);
    } else if (isSameDay(s, e)) {
      // Single click
      if (tempStart && !isSameDay(s, tempStart)) {
        if (isBefore(s, tempStart)) {
          setTempStart(s);
          setTempEnd(tempStart);
        } else {
          setTempEnd(s);
        }
      } else {
        setTempStart(s);
        setTempEnd(null);
      }
    } else {
      const [rStart, rEnd] = isBefore(e, s) ? [e, s] : [s, e];
      setTempStart(rStart);
      setTempEnd(rEnd);
    }

    setDragStart(null);
    setDragEnd(null);
  };

  useEffect(() => {
    const handleGlobalUp = () => {
      if (isDragging) handleMouseUp();
    };
    window.addEventListener("mouseup", handleGlobalUp);
    return () => window.removeEventListener("mouseup", handleGlobalUp);
  });

  const { rangeStart, rangeEnd } = getRange();

  const isInRange = (day: Date) => {
    if (!rangeStart || !rangeEnd) return false;
    return isWithinInterval(day, { start: rangeStart, end: rangeEnd });
  };

  const isRangeStart = (day: Date) => rangeStart && isSameDay(day, rangeStart);
  const isRangeEnd = (day: Date) => rangeEnd && isSameDay(day, rangeEnd);
  const isToday = (day: Date) => isSameDay(day, new Date());

  const clearDates = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, null);
  };

  const handleConfirm = () => {
    let start = tempStart ? new Date(tempStart) : null;
    let end = tempEnd ? new Date(tempEnd) : null;
    if (includeTime) {
      if (start) start.setHours(tempStartHour, tempStartMinute, 0, 0);
      if (end) end.setHours(tempEndHour, tempEndMinute, 0, 0);
    } else {
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(0, 0, 0, 0);
    }
    onChange(start, end);
    setOpen(false);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const formatDisplay = () => {
    if (!startDate) return language === "ko" ? "날짜 선택" : "Pick a date";
    const hasTime = startDate.getHours() !== 0 || startDate.getMinutes() !== 0 ||
                    (endDate && (endDate.getHours() !== 0 || endDate.getMinutes() !== 0));
    const opts = { locale: language === "ko" ? koLocale : undefined };

    if (!endDate || isSameDay(startDate, endDate)) {
      const fmt = language === "ko" ? "yyyy년 M월 d일" : "MMM d, yyyy";
      const base = format(startDate, fmt, opts);
      if (hasTime) {
        const time = format(startDate, "HH:mm");
        if (endDate && (endDate.getHours() !== 0 || endDate.getMinutes() !== 0)) {
          return `${base} ${time} → ${format(endDate, "HH:mm")}`;
        }
        return `${base} ${time}`;
      }
      return base;
    }
    const fmtShort = language === "ko" ? "M월 d일" : "MMM d";
    const sameYear = startDate.getFullYear() === endDate.getFullYear();
    const fmtFull = language === "ko" ? "yyyy년 M월 d일" : "MMM d, yyyy";
    const startFmt = sameYear ? fmtShort : fmtFull;
    const endFmt = sameYear ? fmtShort : fmtFull;
    const startStr = format(startDate, startFmt, opts) + (hasTime ? ` ${format(startDate, "HH:mm")}` : "");
    const endStr = format(endDate, endFmt, opts) + (hasTime && (endDate.getHours() || endDate.getMinutes()) ? ` ${format(endDate, "HH:mm")}` : "");
    return `${startStr}  →  ${endStr}`;
  };

  const weekdays = language === "ko" ? WEEKDAYS_KO : WEEKDAYS_EN;

  // Has the user changed something from the committed state?
  const hasChanges = (() => {
    const sameStart = tempStart && startDate ? isSameDay(tempStart, startDate) : tempStart === startDate;
    const sameEnd = tempEnd && endDate ? isSameDay(tempEnd, endDate) : tempEnd === endDate;
    return !sameStart || !sameEnd;
  })();

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors text-sm group"
      >
        <span
          className={cn(
            "text-sm font-medium",
            startDate ? "text-gray-700" : "text-gray-400"
          )}
        >
          {formatDisplay()}
        </span>
        {startDate && (
          <button
            onClick={clearDates}
            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-0.5"
          >
            <X size={12} />
          </button>
        )}
      </button>

      {/* Calendar popup */}
      {open && popupPos && (
        createPortal(
          <div
            ref={popupRef}
            className="fixed bg-white border border-gray-200 rounded-xl shadow-xl z-[9999] w-[300px] select-none"
            style={{ top: popupPos.top, left: popupPos.left }}
          >
            {/* Header: Month nav */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <button
                onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold text-gray-800">
                {format(
                  viewMonth,
                  language === "ko" ? "yyyy년 M월" : "MMMM yyyy",
                  { locale: language === "ko" ? koLocale : undefined }
                )}
              </span>
              <button
                onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 px-3 pb-1">
              {weekdays.map((d) => (
                <div
                  key={d}
                  className="text-center text-[10px] font-semibold text-gray-400 uppercase py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div
              className="grid grid-cols-7 px-3 pb-3"
              onMouseLeave={() => {
                if (isDragging) setDragEnd(null);
              }}
            >
              {days.map((day) => {
                const inMonth = isSameMonth(day, viewMonth);
                const inRange = isInRange(day);
                const isStart = isRangeStart(day);
                const isEnd = isRangeEnd(day);
                const today = isToday(day);
                const singleSelect = isStart && (!rangeEnd || isSameDay(rangeStart!, rangeEnd!));

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "relative flex items-center justify-center",
                      inRange && !singleSelect && "before:absolute before:inset-y-0.5 before:inset-x-0 before:bg-blue-50",
                      isStart && !singleSelect && "before:!left-1/2 before:!rounded-l-full",
                      isEnd && !singleSelect && "before:!right-1/2 before:!rounded-r-full"
                    )}
                  >
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleMouseDown(day);
                      }}
                      onMouseEnter={() => handleMouseEnter(day)}
                      className={cn(
                        "relative z-10 w-8 h-8 rounded-full text-[13px] font-medium transition-all",
                        !inMonth && "text-gray-300",
                        inMonth && !inRange && !isStart && !isEnd && "text-gray-700 hover:bg-gray-100",
                        inRange && !isStart && !isEnd && "text-blue-700",
                        (isStart || isEnd) && "bg-[#0079FF] text-white shadow-sm",
                        today && !isStart && !isEnd && "ring-1 ring-blue-300 font-bold text-blue-600"
                      )}
                    >
                      {format(day, "d")}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Time toggle + direct input */}
            {!hideTime && (
            <div className="border-t border-gray-100 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIncludeTime(!includeTime)}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors",
                    includeTime ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <Clock size={12} />
                  {language === "ko" ? "시간" : "Time"}
                </button>
                {includeTime && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <input
                      type="text"
                      value={startTimeText}
                      onChange={(e) => {
                        setStartTimeText(e.target.value);
                        const parsed = parseTimeStr(e.target.value);
                        if (parsed) { setTempStartHour(parsed.h); setTempStartMinute(parsed.m); }
                      }}
                      onBlur={() => {
                        const parsed = parseTimeStr(startTimeText);
                        if (parsed) { setTempStartHour(parsed.h); setTempStartMinute(parsed.m); }
                        setStartTimeText(formatTime(tempStartHour, tempStartMinute));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const parsed = parseTimeStr(startTimeText);
                          if (parsed) { setTempStartHour(parsed.h); setTempStartMinute(parsed.m); }
                          setStartTimeText(formatTime(parsed?.h ?? tempStartHour, parsed?.m ?? tempStartMinute));
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      placeholder="09:00"
                      className="w-[56px] text-xs py-1 px-1.5 border border-gray-200 rounded-md bg-white text-center focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 font-mono"
                      maxLength={5}
                    />
                    {!singleDate && (
                      <>
                        <ArrowRight size={10} className="text-gray-300" />
                        <input
                          type="text"
                          value={endTimeText}
                          onChange={(e) => {
                            setEndTimeText(e.target.value);
                            const parsed = parseTimeStr(e.target.value);
                            if (parsed) { setTempEndHour(parsed.h); setTempEndMinute(parsed.m); }
                          }}
                          onBlur={() => {
                            const parsed = parseTimeStr(endTimeText);
                            if (parsed) { setTempEndHour(parsed.h); setTempEndMinute(parsed.m); }
                            setEndTimeText(formatTime(tempEndHour, tempEndMinute));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const parsed = parseTimeStr(endTimeText);
                              if (parsed) { setTempEndHour(parsed.h); setTempEndMinute(parsed.m); }
                              setEndTimeText(formatTime(parsed?.h ?? tempEndHour, parsed?.m ?? tempEndMinute));
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          placeholder="18:00"
                          className="w-[56px] text-xs py-1 px-1.5 border border-gray-200 rounded-md bg-white text-center focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 font-mono"
                          maxLength={5}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Footer: range display + actions */}
            <div className="border-t border-gray-100 px-4 py-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {tempStart ? (
                    <>
                      <span className="font-medium text-gray-700">
                        {format(tempStart, language === "ko" ? "M/d" : "M/d")}
                        {includeTime && ` ${String(tempStartHour).padStart(2, "0")}:${String(tempStartMinute).padStart(2, "0")}`}
                      </span>
                      {tempEnd && !isSameDay(tempStart, tempEnd) && (
                        <>
                          <ArrowRight size={12} className="text-gray-400" />
                          <span className="font-medium text-gray-700">
                            {format(tempEnd, language === "ko" ? "M/d" : "M/d")}
                            {includeTime && ` ${String(tempEndHour).padStart(2, "0")}:${String(tempEndMinute).padStart(2, "0")}`}
                          </span>
                          <span className="text-[10px] text-gray-400 ml-1">
                            {Math.ceil(
                              (tempEnd.getTime() - tempStart.getTime()) / (1000 * 60 * 60 * 24)
                            ) + 1}
                            {language === "ko" ? "일" : "d"}
                          </span>
                        </>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400">
                      {language === "ko" ? "드래그로 범위 선택" : "Drag to select range"}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setTempStart(new Date());
                    setTempEnd(null);
                    setViewMonth(new Date());
                  }}
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {language === "ko" ? "오늘" : "Today"}
                </button>
              </div>

              {/* Confirm / Cancel buttons */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {language === "ko" ? "취소" : "Cancel"}
                </button>
                <button
                  onClick={handleConfirm}
                  className={cn(
                    "flex items-center gap-1 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors",
                    tempStart
                      ? "bg-[#0079FF] text-white hover:bg-blue-700 shadow-sm"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  )}
                  disabled={!tempStart}
                >
                  <Check size={12} />
                  {language === "ko" ? "확인" : "Confirm"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      )}
    </div>
  );
}
